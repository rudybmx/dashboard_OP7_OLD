import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { subDays } from 'date-fns';
import { RangeValue } from '../../../../components/ui/calendar';
import { logger } from '../../../../lib/logger';

const STORAGE_KEYS = {
  accounts: 'op7_account_filter',
  cluster: 'op7_cluster_filter',
  platform: 'op7_platform_filter',
  dateRange: 'op7_date_range',
} as const;

interface FiltersContextType {
  // Multi-account selection ([] = all)
  selectedAccounts: string[];
  setSelectedAccounts: (accounts: string[]) => void;

  // Cluster/Group filter
  selectedCluster: string;
  setSelectedCluster: (cluster: string) => void;

  // Platform filter
  selectedPlatform: string;
  setSelectedPlatform: (platform: string) => void;

  // Date range
  dateRange: RangeValue | null;
  setDateRange: (range: RangeValue | null) => void;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export const FiltersProvider = ({ children }: { children: ReactNode }) => {
  const [selectedAccounts, setSelectedAccountsState] = useState<string[]>(() => {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.accounts);
      if (val) {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
        // Migrate legacy single string value
        if (val !== 'ALL' && val !== 'null') return [val];
      }
    } catch {
      // ignore parse errors
    }
    return [];
  });

  const [selectedCluster, setSelectedClusterState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.cluster) || 'ALL';
  });

  const [selectedPlatform, setSelectedPlatformState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.platform) || 'ALL';
  });

  const [dateRange, setDateRangeState] = useState<RangeValue | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.dateRange);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { start: new Date(parsed.start), end: new Date(parsed.end) };
      } catch (e) {
        logger.error('Failed to parse saved dates', e);
      }
    }
    return { start: subDays(new Date(), 30), end: subDays(new Date(), 1) };
  });

  const setSelectedAccounts = (accounts: string[]) => {
    localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(accounts));
    setSelectedAccountsState(accounts);
  };

  const setSelectedCluster = (cluster: string) => {
    localStorage.setItem(STORAGE_KEYS.cluster, cluster);
    setSelectedClusterState(cluster);
    // Reset account selection when switching clusters
    setSelectedAccountsState([]);
    localStorage.setItem(STORAGE_KEYS.accounts, '[]');
  };

  const setSelectedPlatform = (platform: string) => {
    localStorage.setItem(STORAGE_KEYS.platform, platform);
    setSelectedPlatformState(platform);
  };

  const setDateRange = (range: RangeValue | null) => {
    if (range?.start && range?.end) {
      localStorage.setItem(STORAGE_KEYS.dateRange, JSON.stringify({
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      }));
    }
    setDateRangeState(range);
  };

  const value = useMemo(() => ({
    selectedAccounts,
    setSelectedAccounts,
    selectedCluster,
    setSelectedCluster,
    selectedPlatform,
    setSelectedPlatform,
    dateRange,
    setDateRange,
  }), [selectedAccounts, selectedCluster, selectedPlatform, dateRange]);

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
};

export const useFilters = (): FiltersContextType => {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error('useFilters must be used within FiltersProvider');
  return ctx;
};
