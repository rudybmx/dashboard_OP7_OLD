-- ============================================================================== 
-- MIGRATION: RBAC Refactor & Backend Metrics
-- Description: Centralizes access control in RPCs and adds CPL/Total calculations.
-- ==============================================================================

-- 1. Helper Function to resolve effective account IDs
CREATE OR REPLACE FUNCTION public.get_effective_account_ids(
    p_user_email text,
    p_filter_ids text[] DEFAULT NULL
)
RETURNS text[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
    v_role text;
    v_allowed_ids text[];
    v_effective_ids text[];
BEGIN
    -- Get User Role
    SELECT role INTO v_role FROM perfil_acesso WHERE email = p_user_email;

    -- If Admin, they have access to ALL accounts (unless filtered)
    IF v_role = 'admin' THEN
        IF p_filter_ids IS NULL OR array_length(p_filter_ids, 1) IS NULL THEN
            -- Admin + No Filter = All Accounts
            SELECT array_agg(account_id) INTO v_effective_ids FROM tb_meta_ads_contas WHERE client_visibility = true;
        ELSE
            -- Admin + Filter = Restricted to Filter
            v_effective_ids := p_filter_ids;
        END IF;
        RETURN v_effective_ids;
    END IF;

    -- Non-Admin: Fetch Allowed IDs
    SELECT array_agg(account_id) INTO v_allowed_ids 
    FROM user_accounts_access 
    WHERE user_email = p_user_email;

    IF v_allowed_ids IS NULL THEN
        RETURN ARRAY[]::text[];
    END IF;

    -- Calculate Intersection
    IF p_filter_ids IS NULL OR array_length(p_filter_ids, 1) IS NULL THEN
        v_effective_ids := v_allowed_ids;
    ELSE
        -- Intersect: IDs in BOTH filter AND allowed
        SELECT array_agg(id) INTO v_effective_ids
        FROM unnest(p_filter_ids) AS id
        WHERE id = ANY(v_allowed_ids);
    END IF;

    RETURN COALESCE(v_effective_ids, ARRAY[]::text[]);
END;
$function$;


-- 2. Update get_all_meta_accounts to use RBAC
CREATE OR REPLACE FUNCTION public.get_all_meta_accounts(p_user_email text DEFAULT NULL)
RETURNS SETOF tb_meta_ads_contas
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
    v_effective_ids text[];
BEGIN
    -- Use helper to get ALL allowed IDs (pass NULL as filter)
    v_effective_ids := public.get_effective_account_ids(p_user_email, NULL);

    RETURN QUERY
    SELECT * FROM tb_meta_ads_contas 
    WHERE account_id = ANY(v_effective_ids)
    ORDER BY nome_original ASC;
END;
$function$;


-- 3. Update get_campaign_summary_filtered with RBAC + New Metrics
CREATE OR REPLACE FUNCTION public.get_campaign_summary_filtered(
    p_start_date text,
    p_end_date text,
    p_user_email text,
    p_filter_ids text[]
)
RETURNS TABLE(
    unique_id text,
    franqueado text,
    account_id text,
    account_name text,
    ad_id text,
    date_start text,
    campaign_name text,
    adset_name text,
    ad_name text,
    objective text,
    valor_gasto numeric,
    cpc numeric,
    ctr numeric,
    cpm numeric,
    frequencia numeric,
    custo_por_lead numeric,
    custo_por_compra numeric,
    alcance bigint,
    impressoes bigint,
    cliques_todos bigint,
    leads_total bigint,
    compras bigint,
    msgs_iniciadas bigint,
    msgs_conexoes bigint,
    msgs_novos_contatos bigint,
    msgs_profundidade_2 bigint,
    msgs_profundidade_3 bigint,
    target_plataformas text,
    ad_image_url text,
    ad_destination_url text,
    ad_post_link text,
    ad_body text,
    ad_cta text,
    -- NEW METRICS
    cpl_conversas numeric,
    cpl_total numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
    v_effective_ids text[];
BEGIN
    v_effective_ids := public.get_effective_account_ids(p_user_email, p_filter_ids);

    RETURN QUERY
    SELECT
        -- IDs
        (ai.ad_id || '_' || ai.date_start)::text as unique_id,
        COALESCE(f.nome, 'N/A') as franqueado,
        mac.account_id,
        COALESCE(mac.nome_ajustado, mac.nome_original, 'Sem Nome') as account_name,
        ai.ad_id,
        ai.date_start::text,
        ai.campaign_name,
        ai.adset_name,
        ai.ad_name,
        ai.objective,
        
        -- Basic Metrics
        COALESCE(ai.valor_gasto, 0) as valor_gasto,
        COALESCE(ai.cpc, 0) as cpc,
        COALESCE(ai.ctr, 0) as ctr,
        COALESCE(ai.cpm, 0) as cpm,
        COALESCE(ai.frequencia, 0) as frequencia,
        -- Existing CPL/CPA (Meta provided or pre-calced?) Keeping existing columns
        COALESCE(ai.custo_por_lead, 0) as custo_por_lead,
        COALESCE(ai.custo_por_compra, 0) as custo_por_compra,
        
        -- Volume
        COALESCE(ai.alcance, 0)::bigint as alcance,
        COALESCE(ai.impressoes, 0)::bigint as impressoes,
        COALESCE(ai.cliques_todos, 0)::bigint as cliques_todos,
        COALESCE(ai.leads_total, 0)::bigint as leads_total,
        COALESCE(ai.compras, 0)::bigint as compras,
        COALESCE(ai.msgs_iniciadas, 0)::bigint as msgs_iniciadas,
        COALESCE(ai.msgs_conexoes, 0)::bigint as msgs_conexoes,
        COALESCE(ai.msgs_novos_contatos, 0)::bigint as msgs_novos_contatos,
        COALESCE(ai.msgs_profundidade_2, 0)::bigint as msgs_profundidade_2,
        COALESCE(ai.msgs_profundidade_3, 0)::bigint as msgs_profundidade_3,

        -- Metadata
        'facebook'::text as target_plataformas, -- Mock for now or db column
        ai.ad_image_url,
        NULL::text as ad_destination_url,
        NULL::text as ad_post_link,
        NULL::text as ad_body,
        NULL::text as ad_cta,

        -- NEW CALCULATED METRICS
        CASE WHEN COALESCE(ai.msgs_iniciadas, 0) > 0 
             THEN ROUND((COALESCE(ai.valor_gasto, 0) / ai.msgs_iniciadas)::numeric, 2)
             ELSE 0 
        END as cpl_conversas,

        CASE WHEN COALESCE(ai.leads_total, 0) > 0 
             THEN ROUND((COALESCE(ai.valor_gasto, 0) / ai.leads_total)::numeric, 2)
             ELSE 0 
        END as cpl_total

    FROM public.ads_insights ai
    JOIN public.tb_meta_ads_contas mac ON ai.account_id = mac.account_id
    LEFT JOIN public.tb_franqueados f ON mac.franqueado_id = f.id
    WHERE ai.date_start >= p_start_date::date 
      AND ai.date_start <= p_end_date::date
      AND mac.account_id = ANY(v_effective_ids)
    ORDER BY ai.valor_gasto DESC;
END;
$function$;


-- 4. Update get_managerial_data (Summary Report) with RBAC + New Metrics
CREATE OR REPLACE FUNCTION public.get_managerial_data(
    p_start_date date, 
    p_end_date date, 
    p_user_email text,
    p_franchise_filter uuid[] DEFAULT NULL::uuid[], 
    p_account_filter text[] DEFAULT NULL::text[]
)
RETURNS TABLE(
    meta_account_id text, 
    nome_conta text, 
    franquia text, 
    saldo_atual numeric, 
    investimento numeric, 
    leads bigint, 
    compras bigint, 
    conversas bigint, 
    clicks bigint, 
    impressoes bigint, 
    alcance bigint,
    cpl_conversas numeric,
    cpl_compras numeric,
    cpl_total numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
    v_effective_ids text[];
BEGIN
    -- Resolve effective IDs
    v_effective_ids := public.get_effective_account_ids(p_user_email, p_account_filter);

    RETURN QUERY
    SELECT
        mac.account_id::text as meta_account_id,
        COALESCE(mac.nome_ajustado, mac.nome_original, 'Sem Nome') as nome_conta,
        COALESCE(f.nome, 'N/A') as franquia,
        COALESCE(mac.saldo_balanco::numeric, 0) as saldo_atual,
        
        -- Aggregates
        COALESCE(SUM(ai.valor_gasto), 0) as investimento,
        COALESCE(SUM(ai.leads_total), 0)::BIGINT as leads,
        COALESCE(SUM(ai.compras), 0)::BIGINT as compras,
        COALESCE(SUM(ai.msgs_iniciadas), 0)::BIGINT as conversas,
        COALESCE(SUM(ai.cliques_todos), 0)::BIGINT as clicks,
        COALESCE(SUM(ai.impressoes), 0)::BIGINT as impressoes,
        COALESCE(MAX(ai.alcance), 0)::BIGINT as alcance,

        -- Calculated CPLs (Aggregated)
        CASE WHEN SUM(ai.msgs_iniciadas) > 0 
             THEN ROUND((SUM(ai.valor_gasto) / SUM(ai.msgs_iniciadas))::numeric, 2)
             ELSE 0 
        END as cpl_conversas,

        CASE WHEN SUM(ai.compras) > 0 
             THEN ROUND((SUM(ai.valor_gasto) / SUM(ai.compras))::numeric, 2)
             ELSE 0 
        END as cpl_compras,

        CASE WHEN SUM(ai.leads_total) > 0 
             THEN ROUND((SUM(ai.valor_gasto) / SUM(ai.leads_total))::numeric, 2)
             ELSE 0 
        END as cpl_total

    FROM public.tb_meta_ads_contas mac
    LEFT JOIN public.tb_franqueados f ON mac.franqueado_id = f.id
    LEFT JOIN public.ads_insights ai 
        ON mac.account_id = ai.account_id 
        AND ai.date_start BETWEEN p_start_date AND p_end_date
    WHERE 
        mac.client_visibility = true
        AND mac.account_id = ANY(v_effective_ids)
        -- Keep franchise filter if passed (redundant if checking effective IDs, but good for filtering within allowed)
        AND (p_franchise_filter IS NULL OR mac.franqueado_id = ANY(p_franchise_filter))
    GROUP BY 
        mac.account_id, 
        COALESCE(mac.nome_ajustado, mac.nome_original, 'Sem Nome'), 
        COALESCE(f.nome, 'N/A'),
        COALESCE(mac.saldo_balanco::numeric, 0);
END;
$function$;


-- 5. Update get_kpi_comparison (RBAC only, metrics usually predefined)
CREATE OR REPLACE FUNCTION public.get_kpi_comparison(
    p_start_date date, 
    p_end_date date, 
    p_prev_start_date date, 
    p_prev_end_date date, 
    p_user_email text,
    p_franchise_filter uuid[] DEFAULT NULL::uuid[], 
    p_account_filter text[] DEFAULT NULL::text[]
)
RETURNS TABLE(
    current_spend numeric, 
    prev_spend numeric, 
    current_leads bigint, 
    prev_leads bigint, 
    current_sales bigint, 
    prev_sales bigint
)
LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
    v_effective_ids text[];
BEGIN
    v_effective_ids := public.get_effective_account_ids(p_user_email, p_account_filter);

    RETURN QUERY
    WITH current_metrics AS (
        SELECT 
            SUM(ai.valor_gasto) as spend,
            SUM(ai.leads_total) as leads,
            SUM(ai.compras) as sales
        FROM public.tb_meta_ads_contas mac
        JOIN public.ads_insights ai ON mac.account_id = ai.account_id
        WHERE ai.date_start BETWEEN p_start_date AND p_end_date
          AND mac.client_visibility = true
          AND mac.account_id = ANY(v_effective_ids)
          AND (p_franchise_filter IS NULL OR mac.franqueado_id = ANY(p_franchise_filter))
    ),
    prev_metrics AS (
        SELECT 
            SUM(ai.valor_gasto) as spend,
            SUM(ai.leads_total) as leads,
            SUM(ai.compras) as sales
        FROM public.tb_meta_ads_contas mac
        JOIN public.ads_insights ai ON mac.account_id = ai.account_id
        WHERE ai.date_start BETWEEN p_prev_start_date AND p_prev_end_date
          AND mac.client_visibility = true
          AND mac.account_id = ANY(v_effective_ids)
          AND (p_franchise_filter IS NULL OR mac.franqueado_id = ANY(p_franchise_filter))
    )
    SELECT
        COALESCE((SELECT spend FROM current_metrics), 0),
        COALESCE((SELECT spend FROM prev_metrics), 0),
        COALESCE((SELECT leads FROM current_metrics), 0)::BIGINT,
        COALESCE((SELECT leads FROM prev_metrics), 0)::BIGINT,
        COALESCE((SELECT sales FROM current_metrics), 0)::BIGINT,
        COALESCE((SELECT sales FROM prev_metrics), 0)::BIGINT;
END;
$function$;
