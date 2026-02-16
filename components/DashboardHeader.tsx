import React, { useMemo } from 'react';
import { Calendar, RangeValue } from '@/components/ui/calendar';
import { Select } from '@/components/ui/select-1';
import { Filter, CalendarDays } from 'lucide-react';
import { CampaignData } from '../types';
import { subDays, startOfMonth } from 'date-fns';

interface DashboardHeaderProps {
  title: string;
  data: CampaignData[];
  selectedClient: string;
  setSelectedClient: (val: string) => void;
  dateRange: RangeValue | null;
  setDateRange: (range: RangeValue | null) => void;
  isLocked?: boolean;
  availableFranchises: { id: string; name: string }[];
  metaAccounts: any[];
  userRole?: string;
  assignedAccountIds?: string[]; // RBAC: User's assigned account IDs
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  data,
  selectedClient,
  setSelectedClient,
  dateRange,
  setDateRange,
  isLocked = false,
  availableFranchises,
  metaAccounts,
  userRole,
  assignedAccountIds
}) => {

  // 1. Prepare Franchise Options - REMOVED


  // 2. Extract Clients
  
  const clients = useMemo(() => {
    let filtered = metaAccounts || [];

    // Step 1: Filter by selected franchise - REMOVED


    // Step 2: Apply RBAC - Filter by user's assigned accounts
    // Admins and executives see all accounts, other roles are restricted
    const isAdmin = userRole === 'admin' || userRole === 'executive';

    if (!isAdmin && assignedAccountIds && assignedAccountIds.length > 0) {
      filtered = filtered.filter(acc => {
        // Normalize account IDs (remove 'act_' prefix if present for comparison)
        const normalizedAccId = acc.account_id.replace(/^act_/i, '');
        return assignedAccountIds.some(allowedId => {
          const normalizedAllowedId = allowedId.replace(/^act_/i, '');
          return normalizedAccId === normalizedAllowedId || acc.account_id === allowedId;
        });
      });
    }

    // Step 3: Filter by Visibility Settings
    // Only show accounts marked as visible (client_visibility === true OR null/undefined if legacy)
    // We assume explicit false means hidden
    // Step 3: Filter by Visibility Settings
    // Only show accounts marked as visible (client_visibility === true OR null/undefined if legacy)
    // Sort and map to options format
    // Use display_name (Nome Ajustado) if filled, otherwise use account_name (Nome da Conta)
    const clientOptions = filtered
      .filter(acc => acc.client_visibility !== false)
      .map(acc => ({
        value: acc.account_id,
        label: acc.display_name || acc.account_name
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    // Add "All Accounts" option
    return [
      { value: 'ALL', label: 'Todas as contas' },
      ...clientOptions
    ];
  }, [metaAccounts, userRole, assignedAccountIds]);

  const isClientRole = userRole === 'client';

  return (
    <div className="flex h-20 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm z-50 relative">

      {/* Left: Page Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-sm text-slate-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          Dados atualizados
        </p>
      </div>

      {/* Right: Global Filters Toolbar */}
      <div className="flex items-center gap-3">

        {/* 1. Franqueado (Hidden for Clients) - REMOVED */}


        {/* 2. Cliente */}
        <div className="w-[220px]">
          <Select
            placeholder="Selecione uma Conta"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            options={clients}
          />
        </div>

        <div className="h-8 w-px bg-slate-200 mx-2"></div>

        {/* 3. CALENDAR WRAPPER - This fixes the 'not clickable' issue */}
        <div className="relative isolate z-50">
          <Calendar
            compact={false}
            allowClear
            showTimeInput={false}
            popoverAlignment="end" // Opens to the left
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
      </div>
    </div>
  );
};