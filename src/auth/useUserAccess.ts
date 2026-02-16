import { useMemo } from 'react';
import { UserProfile, ResolvedFranchise, ResolvedMetaAccount } from './types';

interface UseUserAccessReturn {
    // Permissões
    isAdmin: boolean;
    isClient: boolean;

    // Contas que o usuário pode ver
    allowedAccountIds: string[];       // IDs das contas Meta

    // Helpers de filtragem
    filterAccountsByAccess: (allAccounts: ResolvedMetaAccount[]) => ResolvedMetaAccount[];
}

export const useUserAccess = (userProfile: UserProfile | null): UseUserAccessReturn => {
    return useMemo(() => {
        const isAdmin = userProfile?.role === 'admin';
        const isClient = userProfile?.role === 'client';

        // IDs de contas permitidos
        const allowedAccountIds = userProfile?.assigned_account_ids || [];

        const filterAccountsByAccess = (allAccounts: ResolvedMetaAccount[]) => {
            if (!userProfile) return [];
            if (isAdmin) return allAccounts;

            return allAccounts.filter(acc => {
                // Checar se a conta está explicitamente permitida
                if (allowedAccountIds.includes(acc.id) || allowedAccountIds.includes(acc.account_id)) return true;
                return false;
            });
        };

        return {
            isAdmin,
            isClient,
            allowedAccountIds,
            filterAccountsByAccess
        };
    }, [userProfile]);
};
