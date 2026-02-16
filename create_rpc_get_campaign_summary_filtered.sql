-- Função RPC para buscar dados de campanha filtrados
-- Chamada pelo Frontend em supabaseService.ts
-- Parâmetros:
-- p_start_date (text, 'YYYY-MM-DD')
-- p_end_date (text, 'YYYY-MM-DD')
-- p_user_email (text, email do usuário logado)
-- p_filter_ids (text[], array de account_ids ex: ['act_123', 'act_456'])

CREATE OR REPLACE FUNCTION public.get_campaign_summary_filtered(
    p_start_date text,
    p_end_date   text,
    p_user_email text,
    p_filter_ids text[] DEFAULT '{}'::text[]
)
RETURNS SETOF public.vw_dashboard_unified
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_role          text;
    v_allowed_ids   text[];
    v_effective_ids text[];
BEGIN
    -- 1. Buscar perfil de acesso do usuário
    SELECT role, assigned_account_ids
      INTO v_role, v_allowed_ids
    FROM perfil_acesso
    WHERE email = p_user_email;

    -- Fail closed: sem perfil → retorna vazio
    IF v_role IS NULL THEN
        RETURN;
    END IF;

    -- 2. Determinar IDs efetivos (interseção filtro × permissão)
    IF array_length(p_filter_ids, 1) IS NULL OR p_filter_ids = '{}'::text[] THEN
        -- Front não mandou filtro → usar todas as contas que o usuário pode ver
        v_effective_ids := v_allowed_ids;  -- admin pode ter NULL = "todas"
    ELSE
        -- Interseção: o que o front pediu ∩ o que o usuário pode ver
        SELECT array_agg(id)
          INTO v_effective_ids
        FROM unnest(p_filter_ids) AS id
        WHERE v_role = 'admin'
           OR (v_allowed_ids IS NOT NULL AND id = ANY(v_allowed_ids));
    END IF;

    -- 3. Retornar dados filtrados por data e conta
    RETURN QUERY
    SELECT *
    FROM public.vw_dashboard_unified
    WHERE
        date_start >= p_start_date::date
        AND date_start <= p_end_date::date
        AND (
            -- Admin sem restrição explícita → vê tudo
            v_effective_ids IS NULL
            -- Senão, account_id deve estar na lista efetiva
            OR account_id::text = ANY(v_effective_ids)
        );
END;
$function$;

-- NOTA: account_id na view pode ser bigint, mas o cast ::text garante
-- compatibilidade com os IDs 'act_XXX' armazenados em perfil_acesso.assigned_account_ids.
-- Se assigned_account_ids guarda IDs numéricos (sem act_), garantir que o front
-- envie no mesmo formato. O front agora envia os IDs exatamente como vêm do banco.
