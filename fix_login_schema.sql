-- ==============================================================================
-- SCRIPT DE CORREÇÃO DE LOGIN - "Database error querying schema"
-- Execute este script no Editor SQL do Supabase Dashboard.
-- ==============================================================================

-- 1. Criar a tabela 'usuarios_sistema' se não existir
CREATE TABLE IF NOT EXISTS public.usuarios_sistema (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  email text UNIQUE NOT NULL,
  nome text,
  role text DEFAULT 'client' CHECK (role IN ('admin', 'executive', 'client')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Habilitar RLS e criar política de leitura
ALTER TABLE public.usuarios_sistema ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'usuarios_sistema' AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile" ON public.usuarios_sistema
            FOR SELECT USING (auth.uid() = id);
    END IF;
END
$$;

-- 3. Criar a tabela 'vinculo_contas' se não existir
CREATE TABLE IF NOT EXISTS public.vinculo_contas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.usuarios_sistema(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, account_id)
);

-- 4. Habilitar RLS para vinculo_contas
ALTER TABLE public.vinculo_contas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'vinculo_contas' AND policyname = 'Users can view own links'
    ) THEN
        CREATE POLICY "Users can view own links" ON public.vinculo_contas
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
END
$$;

-- 5. Função Trigger Corrigida para novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios_sistema (id, email, nome, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'client')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Recriar o Trigger com segurança
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. Migração de dados de usuários existentes (Safe Insert)
INSERT INTO public.usuarios_sistema (id, email, role)
SELECT id, email, 
       CASE WHEN email = 'rudy@rudy.com' THEN 'admin' ELSE 'client' END
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 8. (Opcional) Garantir que seu usuário admin tenha acesso
UPDATE public.usuarios_sistema 
SET role = 'admin' 
WHERE email = 'rudy@rudy.com';
