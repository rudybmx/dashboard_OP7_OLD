
import { Database } from '../../types/database.types';

export type AdsInsightRow = Database['public']['Tables']['ads_insights']['Row'];

export interface AggregatedMetrics {
    valor_gasto: number;
    impressoes: number;
    cliques_todos: number;
    leads_total: number;
    compras: number;
    msgs_iniciadas: number;
    msgs_conexoes: number;
    alcance: number;
    
    // Calculated
    cpc: number;
    ctr: number;
    cpm: number;
    cpl_total: number;
    cpl_conversas: number;
    cpl_compras: number;
    frequencia: number;
}

/**
 * Calculates aggregated metrics from a list of raw ads_insights rows.
 * Handles division by zero gracefully.
 */
export const calculateMetrics = (data: AdsInsightRow[]): AggregatedMetrics => {
    
    // 1. Sum basic metrics
    const totals = data.reduce((acc, row) => ({
        valor_gasto: acc.valor_gasto + (row.valor_gasto || 0),
        impressoes: acc.impressoes + (row.impressoes || 0),
        cliques_todos: acc.cliques_todos + (row.cliques_todos || 0),
        leads_total: acc.leads_total + (row.leads_total || 0),
        compras: acc.compras + (row.compras || 0),
        msgs_iniciadas: acc.msgs_iniciadas + (row.msgs_iniciadas || 0),
        msgs_conexoes: acc.msgs_conexoes + (row.msgs_conexoes || 0),
        alcance: acc.alcance + (row.alcance || 0), // Note: Summing reach is an approximation, but standard for simple aggregation
    }), {
        valor_gasto: 0,
        impressoes: 0,
        cliques_todos: 0,
        leads_total: 0,
        compras: 0,
        msgs_iniciadas: 0,
        msgs_conexoes: 0,
        alcance: 0,
    });

    // 2. Calculate derived metrics
    const cpc = totals.cliques_todos > 0 ? totals.valor_gasto / totals.cliques_todos : 0;
    const ctr = totals.impressoes > 0 ? (totals.cliques_todos / totals.impressoes) * 100 : 0;
    const cpm = totals.impressoes > 0 ? (totals.valor_gasto / totals.impressoes) * 1000 : 0;
    
    const cpl_total = totals.leads_total > 0 ? totals.valor_gasto / totals.leads_total : 0;
    const cpl_conversas = totals.msgs_iniciadas > 0 ? totals.valor_gasto / totals.msgs_iniciadas : 0;
    const cpl_compras = totals.compras > 0 ? totals.valor_gasto / totals.compras : 0;
    
    const frequencia = totals.alcance > 0 ? totals.impressoes / totals.alcance : 0;

    return {
        ...totals,
        cpc,
        ctr,
        cpm,
        cpl_total,
        cpl_conversas,
        cpl_compras,
        frequencia
    };
};

/**
 * Helper to group data by a key (e.g., account_id, campaign_name)
 */
export const groupDataBy = (data: AdsInsightRow[], key: keyof AdsInsightRow) => {
    return data.reduce((acc, row) => {
        const groupKey = String(row[key] || 'Unknown');
        if (!acc[groupKey]) {
            acc[groupKey] = [];
        }
        acc[groupKey].push(row);
        return acc;
    }, {} as Record<string, AdsInsightRow[]>);
};
