export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts_config: {
        Row: {
          account_id: string
          account_name: string
          created_at: string | null
          franqueado: string
          id: string
          nome_ajustado: string | null
        }
        Insert: {
          account_id: string
          account_name: string
          created_at?: string | null
          franqueado: string
          id?: string
          nome_ajustado?: string | null
        }
        Update: {
          account_id?: string
          account_name?: string
          created_at?: string | null
          franqueado?: string
          id?: string
          nome_ajustado?: string | null
        }
        Relationships: []
      }
      ads_insights: {
        Row: {
          account_id: number
          account_name: string | null
          ad_body: string | null
          ad_cta: string | null
          ad_destination_url: string | null
          ad_id: number
          ad_image_url: string | null
          ad_name: string | null
          ad_post_link: string | null
          ad_title: string | null
          adset_name: string | null
          alcance: number | null
          campaign_name: string | null
          cliques_todos: number | null
          compras: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          ctr: number | null
          custo_por_compra: number | null
          custo_por_lead: number | null
          date_start: string
          franqueado: string
          frequencia: number | null
          impressoes: number | null
          leads_total: number | null
          msgs_conexoes: number | null
          msgs_iniciadas: number | null
          msgs_novos_contatos: number | null
          msgs_profundidade_2: number | null
          msgs_profundidade_3: number | null
          objective: string | null
          target_brand_safety: string | null
          target_comportamentos: string | null
          target_familia: string | null
          target_idade_max: number | null
          target_idade_min: number | null
          target_interesses: string | null
          target_local_1: string | null
          target_local_2: string | null
          target_local_3: string | null
          target_plataformas: string | null
          target_posicao_fb: string | null
          target_posicao_ig: string | null
          target_publicos_custom: string | null
          target_tipo_local: string | null
          unique_id: string
          valor_gasto: number | null
        }
        Insert: {
          account_id: number
          account_name?: string | null
          ad_body?: string | null
          ad_cta?: string | null
          ad_destination_url?: string | null
          ad_id: number
          ad_image_url?: string | null
          ad_name?: string | null
          ad_post_link?: string | null
          ad_title?: string | null
          adset_name?: string | null
          alcance?: number | null
          campaign_name?: string | null
          cliques_todos?: number | null
          compras?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          custo_por_compra?: number | null
          custo_por_lead?: number | null
          date_start: string
          franqueado: string
          frequencia?: number | null
          impressoes?: number | null
          leads_total?: number | null
          msgs_conexoes?: number | null
          msgs_iniciadas?: number | null
          msgs_novos_contatos?: number | null
          msgs_profundidade_2?: number | null
          msgs_profundidade_3?: number | null
          objective?: string | null
          target_brand_safety?: string | null
          target_comportamentos?: string | null
          target_familia?: string | null
          target_idade_max?: number | null
          target_idade_min?: number | null
          target_interesses?: string | null
          target_local_1?: string | null
          target_local_2?: string | null
          target_local_3?: string | null
          target_plataformas?: string | null
          target_posicao_fb?: string | null
          target_posicao_ig?: string | null
          target_publicos_custom?: string | null
          target_tipo_local?: string | null
          unique_id: string
          valor_gasto?: number | null
        }
        Update: {
          account_id?: number
          account_name?: string | null
          ad_body?: string | null
          ad_cta?: string | null
          ad_destination_url?: string | null
          ad_id?: number
          ad_image_url?: string | null
          ad_name?: string | null
          ad_post_link?: string | null
          ad_title?: string | null
          adset_name?: string | null
          alcance?: number | null
          campaign_name?: string | null
          cliques_todos?: number | null
          compras?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          custo_por_compra?: number | null
          custo_por_lead?: number | null
          date_start?: string
          franqueado?: string
          frequencia?: number | null
          impressoes?: number | null
          leads_total?: number | null
          msgs_conexoes?: number | null
          msgs_iniciadas?: number | null
          msgs_novos_contatos?: number | null
          msgs_profundidade_2?: number | null
          msgs_profundidade_3?: number | null
          objective?: string | null
          target_brand_safety?: string | null
          target_comportamentos?: string | null
          target_familia?: string | null
          target_idade_max?: number | null
          target_idade_min?: number | null
          target_interesses?: string | null
          target_local_1?: string | null
          target_local_2?: string | null
          target_local_3?: string | null
          target_plataformas?: string | null
          target_posicao_fb?: string | null
          target_posicao_ig?: string | null
          target_publicos_custom?: string | null
          target_tipo_local?: string | null
          unique_id?: string
          valor_gasto?: number | null
        }
        Relationships: []
      }
      perfil_acesso: {
        Row: {
          assigned_account_ids: string[] | null
          assigned_franchise_ids: string[] | null
          ativo: boolean | null
          created_at: string
          email: string | null
          id: string
          nome: string | null
          role: string | null
          password: string
          permissions: Json | null
        }
        Insert: {
          assigned_account_ids?: string[] | null
          assigned_franchise_ids?: string[] | null
          ativo?: boolean | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          role?: string | null
          password?: string
          permissions?: Json | null
        }
        Update: {
          assigned_account_ids?: string[] | null
          assigned_franchise_ids?: string[] | null
          ativo?: boolean | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          role?: string | null
          password?: string
          permissions?: Json | null
        }
        Relationships: []
      }
      tb_categorias_clientes: {
        Row: {
          cpl_medio: number | null
          created_at: string | null
          fase1_nome: string | null
          fase1_perc: number | null
          fase2_nome: string | null
          fase2_perc: number | null
          fase3_nome: string | null
          fase3_perc: number | null
          fase4_nome: string | null
          fase4_perc: number | null
          id: string
          nome_categoria: string
        }
        Insert: {
          cpl_medio?: number | null
          created_at?: string | null
          fase1_nome?: string | null
          fase1_perc?: number | null
          fase2_nome?: string | null
          fase2_perc?: number | null
          fase3_nome?: string | null
          fase3_perc?: number | null
          fase4_nome?: string | null
          fase4_perc?: number | null
          id?: string
          nome_categoria: string
        }
        Update: {
          cpl_medio?: number | null
          created_at?: string | null
          fase1_nome?: string | null
          fase1_perc?: number | null
          fase2_nome?: string | null
          fase2_perc?: number | null
          fase3_nome?: string | null
          fase3_perc?: number | null
          fase4_nome?: string | null
          fase4_perc?: number | null
          id?: string
          nome_categoria?: string
        }
        Relationships: []
      }
      tb_franqueados: {
        Row: {
          ativo: boolean | null
          created_at: string
          id: string
          nome: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          nome?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          nome?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tb_meta_ads_contas: {
        Row: {
          account_id: string
          categoria_id: string | null
          client_visibility: boolean
          created_at: string
          currency: string | null
          franqueado: string | null
          motivo_bloqueio: string | null
          nome_ajustado: string | null
          nome_original: string | null
          saldo_balanco: string | null
          status_interno: string
          status_meta: string | null
          timezone_name: string | null
          total_gasto: number | null
          updated_at: string
        }
        Insert: {
          account_id: string
          categoria_id?: string | null
          client_visibility?: boolean
          created_at?: string
          currency?: string | null
          franqueado?: string | null
          motivo_bloqueio?: string | null
          nome_ajustado?: string | null
          nome_original?: string | null
          saldo_balanco?: string | null
          status_interno?: string
          status_meta?: string | null
          timezone_name?: string | null
          total_gasto?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          categoria_id?: string | null
          client_visibility?: boolean
          created_at?: string
          currency?: string | null
          franqueado?: string | null
          motivo_bloqueio?: string | null
          nome_ajustado?: string | null
          nome_original?: string | null
          saldo_balanco?: string | null
          status_interno?: string
          status_meta?: string | null
          timezone_name?: string | null
          total_gasto?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tb_meta_ads_contas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "tb_categorias_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      tb_planejamento_metas: {
        Row: {
          account_id: string
          active: boolean | null
          average_ticket: number
          cpl_average: number
          cpl_custom: boolean | null
          created_at: string | null
          id: string
          is_undefined: boolean | null
          month: number | null
          observation: string | null
          planned_revenue: number
          updated_at: string | null
          year: number | null
        }
        Insert: {
          account_id: string
          active?: boolean | null
          average_ticket: number
          cpl_average: number
          cpl_custom?: boolean | null
          created_at?: string | null
          id?: string
          is_undefined?: boolean | null
          month?: number | null
          observation?: string | null
          planned_revenue: number
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          account_id?: string
          active?: boolean | null
          average_ticket?: number
          cpl_average?: number
          cpl_custom?: boolean | null
          created_at?: string | null
          id?: string
          is_undefined?: boolean | null
          month?: number | null
          observation?: string | null
          planned_revenue?: number
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tb_planejamento_metas_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "tb_meta_ads_contas"
            referencedColumns: ["account_id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          assigned_account_ids: string[] | null
          assigned_franchise_ids: string[] | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          role: string | null
        }
        Insert: {
          assigned_account_ids?: string[] | null
          assigned_franchise_ids?: string[] | null
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          role?: string | null
        }
        Update: {
          assigned_account_ids?: string[] | null
          assigned_franchise_ids?: string[] | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          role?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      vw_dashboard_unified: {
        Row: {
          account_id: string | null
          account_name: string | null
          ad_body: string | null
          ad_cta: string | null
          ad_destination_url: string | null
          ad_id: string | null
          ad_image_url: string | null
          ad_name: string | null
          ad_post_link: string | null
          ad_title: string | null
          adset_name: string | null
          alcance: number | null
          campaign_name: string | null
          cliques_todos: number | null
          compras: number | null
          cpc: number | null
          cpm: number | null
          ctr: number | null
          custo_por_compra: number | null
          custo_por_lead: number | null
          date_start: string | null
          franqueado: string | null
          frequencia: number | null
          impressoes: number | null
          leads_total: number | null
          msgs_conexoes: number | null
          msgs_iniciadas: number | null
          msgs_novos_contatos: number | null
          msgs_profundidade_2: number | null
          msgs_profundidade_3: number | null
          objective: string | null
          target_brand_safety: string | null
          target_comportamentos: string | null
          target_familia: string | null
          target_idade_max: number | null
          target_idade_min: number | null
          target_interesses: string | null
          target_local_1: string | null
          target_local_2: string | null
          target_local_3: string | null
          target_plataformas: string | null
          target_posicao_fb: string | null
          target_posicao_ig: string | null
          target_publicos_custom: string | null
          target_tipo_local: string | null
          unique_id: string | null
          valor_gasto: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_campaign_summary: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_franchise_ids?: string[]
          p_account_ids?: string[]
        }
        Returns: {
          unique_id: string
          franqueado: string
          account_id: string
          account_name: string
          ad_id: string
          date_start: string
          campaign_name: string
          adset_name: string
          ad_name: string
          objective: string
          valor_gasto: number
          cpc: number
          ctr: number
          cpm: number
          frequencia: number
          custo_por_lead: number
          custo_por_compra: number
          alcance: number
          impressoes: number
          cliques_todos: number
          leads_total: number
          compras: number
          msgs_iniciadas: number
          msgs_conexoes: number
          msgs_novos_contatos: number
          msgs_profundidade_2: number
          msgs_profundidade_3: number
          target_plataformas: string
          target_interesses: string
          target_familia: string
          target_comportamentos: string
          target_publicos_custom: string
          target_local_1: string
          target_local_2: string
          target_local_3: string
          target_tipo_local: string
          target_brand_safety: string
          target_posicao_fb: string
          target_posicao_ig: string
          target_idade_min: number
          target_idade_max: number
          ad_image_url: string
          ad_title: string
          ad_body: string
          ad_destination_url: string
          ad_cta: string
          ad_post_link: string
        }[]
      }
      get_kpi_comparison: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_prev_start_date: string
          p_prev_end_date: string
          p_franchise_filter?: string[]
          p_account_filter?: string[]
        }
        Returns: {
          spend: number
          impressions: number
          clicks: number
          leads: number
          purchases: number
          conversations: number
          prev_spend: number
          prev_impressions: number
          prev_clicks: number
          prev_leads: number
          prev_purchases: number
          prev_conversations: number
        }[]
      }
      get_managerial_data: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_franchise_filter?: string[]
          p_account_filter?: string[]
        }
        Returns: {
          meta_account_id: string
          nome_conta: string
          franquia: string
          saldo_atual: number
          investimento: number
          leads: number
          compras: number
          conversas: number
          clicks: number
          impressoes: number
          alcance: number
        }[]
      }
      get_summary_report: {
        Args: {
          period_start: string
          period_end: string
          account_filter?: string
          campaign_filter?: string
        }
        Returns: {
          account_id: number
          account_name: string
          campaign_name: string
          campaign_id: string
          investimento: number
          impressoes: number
          cliques: number
          cpc: number
          ctr: number
          cpm: number
          leads: number
          custo_por_lead: number
          compras: number
          custo_por_compra: number
          vendas: number
          roas: number
        }[]
      }
      manage_users: {
        Args: {
          operation: 'create' | 'update' | 'delete' | 'reset_password'
          payload: Json
        }
        Returns: Json
      }
    }
    Enums: {
      account_status: "active" | "inactive" | "removed" | "pending"
      agenda_appointment_status:
      | "scheduled"
      | "cancelled"
      | "completed"
      | "no_show"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}


