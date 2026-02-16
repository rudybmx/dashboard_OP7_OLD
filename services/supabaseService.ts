export { supabase } from './supabaseClient';
import { supabase } from './supabaseClient';
import { CampaignData, SummaryReportRow, MetaAdAccount } from '../types';
import { format } from 'date-fns';
import { MOCK_DATA } from '../constants';
import { Database } from '../types/database.types';
import { logger } from '../lib/logger';


// Tipos auxiliares para evitar 'any'
type ViewRow = Database['public']['Views']['vw_dashboard_unified']['Row'];
type AccountConfigInsert = Database['public']['Tables']['accounts_config']['Insert'];
type FranchiseRow = Database['public']['Tables']['tb_franqueados']['Row'];
type MetaAccountUpdate = Database['public']['Tables']['tb_meta_ads_contas']['Update'];

// Type for our new View
type FirstUrlRow = {
    ad_id: string;
    ad_image_url: string;
    first_seen_date: string;
};

// Tabela/View no Supabase
const VIEW_NAME = 'vw_dashboard_unified';

import { getPreviousPeriod, formatDateForDB } from '../lib/dateUtils';

// --- HELPER: Centralized User Access Profile Fetch ---
// Moved to AuthProvider.tsx (Internal Auth)

// --- HELPER: Fetch First URLs for Persistence ---
const fetchAdFirstUrls = async (adIds: string[]): Promise<FirstUrlRow[]> => {
    if (!adIds.length) return [];

    const uniqueIds = Array.from(new Set(adIds));

    const { data, error } = await supabase
        .from('vw_ad_first_urls' as any) 
        .select('ad_id, ad_image_url, first_seen_date')
        .in('ad_id', uniqueIds);

    if (error) {
        // Suppress error if view doesn't exist yet
        return [];
    }

    return (data as unknown as FirstUrlRow[]) || [];
};

export const fetchCampaignData = async (
    startDate: Date,
    endDate: Date,
    franchiseFilter?: string[],
    accountFilter?: string[]
): Promise<{
    current: CampaignData[],
    previous: CampaignData[],
    isMock: boolean,
    error: string | null
}> => {
    try {
        const { start: prevStart, end: prevEnd } = getPreviousPeriod(startDate, endDate);
        const currentStartStr = formatDateForDB(startDate);
        const currentEndStr = formatDateForDB(endDate);
        const prevStartStr = formatDateForDB(prevStart);
        const prevEndStr = formatDateForDB(prevEnd);

        let finalFranchisesIds = franchiseFilter && franchiseFilter.length > 0 ? franchiseFilter : null;
        let finalAccounts = accountFilter && accountFilter.length > 0 ? accountFilter : null;

        


        // If user is restricted, we merge/intersect logic (omitted for brevity, relying on backend RLS/policy usually, but here we do param injection)
        // If we resolved IDs, usage them.
        
        // Call RPC
        const [currRes, prevRes] = await Promise.all([
            (supabase.rpc as any)('get_campaign_summary', {
                p_start_date: currentStartStr,
                p_end_date: currentEndStr,
                p_franchise_ids: finalFranchisesIds,
                p_account_ids: finalAccounts
            }),
            (supabase.rpc as any)('get_campaign_summary', {
                p_start_date: prevStartStr,
                p_end_date: prevEndStr,
                p_franchise_ids: finalFranchisesIds,
                p_account_ids: finalAccounts
            })
        ]);

        if (currRes.error) throw new Error(`Current Query Error: ${currRes.error.message}`);
        if (prevRes.error) throw new Error(`Previous Query Error: ${prevRes.error.message}`);

        const currentDataRaw = currRes.data || [];
        const previousDataRaw = prevRes.data || [];

        // --- Data Merge: First-URL Persistence ---
        const adsWithMissingUrls = currentDataRaw.filter(
            (row: ViewRow) => !row.ad_image_url || row.ad_image_url.trim() === ''
        ).map((row: ViewRow) => row.ad_id).filter(Boolean);

        let urlMap = new Map<string, string>();

        if (adsWithMissingUrls.length > 0) {
            const firstUrls = await fetchAdFirstUrls(adsWithMissingUrls);
            firstUrls.sort((a, b) =>
                new Date(a.first_seen_date).getTime() - new Date(b.first_seen_date).getTime()
            );
            firstUrls.forEach(row => {
                if (row.ad_image_url) {
                    urlMap.set(row.ad_id, row.ad_image_url);
                }
            });
        }

        const mapRow = (row: ViewRow): CampaignData => {
            let imageUrl = row.ad_image_url || undefined;
            if (!imageUrl || imageUrl.trim() === '') {
                if (row.ad_id && urlMap.has(row.ad_id)) {
                    imageUrl = urlMap.get(row.ad_id);
                }
            }

            return {
                unique_id: row.unique_id || `gen-${Math.random()}`,
                franqueado: row.franqueado || '',
                account_id: String(row.account_id || ''),
                account_name: row.account_name || '',
                ad_id: String(row.ad_id || ''),
                date_start: row.date_start || '',
                campaign_name: row.campaign_name || '',
                adset_name: row.adset_name || undefined,
                ad_name: row.ad_name || undefined,
                objective: row.objective || undefined,
                valor_gasto: row.valor_gasto || 0,
                cpc: row.cpc || 0,
                ctr: row.ctr || 0,
                cpm: row.cpm || 0,
                frequencia: row.frequencia || 0,
                custo_por_lead: row.custo_por_lead || 0,
                custo_por_compra: row.custo_por_compra || 0,
                alcance: row.alcance || 0,
                impressoes: row.impressoes || 0,
                cliques_todos: row.cliques_todos || 0,
                leads_total: row.leads_total || 0,
                compras: row.compras || 0,
                msgs_iniciadas: row.msgs_iniciadas || 0,
                msgs_conexoes: row.msgs_conexoes || 0,
                msgs_novos_contatos: row.msgs_novos_contatos || 0,
                msgs_profundidade_2: row.msgs_profundidade_2 || 0,
                msgs_profundidade_3: row.msgs_profundidade_3 || 0,
                // Demographics / Targeting Mapping
                target_plataformas: row.target_plataformas || '',
                target_interesses: row.target_interesses || undefined,
                target_familia: row.target_familia || undefined,
                target_comportamentos: row.target_comportamentos || undefined,
                target_publicos_custom: row.target_publicos_custom || undefined,
                target_local_1: row.target_local_1 || undefined,
                target_local_2: row.target_local_2 || undefined,
                target_local_3: row.target_local_3 || undefined,
                target_tipo_local: row.target_tipo_local || undefined,
                target_brand_safety: row.target_brand_safety || undefined,
                target_posicao_fb: row.target_posicao_fb || undefined,
                target_posicao_ig: row.target_posicao_ig || undefined,
                target_idade_min: row.target_idade_min || undefined,
                target_idade_max: row.target_idade_max || undefined,

                ad_image_url: imageUrl,
                ad_destination_url: row.ad_destination_url || undefined,
                ad_post_link: row.ad_post_link || undefined,
                ad_body: row.ad_body || undefined,
                ad_cta: row.ad_cta || undefined,
            };
        };

        return {
            current: currentDataRaw.map(mapRow),
            previous: previousDataRaw.map(mapRow),
            isMock: false,
            error: null
        };

    } catch (err: any) {
        logger.error('Failed to fetch campaign data:', err);
        return { current: [], previous: [], isMock: true, error: err.message || 'Erro desconhecido' };
    }
};

export const fetchKPIComparison = async (
    startDate: Date,
    endDate: Date,
    franchiseFilter?: string[],
    accountFilter?: string[]
) => {
    try {
        const { start: prevStart, end: prevEnd } = getPreviousPeriod(startDate, endDate);

        let finalFranchisesIds = franchiseFilter && franchiseFilter.length > 0 ? franchiseFilter : null;
        let finalAccounts = accountFilter && accountFilter.length > 0 ? accountFilter : null;

        const { data, error } = await (supabase.rpc as any)('get_kpi_comparison', {
            p_start_date: formatDateForDB(startDate),
            p_end_date: formatDateForDB(endDate),
            p_prev_start_date: formatDateForDB(prevStart),
            p_prev_end_date: formatDateForDB(prevEnd),
            p_franchise_filter: finalFranchisesIds,
            p_account_filter: finalAccounts
        });

        if (error) {
            logger.error('KPI RPC Error:', error);
            return null;
        }

        return data[0]; 

    } catch (err) {
        logger.error('KPI Fetch Failed:', err);
        return null;
    }
};

export const fetchSummaryReport = async (
    startDate: Date,
    endDate: Date,
    franchiseFilter?: string[],
    accountFilter?: string[]
): Promise<SummaryReportRow[]> => {
    try {
        let finalFranchiseFilter = franchiseFilter && franchiseFilter.length > 0 ? franchiseFilter : null;
        let finalAccountFilter = accountFilter && accountFilter.length > 0 ? accountFilter : null;

        const { data, error } = await (supabase.rpc as any)('get_managerial_data', {
            p_start_date: format(startDate, 'yyyy-MM-dd'),
            p_end_date: format(endDate, 'yyyy-MM-dd'),
            p_franchise_filter: finalFranchiseFilter,
            p_account_filter: finalAccountFilter
        });

        if (error) {
            logger.error('Summary Report RPC Error:', error);
            throw error;
        }

        return data || [];

    } catch (err) {
        logger.error('Summary Fetch Failed:', err);
        return [];
    }
};

export const fetchAccountsConfig = async () => {
    const { data, error } = await supabase
        .from('accounts_config')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const saveAccountConfig = async (account: AccountConfigInsert) => {
    const { data, error } = await supabase
        .from('accounts_config')
        .insert([account])
        .select();

    if (error) throw error;
    return data;
};

export const addAccountConfig = async (config: AccountConfigInsert) => {
    const { data, error } = await supabase
        .from('accounts_config')
        .insert(config)
        .select()
        .single();

    if (error) throw error;
    return data;
};

const safeFloat = (val: string | number | null | undefined): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val; 

    let str = String(val).trim();
    if (str.startsWith('R$')) str = str.replace('R$', '').trim();
    if (!str.includes(',') && !isNaN(Number(str))) {
        return parseFloat(str);
    }
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
};

// BM Settings (tb_meta_ads_contas)
export const fetchMetaAccounts = async (): Promise<MetaAdAccount[]> => {
    // Uses RPC to bypass RLS since Supabase Client is Anon (Internal Auth)
    // Cast to any to avoid TS error until types are regenerated
    const { data, error } = await (supabase.rpc as any)('get_all_meta_accounts');

    if (error) {
        logger.error('Error fetching meta accounts:', error);
        return [];
    }

    // Helper to safely parse float
    const safeFloat = (val: any) => {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
    };

    return (data as any[]).map(row => ({
        id: row.account_id,                        // PK interna da linha (usando account_id como ID único)
        account_id: row.account_id,               // act na Meta
        account_name: row.nome_original || 'Sem Nome',  // nome da conta na Meta
        display_name: row.nome_ajustado || '',    // Nome Dashboard (editável no front)
        // REMOVER uso de franchise_id no front (coluna Vínculo vai sair), mas manter se precisar pra filtros legados
        franchise_id: row.franqueado || '',
        franchise_name: '', // Não temos o join aqui, mas o front não vai usar mais
        categoria_id: row.categoria_id || '',
        status: (row.status_interno === 'removed' ? 'removed' : 'active') as 'removed' | 'active',
        // Visibilidade deve iniciar sempre inativa quando não definido:
        client_visibility: row.client_visibility ?? false,
        current_balance: safeFloat(row.saldo_balanco),
        last_sync: row.updated_at || new Date().toISOString(),
        status_meta: row.status_meta || undefined,
        motivo_bloqueio: row.motivo_bloqueio || undefined,
        total_gasto: safeFloat(row.total_gasto),
        status_interno: row.status_interno || 'A Classificar',
    }));
};

export const updateMetaAccount = async (id: string, updates: Partial<MetaAdAccount>) => {
    // Map frontend fields to RPC params
    const params: any = {
        p_account_id: id
    };
    
    // Only include params if they are defined in updates
    if (updates.display_name !== undefined) params.p_display_name = updates.display_name;
    if (updates.client_visibility !== undefined) params.p_client_visibility = updates.client_visibility;
    if (updates.franchise_id !== undefined) params.p_franqueado = updates.franchise_id;
    if (updates.categoria_id !== undefined) params.p_categoria_id = updates.categoria_id;

    // Check if we have any updates besides ID
    if (Object.keys(params).length <= 1) return;

    const { error } = await (supabase.rpc as any)('update_meta_account_settings', params);

    if (error) throw error;
};

export const fetchFranchises = async () => {
    const { data, error } = await supabase
        .from('tb_franqueados')
        .select('*')
        .order('nome');

    if (error) {
        logger.error('Error fetching franchises:', error);
        return [];
    }

    return (data || []).map((f: FranchiseRow) => ({
        id: f.id,
        name: f.nome || 'Sem Nome',
        active: f.ativo || false
    }));
};





export type CategoryRow = Database['public']['Tables']['tb_categorias_clientes']['Row'];
export type CategoryInsert = Database['public']['Tables']['tb_categorias_clientes']['Insert'];
export type CategoryUpdate = Database['public']['Tables']['tb_categorias_clientes']['Update'];

export const fetchCategories = async () => {
    const { data, error } = await supabase
        .from('tb_categorias_clientes')
        .select('*')
        .order('nome_categoria', { ascending: true });

    if (error) {
        logger.error('Error fetching categories:', error);
        return [];
    }
    return data || [];
};

export const createCategory = async (category: CategoryInsert) => {
    const { data, error } = await supabase
        .from('tb_categorias_clientes')
        .insert(category)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateCategory = async (id: string, updates: CategoryUpdate) => {
    const { data, error } = await supabase
        .from('tb_categorias_clientes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteCategory = async (id: string) => {
    const { error } = await supabase
        .from('tb_categorias_clientes')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

export type PlanningRow = Database['public']['Tables']['tb_planejamento_metas']['Row'];
export type PlanningInsert = Database['public']['Tables']['tb_planejamento_metas']['Insert'];
export type PlanningUpdate = Database['public']['Tables']['tb_planejamento_metas']['Update'];

export const fetchPlannings = async (accountId?: string) => {
    let query = supabase
        .from('tb_planejamento_metas')
        .select(`
            *,
            account:tb_meta_ads_contas(account_id, nome_original, nome_ajustado, categoria_id)
        `)
        .eq('active', true)
        .order('created_at', { ascending: false });

    if (accountId) {
        query = query.eq('account_id', accountId);
    }

    const { data, error } = await query;

    if (error) {
        logger.error('Error fetching plannings:', error);
        return [];
    }
    return data || [];
};

export const savePlanning = async (planning: PlanningInsert) => {
    if (planning.is_undefined) {
        await supabase
            .from('tb_planejamento_metas')
            .update({ active: false })
            .eq('account_id', planning.account_id)
            .eq('is_undefined', true)
            .eq('active', true);
    } else {
        if (planning.month && planning.year) {
            await supabase
                .from('tb_planejamento_metas')
                .update({ active: false })
                .eq('account_id', planning.account_id)
                .eq('month', planning.month)
                .eq('year', planning.year)
                .eq('is_undefined', false)
                .eq('active', true);
        }
    }

    const { data, error } = await supabase
        .from('tb_planejamento_metas')
        .insert(planning)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deactivatePlanning = async (id: string) => {
    const { error } = await supabase
        .from('tb_planejamento_metas')
        .update({ active: false })
        .eq('id', id);

    if (error) throw error;
};