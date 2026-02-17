import { supabase } from './supabaseClient';
import { UserProfile, UserFormData } from '../types';

const TABLE_USERS = 'perfil_acesso';
const TABLE_ACCESS = 'user_accounts_access';

/**
 * Sync user_accounts_access table with the assigned_account_ids array.
 * The RPC get_user_assigned_accounts reads from user_accounts_access for clients,
 * so this table MUST stay in sync with perfil_acesso.assigned_account_ids.
 */
const syncAccountAccess = async (userEmail: string, accountIds: string[]): Promise<void> => {
  // 1. Delete existing rows for this user
  const { error: delError } = await supabase
    .from(TABLE_ACCESS)
    .delete()
    .eq('user_email', userEmail);

  if (delError) {
    console.error('Error clearing user_accounts_access:', delError);
  }

  // 2. Insert new rows
  if (accountIds.length > 0) {
    const rows = accountIds.map(id => ({ user_email: userEmail, account_id: id }));
    const { error: insError } = await supabase
      .from(TABLE_ACCESS)
      .insert(rows);

    if (insError) {
      console.error('Error syncing user_accounts_access:', insError);
    }
  }
};

export const fetchUsers = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from(TABLE_USERS)
    .select('id, email, nome, role, assigned_account_ids, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    email: row.email,
    name: row.nome,
    role: row.role,
    assigned_account_ids: row.assigned_account_ids || [],
    created_at: row.created_at,
  })) as UserProfile[];
};

export const createUser = async (userData: UserFormData): Promise<UserProfile | null> => {
  const payload = {
    email: userData.email,
    nome: userData.name,
    role: userData.role,              // 'admin' ou 'client'
    password: userData.password,      // texto simples, você controla
    assigned_account_ids: userData.assigned_account_ids || [],
  };

  const { data, error } = await supabase
    .from(TABLE_USERS)
    .insert(payload)
    .select('id, email, nome, role, assigned_account_ids, created_at')
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw new Error(error.message || 'Erro ao criar usuário.');
  }

  // Sync user_accounts_access table
  if (userData.role === 'client' && payload.assigned_account_ids.length > 0) {
    await syncAccountAccess(data.email, payload.assigned_account_ids);
  }

  return {
    id: data.id,
    email: data.email,
    name: data.nome,
    role: data.role,
    assigned_account_ids: data.assigned_account_ids || [],
    created_at: data.created_at,
  } as UserProfile;
};

export const updateUser = async (id: string, updates: Partial<UserFormData>): Promise<UserProfile | null> => {
  const payload: any = {
    nome: updates.name,
    role: updates.role,
    assigned_account_ids: updates.assigned_account_ids || [],
  };

  const { data, error } = await supabase
    .from(TABLE_USERS)
    .update(payload)
    .eq('id', id)
    .select('id, email, nome, role, assigned_account_ids, created_at')
    .single();

  if (error) {
    console.error('Error updating user:', error);
    throw new Error(error.message || 'Erro ao atualizar usuário.');
  }

  // Sync user_accounts_access table
  await syncAccountAccess(data.email, payload.assigned_account_ids || []);

  return {
    id: data.id,
    email: data.email,
    name: data.nome,
    role: data.role,
    assigned_account_ids: data.assigned_account_ids || [],
    created_at: data.created_at,
  } as UserProfile;
};

export const deleteUser = async (id: string) => {
  // First get user email to clean up user_accounts_access
  const { data: userData } = await supabase
    .from(TABLE_USERS)
    .select('email')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from(TABLE_USERS)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting user:', error);
    throw new Error(error.message || 'Erro ao excluir usuário.');
  }

  // Clean up user_accounts_access
  if (userData?.email) {
    await syncAccountAccess(userData.email, []);
  }
};

export const resetUserPassword = async (userId: string, newPassword: string) => {
  const { error } = await supabase
    .from(TABLE_USERS)
    .update({ password: newPassword })
    .eq('id', userId);

  if (error) {
    console.error('Falha ao redefinir senha:', error);
    throw new Error(error.message || 'Falha ao redefinir senha.');
  }
  return true;
};
