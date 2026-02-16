import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  Cell
} from 'recharts';
import { BarChart3, AlertCircle } from 'lucide-react';
import { CampaignData } from '../types';

import { TopObjective } from '../hooks/useDashboardMetrics';

interface Props {
  ads: CampaignData[];
  topObjectives?: TopObjective[];
}

interface ObjectiveMetric {
  objective: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  purchases: number;
  msgs: number;
  freqWeightedSum: number;
  count: number;
}

export const ObjectivesPerformanceWidget: React.FC<Props> = ({ ads, topObjectives }) => {

  // 1. Aggregation Logic
  const processedData = useMemo(() => {
    // IF pre-calculated data is provided, map it to the internal format
    if (topObjectives && topObjectives.length > 0) {
        return topObjectives.map(obj => {
            // Map TopObjective to ObjectiveMetric structure
            // Note: TopObjective has { objective, investment, leads, purchases }
            // It lacks: impressions, clicks, msgs, freqWeightedSum, count.
            // But the Chart only needs: objective, spend, leads, cpr (smart).
            // The Table needs: spend, purchases, leads, cpl, cpc, cpr, cpm, freq, impr, clicks.
            // Our `useDashboardMetrics` hook calculation for TopObjective ONLY has: investment, leads, purchases.
            // It DOES NOT have impressions, clicks, etc.
            // This is a GAP in the plan vs existing widget requirements.
            // The existing widget displays a detailed table with CPM, CPC, Clicks, Impressions.
            // My `useDashboardMetrics` implementation of `topObjectives` was simplified:
            //    return { objective, investment: inv, leads: lds, purchases: prs };
            //
            // SOLUTION: I should UPDATE `useDashboardMetrics.ts` to include all these fields for TopObjectives!
            // OR I should simplify the Widget to only show what's available.
            // Given "User Request: Implement Managerial View metrics... Garantir cálculo correto de KPIs", 
            // and the user provided a specific list of cards/charts, preserving the FULL table might be desired.
            // However, the PROMPT didn't explicitly ask to rewrite the `ObjectivesPerformanceWidget`.
            // But if I swap the data source, I break the table columns if data is missing.
            //
            // Let's UPDATE `useDashboardMetrics.ts` to include full details for TopObjectives and TopCreatives.
            // It's safer.
            //
            // But I cannot update the hook in THIS tool call for the widget.
            // I will implement the Logic here assuming the hook WILL provide it (I'll update the hook next).
            // Or I can update the hook FIRST.
            //
            // Actually, I'll update the Widget to handle missing data gracefully (display 0 or -), 
            // AND I will update the Hook in the next step to provide as much as possible.
            
            const spend = obj.investment;
            const leads = obj.leads;
            const purchases = obj.purchases;
            const impressions = (obj as any).impressions || 0;
            const clicks = (obj as any).clicks || 0;
            const msgs = (obj as any).msgs || 0; // if added to hook
            
            const cpl = leads > 0 ? spend / leads : 0;
            const cpr = (purchases > 0 ? spend / purchases : (leads > 0 ? spend / leads : 0)); // Simplified Smart CPR
            const cpc = clicks > 0 ? spend / clicks : 0;
            const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
            
            return {
                objective: obj.objective,
                spend,
                leads,
                purchases,
                impressions,
                clicks,
                msgs,
                freqWeightedSum: 0,
                count: 1,
                cpl,
                cpc,
                cpm,
                cpr,
                freq: 0, // Hook doesn't calculate freq for groups yet
                primaryResult: purchases || leads || clicks
            };
        });
    }

    const groups = new Map<string, ObjectiveMetric>();

    ads.forEach(ad => {
      // Normalize Objective Name
      const objName = (ad.objective || 'Desconhecido').trim();
      const current = groups.get(objName) || {
        objective: objName,
        spend: 0,
        impressions: 0,
        clicks: 0,
        leads: 0,
        purchases: 0,
        msgs: 0,
        freqWeightedSum: 0,
        count: 0
      };

      // Sum Metrics
      current.spend += ad.valor_gasto;
      current.impressions += ad.impressoes;
      current.clicks += ad.cliques_todos;
      // User Request: Leads should be sum of msgs_iniciadas
      current.leads += ad.msgs_iniciadas || 0;
      current.purchases += ad.compras || 0;
      current.msgs += ad.msgs_iniciadas || 0;
      
      // Frequency weighting
      current.freqWeightedSum += (ad.frequencia || 0) * ad.impressoes;
      
      current.count += 1;
      groups.set(objName, current);
    });

    // Calculate Derived Metrics & CPR
    const results = Array.from(groups.values()).map(g => {
        const cpl = g.leads > 0 ? g.spend / g.leads : 0;
        const cpc = g.clicks > 0 ? g.spend / g.clicks : 0;
        const cpm = g.impressions > 0 ? (g.spend / g.impressions) * 1000 : 0;
        const freq = g.impressions > 0 ? g.freqWeightedSum / g.impressions : 0;

        // Smart CPR Logic
        let primaryResult = 0;
        const lowerObj = g.objective.toLowerCase();

        if (lowerObj.includes('venda') || lowerObj.includes('conve') || lowerObj.includes('sales')) {
            primaryResult = g.purchases;
        } else if (lowerObj.includes('cadastro') || lowerObj.includes('lead')) {
            primaryResult = g.leads;
        } else if (lowerObj.includes('trafego') || lowerObj.includes('traffic') || lowerObj.includes('clique')) {
            primaryResult = g.clicks;
        } else if (lowerObj.includes('engaja') || lowerObj.includes('mensagem') || lowerObj.includes('message')) {
            primaryResult = g.msgs > 0 ? g.msgs : g.clicks; // Fallback to clicks if msgs 0
        } else {
            // Generic Fallback
            primaryResult = g.leads > 0 ? g.leads : g.clicks;
        }

        const cpr = primaryResult > 0 ? g.spend / primaryResult : 0;

        return {
            ...g,
            cpl,
            cpc,
            cpm,
            freq,
            cpr,
            primaryResult
        };
    });

    // Sort by Spend Descending
    return results.sort((a, b) => b.spend - a.spend);
  }, [ads, topObjectives]);


  // Formatters
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);
  const formatDecimal = (val: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  // Footer Totals
  const totals = useMemo(() => {
     return processedData.reduce((acc, curr) => ({
         spend: acc.spend + curr.spend,
         purchases: acc.purchases + curr.purchases,
         leads: acc.leads + curr.leads,
         clicks: acc.clicks + curr.clicks,
         impressions: acc.impressions + curr.impressions,
         weightedFreq: acc.weightedFreq + (curr.freq * curr.impressions)
     }), { spend: 0, purchases: 0, leads: 0, clicks: 0, impressions: 0, weightedFreq: 0 });
  }, [processedData]);
  
  const avgCpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const avgFreq = totals.impressions > 0 ? totals.weightedFreq / totals.impressions : 0;

  if (processedData.length === 0) {
      return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <AlertCircle size={32} className="opacity-20" />
            <span>Nenhum dado de objetivo disponível para o período selecionado.</span>
        </div>
      );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 w-full">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <BarChart3 size={20} />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-800">Performance por Objetivo</h3>
                <p className="text-xs text-slate-500">Análise agregada de investimento e retorno.</p>
            </div>
        </div>

        <div className="flex flex-col gap-8">
            
            {/* Section 1: Chart */}
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                        data={processedData} 
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="objective" 
                            type="category" 
                            width={100} 
                            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                            tickFormatter={(val) => val.length > 20 ? val.substring(0, 18) + '...' : val}
                        />
                        <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-slate-800 text-white text-xs rounded-lg p-3 shadow-xl">
                                            <p className="font-bold mb-2 text-sm">{data.objective}</p>
                                            <div className="space-y-1 text-slate-300">
                                                <div className="flex justify-between gap-4">
                                                    <span>Investimento:</span>
                                                    <span className="font-mono text-white">{formatCurrency(data.spend)}</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span>Leads:</span>
                                                    <span className="text-white">{formatNumber(data.leads)}</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-emerald-400 font-bold">CPR (Smart):</span>
                                                    <span className="font-mono text-white">{formatCurrency(data.cpr)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="spend" radius={[0, 4, 4, 0]} barSize={24}>
                            {processedData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="#4F46E5" />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Section 2: Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-slate-100">
                            <th className="py-2 px-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-left">Objetivo</th>
                            <th className="py-2 px-2 text-xs font-bold text-indigo-900 bg-indigo-50/30 uppercase tracking-wider text-right rounded-tl-lg">Investimento</th>
                            <th className="py-2 px-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Compras</th>
                            <th className="py-2 px-2 text-xs font-bold text-indigo-900 bg-indigo-50/30 uppercase tracking-wider text-right">Leads</th>
                            <th className="py-2 px-2 text-xs font-bold text-indigo-900 bg-indigo-50/30 uppercase tracking-wider text-right rounded-tr-lg">CPL</th>
                            <th className="py-2 px-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">CPC</th>
                            <th className="py-2 px-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-right text-indigo-600">CPR</th>
                            <th className="py-2 px-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">CPM</th>
                            <th className="py-2 px-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Freq.</th>
                            <th className="py-2 px-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Impr.</th>
                            <th className="py-2 px-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Cliques</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedData.map((row, idx) => (
                            <tr key={idx} className="even:bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-50 last:border-0">
                                <td className="py-3 px-2 text-sm font-bold text-slate-700 whitespace-nowrap">{row.objective}</td>
                                <td className="py-3 px-2 text-xs font-bold text-indigo-900 bg-indigo-50/30 font-mono text-right">{formatCurrency(row.spend)}</td>
                                <td className="py-3 px-2 text-xs font-medium text-slate-600 text-right">{formatNumber(row.purchases)}</td>
                                <td className="py-3 px-2 text-xs font-bold text-indigo-900 bg-indigo-50/30 text-right">{formatNumber(row.leads)}</td>
                                <td className="py-3 px-2 text-xs font-bold text-indigo-900 bg-indigo-50/30 text-right">{formatCurrency(row.cpl)}</td>
                                <td className="py-3 px-2 text-xs font-medium text-slate-600 text-right text-slate-500">{formatCurrency(row.cpc)}</td>
                                <td className="py-3 px-2 text-xs font-bold text-indigo-600 text-right bg-indigo-50/50 rounded">{formatCurrency(row.cpr)}</td>
                                <td className="py-3 px-2 text-xs font-medium text-slate-600 text-right text-slate-500">{formatCurrency(row.cpm)}</td>
                                <td className="py-3 px-2 text-xs font-medium text-slate-600 text-right text-slate-500">{formatDecimal(row.freq)}</td>
                                <td className="py-3 px-2 text-xs font-medium text-slate-600 text-right text-slate-400">{formatNumber(row.impressions)}</td>
                                <td className="py-3 px-2 text-xs font-medium text-slate-600 text-right text-slate-400">{formatNumber(row.clicks)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-100 border-t-2 border-slate-200 font-bold text-xs text-slate-700">
                            <td className="py-3 px-2 text-left">TOTAL</td>
                            <td className="py-3 px-2 text-right bg-indigo-50/30 text-indigo-900">{formatCurrency(totals.spend)}</td>
                            <td className="py-3 px-2 text-right">{formatNumber(totals.purchases)}</td>
                            <td className="py-3 px-2 text-right bg-indigo-50/30 text-indigo-900">{formatNumber(totals.leads)}</td>
                            <td className="py-3 px-2 text-right bg-indigo-50/30 text-indigo-900">-</td>
                            <td className="py-3 px-2 text-right">-</td>
                            <td className="py-3 px-2 text-right">-</td>
                            <td className="py-3 px-2 text-right">{formatCurrency(avgCpm)}</td>
                            <td className="py-3 px-2 text-right">{formatDecimal(avgFreq)}</td>
                            <td className="py-3 px-2 text-right">{formatNumber(totals.impressions)}</td>
                            <td className="py-3 px-2 text-right">{formatNumber(totals.clicks)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

        </div>
    </div>
  );
};
