import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Search, 
  User, 
  Shield, 
  Mail, 
  Store, 
  LayoutList,
  Edit,
  X,
  Check,
  AlertCircle,
  Loader2,
  Lock
} from 'lucide-react';
import * as userService from '../services/userService';
import { UserProfile, UserFormData, UserRole } from '../types';
import { useSettingsData } from '../context/SettingsDataContext';

export const UsersSettingsTab: React.FC = () => {
    // Data from Context
    const { 
        users, 
        setUsers,
        accounts,
        usersLoading: loading,
        isDataLoaded,
        refreshUsers
    } = useSettingsData();

    // Filter/UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [accountSearchTerm, setAccountSearchTerm] = useState(''); // New state for account filter
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordResetData, setPasswordResetData] = useState({ userId: '', newPassword: '' });

    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form State
    const initialFormState: UserFormData = {
        name: '',
        email: '',
        role: 'client',
        assigned_account_ids: [],
        password: ''
    };
    const [formData, setFormData] = useState<UserFormData>(initialFormState);
    const [isEditing, setIsEditing] = useState(false);

    const handleOpenModal = (user?: UserProfile) => {
        if (user) {
            setFormData({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                assigned_account_ids: user.assigned_account_ids || [],
                password: '' // Don't fill password on edit
            });
            setIsEditing(true);
        } else {
            setFormData(initialFormState);
            setIsEditing(false);
        }
        setIsModalOpen(true);
        setFeedback(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setFeedback(null);

        try {
            if (isEditing && formData.id) {
                const updated = await userService.updateUser(formData.id, formData);
                if (updated) {
                    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
                    setFeedback({ type: 'success', text: 'Usuário atualizado com sucesso!' });
                }
            } else {
                if (!formData.password) throw new Error("Senha é obrigatória para novos usuários.");
                
                // Validação de Conta para Cliente
                if (formData.role === 'client' && (!formData.assigned_account_ids || formData.assigned_account_ids.length === 0)) {
                    throw new Error('Selecione pelo menos uma conta permitida para este usuário.');
                }

                const created = await userService.createUser(formData);
                if (created) {
                    setUsers(prev => [created, ...prev]);
                    setFeedback({ type: 'success', text: 'Usuário criado com sucesso!' });
                    setFormData(initialFormState); // Reset form only on create success
                }
            }
            
            setTimeout(() => {
                setIsModalOpen(false);
                setFeedback(null);
            }, 1500);

        } catch (err: any) {
            console.error(err);
            setFeedback({ type: 'error', text: err.message || 'Erro ao salvar usuário.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza? O usuário perderá o acesso imediatamente.')) return;
        
        try {
            await userService.deleteUser(id);
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch (err) {
            alert('Erro ao excluir usuário');
            refreshUsers(); // Reload on error
        }
    };

    const toggleArraySelection = (arrayName: 'assigned_account_ids', value: string, single: boolean = false) => {
        setFormData(prev => {
            const current = prev[arrayName] || [];
            
            if (single) {
                return { ...prev, [arrayName]: [value] };
            }

            if (current.includes(value)) {
                return { ...prev, [arrayName]: current.filter(id => id !== value) };
            } else {
                return { ...prev, [arrayName]: [...current, value] };
            }
        });
    };

    const handleOpenPasswordModal = (user: UserProfile) => {
        setPasswordResetData({ userId: user.id, newPassword: '' });
        setIsPasswordModalOpen(true);
        setFeedback(null);
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setFeedback(null);

        try {
            await userService.resetUserPassword(passwordResetData.userId, passwordResetData.newPassword);
            setFeedback({ type: 'success', text: 'Senha alterada com sucesso!' });
            
            setTimeout(() => {
                setIsPasswordModalOpen(false);
                setFeedback(null);
                setPasswordResetData({ userId: '', newPassword: '' });
            }, 1500);

        } catch (err: any) {
             setFeedback({ type: 'error', text: err.message });
        } finally {
             setSubmitting(false);
        }
    };

    const filteredUsers = users.filter(u => 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRoleBadge = (role: UserRole) => {
        switch(role) {
            case 'admin': return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-bold border border-purple-200">Admin</span>;
            case 'client': return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-bold border border-orange-200">Cliente / Franqueado</span>;
            default: return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-bold">User</span>;
        }
    };

    const getAccessSummary = (user: UserProfile) => {
        if (user.role === 'admin') {
            return <span className="text-slate-400 italic text-xs">Acesso Total</span>;
        }
        const count = user.assigned_account_ids?.length || 0;
        if (count === 0) return <span className="text-red-400 text-xs">Sem contas vinculadas</span>;
        return <span className="text-slate-600 text-xs">{count} Conta(s) de Anúncio</span>;
    };


    if (loading && !isDataLoaded) {
        return <div className="flex h-64 items-center justify-center text-indigo-600"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                <div>
                   <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                       <Shield className="text-indigo-600" />
                       Gerenciamento de Usuários
                   </h1>
                   <p className="text-slate-500 text-sm">Controle de acesso (RBAC) e permissões do sistema.</p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative group flex-1 md:w-64">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                         <input 
                            type="text" 
                            placeholder="Buscar nome ou email..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                         />
                    </div>
                    <button 
                        onClick={() => handleOpenModal()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Novo Usuário</span>
                    </button>
                </div>
            </div>

            {/* User List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuário</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cargo</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acesso / Restrição</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredUsers.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-400">Nenhum usuário encontrado.</td></tr>
                        ) : (
                            filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border-2 border-white shadow-sm">
                                                {user.name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm">{user.name}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Mail size={10} /> {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getRoleBadge(user.role)}
                                    </td>
                                    <td className="px-6 py-4">
                                        {getAccessSummary(user)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleOpenPasswordModal(user)}
                                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                title="Trocar Senha"
                                            >
                                                <Lock size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleOpenModal(user)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                title="Editar"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(user.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <User className="text-indigo-600" size={20} />
                                {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
                            </h3>
                            <button onClick={() => { setIsModalOpen(false); setAccountSearchTerm(''); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[80vh]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                                        <input 
                                            required 
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                                            value={formData.name}
                                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Ex: João Silva"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email de Acesso</label>
                                        <input 
                                            required 
                                            type="email"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                                            value={formData.email}
                                            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                            placeholder="Ex: joao@email.com"
                                        />
                                    </div>
                                    {!isEditing && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha Provisória</label>
                                            <input 
                                                required={!isEditing}
                                                type="password"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                                                value={formData.password}
                                                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    {/* Simplified Role Select */}
                                     <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nível de Acesso (Role)</label>
                                        <select 
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm bg-white"
                                            value={formData.role}
                                            onChange={e => setFormData(prev => ({ 
                                                ...prev, 
                                                role: e.target.value as UserRole, 
                                                assigned_account_ids: [] 
                                            }))}
                                        >
                                            <option value="client">Cliente / Franqueado (Contas Específicas)</option>
                                            <option value="admin">Administrador (Acesso Total)</option>
                                        </select>
                                    </div>

                                    {/* Conditional Account Select for Clients */}
                                    {formData.role === 'client' && (
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-64 flex flex-col">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-xs font-bold text-indigo-600 uppercase flex items-center gap-1">
                                                    <LayoutList size={14} /> Contas Permitidas
                                                </label>
                                                <div className="relative w-1/2">
                                                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input 
                                                        type="text"
                                                        placeholder="Filtrar contas..."
                                                        className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-indigo-500"
                                                        value={accountSearchTerm}
                                                        onChange={e => setAccountSearchTerm(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                                                {accounts.length === 0 ? <p className="text-xs text-slate-400">Nenhuma conta disponível.</p> : (
                                                    <div className="space-y-2">
                                                        {accounts
                                                            .filter(acc => acc.account_name.toLowerCase().includes(accountSearchTerm.toLowerCase()))
                                                            .map(acc => (
                                                            <label key={acc.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-indigo-600">
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={formData.assigned_account_ids.includes(acc.id)}
                                                                    onChange={() => toggleArraySelection('assigned_account_ids', acc.id, false)}
                                                                    className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                                                />
                                                                <span className="truncate">{acc.account_name}</span>
                                                            </label>
                                                        ))}
                                                        {accounts.filter(acc => acc.account_name.toLowerCase().includes(accountSearchTerm.toLowerCase())).length === 0 && (
                                                            <p className="text-xs text-slate-400 py-2 text-center">Nenhuma conta encontrada para "{accountSearchTerm}"</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Feedback Message */}
                            {feedback && (
                                <div className={`mb-4 p-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2 ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                    {feedback.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                                    {feedback.text}
                                </div>
                            )}

                            {/* Footer */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button 
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold text-sm transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-70 disabled:shadow-none"
                                >
                                    {submitting && <Loader2 size={16} className="animate-spin" />}
                                    {isEditing ? 'Salvar Alterações' : 'Criar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Password Reset Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Lock className="text-amber-600" size={20} />
                                Redefinir Senha
                            </h3>
                            <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handlePasswordReset} className="p-6">
                            <div className="mb-6">
                                <p className="text-sm text-slate-500 mb-4">
                                    Digite a nova senha para o usuário. Esta ação não pode ser desfeita.
                                </p>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nova Senha</label>
                                <input 
                                    required 
                                    type="password"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-sm"
                                    value={passwordResetData.newPassword}
                                    onChange={e => setPasswordResetData(prev => ({ ...prev, newPassword: e.target.value }))}
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                            </div>

                            {feedback && (
                                <div className={`mb-4 p-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2 ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                    {feedback.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                                    {feedback.text}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button 
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => setIsPasswordModalOpen(false)}
                                    className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold text-sm transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-lg shadow-amber-500/20 font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-70 disabled:shadow-none"
                                >
                                    {submitting && <Loader2 size={16} className="animate-spin" />}
                                    Salvar Nova Senha
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};
