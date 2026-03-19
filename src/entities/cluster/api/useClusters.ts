// @ts-nocheck — client_groups / tb_meta_ads_contas not fully typed in database.types
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../services/supabaseClient';
import { Cluster, ClusterAccount } from '../model/types';

// ─── READ ────────────────────────────────────────────────────────────────────

/**
 * Fetches all active client_groups.
 * Each group includes the list of account_ids from tb_meta_ads_contas.group_id.
 */
export const useClusters = () => {
    return useQuery<Cluster[], Error>({
        queryKey: ['client_groups'],
        queryFn: async () => {
            const { data: groups, error: gErr } = await (supabase as any)
                .from('client_groups')
                .select('id, name, type, is_active, created_at')
                .eq('is_active', true)
                .order('name');

            if (gErr) throw new Error(gErr.message);

            // For each group, attach its account_ids
            const { data: allAccounts, error: aErr } = await (supabase as any)
                .from('tb_meta_ads_contas')
                .select('account_id, group_id')
                .not('group_id', 'is', null)
                .neq('status_interno', 'removed');

            if (aErr) throw new Error(aErr.message);

            return (groups || []).map((g: any) => ({
                id: g.id,
                name: g.name,
                created_at: g.created_at,
                cluster_accounts: (allAccounts || [])
                    .filter((a: any) => a.group_id === g.id)
                    .map((a: any) => ({ account_id: a.account_id })),
            })) as Cluster[];
        },
    });
};

/**
 * Returns account_ids that belong to the given groupId.
 * Reads from tb_meta_ads_contas.group_id.
 */
export const useClusterAccounts = (clusterId: string | null) => {
    return useQuery<ClusterAccount[], Error>({
        queryKey: ['cluster_accounts', clusterId],
        queryFn: async () => {
            if (!clusterId) return [];
            const { data, error } = await (supabase as any)
                .from('tb_meta_ads_contas')
                .select('account_id')
                .eq('group_id', clusterId)
                .neq('status_interno', 'removed');

            if (error) throw new Error(error.message);
            return (data || []).map((r: any) => ({
                cluster_id: clusterId,
                account_id: r.account_id,
            })) as ClusterAccount[];
        },
        enabled: !!clusterId,
    });
};

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

export const useManageClusters = () => {
    const queryClient = useQueryClient();

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['client_groups'] });
    };

    /** Create a new group in client_groups */
    const createCluster = useMutation({
        mutationFn: async (name: string) => {
            const { data, error } = await (supabase as any)
                .from('client_groups')
                .insert({ name, type: 'custom', is_active: true })
                .select('id, name, created_at')
                .single();
            if (error) throw new Error(error.message);
            return data;
        },
        onSuccess: invalidate,
    });

    /** Delete a group: unlink all accounts first (via RPC), then delete the group */
    const deleteCluster = useMutation({
        mutationFn: async (groupId: string) => {
            // Unlink accounts via SECURITY DEFINER RPC (empty array = clear all)
            const { error: unlinkErr } = await (supabase as any).rpc('set_accounts_group', {
                p_group_id: groupId,
                p_account_ids: [],
            });
            if (unlinkErr) throw new Error(unlinkErr.message);

            const { error } = await (supabase as any)
                .from('client_groups')
                .delete()
                .eq('id', groupId);
            if (error) throw new Error(error.message);
        },
        onSuccess: invalidate,
    });

    /**
     * Assign accounts to a group via SECURITY DEFINER RPC (bypasses RLS).
     * SQL to create this function: see MIGRATION_PLAN.md or paste in Supabase SQL Editor.
     */
    const linkAccounts = useMutation({
        mutationFn: async ({ clusterId, accountIds }: { clusterId: string; accountIds: string[] }) => {
            const { error } = await (supabase as any).rpc('set_accounts_group', {
                p_group_id: clusterId,
                p_account_ids: accountIds,
            });
            if (error) throw new Error(error.message);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['cluster_accounts', variables.clusterId] });
            invalidate();
        },
    });

    return { createCluster, deleteCluster, linkAccounts };
};
