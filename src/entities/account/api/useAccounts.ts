import { useQuery } from '@tanstack/react-query';
import { fetchMetaAccounts } from '../../../../services/supabaseService';
import { MetaAccount } from '../model/types';

async function loadAccounts(): Promise<MetaAccount[]> {
  const raw = await fetchMetaAccounts();
  return raw.map(a => ({
    account_id: a.account_id,
    account_name: a.account_name,
    display_name: a.display_name,
    franchise_id: (a as any).franchise_id || null,
    franchise_name: (a as any).franchise_name || '',
    current_balance: a.current_balance || 0,
    status: (a.status === 'removed' ? 'removed' : a.status === 'archived' ? 'disabled' : 'active') as MetaAccount['status'],
    client_visibility: a.client_visibility ?? true,
  }));
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: loadAccounts,
    staleTime: 1000 * 60 * 10,
  });
}
