import React, { createContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { supabase } from '../../services/supabaseService';
import { UserProfile, UserRole, LocalSession, ModulePermission } from './types';
import { logger } from '../../lib/logger';

export interface AuthContextType {
    session: LocalSession | null;
    userProfile: UserProfile | null;
    loading: boolean;
    initializing: boolean;
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
    const [initializing, setInitializing] = useState(true); // true até a sessão ser resolvida
    const [error, setError] = useState<string | null>(null);

    // ========== CARREGAR SESSÃO DO STORAGE ==========
    const loadSessionFromStorage = useCallback(async (signal?: AbortSignal) => {
        try {
            setLoading(true);
            const stored = localStorage.getItem(STORAGE_KEY);

            if (!stored) {
                setLoading(false);
                setInitializing(false);
                return;
            }

            const localSession = JSON.parse(stored) as LocalSession;

            // 1. Validar se o usuário ainda existe e buscar perfil básico
            const { data: userData, error: userError } = await supabase
                .from('perfil_acesso')
                .select('*')
                .eq('email', localSession.email)
                .maybeSingle();

            if (signal?.aborted) return;

            if (userError || !userData) {
                logger.warn('Session invalid or user not found:', userError);
                localStorage.removeItem(STORAGE_KEY);
                setSession(null);
                setUserProfile(null);
                return;
            }

            // 2. Buscar permissões atualizadas da nova tabela relacional
            const { data: accountsData, error: accountsError } = await (supabase.rpc as any)('get_user_assigned_accounts', {
                p_user_email: localSession.email
            });

            if (signal?.aborted) return;

            if (accountsError) {
                logger.error('Error fetching user accounts', accountsError);
            }

            const assignedIds: string[] = accountsData
                ? (accountsData as any[]).map((a: any) => a.account_id)
                : [];

            // 3. Buscar permissões de módulo
            const { data: modulesData } = await (supabase.rpc as any)('get_user_module_permissions', {
                p_user_email: localSession.email
            });

            const modulePermissions: ModulePermission[] = modulesData || [];

            // Montar perfil
            const pData = userData as any;
            const profile: UserProfile = {
                id: pData.id,
                email: pData.email,
                name: pData.nome || pData.email.split('@')[0],
                role: (pData.role as UserRole) || 'client',
                is_active: pData.is_active ?? true,
                assigned_account_ids: assignedIds,
                module_permissions: modulePermissions,
                permissions: pData.permissions || {},
                created_at: pData.created_at,
            };

            if (!signal?.aborted) {
                setSession(localSession);
                setUserProfile(profile);
            }

        } catch (err) {
            logger.error('Error loading session:', err);
            localStorage.removeItem(STORAGE_KEY);
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
                setInitializing(false);
            }
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

            // Buscar permissões de módulo
            const { data: modulesData } = await (supabase.rpc as any)('get_user_module_permissions', {
                p_user_email: email
            });
            const modulePermissions: ModulePermission[] = modulesData || [];

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
                is_active: pData.is_active ?? true,
                assigned_account_ids: assignedIds,
                module_permissions: modulePermissions,
                permissions: pData.permissions || {},
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
        const controller = new AbortController();
        loadSessionFromStorage(controller.signal);
        return () => controller.abort();
    }, [loadSessionFromStorage]);

    const value: AuthContextType = useMemo(() => ({
        session,
        userProfile,
        loading,
        initializing,
        error,
        login,
        logout,
        clearError,
    }), [session, userProfile, loading, initializing, error]);

    // Bloqueia render de filhos até a sessão estar resolvida
    if (initializing) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <svg className="h-10 w-10 animate-spin text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-sm font-medium text-slate-500">Carregando...</p>
                </div>
            </div>
        );
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
