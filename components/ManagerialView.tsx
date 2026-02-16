import React, { useMemo } from 'react';
import { RangeValue } from './ui/calendar'; 
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import { useAvailableBalance } from '../hooks/useAvailableBalance';
import { DollarSign, MessageCircle, Users, Target, TrendingUp, TrendingDown, Eye, Route, MousePointer2, Wallet, Loader2 } from 'lucide-react';
import { Funnel3DWidget } from './Funnel3DWidget';
import { WeeklyTrendsWidget } from './WeeklyTrendsWidget';
import { ObjectivesPerformanceWidget } from './ObjectivesPerformanceWidget';
import { TopCreativesWidget } from './TopCreativesWidget';

interface Props {
  dateRange: RangeValue | null;
  // Effective account IDs to filter by (includes handling of 'ALL' or specific selection)
  accountIds: string[]; 
  // Optional: keep selectedClient string for "names" if needed, but logic relies on IDs
  selectedClientLabel?: string; 
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

export const ManagerialView: React.FC<Props> = ({ dateRange, accountIds }) => {
  // Balance (Date Independent)
  const { balance: totalBalance, loading: balanceLoading } = useAvailableBalance(accountIds);

  // Metrics (Date Dependent)
  const { metrics, loading: metricsLoading, error } = useDashboardMetrics({
      startDate: dateRange?.start || new Date(),
      endDate: dateRange?.end || new Date(),
      accountFilter: accountIds
  });

  // Calculate Previous Period Metrics (Optional / TODO)
  // For now, we only implemented current period in useDashboardMetrics as per prompt instructions (focus on useDashboardMetrics basic signature first).
  // Prompt instructions: "Criar um hook, por exemplo useDashboardMetrics... Assinatura: startDate, endDate..."
  // It didn't explicitly ask for comparison/delta logic in the hook, BUT the ManagerialView UI relies heavily on Deltas.
  // The Prompt "Rules of Calculation" section defines metrics for "rows".
  // To keep Deltas working, we either need the hook to fetch PREVIOUS period too, or we accept losing Deltas for now.
  // User Prompt: "Card INVESTIMENTO → metrics.investment... Card COMPRAS → metrics.purchases... "
  // It does NOT mention Deltas in the mapping instruction.
  // It says: "Cartões com valores corretos... Funil... performance... Gráfico... Top 5..."
  // I will assume Deltas are NOT priority or can be 0/null for this refactor, as the prompt focused on the metrics object structure which has single values.
  // BUT the UI has `prevValue`, `delta`.
  // I will hardcode prev/delta to 0/empty for now to satisfy the interface, unless I double check prompt.
  // "Interface DashboardMetrics { ... weeklySeries ... }" -> No 'comparison' or 'prev' fields.
  // "Card INVESTIMENTO → metrics.investment" -> Direct mapping.
  // So I will remove Delta logic from UI or set to 0.

  const isLoading = balanceLoading || metricsLoading;

  if (isLoading && !metrics) {
      return (
          <div className="flex h-96 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
      );
  }

  if (error) {
      return <div className="p-4 text-red-500 bg-red-50 rounded-lg">Erro ao carregar métricas: {error}</div>;
  }

  // Safe defaults
  const m = metrics || {
      investment: 0, purchases: 0, leads: 0, cpl: 0, impressions: 0, reach: 0, linkClicks: 0,
      funnel: { impressions: 0, reach: 0, clicks: 0, leads: 0 },
      weeklySeries: [], topObjectives: [], topCreatives: []
  };

  const cards = [
    {
        title: 'Saldo Disponível',
        icon: <Wallet size={20} className="text-white" />,
        color: 'bg-emerald-600',
        value: formatCurrency(totalBalance),
        prevLabel: '---',
        prevValue: '---',
        delta: 0,
        inverseTrend: false,
        goalProgress: 100
    },
    {
      title: 'Investimento',
      icon: <DollarSign size={20} className="text-white" />,
      color: 'bg-indigo-600',
      value: formatCurrency(m.investment),
      prevLabel: '---', // Delta disabled
      prevValue: '---',
      delta: 0,
      inverseTrend: false, 
      goalProgress: 75 
    },
    {
      title: 'Compras',
      icon: <Target size={20} className="text-white" />,
      color: 'bg-blue-500',
      value: formatNumber(m.purchases),
      prevLabel: '---',
      prevValue: '---',
      delta: 0,
      inverseTrend: false,
      goalProgress: 60 
    },
    {
      title: 'Leads (Msgs)',
      icon: <MessageCircle size={20} className="text-white" />,
      color: 'bg-orange-500',
      value: formatNumber(m.leads),
      prevLabel: '---',
      prevValue: '---',
      delta: 0,
      inverseTrend: false,
      goalProgress: 45 
    },
    {
      title: 'CPL (Médio)',
      icon: <Users size={20} className="text-white" />,
      color: 'bg-emerald-500',
      value: formatCurrency(m.cpl || 0),
      prevLabel: '---',
      prevValue: '---',
      delta: 0,
      inverseTrend: true, 
      goalProgress: 90 
    }
  ];

  const secondaryMetrics = [
      { label: 'Impressões', value: formatNumber(m.impressions), icon: <Eye size={14}/> },
      { label: 'Alcance', value: formatNumber(m.reach), icon: <Route size={14}/> },
      { label: 'Cliques no Link', value: formatNumber(m.linkClicks), icon: <MousePointer2 size={14}/> },
  ];



  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. New Managerial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => {
             const isPositive = card.delta >= 0;
             const isGood = card.inverseTrend ? !isPositive : isPositive;
             const trendColor = isGood ? 'text-emerald-600' : 'text-red-500';
             const TrendIcon = isPositive ? TrendingUp : TrendingDown;
             const showTrend = card.delta !== 0 && card.prevValue !== '---';

             return (
                <div key={card.title} className="bg-white rounded-3xl p-5 shadow-lg shadow-indigo-500/5 border border-slate-100 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`h-10 w-10 rounded-xl ${card.color} shadow-lg shadow-indigo-500/20 flex items-center justify-center shrink-0`}>
                                {card.icon}
                            </div>
                            <span className="text-slate-500 font-bold text-sm uppercase tracking-wide">{card.title}</span>
                        </div>
                        
                        <div className="mb-4">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-1">{card.value}</h3>
                        </div>

                        <div className="flex flex-col text-xs mb-3 bg-slate-50 p-2 rounded-lg">
                             <span className="text-slate-400 font-medium mb-1">{card.prevLabel}</span>
                             <div className="flex items-center gap-2">
                                <span className="text-slate-600 font-bold">{card.prevValue}</span>
                                {showTrend && (
                                    <div className={`flex items-center gap-0.5 font-bold ${trendColor} text-[10px]`}>
                                        <TrendIcon size={12} />
                                        {Math.abs(card.delta).toFixed(1)}%
                                    </div>
                                )}
                             </div>
                        </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-50">
                        <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                            <span>Planejado do Mês</span>
                            <span>{card.goalProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${card.color} opacity-80`} 
                                style={{ width: `${card.goalProgress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
             );
        })}
      </div>

      {/* Secondary Metrics Row */}
      <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start px-2">
         {secondaryMetrics.map((met, idx) => (
             <div key={idx} className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm text-sm text-slate-600 font-medium hover:border-indigo-200 transition-colors">
                 <span className="text-slate-400">{met.icon}</span>
                 {met.label}: <span className="text-slate-900 font-bold">{met.value}</span>
             </div>
         ))}
      </div>

      {/* New Objectives & Top Creatives Widget */}
      <section className="space-y-8">
        <div className="w-full">
            <ObjectivesPerformanceWidget ads={[]} topObjectives={m.topObjectives} /> {/* Need to update Widget props */}
        </div>
        <div className="w-full">
            <TopCreativesWidget data={[]} topCreatives={m.topCreatives} /> {/* Need to update Widget props */}
        </div>
      </section>

      {/* 2. Charts Row (Funnel + Weekly Trends) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto lg:h-[450px]">
        
        {/* Widget 1: Funnel */}
        <Funnel3DWidget 
            investment={m.investment}
            reach={m.reach}
            impressions={m.impressions}
            clicks={m.linkClicks}
            leads={m.leads}
        />

        {/* Widget 2: Weekly Trends */}
        <WeeklyTrendsWidget data={m.weeklySeries.map(s => ({
            day: s.date, // Now comes as 'Segunda', 'Terça', etc.
            spend: s.investment,
            leads: s.leads
        }))} />


      </section>



      {/* 4. Geography & Age Analysis (Section C) */}




    </div>
  );
};

export default ManagerialView;