import React, { useMemo } from 'react';
import { SummaryReportRow } from '../../../../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

const fmtCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtInt = (v: number) => new Intl.NumberFormat('pt-BR').format(Math.round(v));

interface Props { summaryData: SummaryReportRow[]; }

export const ClusterBreakdown: React.FC<Props> = ({ summaryData }) => {
    const chartData = useMemo(() =>
        summaryData
            .map(row => ({
                name: row.nome_conta?.trim() || `Conta ${row.meta_account_id}`,
                investimento: row.investimento || 0,
                leads: row.leads || 0,
                id: row.meta_account_id,
            }))
            .sort((a, b) => b.investimento - a.investimento),
        [summaryData]
    );

    if (chartData.length === 0) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 animate-in fade-in">
            {/* Chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Investimento vs. Leads por Conta</h3>
                    <p className="text-sm text-slate-500">Distribuição de performance entre contas ativas.</p>
                </div>
                <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="name"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                tickFormatter={(v) => v.length > 14 ? v.substring(0, 14) + '…' : v}
                                style={{ fontSize: 11 }}
                            />
                            <YAxis tickFormatter={(v) => `R$${v}`} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                            <RechartsTooltip
                                formatter={(value: number, name: string) => [fmtCurrency(value), name === 'investimento' ? 'Investimento' : 'Leads']}
                                labelStyle={{ fontWeight: 600 }}
                                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                            />
                            <Bar dataKey="investimento" radius={[4, 4, 0, 0]} maxBarSize={50} name="Investimento">
                                {chartData.map((_, i) => <Cell key={i} fill="#4F46E5" />)}
                            </Bar>
                            <Bar dataKey="leads" radius={[4, 4, 0, 0]} maxBarSize={50} name="Leads">
                                {chartData.map((_, i) => <Cell key={`l-${i}`} fill="#06B6D4" />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col border border-slate-200">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">Divisão de Gastos por Conta</h3>
                    <p className="text-sm text-slate-500">Onde seu investimento está concentrado.</p>
                </div>
                <div className="overflow-auto max-h-[350px]">
                    <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                            <TableRow>
                                <TableHead className="text-xs uppercase">Conta</TableHead>
                                <TableHead className="text-right text-xs uppercase">Investimento</TableHead>
                                <TableHead className="text-right text-xs uppercase">Leads</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {chartData.map(row => (
                                <TableRow key={row.id} className="hover:bg-slate-50">
                                    <TableCell className="font-medium text-xs truncate max-w-[150px]" title={row.name}>{row.name}</TableCell>
                                    <TableCell className="text-right text-xs text-slate-600">{fmtCurrency(row.investimento)}</TableCell>
                                    <TableCell className="text-right text-xs font-bold text-indigo-600">{fmtInt(row.leads)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
};
