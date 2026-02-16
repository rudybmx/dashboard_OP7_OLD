
export type Platform = 'facebook' | 'google' | 'instagram' | 'audience_network';

export interface DashboardMetric {
  // Identification
  unique_id: string; // Composite key or specific ID
  franqueado: string;
  account_id: string; // Normalized to string from DB
  account_name: string;
  ad_id: string; // Normalized to string
  date_start: string; // YYYY-MM-DD
  campaign_name: string;
  adset_name?: string;
  ad_name?: string;
  objective?: string;

  // Metrics (Cost & Efficiency) - All numeric
  valor_gasto: number;
  cpc: number;
  ctr: number;
  cpm: number;
  frequencia: number;
  custo_por_lead: number;
  custo_por_compra: number;
  // New Backend Metrics
  cpl_conversas?: number;
  cpl_compras?: number; // Override/Alias
  cpl_total?: number;
  alcance: number;
  valor_compras?: number; // Total Purchase Value (Revenue)

  // Volume (Bottom Funnel) - All numeric
  impressoes: number;
  cliques_todos: number;
  leads_total: number;
  compras: number;
  msgs_iniciadas: number;
  msgs_conexoes: number;
  msgs_novos_contatos: number;
  msgs_profundidade_2: number;
  msgs_profundidade_3: number;

  // Targeting & Platform
  target_plataformas: string; // 'facebook' | 'instagram' | 'google' | ... (normalized by View)
  target_interesses?: string;
  target_familia?: string;
  target_comportamentos?: string;
  target_publicos_custom?: string;
  target_local_1?: string;
  target_local_2?: string;
  target_local_3?: string;
  target_tipo_local?: string;
  target_brand_safety?: string;
  target_posicao_fb?: string;
  target_posicao_ig?: string;
  target_idade_min?: number;
  target_idade_max?: number;

  // Creative
  ad_image_url?: string;
  ad_title?: string;
  ad_body?: string;
  ad_destination_url?: string;
  ad_cta?: string;
  ad_post_link?: string;
}

export type CampaignData = DashboardMetric; // Alias for backward compatibility if needed

export interface AccountConfig {
  id: string;
  account_id: string;
  franqueado: string;
  account_name: string;
  nome_ajustado?: string;
  created_at: string;
}

export interface KPIAggregates {
  totalSpend: number;
  totalLeads: number;
  cpl: number;
  roas: number;
  totalImpressions: number;
  totalClicks: number;
}

export interface Franchise {
  id: string;
  name: string;
  active?: boolean;
}

export interface MetaAdAccount {
  id: string; // Internal UUID
  account_id: string; // Meta Account ID (e.g. act_123)
  account_name: string; // Original Name
  display_name?: string; // Friendly Name
  franchise_id?: string; // Linked Franchise
  categoria_id?: string; // Linked Category
  status: 'active' | 'removed' | 'archived';
  client_visibility: boolean;
  current_balance: number;
  last_sync: string;
  status_meta?: string;
  motivo_bloqueio?: string;
  total_gasto?: number;
  status_interno?: string;
}

// User Management Types
export type UserRole = 'admin' | 'client';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  assigned_account_ids: string[];   // IDs das contas permitidas
  created_at: string;
}

export interface UserFormData {
  id?: string; // Optional for create
  name: string;
  email: string;
  password?: string; // Apenas para criação (não persistido no profile)
  role: UserRole;
  assigned_account_ids: string[];
}

export interface SummaryReportRow {
  meta_account_id: string;
  nome_conta: string;
  franquia: string;
  saldo_atual: number;
  investimento: number;
  leads: number;
  compras: number;
  conversas: number;
  clicks: number;
  impressoes: number;
  alcance: number;
  // New Backend Metrics
  cpl_conversas?: number;
  cpl_compras?: number;
  cpl_total?: number;
}