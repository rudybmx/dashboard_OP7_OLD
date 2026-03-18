import React, { useState, useEffect, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    ColumnDef,
    SortingState,
    getSortedRowModel
} from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';
import {
    Search,
    Filter,
    Eye,
    EyeOff,
    Link as LinkIcon,
    RefreshCw,
    ArrowUpDown,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import * as supabaseService from '../services/supabaseService';
import { MetaAdAccount, Franchise } from '../types';
import { useSettingsData } from '../context/SettingsDataContext';

const BMSettingsTabComponent: React.FC = () => {
    const {
        accounts: data,
        franchises,
        categories,
        setAccounts: setData,
        isLoading: loading,
        isDataLoaded
    } = useSettingsData();

    const queryClient = useQueryClient();

    const [globalFilter, setGlobalFilter] = useState('');
    const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
    const [metaStatusFilter, setMetaStatusFilter] = useState<'all' | 'ACTIVE' | 'DISABLED' | 'PENDING' | 'REMOVED'>('all');
    const [franchiseFilter, setFranchiseFilter] = useState<string>('all');
    const [sorting, setSorting] = useState<SortingState>([]);

    const [pendingUpdates, setPendingUpdates] = useState<Record<string, Partial<MetaAdAccount>>>({});
    const isDirty = Object.keys(pendingUpdates).length > 0;
    const [isSaving, setIsSaving] = useState(false);

    // Local change handler (batches updates)
    const handleLocalChange = (id: string, field: keyof MetaAdAccount, value: any) => {
        setPendingUpdates(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            const promises = Object.entries(pendingUpdates).map(([id, updates]) =>
                supabaseService.updateMetaAccount(id, updates)
            );

            await Promise.all(promises);

            // Actualizar dados locais após sucesso
            setData(prev => prev.map(row => {
                if (pendingUpdates[row.id]) {
                    return { ...row, ...pendingUpdates[row.id] };
                }
                return row;
            }));

            // Invalidate React Query cache to refresh data in App.tsx / Dashboard filters
            queryClient.invalidateQueries({ queryKey: ['metaAccounts'] });

            setPendingUpdates({});
            alert('Alterações salvas com sucesso!'); // Using alert for simplicity as requested/toast not setup
        } catch (err) {
            console.error("Falha ao salvar em lote", err);
            alert('Erro ao salvar algumas alterações. Verifique o console.');
        } finally {
            setIsSaving(false);
        }
    };

    // Helper to get current displayed value (Local pending > Original)
    const getValue = (row: MetaAdAccount, field: keyof MetaAdAccount) => {
        if (pendingUpdates[row.id] && pendingUpdates[row.id][field] !== undefined) {
            return pendingUpdates[row.id][field];
        }
        return row[field];
    }

    // Define meta type locally or use module augmentation if strict typing is needed across files
    // For now we cast inside the cell
    
    // Columns Definition
    const columns = useMemo<ColumnDef<MetaAdAccount>[]>(() => [
        {
            id: 'status_dot',
            accessorKey: 'status',
            header: '',
            size: 30,
            cell: ({ row }) => (
                <div className="flex justify-center">
                    {row.original.status === 'active' ? (
                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" title="Active"></div>
                    ) : (
                        <div className="h-2 w-2 rounded-full bg-slate-300" title="Removed"></div>
                    )}
                </div>
            )
        },
        {
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 hover:text-slate-700 transition-colors uppercase"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Conta de Anúncio
                    {column.getIsSorted() === "asc" ? <ArrowUp size={12} /> : column.getIsSorted() === "desc" ? <ArrowDown size={12} /> : <ArrowUpDown size={12} />}
                </button>
            ),
            accessorKey: 'account_name',
            cell: ({ row, table }) => {
                const meta = table.options.meta as any;
                const pendingUpdates = meta?.pendingUpdates || {};
                
                return (
                    <div className="flex flex-col leading-tight max-w-[200px]">
                        <span className="font-semibold text-slate-700 text-xs truncate" title={row.original.account_name}>{row.original.account_name}</span>
                        <span className="font-mono text-[9px] text-slate-400">{row.original.account_id}</span>
                        {pendingUpdates[row.original.id] && <span className="text-[9px] text-amber-600 font-bold">Editado</span>}
                    </div>
                )
            }
        },
        {
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 hover:text-slate-700 transition-colors uppercase"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Nome Dashboard
                    {column.getIsSorted() === "asc" ? <ArrowUp size={12} /> : column.getIsSorted() === "desc" ? <ArrowDown size={12} /> : <ArrowUpDown size={12} />}
                </button>
            ),
            accessorKey: 'display_name',
            cell: ({ row, table }) => {
                const meta = table.options.meta as any;
                const pendingUpdates = meta?.pendingUpdates || {};
                const handleLocalChange = meta?.handleLocalChange;

                // display_name do RPC = COALESCE(nome_ajustado, nome_original).
                // Se for igual ao account_name, não há nome ajustado → mostrar vazio com placeholder.
                const hasCustomName = row.original.display_name &&
                    row.original.display_name !== row.original.account_name;
                const val = (pendingUpdates[row.original.id] && pendingUpdates[row.original.id].display_name !== undefined)
                    ? pendingUpdates[row.original.id].display_name
                    : (hasCustomName ? row.original.display_name : '');

                return (
                    <input
                        className={`w-full max-w-[180px] bg-transparent border-b hover:border-slate-300 focus:border-indigo-500 focus:outline-none text-xs py-1 transition-colors pl-0 placeholder:text-slate-300 font-medium ${pendingUpdates[row.original.id]?.display_name !== undefined ? 'border-amber-400 bg-amber-50' : 'border-transparent'}`}
                        value={val as string}
                        onChange={e => handleLocalChange(row.original.id, 'display_name', e.target.value)}
                        placeholder={row.original.account_name}
                    />
                );
            }
        },

        {
            header: 'Categoria',
            accessorKey: 'categoria_id',
            cell: ({ row, table }) => {
                const meta = table.options.meta as any;
                const pendingUpdates = meta?.pendingUpdates || {};
                const handleLocalChange = meta?.handleLocalChange;

                const val = (pendingUpdates[row.original.id] && pendingUpdates[row.original.id].categoria_id !== undefined)
                    ? pendingUpdates[row.original.id].categoria_id
                    : (row.original.categoria_id || '');

                return (
                    <div className="relative w-[160px]">
                        <select
                            className={`
                        appearance-none w-full bg-slate-50 border text-slate-700 py-1 pl-2 pr-6 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all
                        ${!val ? 'text-slate-400 italic' : ''}
                        ${pendingUpdates[row.original.id]?.categoria_id !== undefined ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}
                    `}
                            value={val as string}
                            onChange={(e) => handleLocalChange(row.original.id, 'categoria_id', e.target.value || null)}
                        >
                            <option value="">-- Sem Categoria --</option>
                            {categories.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.nome_categoria}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-slate-500">
                            <Filter size={10} />
                        </div>
                    </div>
                )
            }
        },
        {
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 hover:text-slate-700 transition-colors uppercase"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Visibilidade
                    {column.getIsSorted() === "asc" ? <ArrowUp size={12} /> : column.getIsSorted() === "desc" ? <ArrowDown size={12} /> : <ArrowUpDown size={12} />}
                </button>
            ),
            accessorKey: 'client_visibility',
            cell: ({ row, table }) => {
                const meta = table.options.meta as any;
                const pendingUpdates = meta?.pendingUpdates || {};
                const handleLocalChange = meta?.handleLocalChange;

                const isVisible = (pendingUpdates[row.original.id] && pendingUpdates[row.original.id].client_visibility !== undefined)
                    ? pendingUpdates[row.original.id].client_visibility
                    : row.original.client_visibility;
                
                const isModified = pendingUpdates[row.original.id]?.client_visibility !== undefined;

                return (
                    <button
                        onClick={() => handleLocalChange(row.original.id, 'client_visibility', !isVisible)}
                        className={`
                        flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold transition-all border
                        ${isVisible
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }
                        ${isModified ? 'ring-2 ring-amber-400 ring-offset-1' : ''}
                    `}
                    >
                        {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                        {isVisible ? 'Visível' : 'Oculto'}
                    </button>
                )
            }
        },
        {
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 hover:text-slate-700 transition-colors uppercase"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Saldo
                    {column.getIsSorted() === "asc" ? <ArrowUp size={12} /> : column.getIsSorted() === "desc" ? <ArrowDown size={12} /> : <ArrowUpDown size={12} />}
                </button>
            ),
            accessorKey: 'current_balance',
            cell: ({ row }) => (
                <div className={`font-mono text-xs font-bold ${row.original.current_balance < 100 ? 'text-red-500' : 'text-slate-700'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.original.current_balance)}
                </div>
            )
        },
        {
            header: 'Status Meta',
            accessorKey: 'status_meta',
            cell: ({ row }) => (
                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${row.original.status_meta === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    }`}>
                    {row.original.status_meta || 'N/A'}
                </span>
            )
        },
        {
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 hover:text-slate-700 transition-colors uppercase border-none bg-transparent"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Total Gasto
                    {column.getIsSorted() === "asc" ? <ArrowUp size={12} /> : column.getIsSorted() === "desc" ? <ArrowDown size={12} /> : <ArrowUpDown size={12} />}
                </button>
            ),
            accessorKey: 'total_gasto',
            cell: ({ row }) => (
                <span className="font-mono text-[10px] text-slate-500">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(row.original.total_gasto || 0)}
                </span>
            )
        }
    ], [franchises, categories]); // REMOVIDO: pendingUpdates para garantir estabilidade das colunas

    // Filtering Logic
    const filteredData = useMemo(() => {
        return data.filter(item => {
            // 1. Search filter
            const searchLower = globalFilter.toLowerCase();
            const matchesSearch =
                item.account_name.toLowerCase().includes(searchLower) ||
                item.account_id.toLowerCase().includes(searchLower) ||
                (item.display_name || '').toLowerCase().includes(searchLower);

            // 2. Visibility filter
            const matchesVisibility = visibilityFilter === 'all'
                ? true
                : visibilityFilter === 'visible' ? item.client_visibility : !item.client_visibility;

            // 3. Status filter
            const matchesMetaStatus = metaStatusFilter === 'all' ? true : item.status_meta === metaStatusFilter;

            // 4. Franchise filter
            let matchesFranchise = true;
            if (franchiseFilter === 'unassigned') matchesFranchise = !item.franchise_id;
            else if (franchiseFilter !== 'all') matchesFranchise = item.franchise_id === franchiseFilter;

            return matchesSearch && matchesVisibility && matchesMetaStatus && matchesFranchise;
        });
    }, [data, globalFilter, visibilityFilter, metaStatusFilter, franchiseFilter]);

    const table = useReactTable<MetaAdAccount>({
        data: filteredData,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        autoResetPageIndex: false,
        initialState: {
            pagination: {
                pageSize: 25,
            }
        },
        meta: {
            pendingUpdates,
            handleLocalChange
        }
    });

    if (loading && !isDataLoaded) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin text-indigo-600"><RefreshCw /></div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 relative">

            {/* Header & Controls */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Gestão de Contas de Anúncios</h1>
                    <div className="flex items-center gap-2">
                        <p className="text-slate-500 text-sm">Controle mestre de vinculação e visibilidade.</p>
                        {isDirty && <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">{Object.keys(pendingUpdates).length} pendente(s)</span>}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mr-2">
                        {isDirty && (
                            <button
                                onClick={() => setPendingUpdates({})}
                                className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                            >
                                Cancelar
                            </button>
                        )}
                        <button
                            onClick={handleSaveAll}
                            disabled={!isDirty || isSaving}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all border
                                ${isDirty
                                    ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5'
                                    : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                }
                            `}
                        >
                            {isSaving ? <RefreshCw className="animate-spin" size={16} /> : null}
                            {isSaving ? 'Salvando...' : isDirty ? 'Salvar Alterações' : 'Salvar'}
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-200 mx-2 hidden lg:block"></div>

                    {/* Search */}
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar Conta ou ID..."
                            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-56 transition-all shadow-sm"
                            value={globalFilter}
                            onChange={e => setGlobalFilter(e.target.value)}
                        />
                    </div>

                    {/* Franchise Filter */}
                    <div className="relative">
                        <select
                            className="pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-44 appearance-none shadow-sm text-slate-600 font-medium"
                            value={franchiseFilter}
                            onChange={e => setFranchiseFilter(e.target.value)}
                        >
                            <option value="all">Unidades: Todas</option>
                            <option value="unassigned">⚠️ Sem Vínculo</option>
                            <option disabled>──────────</option>
                            {franchises.map(f => f ? <option key={f.id} value={f.name}>{f.name}</option> : null)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                            <Filter size={14} />
                        </div>
                    </div>

                    {/* Visibility Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
                        <button
                            onClick={() => setVisibilityFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${visibilityFilter === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            TUDO
                        </button>
                        <button
                            onClick={() => setVisibilityFilter('visible')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${visibilityFilter === 'visible' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            VISÍVEL
                        </button>
                        <button
                            onClick={() => setVisibilityFilter('hidden')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${visibilityFilter === 'hidden' ? 'bg-white shadow text-slate-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            OCULTO
                        </button>
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <select
                            className="pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none shadow-sm text-slate-600 font-medium"
                            value={metaStatusFilter}
                            onChange={e => setMetaStatusFilter(e.target.value as any)}
                        >
                            <option value="all">Status: Todos</option>
                            <option value="ACTIVE">Ativo</option>
                            <option value="DISABLED">Desativado</option>
                            <option value="PENDING">Pendente</option>
                            <option value="REMOVED">Removido</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                            <Filter size={14} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Contas Filtradas</span>
                    <span className="text-2xl font-black text-slate-800">{filteredData.length}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Investimento Total</span>
                    <span className="text-2xl font-black text-indigo-600 truncate">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(filteredData.reduce((acc, curr) => acc + (curr.total_gasto || 0), 0))}
                    </span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Saldo em Caixa</span>
                    <span className="text-2xl font-black text-emerald-600 truncate">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(filteredData.reduce((acc, curr) => acc + curr.current_balance, 0))}
                    </span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Taxa de Visibilidade</span>
                    <span className="text-2xl font-black text-slate-500">
                        {filteredData.length > 0 ? Math.round((filteredData.filter(d => d.client_visibility).length / filteredData.length) * 100) : 0}%
                    </span>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1100px]">
                    <thead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id} className="bg-slate-50 border-b border-slate-200">
                                {headerGroup.headers.map(header => (
                                    <th key={header.id} className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {table.getRowModel().rows.length > 0 ? (
                            table.getRowModel().rows.map(row => (
                                <tr
                                    key={row.id}
                                    className={`group hover:bg-slate-50/80 transition-colors ${row.original.status === 'removed' ? 'opacity-50 grayscale' : ''}`}
                                >
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="px-4 py-3">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Search size={32} className="opacity-20" />
                                        <p>Nenhuma conta encontrada com os filtros atuais.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Footer / Pagination */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">
                        {table.getRowModel().rows.length} registros encontrados
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="px-4 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold disabled:opacity-50 hover:bg-slate-100 transition-colors shadow-sm"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="px-4 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold disabled:opacity-50 hover:bg-slate-100 transition-colors shadow-sm"
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};

// Export memoized version to prevent unnecessary re-renders
export const BMSettingsTab = React.memo(BMSettingsTabComponent);
