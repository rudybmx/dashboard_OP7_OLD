export interface ConsolidatedMetrics {
  spend: number;
  leads: number;
  cpl: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversations: number;
  reach: number;
  rawData: any[];
}

export interface FinanceFilters {
  accountIds: string[];
  dateStart: Date;
  dateEnd: Date;
}
