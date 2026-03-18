import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../services/supabaseClient';
import { logger } from '../../../../lib/logger';
import { ConsolidatedMetrics, FinanceFilters } from '../model/types';
import { formatDateForDB } from '../../../../lib/dateUtils';

const PAGE_SIZE = 1000;

async function fetchFinanceData(filters: FinanceFilters): Promise<ConsolidatedMetrics> {
  const { accountIds, dateStart, dateEnd } = filters;
  const startStr = formatDateForDB(dateStart);
  const endStr = formatDateForDB(dateEnd);

  let allRows: any[] = [];
  let page = 0;

  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('vw_dashboard_unified')
      .select('*')
      .gte('date_start', startStr)
      .lte('date_start', endStr)
      .range(from, to);

    if (accountIds.length > 0) {
      query = query.in('account_id', accountIds);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('useFinanceData fetch error', error);
      throw new Error(error.message);
    }

    allRows = allRows.concat(data || []);

    if (!data || data.length < PAGE_SIZE) break;
    page++;
  }

  // vw_dashboard_unified columns: valor_gasto, leads_total, msgs_iniciadas, cliques_todos, impressoes, alcance
  const spend = allRows.reduce((s, r) => s + (Number(r.valor_gasto) || 0), 0);
  const leads = allRows.reduce((s, r) => s + (Number(r.leads_total) || 0), 0);
  const impressions = allRows.reduce((s, r) => s + (Number(r.impressoes) || 0), 0);
  const clicks = allRows.reduce((s, r) => s + (Number(r.cliques_todos) || 0), 0);
  const conversations = allRows.reduce((s, r) => s + (Number(r.msgs_iniciadas) || 0), 0);
  const reach = allRows.reduce((s, r) => s + (Number(r.alcance) || 0), 0);

  return {
    rawData: allRows,
    spend,
    leads,
    cpl: leads > 0 ? spend / leads : 0,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    conversations,
    reach,
  };
}

export function useFinanceData(filters: FinanceFilters | null) {
  return useQuery({
    queryKey: ['finance', filters?.accountIds, filters?.dateStart?.toISOString(), filters?.dateEnd?.toISOString()],
    queryFn: () => fetchFinanceData(filters!),
    enabled: !!filters && filters.accountIds.length > 0 && !!filters.dateStart && !!filters.dateEnd,
    staleTime: 1000 * 60 * 5,
  });
}
