import { useState, useEffect } from 'react';
import { fetchCampaignDataRaw, processCampaignData } from '../services/supabaseService';
import { calculateMetrics, AdsInsightRow } from '../src/utils/dataAggregation';
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
        
          
          // Fetch data using Raw Service (Hybrid Architecture)
          const rawRows = await fetchCampaignDataRaw(startDate, endDate, accountFilter ?? []);

          if (!mounted) return;

          // --- CALCULATION LOGIC ---
          // 1. Calculate Backend-Compatible Metrics (CPL, etc.)
          const metricsCalc = calculateMetrics(rawRows);

          const {
              valor_gasto,
              compras,
              leads_total,
              msgs_iniciadas,
              impressoes,
              alcance,
              cliques_todos,
              cpl_total,
          } = metricsCalc;

          // Leads Logic is now centralized in calculateMetrics (it sums leads+msgs+purchases? No, check implementation)
          // calculateMetrics sums fields individually.
          // The Hook had specific logic: leads = msgs + leads_total + compras.
          // Let's replicate that specific logic using the SUMS from calculateMetrics.
          
          const totalLeads = msgs_iniciadas + leads_total + compras;
          
          // Re-calculate CPL based on this specific "Total Leads" definition if it differs from calculateMetrics's generic one
          // calculateMetrics CPL = investment / leads_total.
          // User might want CPL = investment / (leads+msgs+compras).
          // Let's stick to the hook's previous logic for consistency or update dataAggregation?
          // The Hook's logic: cpl = investment / leads. (where leads = sum of 3 things).
          
          const cpl = totalLeads > 0 ? valor_gasto / totalLeads : null; 

          // Funnel
          const funnel = {
            impressions: impressoes,
            reach: alcance,
            clicks: cliques_todos,
            leads: totalLeads,
          };

          // Process rows for lists (add images, etc.)
          // We can do this in parallel or after? 
          // For Weekly/Objectives we can use rawRows (faster).
          // For TopCreatives we need images (processCampaignData).
          
          const processedRows = await processCampaignData(rawRows);
          const rows = processedRows; // Keep naming for compatibility below

        // Weekly Series (Aggregation by Day of Week: Mon-Sun)
        const daysOfWeek = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
        // Initialize buckets: 0=Mon, 1=Tue, ..., 6=Sun
        const weekBuckets = daysOfWeek.map(label => ({
            label,
            investment: 0,
            leads: 0,
            purchases: 0,
            count: 0
        }));

        rows.forEach(row => {
            if (!row.date_start) return;
            // Parse date (assuming YYYY-MM-DD from DB)
            const d = new Date(row.date_start);
            // getDay(): 0=Sun, 1=Mon...6=Sat
            let dayIdx = d.getUTCDay(); 
            
            // Adjust to Mon(0) -> Sun(6) index for our array
            // Mon(1)->0, Tue(2)->1... Sat(6)->5, Sun(0)->6
            let bucketIdx = dayIdx === 0 ? 6 : dayIdx - 1;

            if (weekBuckets[bucketIdx]) {
                weekBuckets[bucketIdx].investment += (row.valor_gasto || 0);
                weekBuckets[bucketIdx].leads += (row.leads_total || 0) + (row.msgs_iniciadas || 0) + (row.compras || 0);
                weekBuckets[bucketIdx].purchases += (row.compras || 0);
                weekBuckets[bucketIdx].count += 1;
            }
        });

        const weeklySeries = weekBuckets.map(b => ({
            date: b.label, // Reuse 'date' field for label to match interface
            investment: b.investment,
            leads: b.leads,
            purchases: b.purchases
        }));

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
          investment: valor_gasto,
          purchases: compras,
          leads: totalLeads,
          cpl,
          impressions: impressoes,
          reach: alcance,
          linkClicks: cliques_todos,
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
