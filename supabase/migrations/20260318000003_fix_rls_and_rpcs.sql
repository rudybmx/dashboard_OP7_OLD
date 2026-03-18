-- Migration: Fix RLS policies e RPCs críticos
-- O app usa custom auth (perfil_acesso), não Supabase Auth.
-- auth.uid() sempre retorna NULL. Por isso usamos SECURITY DEFINER
-- nas RPCs para validar o usuário via email sem expor dados diretos.

-- ============================================================
-- 1. GARANTIR is_active em perfil_acesso
-- ============================================================
ALTER TABLE public.perfil_acesso
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- 2. RPC authenticate_user — atualizada com is_active check
-- ============================================================
CREATE OR REPLACE FUNCTION public.authenticate_user(
    p_email    TEXT,
    p_password TEXT
)
RETURNS TABLE (
    id          UUID,
    email       TEXT,
    nome        TEXT,
    role        TEXT,
    permissions JSONB,
    created_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pa.id,
        pa.email,
        pa.nome,
        pa.role,
        pa.permissions,
        pa.created_at
    FROM public.perfil_acesso pa
    WHERE pa.email    = p_email
      AND pa.password = p_password   -- NOTE: em produção usar pgcrypto crypt()
      AND pa.is_active = true;
END;
$$;

-- ============================================================
-- 3. RPC get_user_assigned_accounts — inclui access_level por conta
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_assigned_accounts(p_user_email TEXT)
RETURNS TABLE (
    account_id   TEXT,
    access_level TEXT,
    group_id     UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role
    FROM public.perfil_acesso
    WHERE email = p_user_email AND is_active = true;

    IF v_role IS NULL THEN RETURN; END IF;

    -- superadmin e admin: todas as contas ativas
    IF v_role IN ('superadmin', 'admin') THEN
        RETURN QUERY
        SELECT
            t.account_id,
            'admin'::TEXT AS access_level,
            t.group_id
        FROM public.tb_meta_ads_contas t
        WHERE t.status_meta != 'DISABLED'
           OR t.status_meta IS NULL;
        RETURN;
    END IF;

    -- manager/client/viewer: apenas contas explicitamente atribuídas
    RETURN QUERY
    SELECT
        uaa.account_id,
        uaa.access_level,
        uaa.group_id
    FROM public.user_accounts_access uaa
    WHERE uaa.user_email = p_user_email;
END;
$$;

-- ============================================================
-- 4. RPC get_all_meta_accounts — retorna contas visíveis para o usuário
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_all_meta_accounts(p_user_email TEXT DEFAULT NULL)
RETURNS TABLE (
    account_id      TEXT,
    account_name    TEXT,
    display_name    TEXT,
    franchise_id    UUID,
    franchise_name  TEXT,
    group_id        UUID,
    group_name      TEXT,
    categoria_id    UUID,
    current_balance NUMERIC,
    status          TEXT,
    client_visibility BOOLEAN,
    status_meta     TEXT,
    motivo_bloqueio TEXT,
    total_gasto     NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_role TEXT;
BEGIN
    IF p_user_email IS NOT NULL THEN
        SELECT role INTO v_role
        FROM public.perfil_acesso
        WHERE email = p_user_email AND is_active = true;
    END IF;

    -- Admin ou sem filtro: todas as contas com visibilidade
    IF v_role IN ('superadmin', 'admin') OR p_user_email IS NULL THEN
        RETURN QUERY
        SELECT
            t.account_id,
            t.nome_original                  AS account_name,
            COALESCE(t.nome_ajustado, t.nome_original) AS display_name,
            t.franqueado_id                  AS franchise_id,
            COALESCE(f.nome, cg.name, '')   AS franchise_name,
            t.group_id,
            cg.name                          AS group_name,
            t.categoria_id,
            COALESCE(t.saldo_balanco, 0)     AS current_balance,
            CASE
                WHEN t.status_meta = 'DISABLED' THEN 'disabled'
                WHEN t.status_meta = 'UNSETTLED' THEN 'disabled'
                ELSE 'active'
            END                              AS status,
            COALESCE(t.client_visibility, true) AS client_visibility,
            t.status_meta,
            t.motivo_bloqueio,
            COALESCE(t.limite_gastos, 0)     AS total_gasto
        FROM public.tb_meta_ads_contas t
        LEFT JOIN public.tb_franqueados f ON f.id = t.franqueado_id
        LEFT JOIN public.client_groups cg ON cg.id = t.group_id
        ORDER BY t.nome_original;
        RETURN;
    END IF;

    -- manager/client/viewer: apenas contas atribuídas
    RETURN QUERY
    SELECT
        t.account_id,
        t.nome_original                  AS account_name,
        COALESCE(t.nome_ajustado, t.nome_original) AS display_name,
        t.franqueado_id                  AS franchise_id,
        COALESCE(f.nome, cg.name, '')   AS franchise_name,
        t.group_id,
        cg.name                          AS group_name,
        t.categoria_id,
        COALESCE(t.saldo_balanco, 0)     AS current_balance,
        CASE
            WHEN t.status_meta = 'DISABLED' THEN 'disabled'
            WHEN t.status_meta = 'UNSETTLED' THEN 'disabled'
            ELSE 'active'
        END                              AS status,
        COALESCE(t.client_visibility, true) AS client_visibility,
        t.status_meta,
        t.motivo_bloqueio,
        COALESCE(t.limite_gastos, 0)     AS total_gasto
    FROM public.user_accounts_access uaa
    JOIN public.tb_meta_ads_contas t ON t.account_id = uaa.account_id
    LEFT JOIN public.tb_franqueados f ON f.id = t.franqueado_id
    LEFT JOIN public.client_groups cg ON cg.id = t.group_id
    WHERE uaa.user_email = p_user_email
      AND COALESCE(t.client_visibility, true) = true
    ORDER BY t.nome_original;
END;
$$;
