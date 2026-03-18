import React, { useState } from 'react';
import { BMSettingsTab } from './BMSettingsTab';
import { UsersSettingsTab } from './UsersSettingsTab';
import { CategoriesSettingsTab } from './CategoriesSettingsTab';
import { PlanningTableView } from './PlanningTableView';
import { AccountGroupsTab } from '../src/features/cluster-management/ui/AccountGroupsTab';
import { SettingsDataProvider } from '../context/SettingsDataContext';
import { LayoutList, Store, Shield, Tags, Folder } from 'lucide-react';

export const SettingsView: React.FC<{ userRole?: string }> = ({ userRole }) => {
    // Legacy hook removed to fix duplicate auth state bug
    // const { canManageUsers } = useAuth();

    // Derive permission directly from passed prop (Single Source of Truth)
    const canManageUsers = userRole === 'admin';
    const [activeTab, setActiveTab] = useState<'accounts' | 'franchises' | 'users' | 'categories' | 'groups'>('accounts');

    // Security Guard using useEffect pattern for client-side protection
    React.useEffect(() => {
        if (activeTab === 'users' && !canManageUsers) {
            setActiveTab('accounts'); // Redirect to safe tab
            // console.warn("Acesso negado a aba de usuários");
        }
    }, [activeTab, canManageUsers]);

    return (
        <SettingsDataProvider>
            <div className="flex flex-col h-full">

                {/* Tabs Header */}
                <div className="bg-white border-b border-slate-200 px-8 pt-6">
                    <div className="flex items-center gap-8">
                        <button
                            onClick={() => setActiveTab('accounts')}
                            className={`
                                pb-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-all
                                ${activeTab === 'accounts'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                            `}
                        >
                            <LayoutList size={18} />
                            Contas de Anúncio
                        </button>



                        <button
                            onClick={() => setActiveTab('categories')}
                            className={`
                                pb-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-all
                                ${activeTab === 'categories'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                            `}
                        >
                            <Tags size={18} />
                            Cadastro Categorias
                        </button>

                        <button
                            onClick={() => setActiveTab('groups')}
                            className={`
                                pb-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-all
                                ${activeTab === 'groups'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                            `}
                        >
                            <Folder size={18} />
                            Grupos de Contas
                        </button>

                        {canManageUsers && (
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`
                                    pb-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-all
                                    ${activeTab === 'users'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                                `}
                            >
                                <Shield size={18} />
                                Usuários e Acesso
                            </button>
                        )}
                    </div>
                </div>

                {/* Tab Content - Keep all tabs mounted to preserve cache */}
                <div className="flex-1 bg-slate-50 overflow-auto p-8">
                    <div style={{ display: activeTab === 'accounts' ? 'block' : 'none' }}>
                        <BMSettingsTab />
                    </div>

                    <div style={{ display: activeTab === 'categories' ? 'block' : 'none' }}>
                        <CategoriesSettingsTab />
                    </div>
                    <div style={{ display: activeTab === 'groups' ? 'block' : 'none' }}>
                        <AccountGroupsTab />
                    </div>

                    {canManageUsers && (
                        <div style={{ display: activeTab === 'users' ? 'block' : 'none' }}>
                            <UsersSettingsTab />
                        </div>
                    )}
                </div>

            </div>
        </SettingsDataProvider>
    );
};

export default SettingsView;
