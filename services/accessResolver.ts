
import { supabase } from './supabaseService';
import { UserProfile, ResolvedFranchise, ResolvedMetaAccount } from '../src/auth/types';

/**
 * Converte IDs de franquias (UUIDs) em objetos ResolvedFranchise com detalhes
 */
export const resolveUserFranchises = async (franchiseIds: string[]): Promise<ResolvedFranchise[]> => {
    return [];
};

/**
 * Busca TODAS as contas Meta e filtra baseado no perfil do usuário
 * Lógica:
 * 1. Admin/Executive vê tudo (ou filtra se tiver requirements)
 * 2. Client vê apenas contas explicitamente atribuídas OU contas das franquias atribuídas
 */
export const resolveUserAccounts = async (userProfile: UserProfile): Promise<ResolvedMetaAccount[]> => {
    try {
        let query = supabase
            .from('tb_meta_ads_contas')
            .select(`
                account_id,
                nome_original,
                nome_ajustado,
                franqueado_id,
                saldo_balanco,
                status_meta,
                status_interno,
                client_visibility,
                tb_franqueados (nome)
            `);

        const { data, error } = await query;

        if (error) {
            console.error('[AccessResolver] Error fetching accounts:', error);
            throw error;
        }

        // Mapear para ResolvedMetaAccount
        const allAccounts: ResolvedMetaAccount[] = (data || []).map((acc: any) => ({
            id: acc.account_id, // Mapping id to account_id as per interface
            account_id: acc.account_id,
            account_name: acc.nome_original, // ou nome_ajustado se preferir
            display_name: acc.nome_ajustado || acc.nome_original,
            franchise_id: acc.franqueado_id,
            franchise_name: acc.tb_franqueados?.nome || 'Sem Franquia',
            current_balance: parseFloat(acc.saldo_balanco || '0'),
            status: (acc.status_meta === 'ACTIVE' && acc.status_interno !== 'REMOVED') ? 'active' : 'removed', // Simplificação
            client_visibility: acc.client_visibility
        }));

        // Aplicar filtros de acesso
        const allowedAccountIds = userProfile.assigned_account_ids || [];
        const isAdmin = userProfile.role === 'admin';

        if (isAdmin) return allAccounts;

        return allAccounts.filter(acc => {
            if (allowedAccountIds.includes(acc.account_id) || allowedAccountIds.includes(acc.id)) return true;
            return false;
        });

    } catch (err) {
        console.error('[AccessResolver] Error in resolveUserAccounts:', err);
        return [];
    }
};

export const canAccessAccount = (account: ResolvedMetaAccount, userProfile: UserProfile): boolean => {
    if (userProfile.role === 'admin') return true;
    if (userProfile.assigned_account_ids.includes(account.account_id)) return true;
    return false;
};
