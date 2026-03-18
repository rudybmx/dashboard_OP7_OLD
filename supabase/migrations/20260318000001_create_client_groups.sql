-- Migration: client_groups
-- Substitui tb_franqueados + franchises por uma tabela genérica de grupos de clientes.
-- Permite agrupar contas Meta Ads, clientes Bling, etc. sob um mesmo "grupo".
-- Ex: uma franqueada, uma marca, uma unidade regional.

-- ============================================================
-- 1. CRIAR TABELA client_groups
-- ============================================================
CREATE TABLE IF NOT EXISTS public.client_groups (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    description TEXT,
    type        TEXT        NOT NULL DEFAULT 'franchise'
                            CHECK (type IN ('franchise', 'brand', 'agency', 'region', 'other')),
    is_active   BOOLEAN     NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.client_groups IS 'Grupos de clientes/franqueados. Substitui tb_franqueados e franchises.';
COMMENT ON COLUMN public.client_groups.type IS 'franchise | brand | agency | region | other';

-- ============================================================
-- 2. MIGRAR DADOS de tb_franqueados → client_groups
-- ============================================================
INSERT INTO public.client_groups (id, name, type, is_active, created_at)
SELECT
    id,
    COALESCE(nome, name, 'Sem nome') AS name,
    'franchise'                       AS type,
    COALESCE(active, true)            AS is_active,
    COALESCE(created_at, now())       AS created_at
FROM public.tb_franqueados
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. ADICIONAR coluna group_id em tb_meta_ads_contas
--    (FK para client_groups, substituindo franqueado_id)
-- ============================================================
ALTER TABLE public.tb_meta_ads_contas
    ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.client_groups(id) ON DELETE SET NULL;

-- Migrar franqueado_id → group_id onde ainda for NULL
UPDATE public.tb_meta_ads_contas
SET group_id = franqueado_id
WHERE franqueado_id IS NOT NULL AND group_id IS NULL;

-- ============================================================
-- 4. RLS — acesso aberto via anon (custom auth, sem Supabase Auth)
-- ============================================================
ALTER TABLE public.client_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_groups_anon_read" ON public.client_groups;
CREATE POLICY "client_groups_anon_read"
    ON public.client_groups FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "client_groups_anon_write" ON public.client_groups;
CREATE POLICY "client_groups_anon_write"
    ON public.client_groups FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- 5. TRIGGER: atualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_client_groups_updated_at ON public.client_groups;
CREATE TRIGGER trg_client_groups_updated_at
    BEFORE UPDATE ON public.client_groups
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
