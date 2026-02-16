import React, { useEffect, useMemo, useState } from 'react';
import { CampaignData, MetaAdAccount, SummaryReportRow } from '../types';
import { fetchMetaAccounts, fetchSummaryReport } from '../services/supabaseService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from "@/lib/utils";

interface Props {
  data: CampaignData[];
  selectedFranchisee: string;
  selectedClient: string;
  dateRange: { from: Date; to: Date } | undefined;
  allowedFranchises?: string[]; // IDs/Names permitted for the user
  allowedAccounts?: string[];    // Account IDs permitted

  // External Data (Persistence)
  externalSummaryData?: SummaryReportRow[];
  externalLoading?: boolean;
}

interface AggregatedAccountStats {
  // ... (lines 18-47 unchanged)
  // [Skipping unchanged lines for brevity in replacement but I must provide full target if I use replace_file_content]
  // I'll use a better target content below.
  account_name: string;
  spend: number;
  purchases: number;
  conversations: number;
  results: number;
  clicks: number;
  impressions: number;
  reach: number;
  cpl: number;
  ctr: number;
  cpc: number;
}

interface MergedAccountData extends MetaAdAccount {
  period_stats: AggregatedAccountStats;
}

type SortDirection = 'asc' | 'desc';
interface SortConfig {
  key: string;
  direction: SortDirection;
}

// Formatters
const fmtCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const fmtInt = (value: number) => new Intl.NumberFormat('pt-BR').format(value);
const fmtPct = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2 }).format(value / 100);
const fmtDec = (value: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export const SummaryView: React.FC<Props> = ({
  data,
  selectedFranchisee,
  selectedClient,
  dateRange,
  allowedFranchises,
  allowedAccounts,
  externalSummaryData,
  externalLoading
}) => {
  const [summaryData, setSummaryData] = useState<SummaryReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMSG, setErrorMSG] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'investimento', direction: 'desc' });

  // Update internal summaryData if external is provided
  useEffect(() => {
    if (externalSummaryData) {
      setSummaryData(externalSummaryData);
      setLoading(!!externalLoading);
    }
  }, [externalSummaryData, externalLoading]);

  // Use passed date range or default to last 30 days
  // Handles both { from, to } and { start, end } formats to prevent fallback loop
  // Estabilizar datas e strings para evitar loops infinitos
  const { startText, endText } = useMemo(() => {
    const from = dateRange?.from || (dateRange as any)?.start;
    const to = dateRange?.to || (dateRange as any)?.end;

    if (from && to) {
      return { startText: from.toISOString(), endText: to.toISOString() };
    }

    const e = new Date();
    const s = new Date();
    s.setDate(s.getDate() - 30);
    return { startText: s.toISOString(), endText: e.toISOString() };
  }, [dateRange]);

  // Stabilize arrays from props to prevent infinite effect loops
  const stableAllowedFranchises = useMemo(() =>
    (allowedFranchises || []).sort().join(','),
    [allowedFranchises]
  );
  const stableAllowedAccounts = useMemo(() =>
    (allowedAccounts || []).sort().join(','),
    [allowedAccounts]
  );

  useEffect(() => {
    // Skip internal load if external data is provided
    if (externalSummaryData) return;

    let mounted = true;
    const loadReport = async () => {
      setLoading(true);
      try {
        const start = new Date(startText);
        const end = new Date(endText);
        const franchises = stableAllowedFranchises ? stableAllowedFranchises.split(',') : undefined;
        const accounts = stableAllowedAccounts ? stableAllowedAccounts.split(',') : undefined;

        const report = await fetchSummaryReport(start, end, franchises, accounts);

        if (mounted) {
          setSummaryData(report);
          setErrorMSG(null);
        }
      } catch (error: any) {
        console.error("Summary Load Failed", error);
        if (mounted) setErrorMSG("Erro ao carregar dados.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadReport();
    return () => { mounted = false; };
    // VITAL: Usar strings primitivas no array de dependências para evitar loops
  }, [selectedFranchisee, selectedClient, startText, endText, stableAllowedFranchises, stableAllowedAccounts]);

  const filteredList = useMemo(() => {
    // RBAC: Require account selection - no data shown without specific account
    if (!selectedClient) return [];
    
    return summaryData.filter(row => {
      // UI Filter: Franchise
      if (selectedFranchisee && row.franquia !== selectedFranchisee) return false;

      // UI Filter: Account (compare by account_id, not nome_conta)
      // Normalize both to handle potential 'act_' prefix mismatches
      if (selectedClient && selectedClient !== 'ALL') {
        const normSelected = selectedClient.replace(/^act_/i, '');
        const normRow = (row.meta_account_id || '').replace(/^act_/i, '');
        if (normSelected !== normRow) return false;
      }
      return true;
    });
  }, [summaryData, selectedFranchisee, selectedClient]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredList;
    return [...filteredList].sort((a, b) => {
      const valA = (a as any)[sortConfig.key] || 0;
      const valB = (b as any)[sortConfig.key] || 0;
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredList, sortConfig]);

  // Totals Calculation
  const totals = useMemo(() => {
    return filteredList.reduce((acc, row) => ({
      count: acc.count + 1,
      investimento: acc.investimento + (row.investimento || 0),
      compras: acc.compras + (row.compras || 0),
      leads: acc.leads + (row.leads || 0),
      conversas: acc.conversas + (row.conversas || 0),
      clicks: acc.clicks + (row.clicks || 0),
      reach: acc.reach + (row.alcance || 0),
      impressoes: acc.impressoes + (row.impressoes || 0),
      saldo_atual: acc.saldo_atual + (row.saldo_atual || 0)
    }), {
      count: 0, investimento: 0, compras: 0, leads: 0, conversas: 0, clicks: 0, reach: 0, impressoes: 0, saldo_atual: 0
    });
  }, [filteredList]);

  // Derived Totals
  const totalResults = totals.compras + totals.leads + totals.conversas;
  const avgCpl = totals.leads > 0 ? totals.investimento / totals.leads : 0;
  const avgCpc = totals.clicks > 0 ? totals.investimento / totals.clicks : 0;
  const avgCpr = totalResults > 0 ? totals.investimento / totalResults : 0;
  const avgCpm = totals.impressoes > 0 ? (totals.investimento / totals.impressoes) * 1000 : 0;
  const avgFreq = totals.reach > 0 ? totals.impressoes / totals.reach : 0;


  // Helper Components & Render
  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortConfig?.key !== colKey) return <ArrowUpDown size={12} className="text-slate-300 ml-1 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-blue-600 ml-1" /> : <ArrowDown size={12} className="text-blue-600 ml-1" />;
  };
  const requestSort = (key: string) => {
    let direction: SortDirection = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  // Render
  if (loading) return <div className="h-64 flex items-center justify-center gap-2 text-primary"><Loader2 className="animate-spin" /> Carregando relatório...</div>;
  if (errorMSG) return <div className="p-8 text-center text-red-500">{errorMSG}</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Resumo Gerencial (RPC)</h2>
        <p className="text-slate-500">Visão consolidada via Banco de Dados (Otimizado).</p>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[200px] cursor-pointer" onClick={() => requestSort('nome_conta')}>Conta <SortIcon colKey="nome_conta" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('investimento')}>Investimento <SortIcon colKey="investimento" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('compras')}>Compras <SortIcon colKey="compras" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('leads')}>Leads <SortIcon colKey="leads" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('cpl')}>CPL <SortIcon colKey="cpl" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('cpc')}>CPC <SortIcon colKey="cpc" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('cpr')}>CPR <SortIcon colKey="cpr" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('cpm')}>CPM <SortIcon colKey="cpm" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('freq')}>Freq. <SortIcon colKey="freq" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('impressoes')}>Impr. <SortIcon colKey="impressoes" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('clicks')}>Cliques <SortIcon colKey="clicks" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('saldo_atual')}>Saldo <SortIcon colKey="saldo_atual" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row, index) => {
              const rowResults = row.compras + row.leads + row.conversas;
              // Use Backend CPL if available, else fallback (though backend should always provide it now)
              const cpl = row.cpl_total ?? (row.leads > 0 ? row.investimento / row.leads : 0);
              const cpc = row.clicks > 0 ? row.investimento / row.clicks : 0;
              const cpr = rowResults > 0 ? row.investimento / rowResults : 0;
              const cpm = row.impressoes > 0 ? (row.investimento / row.impressoes) * 1000 : 0;
              const freq = row.alcance > 0 ? row.impressoes / row.alcance : 0;

              // Fallback for Bug #6: Missing Account Name
              const accId = row.meta_account_id || (row as any).account_id || 'ID Desconhecido';
              const accountName = row.nome_conta && row.nome_conta.trim() !== ''
                ? row.nome_conta
                : `Conta ${accId}`;

              const rowKey = accId !== 'ID Desconhecido' ? accId : `unknown-${index}`;

              return (
                <TableRow key={rowKey} className="hover:bg-slate-50">
                  <TableCell className="font-bold text-slate-800">
                    <div className="line-clamp-1" title={accountName}>{accountName}</div>
                    <div className="text-[10px] text-slate-400 font-normal font-mono">{accId}</div>
                  </TableCell>
                  <TableCell className="text-right">{fmtCurrency(row.investimento)}</TableCell>
                  <TableCell className="text-right">{row.compras}</TableCell>
                  <TableCell className="text-right">{row.leads}</TableCell>
                  <TableCell className="text-right text-slate-500">{fmtCurrency(cpl)}</TableCell>
                  <TableCell className="text-right text-slate-500">{fmtCurrency(cpc)}</TableCell>
                  <TableCell className="text-right text-slate-500">{fmtCurrency(cpr)}</TableCell>
                  <TableCell className="text-right text-slate-500">{fmtCurrency(cpm)}</TableCell>
                  <TableCell className="text-right text-slate-500">{fmtDec(freq)}</TableCell>
                  <TableCell className="text-right text-slate-500">{fmtInt(row.impressoes)}</TableCell>
                  <TableCell className="text-right text-slate-500">{fmtInt(row.clicks)}</TableCell>
                  <TableCell className={cn("text-right font-bold", row.saldo_atual < 100 ? "text-red-600" : "text-emerald-700")}>{fmtCurrency(row.saldo_atual)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter className="bg-slate-100 font-bold border-t-2 border-slate-300">
            <TableRow>
              <TableCell>Total ({totals.count})</TableCell>
              <TableCell className="text-right">{fmtCurrency(totals.investimento)}</TableCell>
              <TableCell className="text-right">{totals.compras}</TableCell>
              <TableCell className="text-right">{totals.leads}</TableCell>
              <TableCell className="text-right">{fmtCurrency(avgCpl)}</TableCell>
              <TableCell className="text-right">{fmtCurrency(avgCpc)}</TableCell>
              <TableCell className="text-right">{fmtCurrency(avgCpr)}</TableCell>
              <TableCell className="text-right">{fmtCurrency(avgCpm)}</TableCell>
              <TableCell className="text-right">{fmtDec(avgFreq)}</TableCell>
              <TableCell className="text-right">{fmtInt(totals.impressoes)}</TableCell>
              <TableCell className="text-right">{fmtInt(totals.clicks)}</TableCell>
              <TableCell className="text-right">{fmtCurrency(totals.saldo_atual)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
};

export default SummaryView;
