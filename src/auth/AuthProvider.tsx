import React, { createContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { supabase } from '../../services/supabaseService';
import { UserProfile, UserRole, LocalSession } from './types';
import { logger } from '../../lib/logger';

export interface AuthContextType {
    session: LocalSession | null;
    userProfile: UserProfile | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'op7_local_session';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<LocalSession | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ========== CARREGAR SESSÃO DO STORAGE ==========
    const loadSessionFromStorage = useCallback(async () => {
        let isMounted = true;
        try {
            setLoading(true);
            const stored = localStorage.getItem(STORAGE_KEY);
            
            if (!stored) {
                if (isMounted) setLoading(false);
                return;
            }

            const localSession = JSON.parse(stored) as LocalSession;

            // 1. Validar se o usuário ainda existe e buscar perfil básico
            const { data: userData, error: userError } = await supabase
                .from('perfil_acesso')
                .select('*')
                .eq('email', localSession.email)
                .maybeSingle();

            if (userError || !userData) {
                logger.warn('Session invalid or user not found:', userError);
                localStorage.removeItem(STORAGE_KEY);
                if (isMounted) {
                    setSession(null);
                    setUserProfile(null);
                }
                return;
            }

            // 2. Buscar permissões atualizadas da nova tabela relacional
            const { data: accountsData, error: accountsError } = await (supabase.rpc as any)('get_user_assigned_accounts', { 
                p_user_email: localSession.email 
            });

            if (accountsError) {
                logger.error('Error fetching user accounts', accountsError);
            }

            // Converter para array de strings (garantindo que seja string[])
            // O RPC retorna TABLE(account_id text), então data é [{ account_id: '...' }, ...]
            // Mas o supabase JS client pode retornar direto se for configurado, vamos assumir o padrão
            const assignedIds: string[] = accountsData 
                ? (accountsData as any[]).map((a: any) => a.account_id) 
                : [];

            // Montar perfil
            const pData = userData as any;
            const profile: UserProfile = {
                id: pData.id,
                email: pData.email,
                name: pData.nome || pData.email.split('@')[0],
                role: (pData.role as UserRole) || 'client',
                assigned_account_ids: assignedIds, // Dados frescos da tabela relacional
                permissions: pData.permissions || [],
                created_at: pData.created_at,
            };

            if (isMounted) {
                setSession(localSession);
                setUserProfile(profile);
            }

        } catch (err) {
            logger.error('Error loading session:', err);
            localStorage.removeItem(STORAGE_KEY);
        } finally {
            if (isMounted) setLoading(false);
        }
    }, []);

    // ========== LOGIN INTERNO ==========
    const login = async (email: string, password: string) => {
        setLoading(true);
        setError(null);
        try {
            // Usar RPC para autenticação (bypassing RLS via Security Definer)
            const { data, error } = await (supabase.rpc as any)('authenticate_user', {
                p_email: email,
                p_password: password
            });

            if (error) {
                console.error('Erro no login:', error);
                throw new Error('Erro ao processar login.');
            }

            if (!data || data.length === 0) {
                throw new Error('Credenciais inválidas.');
            }

            const pData = data[0]; // RPC returns array

            // BUSCAR CONTAS ATUALIZADAS (Relational)
            // Authenticate user retorna dados do perfil_acesso, que pode ter array desatualizado.
            // Vamos buscar a fonte da verdade.
            const { data: accountsData, error: accountsError } = await (supabase.rpc as any)('get_user_assigned_accounts', { 
                p_user_email: email 
            });
            
            const assignedIds: string[] = accountsData 
                ? (accountsData as any[]).map((a: any) => a.account_id) 
                : [];


            // Sucesso - Criar sessão local
            const newSession: LocalSession = {
                userId: pData.id,
                email: pData.email,
                createdAt: new Date().toISOString()
            };

            const profile: UserProfile = {
                id: pData.id,
                email: pData.email,
                name: pData.nome || pData.email.split('@')[0],
                role: (pData.role as UserRole) || 'client',
                assigned_account_ids: assignedIds, // Fonte da verdade
                permissions: pData.permissions || [],
                created_at: pData.created_at,
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
            
            setSession(newSession);
            setUserProfile(profile);

        } catch (err: any) {
            setError(err.message || 'Erro ao fazer login');
            throw err; // Re-throw para o componente tratar se quiser
        } finally {
            setLoading(false);
        }
    };

    // ========== LOGOUT ==========
    const logout = async () => {
        try {
            localStorage.removeItem(STORAGE_KEY);
            setSession(null);
            setUserProfile(null);
            setError(null);
        } catch (err) {
            logger.error('Error logout:', err);
        }
    };

    const clearError = () => setError(null);

    // ========== EFEITOS ==========
    useEffect(() => {
        loadSessionFromStorage();
    }, [loadSessionFromStorage]);

    const value: AuthContextType = useMemo(() => ({
        session,
        userProfile,
        loading,
        error,
        login,
        logout,
        clearError,
    }), [session, userProfile, loading, error]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
