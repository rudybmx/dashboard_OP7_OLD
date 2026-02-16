import { useState, useEffect } from 'react';
import { fetchMetaAccounts } from '../services/supabaseService';
import { MetaAdAccount } from '../types';

export function useAvailableBalance(accountIds: string[] | undefined) {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    
    async function load() {
      // If accountIds is empty array -> it usually implies "No Access" OR "All Access" depending on context.
      // But typically if accountIds is passed as [], and we are a Client, it means No Access.
      // If Admin, they might pass specific IDs or none.
      // Implementation: Check `accountIds`.
      // If accountIds is undefined: Do nothing or fetch all? 
      // Safe default: 0 if no accounts provided?
      
      // But wait: Admin "All Accounts" sends ALL visible account IDs?
      // In App.tsx, we pass `allowedAccountIds` (for client) or `filteredAccounts` (for admin).
      // Let's assume accountIds contains the list of *effective* account IDs to sum.
      
      if (!accountIds || accountIds.length === 0) {
        if (mounted) {
            setBalance(0);
            setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        // Optimization: We could fetch relevant accounts only, but existing fetchMetaAccounts fetches all.
        // We'll filter client-side.
        const allAccounts = await fetchMetaAccounts();
        
        if (!mounted) return;

        const total = allAccounts
          .filter(acc => accountIds.includes(acc.account_id))
          .reduce((sum, acc) => sum + (acc.current_balance || 0), 0);

        setBalance(total);
      } catch (err) {
        console.error("Failed to load balance", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [(accountIds || []).join(',')]); // Depend on stable ID list

  return { balance, loading };
}
