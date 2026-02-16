export type UserRole = 'admin' | 'client';

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    assigned_account_ids: string[];   // IDs das contas Meta
    permissions?: string[];
    created_at?: string;
}

export interface ResolvedFranchise {
    id: string;
    name: string;
    active: boolean;
}

export interface ResolvedMetaAccount {
    id: string; // account_id
    account_id: string;
    account_name: string;
    display_name?: string;
    franchise_id: string | null;    // UUID da franquia
    franchise_name: string;         // Nome da franquia (para display)
    current_balance: number;
    status: 'active' | 'removed' | 'disabled';
    client_visibility: boolean;
}

export interface LocalSession {
    userId: string;
    email: string;
    createdAt: string;
}
