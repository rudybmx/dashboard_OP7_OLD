import { useState, useEffect } from 'react';
import { fetchCampaignData } from '../services/supabaseService';
import { CampaignData } from '../types';

export interface DashboardFilter {
  startDate: Date;
  endDate: Date;
  franchiseFilter?: string[];
  accountFilter?: string[];
}

export interface WeeklySeriesPoint {
  date: string;
  investment: number;
  leads: number;
  purchases: number;
}

export interface TopObjective {
  objective: string;
  investment: number;
  leads: number;
  purchases: number;
  // Extended props for Widget tables
  impressions?: number;
  clicks?: number;
  msgs?: number;
}

export interface TopCreative {
  ad_id: string;
  ad_name?: string;
  investment: number;
  leads: number;
  purchases: number;
  cpr?: number;
  // Extended props for Widget tables
  impressions?: number;
  clicks?: number;
  imageUrl?: string;
  link?: string;
}

export interface DashboardMetrics {
  investment: number;
  purchases: number;
  leads: number;
  cpl: number | null;
  impressions: number;
  reach: number;
  linkClicks: number;
  funnel: {
    impressions: number;
    reach: number;
    clicks: number;
    leads: number;
  };
  weeklySeries: WeeklySeriesPoint[];
  topObjectives: TopObjective[];
  topCreatives: TopCreative[];
}

// Helper: Group By
function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export function useDashboardMetrics(filters: DashboardFilter) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { startDate, endDate, franchiseFilter, accountFilter } = filters;
        
        // Fetch data using existing service
        const result = await fetchCampaignData(startDate, endDate, franchiseFilter, accountFilter);
        const rows = result.current;

        if (!mounted) return;

        // --- CALCULATION LOGIC ---

        // Basic KPI Aggregations
        const investment = rows.reduce((acc, r) => acc + (r.valor_gasto || 0), 0);
        const purchases = rows.reduce((acc, r) => acc + (r.compras || 0), 0);
        
        // Leads Logic: msgs_iniciadas + leads_total + compras
        const totalMsgsIniciadas = rows.reduce((acc, r) => acc + (r.msgs_iniciadas || 0), 0);
        const totalLeadsRaw = rows.reduce((acc, r) => acc + (r.leads_total || 0), 0);
        const totalCompras = purchases;
        const leads = totalMsgsIniciadas + totalLeadsRaw + totalCompras;

        const cpl = leads > 0 ? investment / leads : null;

        const impressions = rows.reduce((acc, r) => acc + (r.impressoes || 0), 0);
        const reach = rows.reduce((acc, r) => acc + (r.alcance || 0), 0);
        const linkClicks = rows.reduce((acc, r) => acc + (r.cliques_todos || 0), 0);

        // Funnel
        const funnel = {
          impressions,
          reach,
          clicks: linkClicks,
          leads,
        };

        // Weekly Series
        const byDay = groupBy(rows, r => r.date_start);
        const weeklySeries = Object.entries(byDay).map(([date, dayRows]) => {
          const inv = dayRows.reduce((acc, r) => acc + (r.valor_gasto || 0), 0);
          const lds = dayRows.reduce((acc, r) => acc + (r.leads_total || 0) + (r.msgs_iniciadas || 0) + (r.compras || 0), 0);
          const prs = dayRows.reduce((acc, r) => acc + (r.compras || 0), 0);
          return { date, investment: inv, leads: lds, purchases: prs };
        }).sort((a, b) => a.date.localeCompare(b.date));

        // Top Objectives
        const byObjective = groupBy(rows, r => r.objective || 'SEM OBJETIVO');
        const topObjectives = Object.entries(byObjective).map(([objective, group]) => {
          const inv = group.reduce((acc, r) => acc + (r.valor_gasto || 0), 0);
          const lds = group.reduce((acc, r) => acc + (r.leads_total || 0) + (r.msgs_iniciadas || 0) + (r.compras || 0), 0);
          const prs = group.reduce((acc, r) => acc + (r.compras || 0), 0);
          
          const impr = group.reduce((acc, r) => acc + (r.impressoes || 0), 0);
          const clks = group.reduce((acc, r) => acc + (r.cliques_todos || 0), 0);
          const msgs = group.reduce((acc, r) => acc + (r.msgs_iniciadas || 0), 0);

          return { 
             objective, 
             investment: inv, 
             leads: lds, 
             purchases: prs,
             impressions: impr,
             clicks: clks,
             msgs
          };
        }).sort((a, b) => b.investment - a.investment);

        // Top Creatives
        const byCreative = groupBy(rows, r => r.ad_id || 'SEM_ID');
        let topCreatives = Object.entries(byCreative).map(([ad_id, group]) => {
          const inv = group.reduce((acc, r) => acc + (r.valor_gasto || 0), 0);
          const lds = group.reduce((acc, r) => acc + (r.leads_total || 0) + (r.msgs_iniciadas || 0) + (r.compras || 0), 0);
          const prs = group.reduce((acc, r) => acc + (r.compras || 0), 0);
          const cpr = (lds + prs) > 0 ? inv / (lds + prs) : undefined;
          
          const impr = group.reduce((acc, r) => acc + (r.impressoes || 0), 0);
          const clks = group.reduce((acc, r) => acc + (r.cliques_todos || 0), 0);

          // Get metadata from first valid entry
          const first = group[0];
          const ad_name = first?.ad_name || first?.adset_name || first?.campaign_name || 'Anúncio sem nome';
          const imageUrl = first?.ad_image_url;
          const link = first?.ad_post_link || first?.ad_destination_url;
          
          return { 
              ad_id, 
              ad_name, 
              investment: inv, 
              leads: lds, 
              purchases: prs, 
              cpr,
              impressions: impr,
              clicks: clks,
              imageUrl,
              link
          };
        });

        topCreatives = topCreatives
          .sort((a, b) => b.investment - a.investment)
          .slice(0, 5);

        setMetrics({
          investment,
          purchases,
          leads,
          cpl,
          impressions,
          reach,
          linkClicks,
          funnel,
          weeklySeries,
          topObjectives,
          topCreatives
        });
        
      } catch (err: any) {
        console.error("Error calculating dashboard metrics:", err);
        setError(err.message || "Failed to load dashboard metrics");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => { mounted = false; };
  }, [
    filters.startDate.toISOString(), 
    filters.endDate.toISOString(), 
    // Join filters to stable strings for dep array
    (filters.franchiseFilter || []).join(','),
    (filters.accountFilter || []).join(',')
  ]);

  return { metrics, loading, error };
}
