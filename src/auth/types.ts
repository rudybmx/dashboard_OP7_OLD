// ============================================================
// ROLES
// ============================================================
export type UserRole = 'superadmin' | 'admin' | 'manager' | 'client' | 'viewer';

// ============================================================
// PERMISSÕES GRANULARES (por perfil)
// ============================================================
export interface UserPermissions {
    canManageUsers?: boolean;
    canExportData?: boolean;
    canViewFinancials?: boolean;
    canEditSettings?: boolean;
}

// ============================================================
// MÓDULOS DO SISTEMA
// ============================================================
export type ModuleAccessLevel = 'none' | 'read' | 'write' | 'admin';

export interface ModulePermission {
    module_id: string;     // 'meta_ads_summary', 'planning', 'settings', etc.
    module_name: string;
    route: string;         // hash route: 'summary', 'campaigns', etc.
    icon: string;          // nome do ícone Lucide
    sort_order: number;
    access_level: ModuleAccessLevel;
}

// ============================================================
// GRUPOS DE CLIENTES (substitui Franchise)
// ============================================================
export type ClientGroupType = 'franchise' | 'brand' | 'agency' | 'region' | 'other';

export interface ClientGroup {
    id: string;
    name: string;
    description?: string;
    type: ClientGroupType;
    is_active: boolean;
    created_at?: string;
}

// ============================================================
// PERFIL DO USUÁRIO
// ============================================================
export interface UserProfile {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    is_active: boolean;
    assigned_account_ids: string[];    // contas Meta Ads acessíveis
    module_permissions: ModulePermission[]; // permissões por módulo
    permissions?: UserPermissions;     // permissões globais legadas
    created_at?: string;
}

// ============================================================
// CONTAS META ADS RESOLVIDAS
// ============================================================
export interface ResolvedMetaAccount {
    id: string;           // account_id
    account_id: string;
    account_name: string;
    display_name?: string;
    group_id?: string | null;
    group_name?: string;
    franchise_id: string | null;  // legado — usar group_id
    franchise_name: string;       // legado — usar group_name
    current_balance: number;
    status: 'active' | 'removed' | 'disabled';
    client_visibility: boolean;
}

// ============================================================
// SESSÃO LOCAL (custom auth, sem Supabase Auth)
// ============================================================
export interface LocalSession {
    userId: string;
    email: string;
    createdAt: string;
}

// ============================================================
// LEGADO — manter compatibilidade
// ============================================================
export interface ResolvedFranchise {
    id: string;
    name: string;
    active: boolean;
}
