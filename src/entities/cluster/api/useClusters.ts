// @ts-nocheck — clusters/cluster_accounts tables not yet in database.types
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../services/supabaseClient';
import { Cluster, ClusterAccount } from '../model/types';

export const useClusters = () => {
    return useQuery<Cluster[], Error>({
        queryKey: ['clusters'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('clusters')
                .select('*, cluster_accounts(account_id)')
                .order('name');
            if (error) throw new Error(error.message);
            return data as Cluster[];
        }
    });
};

export const useClusterAccounts = (clusterId: string | null) => {
    return useQuery<ClusterAccount[], Error>({
        queryKey: ['cluster_accounts', clusterId],
        queryFn: async () => {
            if (!clusterId) return [];
            const { data, error } = await supabase
                .from('cluster_accounts')
                .select('cluster_id, account_id')
                .eq('cluster_id', clusterId);
            if (error) throw new Error(error.message);
            return data as ClusterAccount[];
        },
        enabled: !!clusterId
    });
};

export const useManageClusters = () => {
    const queryClient = useQueryClient();

    const createCluster = useMutation({
        mutationFn: async (name: string) => {
            const { data, error } = await supabase
                .from('clusters')
                .insert({ name })
                .select()
                .single();
            if (error) throw new Error(error.message);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clusters'] });
        }
    });

    const deleteCluster = useMutation({
        mutationFn: async (clusterId: string) => {
            const { error } = await supabase
                .from('clusters')
                .delete()
                .eq('id', clusterId);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clusters'] });
        }
    });

    const linkAccounts = useMutation({
        mutationFn: async ({ clusterId, accountIds }: { clusterId: string; accountIds: string[] }) => {
            const { error: delError } = await supabase
                .from('cluster_accounts')
                .delete()
                .eq('cluster_id', clusterId);
            if (delError) throw new Error(delError.message);

            if (accountIds.length > 0) {
                const inserts = accountIds.map(accountId => ({ cluster_id: clusterId, account_id: accountId }));
                const { error } = await supabase.from('cluster_accounts').insert(inserts);
                if (error) throw new Error(error.message);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['cluster_accounts', variables.clusterId] });
        }
    });

    return { createCluster, deleteCluster, linkAccounts };
};
