import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { ChevronDown, Search, CheckSquare, Square, Monitor, Layers } from 'lucide-react';
import { useFilters } from '../src/features/filters';
import { useClusters, useClusterAccounts } from '../src/entities/cluster';

interface DashboardHeaderProps {
  title: string;
  metaAccounts: any[];
  userRole?: string;
  assignedAccountIds?: string[];
}

// Simple dropdown with search + multi-select for account selection
const UnitsDropdown: React.FC<{
  accounts: { value: string; label: string }[];
  selectedAccounts: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
}> = ({ accounts, selectedAccounts, onToggle, onSelectAll }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(
    () =>
      accounts.filter(
        a =>
          !search ||
          a.label.toLowerCase().includes(search.toLowerCase()) ||
          a.value.toLowerCase().includes(search.toLowerCase())
      ),
    [accounts, search]
  );

  const allSelected = selectedAccounts.length === 0;
  const label =
    allSelected
      ? `Todas as contas (${accounts.length})`
      : selectedAccounts.length === 1
      ? accounts.find(a => a.value === selectedAccounts[0])?.label || '1 conta'
      : `${selectedAccounts.length} contas`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors min-w-[200px] justify-between ${
          !allSelected
            ? 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600'
            : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400'
        }`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-slate-100">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Buscar unidade ou ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
              />
            </div>
          </div>

          {/* "All accounts" option */}
          <div className="flex items-center border-b border-slate-100">
            <div
              onClick={() => { onSelectAll(); setOpen(false); }}
              className={`flex-1 flex items-center gap-3 px-4 py-3 cursor-pointer text-sm font-semibold ${
                allSelected ? 'bg-orange-500 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {allSelected && <span className="text-white">✓</span>}
              <span>Todas as contas ({accounts.length})</span>
            </div>
            {!allSelected && (
              <button
                onClick={(e) => { e.stopPropagation(); onSelectAll(); }}
                className="px-4 py-3 text-xs font-bold text-orange-500 hover:bg-orange-50 transition-colors uppercase border-l border-slate-100"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Account list */}
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">Nenhuma conta encontrada</p>
            )}
            <div className="px-2 py-1 text-[10px] text-slate-400 uppercase tracking-wide font-semibold">
              Contas de Anúncio
            </div>
            {filtered.map(acc => {
              const isSelected = selectedAccounts.includes(acc.value);
              return (
                <div
                  key={acc.value}
                  onClick={() => onToggle(acc.value)}
                  className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-slate-50 ${
                    isSelected ? 'bg-indigo-50/40' : ''
                  }`}
                >
                  {isSelected
                    ? <CheckSquare size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                    : <Square size={16} className="text-slate-300 mt-0.5 shrink-0" />
                  }
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{acc.label}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{acc.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Simple single-select dropdown
const SimpleDropdown: React.FC<{
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
}> = ({ options, value, onChange, icon }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const label = options.find(o => o.value === value)?.label || options[0]?.label || '';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:border-indigo-400 transition-colors"
      >
        {icon}
        <span>{label}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 min-w-[180px] py-1 overflow-hidden">
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-slate-50 ${
                value === opt.value ? 'font-semibold text-indigo-600 bg-indigo-50' : 'text-slate-700'
              }`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  metaAccounts,
  userRole,
  assignedAccountIds,
}) => {
  const {
    selectedAccounts,
    setSelectedAccounts,
    selectedCluster,
    setSelectedCluster,
    selectedPlatform,
    setSelectedPlatform,
    dateRange,
    setDateRange,
  } = useFilters();

  const { data: clusters = [] } = useClusters();
  const { data: clusterAccountList = [] } = useClusterAccounts(
    selectedCluster !== 'ALL' ? selectedCluster : null
  );

  // RBAC-filtered visible accounts
  const visibleAccounts = useMemo(() => {
    let filtered = (metaAccounts || []).filter(a => a.client_visibility === true);

    const isAdmin = userRole === 'admin' || userRole === 'executive' || userRole === 'superadmin';
    if (!isAdmin && assignedAccountIds && assignedAccountIds.length > 0) {
      filtered = filtered.filter(acc => {
        const norm = acc.account_id.replace(/^act_/i, '');
        return assignedAccountIds.some(id => {
          const normId = id.replace(/^act_/i, '');
          return norm === normId || acc.account_id === id;
        });
      });
    }

    return filtered
      .map(acc => ({
        value: acc.account_id,
        label: acc.display_name?.trim() || acc.account_name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [metaAccounts, userRole, assignedAccountIds]);

  // Accounts filtered by selected cluster
  const accountsInCluster = useMemo(() => {
    if (selectedCluster === 'ALL') return visibleAccounts;
    const clusterIds = new Set(clusterAccountList.map(ca => ca.account_id));
    return visibleAccounts.filter(a => clusterIds.has(a.value));
  }, [visibleAccounts, selectedCluster, clusterAccountList]);

  const platformOptions = [
    { value: 'ALL', label: 'Todas as Redes' },
    { value: 'META', label: 'Meta Ads' },
  ];

  const clusterOptions = [
    { value: 'ALL', label: 'Todas as Contas' },
    ...clusters.map(c => ({ value: c.id, label: c.name })),
  ];

  const handleToggleAccount = (id: string) => {
    setSelectedAccounts(
      selectedAccounts.includes(id)
        ? selectedAccounts.filter(a => a !== id)
        : [...selectedAccounts, id]
    );
  };

  return (
    <div className="flex h-20 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm z-50 relative">
      {/* Left: Page Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-sm text-slate-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          Dados atualizados
        </p>
      </div>

      {/* Right: Filters */}
      <div className="flex items-center gap-3">
        {/* Platform */}
        <SimpleDropdown
          options={platformOptions}
          value={selectedPlatform}
          onChange={setSelectedPlatform}
          icon={<Monitor size={14} className="text-slate-400" />}
        />

        {/* Cluster/Group */}
        <SimpleDropdown
          options={clusterOptions}
          value={selectedCluster}
          onChange={setSelectedCluster}
          icon={<Layers size={14} className="text-slate-400" />}
        />

        {/* Units / Accounts */}
        <UnitsDropdown
          accounts={accountsInCluster}
          selectedAccounts={selectedAccounts}
          onToggle={handleToggleAccount}
          onSelectAll={() => setSelectedAccounts([])}
        />

        <div className="h-8 w-px bg-slate-200 mx-1" />

        {/* Date Range */}
        <div className="relative isolate z-50">
          <Calendar
            compact={false}
            allowClear
            showTimeInput={false}
            popoverAlignment="end"
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
      </div>
    </div>
  );
};
