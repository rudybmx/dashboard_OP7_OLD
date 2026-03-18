import { useMemo } from 'react';
import { UserProfile, ResolvedMetaAccount, ModuleAccessLevel, ModulePermission } from './types';

interface UseUserAccessReturn {
    // Flags de role
    isSuperAdmin: boolean;
    isAdmin: boolean;
    isManager: boolean;
    isClient: boolean;
    isViewer: boolean;

    // Permissões globais
    canManageUsers: boolean;
    canExportData: boolean;
    canViewSettings: boolean;
    canViewFinancials: boolean;

    // Contas acessíveis
    allowedAccountIds: string[];

    // Módulos
    modulePermissions: ModulePermission[];

    /** Retorna o nível de acesso do usuário a um módulo específico */
    getModuleAccess: (moduleId: string) => ModuleAccessLevel;

    /** True se o usuário tem acesso >= 'read' ao módulo */
    canAccessModule: (moduleId: string) => boolean;

    /** True se o usuário tem acesso >= 'write' ao módulo */
    canWriteModule: (moduleId: string) => boolean;

    /** True se o usuário tem acesso 'admin' ao módulo */
    isModuleAdmin: (moduleId: string) => boolean;

    /** Lista de rotas de hash que o usuário pode acessar */
    allowedRoutes: string[];

    // Helper de filtragem de contas
    filterAccountsByAccess: (allAccounts: ResolvedMetaAccount[]) => ResolvedMetaAccount[];
}

const ACCESS_ORDER: Record<ModuleAccessLevel, number> = {
    none: 0,
    read: 1,
    write: 2,
    admin: 3,
};

export const useUserAccess = (userProfile: UserProfile | null): UseUserAccessReturn => {
    return useMemo(() => {
        const role = userProfile?.role;
        const perms = userProfile?.permissions;
        const modulePermissions = userProfile?.module_permissions ?? [];

        const isSuperAdmin = role === 'superadmin';
        const isAdmin = isSuperAdmin || role === 'admin';
        const isManager = isAdmin || role === 'manager';
        const isClient = role === 'client';
        const isViewer = role === 'viewer';

        const canManageUsers = isSuperAdmin || !!perms?.canManageUsers;
        const canExportData = isManager || !!perms?.canExportData;
        const canViewSettings = isAdmin || !!perms?.canEditSettings;
        const canViewFinancials = isManager || !!perms?.canViewFinancials;

        const allowedAccountIds = userProfile?.assigned_account_ids ?? [];

        // --- Módulos ---
        const moduleMap = new Map<string, ModuleAccessLevel>(
            modulePermissions.map(m => [m.module_id, m.access_level])
        );

        const getModuleAccess = (moduleId: string): ModuleAccessLevel => {
            return moduleMap.get(moduleId) ?? 'none';
        };

        const canAccessModule = (moduleId: string): boolean =>
            ACCESS_ORDER[getModuleAccess(moduleId)] >= ACCESS_ORDER['read'];

        const canWriteModule = (moduleId: string): boolean =>
            ACCESS_ORDER[getModuleAccess(moduleId)] >= ACCESS_ORDER['write'];

        const isModuleAdmin = (moduleId: string): boolean =>
            getModuleAccess(moduleId) === 'admin';

        // Rotas acessíveis = módulos com acesso >= read, extraindo o route
        const allowedRoutes = modulePermissions
            .filter(m => ACCESS_ORDER[m.access_level] >= ACCESS_ORDER['read'])
            .map(m => m.route)
            .filter(Boolean);

        // --- Filtragem de contas ---
        const filterAccountsByAccess = (allAccounts: ResolvedMetaAccount[]) => {
            if (!userProfile) return [];
            if (isAdmin) return allAccounts.filter(acc => acc.client_visibility !== false);
            return allAccounts.filter(acc =>
                (allowedAccountIds.includes(acc.id) || allowedAccountIds.includes(acc.account_id))
                && acc.client_visibility !== false
            );
        };

        return {
            isSuperAdmin,
            isAdmin,
            isManager,
            isClient,
            isViewer,
            canManageUsers,
            canExportData,
            canViewSettings,
            canViewFinancials,
            allowedAccountIds,
            modulePermissions,
            getModuleAccess,
            canAccessModule,
            canWriteModule,
            isModuleAdmin,
            allowedRoutes,
            filterAccountsByAccess,
        };
    }, [userProfile]);
};
