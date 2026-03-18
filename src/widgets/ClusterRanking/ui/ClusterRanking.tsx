import React, { useMemo } from 'react';
import { SummaryReportRow } from '../../../../types';
import { Trophy, TrendingDown, TrendingUp, Minus, Medal } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../../../components/ui/table';

const fmtCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function cn(...classes: (string | false | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}

interface Props { summaryData: SummaryReportRow[]; }

export const ClusterRanking: React.FC<Props> = ({ summaryData }) => {
    const rankingInfo = useMemo(() => {
        if (!summaryData.length) return { items: [], avgCpl: 0 };

        const totalLeads = summaryData.reduce((s, r) => s + (r.leads || 0), 0);
        const totalSpend = summaryData.reduce((s, r) => s + (r.investimento || 0), 0);
        const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

        const items = summaryData.map(row => {
            const spend = row.investimento || 0;
            const leads = row.leads || 0;
            const unitCpl = leads > 0 ? spend / leads : 0;
            let efficiency = 0;
            if (avgCpl > 0 && unitCpl > 0) {
                efficiency = ((unitCpl - avgCpl) / avgCpl) * 100;
            } else if (unitCpl === 0 && spend > 0) {
                efficiency = 100;
            }
            return {
                accountId: row.meta_account_id || '...',
                accountName: row.nome_conta?.trim() || `Conta ${row.meta_account_id}`,
                spend,
                results: leads,
                unitCpl,
                efficiency,
            };
        });

        const sorted = items
            .filter(i => i.spend > 0 || i.results > 0)
            .sort((a, b) => {
                if (a.unitCpl === 0 && a.spend > 0) return 1;
                if (b.unitCpl === 0 && b.spend > 0) return -1;
                if (a.unitCpl === 0 && a.spend === 0) return 1;
                if (b.unitCpl === 0 && b.spend === 0) return -1;
                return a.unitCpl - b.unitCpl;
            });

        return { items: sorted, avgCpl };
    }, [summaryData]);

    if (!rankingInfo.items.length) return null;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-xl">
                        <Trophy size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Ranking de Eficiência</h3>
                        <p className="text-sm text-slate-500">Contas ordenadas pelo menor custo por lead.</p>
                    </div>
                </div>
                <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-500">Média do Grupo:</span>
                    <span className="text-lg font-bold text-slate-900">{fmtCurrency(rankingInfo.avgCpl)}</span>
                </div>
            </div>

            <div className="rounded-xl border bg-white overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[60px] text-center text-xs uppercase">Pos</TableHead>
                            <TableHead className="text-xs uppercase">Unidade</TableHead>
                            <TableHead className="text-right text-xs uppercase">Investimento</TableHead>
                            <TableHead className="text-right text-xs uppercase">Resultados</TableHead>
                            <TableHead className="text-right text-xs uppercase">CPL</TableHead>
                            <TableHead className="text-right text-xs uppercase">Eficiência</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rankingInfo.items.map((row, i) => {
                            let badgeIcon = <Minus size={14} className="text-slate-400" />;
                            let badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
                            let prefix = '';
                            if (row.efficiency < 0) {
                                badgeIcon = <TrendingDown size={14} className="text-emerald-500" />;
                                badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                            } else if (row.efficiency > 0) {
                                badgeIcon = <TrendingUp size={14} className="text-red-500" />;
                                badgeClass = 'bg-red-50 text-red-700 border-red-100';
                                prefix = '+';
                            }
                            return (
                                <TableRow key={row.accountId} className={i === 0 ? 'bg-amber-50/20' : ''}>
                                    <TableCell className="text-center font-bold text-slate-500">
                                        {i === 0 ? <Medal size={20} className="mx-auto text-yellow-500" /> : `${i + 1}º`}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-semibold text-slate-800">{row.accountName}</div>
                                        <div className="text-xs text-slate-400 font-mono">{row.accountId}</div>
                                    </TableCell>
                                    <TableCell className="text-right text-xs font-medium text-slate-600">{fmtCurrency(row.spend)}</TableCell>
                                    <TableCell className="text-right text-xs font-semibold text-slate-700">{row.results}</TableCell>
                                    <TableCell className="text-right text-xs text-slate-500">{fmtCurrency(row.unitCpl)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold', badgeClass)}>
                                            {badgeIcon}
                                            {row.efficiency !== 0 ? `${prefix}${row.efficiency.toFixed(1)}%` : 'Na média'}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
