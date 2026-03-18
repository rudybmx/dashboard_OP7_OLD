import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader2, ArrowUpDown, ArrowUp, ArrowDown, DollarSign, Users, Target, MessageCircle, ShoppingCart } from 'lucide-react';
import { SummaryReportRow } from '../../types';
import { ClusterBreakdown } from '../widgets/ClusterBreakdown';
import { ClusterRanking } from '../widgets/ClusterRanking';
import { useFilters } from '../features/filters';
import { useClusters } from '../entities/cluster';

type SortDirection = 'asc' | 'desc';
interface SortConfig { key: string; direction: SortDirection; }

const fmtCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtInt = (v: number) => new Intl.NumberFormat('pt-BR').format(Math.round(v));
const fmtDec = (v: number) => isFinite(v) ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) : '0,00';

interface SummaryViewProps {
  summaryData: SummaryReportRow[];
  loading?: boolean;
}

export const SummaryView: React.FC<SummaryViewProps> = ({ summaryData, loading }) => {
  const { selectedCluster, selectedAccounts } = useFilters();
  const { data: clustersList } = useClusters();
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'investimento', direction: 'desc' });

  const sortedData = useMemo(() => {
    if (!sortConfig) return summaryData;
    return [...summaryData].sort((a, b) => {
      const valA = (a as any)[sortConfig.key] ?? 0;
      const valB = (b as any)[sortConfig.key] ?? 0;
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [summaryData, sortConfig]);

  const totals = useMemo(() => summaryData.reduce((acc, row) => ({
    count: acc.count + 1,
    investimento: acc.investimento + (row.investimento || 0),
    compras: acc.compras + (row.compras || 0),
    leads: acc.leads + (row.leads || 0),
    conversas: acc.conversas + (row.conversas || 0),
    clicks: acc.clicks + (row.clicks || 0),
    reach: acc.reach + (row.alcance || 0),
    impressoes: acc.impressoes + (row.impressoes || 0),
    saldo_atual: acc.saldo_atual + (row.saldo_atual || 0),
  }), { count: 0, investimento: 0, compras: 0, leads: 0, conversas: 0, clicks: 0, reach: 0, impressoes: 0, saldo_atual: 0 }), [summaryData]);

  const totalResults = totals.compras + totals.leads + totals.conversas;
  const avgCpl  = totals.leads > 0     ? totals.investimento / totals.leads     : 0;
  const avgCpc  = totals.clicks > 0    ? totals.investimento / totals.clicks    : 0;
  const avgCpr  = totalResults > 0     ? totals.investimento / totalResults     : 0;
  const avgCpm  = totals.impressoes > 0 ? (totals.investimento / totals.impressoes) * 1000 : 0;
  const avgFreq = totals.reach > 0     ? totals.impressoes / totals.reach      : 0;

  const requestSort = (key: string) => {
    const direction: SortDirection = sortConfig?.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc';
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortConfig?.key !== colKey) return <ArrowUpDown size={12} className="text-slate-300 ml-1 opacity-50 inline" />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp size={12} className="text-blue-600 ml-1 inline" />
      : <ArrowDown size={12} className="text-blue-600 ml-1 inline" />;
  };

  // Dynamic title
  let dashboardTitle = 'Visão Global (Todas as Contas Ativas)';
  let dashboardSubtitle = 'Performance agregada de todas as contas disponíveis.';

  if (selectedCluster && selectedCluster !== 'ALL') {
    const clsName = clustersList?.find(c => c.id === selectedCluster)?.name || 'Grupo';
    dashboardTitle = `Visão Consolidada: ${clsName}`;
    dashboardSubtitle = 'Métricas somadas do Grupo e detalhamento por contas.';
  } else if (selectedAccounts.length === 1) {
    const accName = summaryData.length > 0 ? summaryData[0].nome_conta : selectedAccounts[0];
    dashboardTitle = `Visão Geral: ${accName}`;
    dashboardSubtitle = 'Métricas exclusivas desta conta.';
  } else if (selectedAccounts.length > 1) {
    dashboardTitle = `Seleção: ${selectedAccounts.length} contas`;
    dashboardSubtitle = 'Performance das contas selecionadas.';
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center gap-2 text-indigo-600">
        <Loader2 className="animate-spin" /> Carregando relatório...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{dashboardTitle}</h2>
        <p className="text-sm text-muted-foreground">{dashboardSubtitle}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6">
        {[
          { label: 'Investimento',     value: fmtCurrency(totals.investimento), icon: <DollarSign className="h-4 w-4 text-emerald-600" /> },
          { label: 'Leads de Mensagem',value: fmtInt(totals.conversas),         icon: <MessageCircle className="h-4 w-4 text-blue-500" /> },
          { label: 'Leads Geral',      value: fmtInt(totals.leads),             icon: <Users className="h-4 w-4 text-indigo-600" /> },
          { label: 'Compras',          value: fmtInt(totals.compras),           icon: <ShoppingCart className="h-4 w-4 text-orange-500" /> },
          { label: 'CPL',              value: fmtCurrency(avgCpl),              icon: <Target className="h-4 w-4 text-purple-600" /> },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{card.label}</span>
              <div className="p-1.5 rounded-md bg-slate-50">{card.icon}</div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Cluster widgets (only when group selected) */}
      {selectedCluster && selectedCluster !== 'ALL' && (
        <div className="space-y-6 mt-8">
          <ClusterRanking summaryData={summaryData} />
          <ClusterBreakdown summaryData={summaryData} />
        </div>
      )}

      {/* Accounts Table */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden mt-8">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[200px] cursor-pointer text-xs uppercase" onClick={() => requestSort('nome_conta')}>Conta <SortIcon colKey="nome_conta" /></TableHead>
              <TableHead className="text-right cursor-pointer text-xs uppercase" onClick={() => requestSort('investimento')}>Investimento <SortIcon colKey="investimento" /></TableHead>
              <TableHead className="text-right cursor-pointer text-xs uppercase" onClick={() => requestSort('compras')}>Compras <SortIcon colKey="compras" /></TableHead>
              <TableHead className="text-right cursor-pointer text-xs uppercase" onClick={() => requestSort('leads')}>Leads <SortIcon colKey="leads" /></TableHead>
              <TableHead className="text-right cursor-pointer text-xs uppercase" onClick={() => requestSort('cpl_total')}>CPL <SortIcon colKey="cpl_total" /></TableHead>
              <TableHead className="text-right text-xs uppercase">CPC</TableHead>
              <TableHead className="text-right text-xs uppercase">CPR</TableHead>
              <TableHead className="text-right text-xs uppercase">CPM</TableHead>
              <TableHead className="text-right cursor-pointer text-xs uppercase" onClick={() => requestSort('impressoes')}>Freq. <SortIcon colKey="impressoes" /></TableHead>
              <TableHead className="text-right cursor-pointer text-xs uppercase" onClick={() => requestSort('impressoes')}>Impr. <SortIcon colKey="impressoes" /></TableHead>
              <TableHead className="text-right cursor-pointer text-xs uppercase" onClick={() => requestSort('clicks')}>Cliques <SortIcon colKey="clicks" /></TableHead>
              <TableHead className="text-right cursor-pointer text-xs uppercase" onClick={() => requestSort('saldo_atual')}>Saldo <SortIcon colKey="saldo_atual" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-slate-400 py-12 text-sm">
                  Nenhum dado encontrado para o período selecionado.
                </TableCell>
              </TableRow>
            )}
            {sortedData.map((row, index) => {
              const rowResults = (row.compras || 0) + (row.leads || 0) + (row.conversas || 0);
              const cpl = row.cpl_total ?? (row.leads > 0 ? row.investimento / row.leads : 0);
              const cpc = row.clicks > 0 ? row.investimento / row.clicks : 0;
              const cpr = rowResults > 0 ? row.investimento / rowResults : 0;
              const cpm = row.impressoes > 0 ? (row.investimento / row.impressoes) * 1000 : 0;
              const freq = row.alcance > 0 ? row.impressoes / row.alcance : 0;
              const accId = row.meta_account_id || '';
              const accountName = row.nome_conta?.trim() || `Conta ${accId}`;
              const rowKey = accId || `row-${index}`;

              return (
                <TableRow key={rowKey} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-semibold text-sm">
                    <div className="line-clamp-1 py-1" title={accountName}>{accountName}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{accId}</div>
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium">{fmtCurrency(row.investimento || 0)}</TableCell>
                  <TableCell className="text-right text-xs">{row.compras || 0}</TableCell>
                  <TableCell className="text-right text-xs">{row.leads || 0}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{fmtCurrency(cpl)}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{fmtCurrency(cpc)}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{fmtCurrency(cpr)}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{fmtCurrency(cpm)}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{fmtDec(freq)}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{fmtInt(row.impressoes || 0)}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{fmtInt(row.clicks || 0)}</TableCell>
                  <TableCell className={`text-right text-xs font-bold ${(row.saldo_atual || 0) < 100 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {fmtCurrency(row.saldo_atual || 0)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter className="bg-muted/50 font-bold border-t">
            <TableRow>
              <TableCell className="text-xs">Total ({totals.count})</TableCell>
              <TableCell className="text-right text-xs">{fmtCurrency(totals.investimento)}</TableCell>
              <TableCell className="text-right text-xs">{totals.compras}</TableCell>
              <TableCell className="text-right text-xs">{totals.leads}</TableCell>
              <TableCell className="text-right text-xs">{fmtCurrency(avgCpl)}</TableCell>
              <TableCell className="text-right text-xs">{fmtCurrency(avgCpc)}</TableCell>
              <TableCell className="text-right text-xs">{fmtCurrency(avgCpr)}</TableCell>
              <TableCell className="text-right text-xs">{fmtCurrency(avgCpm)}</TableCell>
              <TableCell className="text-right text-xs">{fmtDec(avgFreq)}</TableCell>
              <TableCell className="text-right text-xs">{fmtInt(totals.impressoes)}</TableCell>
              <TableCell className="text-right text-xs">{fmtInt(totals.clicks)}</TableCell>
              <TableCell className="text-right text-xs">{fmtCurrency(totals.saldo_atual)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
};

export default SummaryView;
