CREATE OR REPLACE FUNCTION public.get_campaign_summary_filtered(
    p_start_date text, 
    p_end_date text, 
    p_user_email text, 
    p_mode text, 
    p_account_id text
)
RETURNS SETOF vw_dashboard_unified
LANGUAGE plpgsql
AS $function$
DECLARE
    v_allowed_ids bigint[];
    v_role text;
BEGIN
    -- 1. Recupera e Limpa Permissões (CTE Implícito)
    -- Busca role e array de IDs permitidos para o email fornecido
    SELECT 
        role,
        ARRAY(
            SELECT REPLACE(unnested_id, 'act_', '')::bigint
            FROM UNNEST(assigned_account_ids) AS unnested_id
            WHERE unnested_id IS NOT NULL AND unnested_id <> ''
        )
    INTO v_role, v_allowed_ids
    FROM perfil_acesso
    WHERE email = p_user_email;

    -- Se usuário não encontrado ou sem role, retorna vazio (Segurança)
    IF v_role IS NULL THEN
        RETURN;
    END IF;

    -- 2. Query Principal
    RETURN QUERY
    SELECT *
    FROM public.vw_dashboard_unified
    WHERE 
        date_start >= p_start_date::date
        AND date_start <= p_end_date::date
        AND (
            -- Lógica para Modo "ONE" (Um único ID específico vindo do front)
            (p_mode = 'ONE' AND (
                p_account_id IS NOT NULL 
                AND account_id = (REGEXP_REPLACE(p_account_id, '\D', '', 'g'))::bigint
                -- Segurança adicional: cliente só vê se for dono (ou se for admin)
                AND (v_role = 'admin' OR (v_allowed_ids IS NOT NULL AND account_id = ANY(v_allowed_ids)))
            ))
            OR
            -- Lógica para Modo "ALL" (Todas as contas permitidas)
            -- Front manda p_mode='ALL' ou p_mode='NONE' (tratado como ALL nas regras de negócio se não for ONE)
            (p_mode <> 'ONE' AND (
                v_role = 'admin' -- Admin vê tudo
                OR
                (v_allowed_ids IS NOT NULL AND account_id = ANY(v_allowed_ids)) -- Cliente vê apenas seus IDs
            ))
        );
END;
$function$;
