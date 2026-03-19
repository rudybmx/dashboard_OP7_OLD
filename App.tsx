import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { DashboardHeader } from './components/DashboardHeader';
import { LoginView } from './components/LoginView';
import { fetchCampaignData, fetchFranchises, fetchKPIComparison, fetchSummaryReport, fetchMetaAccounts } from './services/supabaseService';
import { CampaignData, Franchise, SummaryReportRow } from './types';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { useAuth } from './src/auth/useAuth';
import { ViewLoader } from './components/ViewLoader';
import { useUserAccess } from './src/auth/useUserAccess';
import { ResolvedMetaAccount, ResolvedFranchise } from './src/auth/types';
import { useFilters } from './src/features/filters';
import { useClusterAccounts } from './src/entities/cluster';
import { useQuery } from '@tanstack/react-query';
import { logger } from './lib/logger';


// Retry wrapper for lazy imports — handles stale chunk 404s after new deploys
function lazyWithRetry(importFn: () => Promise<any>) {
  return lazy(() =>
    importFn().then((mod) => {
      // On success, clear any previous chunk-reload flag
      sessionStorage.removeItem('chunk_reload');
      return mod;
    }).catch((err) => {
      // Avoid infinite reload loop: only reload once per session
      const hasReloaded = sessionStorage.getItem('chunk_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload', '1');
        window.location.reload();
        return new Promise(() => {}); // Never resolves — page will reload
      }
      throw err; // Let ErrorBoundary handle after 1 retry
    })
  );
}

// Lazy load views for code splitting (with auto-retry on stale chunks)
const SummaryView = lazyWithRetry(() => import('./src/pages/SummaryView'));
const ManagerialView = lazyWithRetry(() => import('./src/pages/ManagerialView'));
const DashboardOverview = lazyWithRetry(() => import('./components/DashboardOverview'));
const CampaignsView = lazyWithRetry(() => import('./components/CampaignsView'));
const CreativesView = lazyWithRetry(() => import('./components/CreativesView'));
const DemographicsGeoView = lazyWithRetry(() => import('./components/DemographicsGeoView'));
const AdsTableView = lazyWithRetry(() => import('./components/AdsTableView'));
const SettingsView = lazyWithRetry(() => import('./components/SettingsView'));
const PlanningDashboardView = lazyWithRetry(() => import('./components/PlanningDashboardView'));

export default function App() {

  const { session, userProfile, loading: authLoading, error: authError, logout } = useAuth();

  // App Data States
  const [data, setData] = useState<CampaignData[]>([]);
  const [officialFranchises, setOfficialFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const VALID_VIEWS = ['dashboard', 'settings', 'campaigns', 'creatives', 'executive', 'demographics', 'ads', 'summary', 'planning'] as const;
  type ActiveView = typeof VALID_VIEWS[number];

  const getInitialView = (): ActiveView => {
    const hash = window.location.hash.replace('#', '') as ActiveView;
    return VALID_VIEWS.includes(hash) ? hash : 'summary';
  };

  const [activeView, setActiveView] = useState<ActiveView>(getInitialView);

  const navigateTo = (view: ActiveView) => {
    window.location.hash = view;
    setActiveView(view);
  };

  // Sync activeView when user navigates with browser back/forward buttons
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '') as ActiveView;
      const view = VALID_VIEWS.includes(hash) ? hash : 'summary';
      setActiveView(view);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const [formattedComparisonData, setFormattedComparisonData] = useState<CampaignData[]>([]);
  const [kpiRpcData, setKpiRpcData] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<SummaryReportRow[]>([]);
  const [metaAccounts, setMetaAccounts] = useState<any[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);

  // Filter States — centralized via FiltersProvider
  const { selectedAccounts, setSelectedAccounts, selectedCluster, dateRange, setDateRange } = useFilters();

  // Cluster accounts for effectiveAccountIds computation
  const { data: clusterAccountList = [] } = useClusterAccounts(
    selectedCluster !== 'ALL' ? selectedCluster : null
  );

  // Clean URL query params on mount — preserve the hash
  useEffect(() => {
    if (window.location.search) {
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

  // Estabilizar datas para evitar triggers de useEffect desnecessários
  const stableDates = useMemo(() => {
    return {
      startText: dateRange?.start ? dateRange.start.toISOString() : '',
      endText: dateRange?.end ? dateRange.end.toISOString() : ''
    };
  }, [dateRange?.start, dateRange?.end]);

  // --- ACCESS CONTROL HOOK ---
  const {
    isAdmin,
    isManager,
    allowedAccountIds,
    canViewSettings,
    canAccessModule,
    allowedRoutes,
    filterAccountsByAccess
  } = useUserAccess(userProfile);

  // Guard: verifica se o usuário pode acessar a view atual.
  // Usa allowedRoutes (do módulo) quando disponível,
  // senão cai no mapa legado de roles.
  const LEGACY_ROLE_VIEW_MAP: Record<string, string[]> = {
    dashboard:    ['superadmin', 'admin', 'manager', 'client', 'viewer'],
    summary:      ['superadmin', 'admin', 'manager', 'client'],
    executive:    ['superadmin', 'admin', 'manager'],
    campaigns:    ['superadmin', 'admin', 'manager'],
    creatives:    ['superadmin', 'admin', 'manager'],
    demographics: ['superadmin', 'admin', 'manager'],
    ads:          ['superadmin', 'admin', 'manager'],
    planning:     ['superadmin', 'admin'],
    settings:     ['superadmin', 'admin'],
  };

  const canAccessView = (view: string): boolean => {
    // Se o usuário tem permissões de módulo carregadas, usa elas
    if (userProfile?.module_permissions?.length) {
      return allowedRoutes.includes(view);
    }
    // Fallback legado por role
    const allowed = LEGACY_ROLE_VIEW_MAP[view] ?? [];
    return allowed.includes(userProfile?.role ?? '');
  };

  // --- DATA FETCHING (QUERIES) ---
  // Load franchises and accounts once (or when session changes)
  const { data: allFranchises } = useMemo(() => ({ data: officialFranchises }), [officialFranchises]); // Legacy compat until we move to useQuery fully
  // We keep existing fetchFranchises effect for now to minimize diff, but we could useQuery here.

  // --- FILTERED LISTS (MEMOIZED) ---
  const availableFranchises = useMemo(() => {
    if (!officialFranchises.length) return [];
    
    if (isAdmin) return officialFranchises;

    // Derive franchises from accessible accounts
    if (metaAccounts.length > 0) {
        const allowedFranchiseIds = new Set(metaAccounts.map(a => a.franchise_id).filter(Boolean));
        return officialFranchises.filter(f => allowedFranchiseIds.has(f.id));
    }
    
    return []; 
  }, [officialFranchises, metaAccounts, isAdmin]);

  const availableAccounts = useMemo(() => {
      if (!metaAccounts.length) return [];
      
      const mappedAccounts: ResolvedMetaAccount[] = metaAccounts.map(a => ({
          ...a,
          id: a.account_id,
          franchise_id: a.franchise_id || null, // Ensure compatibility
          franchise_name: a.franchise_name || ''
      }));

      return filterAccountsByAccess(mappedAccounts);
  }, [metaAccounts, filterAccountsByAccess]);


  // Load Data
  useEffect(() => {
    if (!session || !userProfile || !dateRange?.start || !dateRange?.end) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const start = dateRange.start!;
        const end = dateRange.end!;
        
        // Determina franquias para filtro (IDs sent to Service)
        // Always empty means "all accessible" (Service handles logic)
        const franchiseIdsForService: string[] = [];
        
        /* Removed filter logic
        if (selectedFranchise) {
          // ...
          const found = availableFranchises.find(f => f.name === selectedFranchise);
          if (found) {
             franchiseIdsForService = [found.id];
          } else {
             logger.warn(`Selected franchise "${selectedFranchise}" not found in available list.`);
          }
        } 
        */
        // If not selected, we send empty (server handles "all" or we rely on account filtering)

        // Fetch Accounts First (to have the list for filtering)
        const allAccountsRaw = await fetchMetaAccounts();
        
        // Filter accounts for the dropdown/state
        const mappedAccounts: ResolvedMetaAccount[] = allAccountsRaw.map(a => {
             const franchise = officialFranchises.find(f => f.id === a.franchise_id);
             return {
                 ...a, 
                 id: a.account_id,
                 franchise_id: a.franchise_id || null, 
                 franchise_name: franchise?.name || '',
                 status: (a.status === 'removed' ? 'removed' : 'active') as 'active' | 'removed' | 'disabled'
             };
        });
        
        const filteredAccounts = filterAccountsByAccess(mappedAccounts);
        setMetaAccounts(filteredAccounts);

        // --- FILTER LOGIC: Compute effective account IDs for fetchCampaignData ---
        // Admin: sem assigned_account_ids → usa IDs de todas as contas carregadas
        // Client: usa allowedAccountIds (assigned_account_ids do perfil)
        let effectiveAccountIds: string[] = [];

        if (selectedAccounts.length > 0) {
            // Specific accounts selected by user
            effectiveAccountIds = selectedAccounts;
        } else if (isAdmin) {
            // Admin: no selection → all loaded account IDs
            effectiveAccountIds = filteredAccounts.map(a => a.account_id);
        } else {
            // Client: no selection → only their assigned accounts
            effectiveAccountIds = allowedAccountIds;
        }

        // For RPCs that still use franchise/account params (KPI, Summary)
        const serviceAccountFilter = selectedAccounts.length > 0 ? selectedAccounts : [];

        logger.info('Loading dashboard data:', { 
          role: userProfile.role,
          effectiveIds: effectiveAccountIds.length,
          filterMode: selectedAccounts.join(',') || 'ALL'
        });

        // Now fetch data
        const [campaignResult, kpiResult, summaryResult] = await Promise.all([
          fetchCampaignData(start, end, effectiveAccountIds),
          fetchKPIComparison(start, end, franchiseIdsForService, serviceAccountFilter),
          fetchSummaryReport(start, end, franchiseIdsForService, serviceAccountFilter)
        ]);

        // Regra 2: Nome Dashboard → se preenchido usa display_name, senão usa account_name.
        // Aplicado aqui para que TODAS as views herdem o nome correto automaticamente.
        // filteredAccounts já passou por filterAccountsByAccess (só visíveis chegam aqui)
        const displayNameMap = new Map<string, string>(
          filteredAccounts.map(a => [
            a.account_id,
            (a.display_name && a.display_name.trim()) ? a.display_name.trim() : a.account_name,
          ])
        );

        const applyDisplayName = (items: CampaignData[]): CampaignData[] =>
          items.map(item => ({
            ...item,
            account_name:
              displayNameMap.get(item.account_id) ||
              displayNameMap.get(item.account_id?.replace(/^act_/i, '')) ||
              item.account_name,
          }));

        setData(applyDisplayName(campaignResult.current));
        setFormattedComparisonData(applyDisplayName(campaignResult.previous));
        setKpiRpcData(kpiResult);
        // Aplica display_name também no resumo gerencial
        // Tenta account_id direto e sem prefixo act_ (RPC devolve sem prefixo)
        setSummaryData(summaryResult.map(row => ({
          ...row,
          nome_conta:
            displayNameMap.get(row.meta_account_id) ||
            displayNameMap.get(row.meta_account_id?.replace(/^act_/i, '')) ||
            row.nome_conta,
        })));
        
        setIsDemoMode(campaignResult.isMock);
        if (campaignResult.isMock) setConnectionError(campaignResult.error);
        setIsDataLoaded(true);

      } catch (err) {
        logger.error("Critical data loading failure:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    
    // Dependencies: Stable ones only
  }, [
    session,
    userProfile?.id,
    dateRange?.start?.toISOString(),
    dateRange?.end?.toISOString(),
    JSON.stringify(selectedAccounts),
  ]);

  // Filtros sincronizados via FiltersProvider (localStorage gerenciado lá)

  // Dynamic Balance Calculation (Reactive to UI Filters + RBAC)
  const currentFilteredBalance = useMemo(() => {
    if (!metaAccounts.length) return 0;

    // Franchise filter removed - calculate for all visible accounts
    
    return metaAccounts
      .filter(acc => {
        if (selectedAccounts.length === 0) return true;
        return selectedAccounts.includes(acc.account_id);
      })
      .reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  }, [metaAccounts, selectedAccounts]);

  // Separate Effect for Franchises (Only once or when profile changes)
  useEffect(() => {
    if (!session) return;
    const loadFranchises = async () => {
      try {
        const list = await fetchFranchises();
        setOfficialFranchises(list);
      } catch (e) {
        logger.error("Failed to load franchises", e);
      }
    };
    loadFranchises();
  }, [session]);

  // Filters Reset
  // Filters Reset - REMOVED
  // useEffect(() => { setSelectedAccount(''); }, [selectedFranchise]);

  const filteredData = useMemo(() => {
    if (selectedAccounts.length === 0) return data; // Show all loaded data
    const selectedSet = new Set(selectedAccounts.map(id => id.replace(/^act_/i, '')));
    return data.filter(d => {
      const norm = (d.account_id || '').replace(/^act_/i, '');
      return selectedSet.has(norm) || selectedSet.has(d.account_id);
    });
  }, [selectedAccounts, data]);

  // Client-side safety filter for summaryData (RPC may return all accounts if filter not applied)
  const filteredSummaryData = useMemo(() => {
    if (selectedAccounts.length === 0) return summaryData;
    const selectedSet = new Set(selectedAccounts.map(id => id.replace(/^act_/i, '')));
    return summaryData.filter(row => {
      const accId = (row.meta_account_id || '').replace(/^act_/i, '');
      return selectedSet.has(accId) || selectedSet.has(row.meta_account_id);
    });
  }, [summaryData, selectedAccounts]);

  const comparisonData = useMemo(() => {
    if (selectedAccounts.length === 0) return formattedComparisonData;
    const selectedSet = new Set(selectedAccounts.map(id => id.replace(/^act_/i, '')));
    return formattedComparisonData.filter(d => {
      const norm = (d.account_id || '').replace(/^act_/i, '');
      return selectedSet.has(norm) || selectedSet.has(d.account_id);
    });
  }, [selectedAccounts, formattedComparisonData]);

  // Auth Guards & Loading
  if (authLoading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-slate-500 animate-pulse">Autenticando...</p>
      </div>
    </div>
  );

  if (authError) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Erro de Acesso</h3>
        <p className="text-sm text-slate-500">{authError}</p>
        <button onClick={logout} className="w-full mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg">Sair</button>
      </div>
    </div>
  );

  if (!session) return <LoginView />;

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      <aside className="hidden md:flex w-72 flex-col border-r bg-card h-full">
        <Sidebar activeView={activeView} setActiveView={navigateTo} isDemoMode={isDemoMode} userRole={userProfile?.role} userName={userProfile?.name} userEmail={userProfile?.email} className="border-none h-full" />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden h-full">
        <header className="relative z-50 flex-none">
          <div className="md:hidden p-4 bg-white border-b flex items-center justify-between">
            <MobileNav activeView={activeView} setActiveView={navigateTo} isDemoMode={isDemoMode} />
            <span className="font-bold">OP7 PERFORMANCE</span>
          </div>
          {activeView === 'settings' ? (
            <div className="h-20 flex items-center px-6 bg-white border-b border-slate-200 shadow-sm relative z-40">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Configurações</h2>
            </div>
          ) : (
            <DashboardHeader
              title={activeView === 'dashboard' ? 'Visão Gerencial' : activeView === 'summary' ? 'Resumo Gerencial' : activeView === 'executive' ? 'Visão Executiva' : activeView === 'campaigns' ? 'Performance de Campanhas' : activeView === 'creatives' ? 'Galeria de Criativos' : activeView === 'ads' ? 'Detalhamento de Anúncios' : activeView === 'demographics' ? 'Inteligência de Público' : activeView === 'planning' ? 'Planejamento Analítico' : 'Dashboard'}
              metaAccounts={availableAccounts}
              userRole={userProfile?.role}
              assignedAccountIds={allowedAccountIds}
            />
          )}
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-6 scroll-smooth">
          <div className="max-w-[1600px] mx-auto w-full space-y-6 pb-10">
            {isDemoMode && connectionError && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20">Atenção: Modo Offline. Exibindo dados de exemplo.</div>}

            <Suspense fallback={<ViewLoader />}>
              {activeView === 'summary' && (
                <SummaryView
                  summaryData={filteredSummaryData}
                  loading={loading && !isDataLoaded}
                />
              )}
              {activeView === 'planning' && <PlanningDashboardView allowedFranchises={availableFranchises.map(f => f.name)} userRole={userProfile?.role} />}
              {activeView === 'dashboard' && (
                <ManagerialView
                  dateRange={dateRange}
                  accountIds={
                    selectedAccounts.length > 0
                      ? selectedAccounts
                      : isAdmin
                      ? metaAccounts.map(a => a.account_id)
                      : allowedAccountIds
                  }
                />

              )}
              {activeView === 'executive' && <DashboardOverview data={filteredData} />}
              {activeView === 'campaigns' && <CampaignsView data={filteredData} />}
              {activeView === 'ads' && (
                <AdsTableView
                  data={filteredData}
                  onCampaignClick={(campaignName) => {
                    navigateTo('campaigns');
                  }}
                />
              )}
              {activeView === 'creatives' && <CreativesView data={filteredData} />}
              {activeView === 'demographics' && <DemographicsGeoView data={filteredData} />}
              {activeView === 'settings' && (
                canAccessView('settings')
                  ? <SettingsView userRole={userProfile?.role} />
                  : (
                    <div className="flex h-[60vh] w-full items-center justify-center">
                      <div className="flex max-w-md flex-col items-center text-center gap-4 p-8 bg-white rounded-2xl border border-slate-200">
                        <Shield className="h-12 w-12 text-red-500 bg-red-50 p-3 rounded-full mb-2" />
                        <h3 className="text-xl font-bold text-slate-900">Acesso Restrito</h3>
                        <p className="text-slate-500">Seu perfil ({userProfile?.role}) não possui permissão para acessar as configurações.</p>
                        <button onClick={() => navigateTo('dashboard')} className="mt-4 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg">Voltar ao Dashboard</button>
                      </div>
                    </div>
                  )
              )}
            </Suspense>

            <footer className="text-center text-muted-foreground text-xs py-8">&copy; {new Date().getFullYear()} OP7 Performance.</footer>
          </div>
        </main>
      </div>
    </div>
  );
}