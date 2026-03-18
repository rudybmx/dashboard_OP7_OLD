import React, { useState } from 'react';
import { useClusters, useManageClusters, useClusterAccounts } from '../../../entities/cluster';
import { useSettingsData } from '../../../../context/SettingsDataContext';
import { Folder, Plus, Trash2, CheckSquare, Square, Loader2 } from 'lucide-react';

export const AccountGroupsTab: React.FC = () => {
    const { data: clusters = [], isLoading: isLoadingClusters } = useClusters();
    const { createCluster, deleteCluster, linkAccounts } = useManageClusters();
    const { accounts } = useSettingsData();

    const [newGroupName, setNewGroupName] = useState('');
    const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const selectedCluster = clusters.find(c => c.id === selectedClusterId);
    const { data: clusterAccounts = [], isLoading: isLoadingAccounts } = useClusterAccounts(selectedClusterId);
    const linkedAccountIds = clusterAccounts.map(ca => ca.account_id);

    const handleToggleAccount = (accountId: string) => {
        if (!selectedClusterId) return;
        const newLinkedIds = linkedAccountIds.includes(accountId)
            ? linkedAccountIds.filter(id => id !== accountId)
            : [...linkedAccountIds, accountId];
        linkAccounts.mutate({ clusterId: selectedClusterId, accountIds: newLinkedIds });
    };

    const handleCreateCluster = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        setIsCreating(true);
        try {
            await createCluster.mutateAsync(newGroupName.trim());
            setNewGroupName('');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteCluster = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('Tem certeza que deseja deletar este grupo? Ele será removido com todas as vinculações.')) {
            await deleteCluster.mutateAsync(id);
            if (selectedClusterId === id) setSelectedClusterId(null);
        }
    };

    if (isLoadingClusters) {
        return (
            <div className="p-8 flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex h-[600px]">

                {/* Left Panel: List of Clusters */}
                <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50/50">
                    <div className="p-4 border-b border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Folder size={18} className="text-indigo-600" /> Grupos de Contas
                        </h3>
                        <form onSubmit={handleCreateCluster} className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Novo grupo..."
                                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={!newGroupName.trim() || isCreating}
                                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                            </button>
                        </form>
                    </div>

                    <div className="overflow-y-auto flex-1 p-2 space-y-1">
                        {clusters.map(cluster => (
                            <div
                                key={cluster.id}
                                onClick={() => setSelectedClusterId(cluster.id)}
                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                                    selectedClusterId === cluster.id
                                        ? 'bg-indigo-50 border-indigo-200 border'
                                        : 'hover:bg-slate-100 border border-transparent'
                                }`}
                            >
                                <span className="font-medium text-sm text-slate-700 truncate">{cluster.name}</span>
                                <button
                                    onClick={(e) => handleDeleteCluster(e, cluster.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center rounded-md transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        {clusters.length === 0 && (
                            <p className="text-xs text-slate-500 text-center py-6">Nenhum grupo criado</p>
                        )}
                    </div>
                </div>

                {/* Right Panel: Accounts Assignment */}
                <div className="flex-1 flex flex-col bg-white">
                    {selectedCluster ? (
                        <>
                            <div className="p-6 border-b border-slate-100 flex flex-col gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Contas do grupo: {selectedCluster.name}</h3>
                                    <p className="text-sm text-slate-500">Selecione as contas que pertencem a este grupo.</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome ou ID..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="flex-1 px-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    />
                                    <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium rounded-full shrink-0">
                                        {linkedAccountIds.length} contas selecionadas
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {isLoadingAccounts ? (
                                    <div className="flex items-center justify-center p-8">
                                        <Loader2 className="animate-spin text-slate-400" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {accounts
                                            .filter(a => a.status !== 'removed' && a.client_visibility !== false)
                                            .filter(a => {
                                                const search = searchTerm.toLowerCase();
                                                const name1 = (a.display_name || '').toLowerCase();
                                                const name2 = (a.account_name || '').toLowerCase();
                                                const id = (a.account_id || '').toLowerCase();
                                                return search === '' || name1.includes(search) || name2.includes(search) || id.includes(search);
                                            })
                                            .map(account => {
                                                const isLinked = linkedAccountIds.includes(account.account_id);
                                                const displayName = account.display_name?.trim() || account.account_name || 'Conta sem nome';

                                                return (
                                                    <div
                                                        key={account.account_id}
                                                        onClick={() => handleToggleAccount(account.account_id)}
                                                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                                            isLinked
                                                                ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                                                                : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <div className="mt-0.5">
                                                            {isLinked
                                                                ? <CheckSquare className="text-indigo-600" size={18} />
                                                                : <Square className="text-slate-300" size={18} />
                                                            }
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className={`text-sm font-medium line-clamp-2 leading-tight ${isLinked ? 'text-indigo-900' : 'text-slate-700'}`} title={displayName}>
                                                                {displayName}
                                                            </p>
                                                            <p className="text-xs text-slate-400 font-mono mt-1 break-all">{account.account_id}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-3">
                            <Folder size={48} className="text-slate-200" />
                            <p>Selecione ou crie um grupo ao lado</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
