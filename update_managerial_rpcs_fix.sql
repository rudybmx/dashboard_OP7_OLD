-- RPC: get_managerial_data (Fixed Join & RBAC)
CREATE OR REPLACE FUNCTION public.get_managerial_data(
    p_start_date date, 
    p_end_date date, 
    p_user_email text,
    p_franchise_filter uuid[] DEFAULT NULL::uuid[], 
    p_account_filter text[] DEFAULT NULL::text[]
)
RETURNS TABLE(meta_account_id text, nome_conta text, franqueado text, saldo_atual numeric, investimento numeric, leads bigint, compras bigint, conversas bigint, clicks bigint, impressoes bigint, alcance bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
    v_role text;
    v_accessible_ids text[];
BEGIN
    SELECT role INTO v_role FROM perfil_acesso WHERE email = p_user_email;

    IF v_role IS DISTINCT FROM 'admin' THEN
        SELECT array_agg(account_id) INTO v_accessible_ids 
        FROM user_accounts_access WHERE user_email = p_user_email;
    END IF;

    RETURN QUERY
    SELECT
        mac.account_id::text as meta_account_id,
        COALESCE(mac.nome_ajustado, mac.nome_original, 'Sem Nome') as nome_conta,
        COALESCE(f.nome, 'N/A') as franqueado,
        COALESCE(mac.saldo_balanco::numeric, 0) as saldo_atual,
        COALESCE(SUM(ai.valor_gasto), 0) as investimento,
        COALESCE(SUM(ai.leads_total), 0)::BIGINT as leads,
        COALESCE(SUM(ai.compras), 0)::BIGINT as compras,
        COALESCE(SUM(ai.msgs_iniciadas), 0)::BIGINT as conversas,
        COALESCE(SUM(ai.cliques_todos), 0)::BIGINT as clicks,
        COALESCE(SUM(ai.impressoes), 0)::BIGINT as impressoes,
        COALESCE(MAX(ai.alcance), 0)::BIGINT as alcance
    FROM public.tb_meta_ads_contas mac
    LEFT JOIN public.tb_franqueados f ON mac.franqueado_id = f.id
    -- FIX: Simple join because ai.account_id is BigInt
    LEFT JOIN public.ads_insights ai 
        ON mac.account_id_link = ai.account_id 
        AND ai.date_start BETWEEN p_start_date AND p_end_date
    WHERE 
        mac.client_visibility = true
        AND (
            v_role = 'admin' 
            OR (v_accessible_ids IS NOT NULL AND mac.account_id = ANY(v_accessible_ids))
        )
        AND (
            (p_franchise_filter IS NULL OR mac.franqueado_id = ANY(p_franchise_filter))
            OR
            (p_account_filter IS NULL OR mac.account_id::text = ANY(p_account_filter))
        )
    GROUP BY 
        mac.account_id, 
        COALESCE(mac.nome_ajustado, mac.nome_original, 'Sem Nome'), 
        COALESCE(f.nome, 'N/A'),
        COALESCE(mac.saldo_balanco::numeric, 0);
END;
$function$;

-- RPC: get_kpi_comparison (Fixed Join & RBAC)
CREATE OR REPLACE FUNCTION public.get_kpi_comparison(
    p_start_date date, 
    p_end_date date, 
    p_prev_start_date date, 
    p_prev_end_date date, 
    p_user_email text,
    p_franchise_filter uuid[] DEFAULT NULL::uuid[], 
    p_account_filter text[] DEFAULT NULL::text[]
)
RETURNS TABLE(current_spend numeric, prev_spend numeric, current_leads bigint, prev_leads bigint, current_sales bigint, prev_sales bigint)
LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
    v_role text;
    v_accessible_ids text[];
BEGIN
    SELECT role INTO v_role FROM perfil_acesso WHERE email = p_user_email;

    IF v_role IS DISTINCT FROM 'admin' THEN
        SELECT array_agg(account_id) INTO v_accessible_ids 
        FROM user_accounts_access WHERE user_email = p_user_email;
    END IF;

    RETURN QUERY
    WITH current_metrics AS (
        SELECT 
            SUM(ai.valor_gasto) as spend,
            SUM(ai.leads_total) as leads,
            SUM(ai.compras) as sales
        FROM public.tb_meta_ads_contas mac
        -- FIX: Simple join
        JOIN public.ads_insights ai ON mac.account_id_link = ai.account_id
        WHERE ai.date_start BETWEEN p_start_date AND p_end_date
          AND mac.client_visibility = true
          AND (v_role = 'admin' OR (v_accessible_ids IS NOT NULL AND mac.account_id = ANY(v_accessible_ids)))
          AND (p_franchise_filter IS NULL OR mac.franqueado_id = ANY(p_franchise_filter))
          AND (p_account_filter IS NULL OR mac.account_id::text = ANY(p_account_filter))
    ),
    prev_metrics AS (
        SELECT 
            SUM(ai.valor_gasto) as spend,
            SUM(ai.leads_total) as leads,
            SUM(ai.compras) as sales
        FROM public.tb_meta_ads_contas mac
        JOIN public.ads_insights ai ON mac.account_id_link = ai.account_id
        WHERE ai.date_start BETWEEN p_prev_start_date AND p_prev_end_date
          AND mac.client_visibility = true
           AND (v_role = 'admin' OR (v_accessible_ids IS NOT NULL AND mac.account_id = ANY(v_accessible_ids)))
          AND (p_franchise_filter IS NULL OR mac.franqueado_id = ANY(p_franchise_filter))
          AND (p_account_filter IS NULL OR mac.account_id::text = ANY(p_account_filter))
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

-- RPC: get_all_meta_accounts (no changes needed to what I wrote before, just keep consistency)
CREATE OR REPLACE FUNCTION public.get_all_meta_accounts(p_user_email text DEFAULT NULL)
RETURNS SETOF tb_meta_ads_contas
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
    v_role text;
    v_accessible_ids text[];
BEGIN
    IF p_user_email IS NOT NULL THEN
        SELECT role INTO v_role FROM perfil_acesso WHERE email = p_user_email;
        
        IF v_role IS DISTINCT FROM 'admin' THEN
            SELECT array_agg(account_id) INTO v_accessible_ids 
            FROM user_accounts_access WHERE user_email = p_user_email;
            
            RETURN QUERY
            SELECT * FROM tb_meta_ads_contas 
            WHERE account_id = ANY(v_accessible_ids)
            ORDER BY nome_original ASC;
            RETURN;
        END IF;
    END IF;

    RETURN QUERY
    SELECT * FROM tb_meta_ads_contas ORDER BY nome_original ASC;
END;
$function$;
