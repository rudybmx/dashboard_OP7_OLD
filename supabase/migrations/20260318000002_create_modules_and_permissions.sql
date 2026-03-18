-- Migration: modules + user_module_permissions
-- Sistema de módulos para escalar o dashboard:
-- Cada módulo (meta_ads, bling, planning, google_ads...) pode ter
-- nível de acesso por usuário independente do role global.

-- ============================================================
-- 1. TABELA modules — registry de módulos do sistema
-- ============================================================
CREATE TABLE IF NOT EXISTS public.modules (
    id          TEXT        PRIMARY KEY,  -- 'meta_ads', 'bling', 'planning', 'google_ads', 'crm'
    name        TEXT        NOT NULL,
    description TEXT,
    icon        TEXT,                     -- nome do ícone Lucide para o menu
    route       TEXT,                     -- hash route ex: 'summary', 'campaigns'
    is_active   BOOLEAN     NOT NULL DEFAULT true,
    sort_order  INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.modules IS 'Registry de módulos disponíveis no dashboard.';

-- Seed: módulos iniciais
INSERT INTO public.modules (id, name, description, icon, route, sort_order) VALUES
    ('meta_ads_summary',    'Resumo Gerencial',        'Resumo de KPIs Meta Ads',        'LayoutDashboard', 'summary',      10),
    ('meta_ads_dashboard',  'Visão Gerencial',         'Dashboard gerencial Meta Ads',   'BarChart3',       'dashboard',    20),
    ('meta_ads_executive',  'Visão Executiva',         'Overview executivo',             'TrendingUp',      'executive',    30),
    ('meta_ads_campaigns',  'Campanhas',               'Performance de campanhas',       'Megaphone',       'campaigns',    40),
    ('meta_ads_ads',        'Anúncios',                'Tabela de anúncios',             'Table',           'ads',          50),
    ('meta_ads_creatives',  'Criativos',               'Galeria de criativos',           'Image',           'creatives',    60),
    ('meta_ads_demographics','Públicos',               'Inteligência de público',        'Users',           'demographics', 70),
    ('planning',            'Planejamento',            'Planejamento analítico',         'Target',          'planning',     80),
    ('settings',            'Configurações',           'Configurações do sistema',       'Settings',        'settings',     90)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. TABELA user_module_permissions
--    Controle granular: usuário ↔ módulo ↔ nível de acesso
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_module_permissions (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email   TEXT        NOT NULL,
    module_id    TEXT        NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    access_level TEXT        NOT NULL DEFAULT 'read'
                             CHECK (access_level IN ('none', 'read', 'write', 'admin')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_email, module_id)
);

COMMENT ON TABLE  public.user_module_permissions IS 'Permissões granulares por usuário e módulo.';
COMMENT ON COLUMN public.user_module_permissions.access_level IS 'none | read | write | admin';

-- ============================================================
-- 3. MELHORAR user_accounts_access — adicionar access_level por conta
-- ============================================================
ALTER TABLE public.user_accounts_access
    ADD COLUMN IF NOT EXISTS access_level TEXT NOT NULL DEFAULT 'read'
        CHECK (access_level IN ('none', 'read', 'write', 'admin')),
    ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.client_groups(id) ON DELETE SET NULL;

-- ============================================================
-- 4. RLS — anon full access (custom auth sem Supabase Auth)
-- ============================================================
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "modules_anon_read" ON public.modules;
CREATE POLICY "modules_anon_read"
    ON public.modules FOR SELECT TO anon USING (true);

ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ump_anon_all" ON public.user_module_permissions;
CREATE POLICY "ump_anon_all"
    ON public.user_module_permissions FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- 5. TRIGGER: updated_at para user_module_permissions
-- ============================================================
DROP TRIGGER IF EXISTS trg_ump_updated_at ON public.user_module_permissions;
CREATE TRIGGER trg_ump_updated_at
    BEFORE UPDATE ON public.user_module_permissions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 6. RPC: get_user_module_permissions
--    Retorna todos os módulos ativos com o nível de acesso do usuário.
--    Roles superadmin/admin recebem 'admin' em todos os módulos.
--    Roles manager recebem 'read' nos módulos não configurados explicitamente.
--    Roles client/viewer seguem apenas as permissões explícitas.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_module_permissions(p_user_email TEXT)
RETURNS TABLE (
    module_id    TEXT,
    module_name  TEXT,
    route        TEXT,
    icon         TEXT,
    sort_order   INTEGER,
    access_level TEXT
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
    WHERE email = p_user_email;

    IF v_role IS NULL THEN
        RETURN; -- user not found
    END IF;

    -- superadmin e admin: acesso admin a todos os módulos ativos
    IF v_role IN ('superadmin', 'admin') THEN
        RETURN QUERY
        SELECT
            m.id,
            m.name,
            m.route,
            m.icon,
            m.sort_order,
            'admin'::TEXT AS access_level
        FROM public.modules m
        WHERE m.is_active = true
        ORDER BY m.sort_order;
        RETURN;
    END IF;

    -- manager: read em todos os módulos exceto settings, a menos que tenha permissão explícita
    IF v_role = 'manager' THEN
        RETURN QUERY
        SELECT
            m.id,
            m.name,
            m.route,
            m.icon,
            m.sort_order,
            COALESCE(ump.access_level,
                CASE WHEN m.id = 'settings' THEN 'none' ELSE 'read' END
            ) AS access_level
        FROM public.modules m
        LEFT JOIN public.user_module_permissions ump
            ON ump.user_email = p_user_email AND ump.module_id = m.id
        WHERE m.is_active = true
        ORDER BY m.sort_order;
        RETURN;
    END IF;

    -- client/viewer: apenas módulos com permissão explícita
    RETURN QUERY
    SELECT
        m.id,
        m.name,
        m.route,
        m.icon,
        m.sort_order,
        COALESCE(ump.access_level, 'none') AS access_level
    FROM public.modules m
    LEFT JOIN public.user_module_permissions ump
        ON ump.user_email = p_user_email AND ump.module_id = m.id
    WHERE m.is_active = true
    ORDER BY m.sort_order;
END;
$$;
