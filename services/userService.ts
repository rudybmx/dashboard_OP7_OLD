import { supabase } from './supabaseClient';
import { UserProfile, UserFormData } from '../types';

const TABLE_USERS = 'perfil_acesso';

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
  const { error } = await supabase
    .from(TABLE_USERS)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting user:', error);
    throw new Error(error.message || 'Erro ao excluir usuário.');
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
