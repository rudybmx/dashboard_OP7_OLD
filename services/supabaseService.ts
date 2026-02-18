export { supabase } from './supabaseClient';
import { supabase } from './supabaseClient';
import { CampaignData, SummaryReportRow, MetaAdAccount } from '../types';
import { Database } from '../types/database.types';
import { logger } from '../lib/logger';
import { AdsInsightRow } from '../src/utils/dataAggregation';
import { getPreviousPeriod, formatDateForDB } from '../lib/dateUtils';

// ============================================================================
// TIPOS AUXILIARES (derivados do schema do banco)
// ============================================================================


type FranchiseRow = Database['public']['Tables']['tb_franqueados']['Row'];

// View de persistência de image URLs
type FirstUrlRow = {
    ad_id: string;
    ad_image_url: string;
    first_seen_date: string;
};

// Tipos de retorno das RPCs (derivados de database.types.ts)
type KPIComparisonResult = Database['public']['Functions']['get_kpi_comparison']['Returns'][number];
type ManagerialDataResult = Database['public']['Functions']['get_managerial_data']['Returns'][number];

// Tipos de parâmetros das RPCs
interface KPIComparisonParams {
    p_start_date: string;
    p_end_date: string;
    p_prev_start_date: string;
    p_prev_end_date: string;
    p_user_email: string | null;
    p_franchise_filter: string[] | null;
    p_account_filter: string[] | null;
}

interface ManagerialDataParams {
    p_start_date: string;
    p_end_date: string;
    p_user_email: string | null;
    p_franchise_filter: string[] | null;
    p_account_filter: string[] | null;
}

interface MetaAccountRPCRow {
    account_id: string;
    nome_original: string | null;
    nome_ajustado: string | null;
    franqueado: string | null;
    categoria_id: string | null;
    status_interno: string;
    client_visibility: boolean | null;
    saldo_balanco: string | number | null;
    updated_at: string | null;
    status_meta: string | null;
    motivo_bloqueio: string | null;
    total_gasto: number | null;
}

interface UpdateMetaAccountParams {
    p_account_id: string;
    p_display_name?: string;
    p_client_visibility?: boolean;
    p_franqueado?: string;
    p_categoria_id?: string;
}

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

/** Extrai email do usuário autenticado via sessão local (AuthProvider usa localStorage) */
const getUserEmail = (): string | null => {
    try {
        const stored = localStorage.getItem('op7_local_session');
        if (!stored) return null;
        const session = JSON.parse(stored);
        return session?.email ?? null;
    } catch {
        return null;
    }
};

/** Converte valores monetários de string/number para number seguro */
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

/** Busca URLs persistidas de imagens para ads que perderam o link */
const fetchAdFirstUrls = async (adIds: string[]): Promise<FirstUrlRow[]> => {
    if (!adIds.length) return [];

    const uniqueIds = Array.from(new Set(adIds));

    // View pode não existir ainda — suprimir erro silenciosamente
    const { data, error } = await (supabase.from as any)('vw_ad_first_urls')
        .select('ad_id, ad_image_url, first_seen_date')
        .in('ad_id', uniqueIds);

    if (error) {
        logger.warn('[fetchAdFirstUrls] View may not exist yet:', error.message);
        return [];
    }

    return (data as unknown as FirstUrlRow[]) || [];
};

// ============================================================================
// DADOS DE CAMPANHA — Hybrid Architecture
// Backend: filtra por account_ids seguros
// Frontend: calcula métricas agregadas (via dataAggregation.ts)
// ============================================================================

/**
 * Busca dados RAW de ads_insights filtrados por IDs de conta permitidos.
 *
 * @param startDate  - Início do período
 * @param endDate    - Fim do período
 * @param allowedAccountIds - IDs das contas permitidas para o usuário (segurança)
 * @returns Array de linhas brutas do ads_insights
 */
export const fetchCampaignDataRaw = async (
    startDate: Date,
    endDate: Date,
    allowedAccountIds: string[]
): Promise<AdsInsightRow[]> => {
    // Guard: sem IDs = sem dados (segurança por design)
    if (!allowedAccountIds.length) return [];

    try {
        const startStr = formatDateForDB(startDate);
        const endStr = formatDateForDB(endDate);

        let allRows: AdsInsightRow[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabase
                .from('ads_insights')
                .select('*')
                .in('account_id', allowedAccountIds)
                .gte('date_start', startStr)
                .lte('date_start', endStr)
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;
            
            if (data && data.length > 0) {
                allRows = allRows.concat(data as AdsInsightRow[]);
                if (data.length < pageSize) {
                    hasMore = false;
                } else {
                    page++;
                }
            } else {
                hasMore = false;
            }
        }

        return allRows;

    } catch (err) {
        logger.error('[fetchCampaignDataRaw] Error:', err);
        return [];
    }
};

/**
 * Busca dados de campanha do período atual e anterior.
 * Retorna dados mapeados para CampaignData (com image URL persistence).
 *
 * @param startDate - Início do período atual
 * @param endDate   - Fim do período atual
 * @param allowedAccountIds - IDs das contas permitidas (segurança)
 */
export const fetchCampaignData = async (
    startDate: Date,
    endDate: Date,
    allowedAccountIds: string[]
): Promise<{
    current: CampaignData[],
    previous: CampaignData[],
    isMock: boolean,
    error: string | null
}> => {
    try {
        const { start: prevStart, end: prevEnd } = getPreviousPeriod(startDate, endDate);

        // Busca paralela: período atual + período anterior
        const [currentDataRaw, previousDataRaw] = await Promise.all([
            fetchCampaignDataRaw(startDate, endDate, allowedAccountIds),
            fetchCampaignDataRaw(prevStart, prevEnd, allowedAccountIds)
        ]);

        // Mapear para CampaignData com image persistence (sem cálculos)
        const [currentProcessed, previousProcessed] = await Promise.all([
            processCampaignData(currentDataRaw),
            processCampaignData(previousDataRaw)
        ]);

        return {
            current: currentProcessed,
            previous: previousProcessed,
            isMock: false,
            error: null
        };

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        logger.error('[fetchCampaignData] Failed:', message);
        return { current: [], previous: [], isMock: false, error: message };
    }
};

/**
 * Mapeia AdsInsightRow[] → CampaignData[].
 * Responsabilidade: normalização de tipos + image URL persistence.
 * NÃO faz cálculos de métricas — isso é responsabilidade do frontend (dataAggregation.ts).
 */
export const processCampaignData = async (rows: AdsInsightRow[]): Promise<CampaignData[]> => {
    // --- Image URL Persistence: buscar URLs históricas para ads sem imagem ---
    const adsWithMissingUrls = rows
        .filter(row => !row.ad_image_url || row.ad_image_url.trim() === '')
        .map(row => String(row.ad_id))
        .filter(Boolean);

    let urlMap = new Map<string, string>();

    if (adsWithMissingUrls.length > 0) {
        try {
            const firstUrls = await fetchAdFirstUrls(adsWithMissingUrls);
            firstUrls.sort((a, b) =>
                new Date(a.first_seen_date).getTime() - new Date(b.first_seen_date).getTime()
            );
            firstUrls.forEach(row => {
                if (row.ad_image_url) {
                    urlMap.set(row.ad_id, row.ad_image_url);
                }
            });
        } catch (e) {
            logger.warn('[processCampaignData] Failed to fetch first urls:', e);
        }
    }

    // Mapeamento puro: AdsInsightRow → CampaignData
    const mapRow = (row: AdsInsightRow): CampaignData => {
        const adIdStr = String(row.ad_id || '');
        let imageUrl = row.ad_image_url || undefined;

        // Fallback: usar imagem histórica se a atual está vazia
        if (!imageUrl || imageUrl.trim() === '') {
            if (adIdStr && urlMap.has(adIdStr)) {
                imageUrl = urlMap.get(adIdStr);
            }
        }

        return {
            unique_id: row.unique_id || `gen-${Math.random()}`,
            franqueado: row.franqueado || '',
            account_id: String(row.account_id || ''),
            account_name: row.account_name || '',
            ad_id: adIdStr,
            date_start: row.date_start || '',
            campaign_name: row.campaign_name || '',
            adset_name: row.adset_name || undefined,
            ad_name: row.ad_name || undefined,
            objective: row.objective || undefined,

            // Métricas brutas — passadas direto do banco, sem transformação
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

            // Targeting
            target_plataformas: row.target_plataformas || '',
            target_interesses: row.target_interesses || undefined,
            target_familia: row.target_familia || undefined,
            target_comportamentos: row.target_comportamentos || undefined,
            target_publicos_custom: row.target_publicos_custom || undefined,
            target_local_1: row.target_local_1 ? String(row.target_local_1) : undefined,
            target_local_2: row.target_local_2 ? String(row.target_local_2) : undefined,
            target_local_3: row.target_local_3 ? String(row.target_local_3) : undefined,
            target_tipo_local: row.target_tipo_local || undefined,
            target_brand_safety: row.target_brand_safety || undefined,
            target_posicao_fb: row.target_posicao_fb || undefined,
            target_posicao_ig: row.target_posicao_ig || undefined,
            target_idade_min: row.target_idade_min || undefined,
            target_idade_max: row.target_idade_max || undefined,

            // Creative
            ad_image_url: imageUrl,
            ad_destination_url: row.ad_destination_url || undefined,
            ad_post_link: row.ad_post_link || undefined,
            ad_body: row.ad_body || undefined,
            ad_cta: row.ad_cta || undefined,

            // CPLs: NÃO calculados aqui — o frontend (calculateMetrics) faz isso na agregação.
            // Valores row-level do banco passados como estão.
            cpl_conversas: row.msgs_iniciadas && row.valor_gasto
                ? row.valor_gasto / row.msgs_iniciadas : 0,
            cpl_compras: row.compras && row.valor_gasto
                ? row.valor_gasto / row.compras : 0,
            cpl_total: row.leads_total && row.valor_gasto
                ? row.valor_gasto / row.leads_total : 0,
        };
    };

    return rows.map(mapRow);
};

// ============================================================================
// KPI COMPARISON (RPC segura — controle de acesso via p_user_email no backend)
// ============================================================================

export const fetchKPIComparison = async (
    startDate: Date,
    endDate: Date,
    franchiseFilter?: string[],
    accountFilter?: string[]
): Promise<KPIComparisonResult | null> => {
    try {
        const { start: prevStart, end: prevEnd } = getPreviousPeriod(startDate, endDate);

        const finalFranchises = franchiseFilter?.length ? franchiseFilter : null;
        const finalAccounts = accountFilter?.length && accountFilter[0] !== 'ALL'
            ? accountFilter : null;

        const userEmail = getUserEmail();

        const params: KPIComparisonParams = {
            p_start_date: formatDateForDB(startDate),
            p_end_date: formatDateForDB(endDate),
            p_prev_start_date: formatDateForDB(prevStart),
            p_prev_end_date: formatDateForDB(prevEnd),
            p_user_email: userEmail,
            p_franchise_filter: finalFranchises,
            p_account_filter: finalAccounts
        };

        const { data, error } = await (supabase.rpc as Function)('get_kpi_comparison', params);

        if (error) {
            logger.error('[fetchKPIComparison] RPC Error:', error);
            return null;
        }

        return (data as KPIComparisonResult[])?.[0] ?? null;

    } catch (err) {
        logger.error('[fetchKPIComparison] Failed:', err);
        return null;
    }
};

// ============================================================================
// VISÃO GERENCIAL / SUMMARY REPORT (RPC segura)
// ============================================================================

export const fetchSummaryReport = async (
    startDate: Date,
    endDate: Date,
    franchiseFilter?: string[],
    accountFilter?: string[]
): Promise<SummaryReportRow[]> => {
    try {
        const finalFranchises = franchiseFilter?.length ? franchiseFilter : null;
        const finalAccounts = accountFilter?.length && accountFilter[0] !== 'ALL'
            ? accountFilter : null;

        const userEmail = getUserEmail();

        const params: ManagerialDataParams = {
            p_start_date: formatDateForDB(startDate),
            p_end_date: formatDateForDB(endDate),
            p_user_email: userEmail,
            p_franchise_filter: finalFranchises,
            p_account_filter: finalAccounts
        };

        const { data, error } = await (supabase.rpc as Function)('get_managerial_data', params);

        if (error) {
            logger.error('[fetchSummaryReport] RPC Error:', error);
            throw error;
        }

        // Map RPC column names → SummaryReportRow field names
        const mapped: SummaryReportRow[] = ((data as any[]) || []).map((row: any) => ({
            meta_account_id: row.account_id || '',
            nome_conta: row.account_name || '',
            franquia: row.franqueado || '',
            saldo_atual: Number(row.saldo_balanco) || 0,
            investimento: Number(row.total_gasto) || 0,
            leads: Number(row.total_leads) || 0,
            compras: Number(row.total_compras) || 0,
            conversas: 0, // RPC doesn't return this separately
            clicks: Number(row.total_cliques) || 0,
            impressoes: Number(row.total_impressoes) || 0,
            alcance: 0, // RPC doesn't return reach separately
            cpl_total: row.cpa != null ? Number(row.cpa) : undefined,
        }));

        return mapped;

    } catch (err) {
        logger.error('[fetchSummaryReport] Failed:', err);
        return [];
    }
};



// ============================================================================
// META AD ACCOUNTS (tb_meta_ads_contas) — via RPC segura
// ============================================================================

export const fetchMetaAccounts = async (): Promise<MetaAdAccount[]> => {
    try {
        const userEmail = getUserEmail();

        const { data, error } = await (supabase.rpc as Function)('get_all_meta_accounts', {
            p_user_email: userEmail
        });

        if (error) {
            logger.error('[fetchMetaAccounts] RPC Error:', error);
            return [];
        }

        return ((data as MetaAccountRPCRow[]) || []).map(row => ({
            id: row.account_id,
            account_id: row.account_id,
            account_name: row.nome_original || 'Sem Nome',
            display_name: row.nome_ajustado || '',
            franchise_id: row.franqueado || '',
            franchise_name: '',
            categoria_id: row.categoria_id || '',
            status: (row.status_interno === 'removed' ? 'removed' : 'active') as 'removed' | 'active',
            client_visibility: row.client_visibility ?? false,
            current_balance: safeFloat(row.saldo_balanco),
            last_sync: row.updated_at || new Date().toISOString(),
            status_meta: row.status_meta || undefined,
            motivo_bloqueio: row.motivo_bloqueio || undefined,
            total_gasto: safeFloat(row.total_gasto),
            status_interno: row.status_interno || 'A Classificar',
        }));

    } catch (err) {
        logger.error('[fetchMetaAccounts] Failed:', err);
        return [];
    }
};

export const updateMetaAccount = async (id: string, updates: Partial<MetaAdAccount>) => {
    const params: UpdateMetaAccountParams = {
        p_account_id: id
    };

    if (updates.display_name !== undefined) params.p_display_name = updates.display_name;
    if (updates.client_visibility !== undefined) params.p_client_visibility = updates.client_visibility;
    if (updates.franchise_id !== undefined) params.p_franqueado = updates.franchise_id;
    if (updates.categoria_id !== undefined) params.p_categoria_id = updates.categoria_id;

    // Nada para atualizar além do ID
    if (Object.keys(params).length <= 1) return;

    const { error } = await (supabase.rpc as Function)('update_meta_account_settings', params);

    if (error) throw error;
};

// ============================================================================
// FRANQUEADOS
// ============================================================================

export const fetchFranchises = async () => {
    const { data, error } = await supabase
        .from('tb_franqueados')
        .select('*')
        .order('nome');

    if (error) {
        logger.error('[fetchFranchises] Error:', error);
        return [];
    }

    return (data || []).map((f: FranchiseRow) => ({
        id: f.id,
        name: f.nome || 'Sem Nome',
        active: f.ativo || false
    }));
};

// ============================================================================
// CATEGORIAS DE CLIENTES
// ============================================================================

export type CategoryRow = Database['public']['Tables']['tb_categorias_clientes']['Row'];
export type CategoryInsert = Database['public']['Tables']['tb_categorias_clientes']['Insert'];
export type CategoryUpdate = Database['public']['Tables']['tb_categorias_clientes']['Update'];

export const fetchCategories = async () => {
    const { data, error } = await supabase
        .from('tb_categorias_clientes')
        .select('*')
        .order('nome_categoria', { ascending: true });

    if (error) {
        logger.error('[fetchCategories] Error:', error);
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

// ============================================================================
// PLANEJAMENTO DE METAS
// ============================================================================

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
        logger.error('[fetchPlannings] Error:', error);
        return [];
    }
    return data || [];
};

export const savePlanning = async (planning: PlanningInsert) => {
    // Desativar planejamento anterior do mesmo escopo
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