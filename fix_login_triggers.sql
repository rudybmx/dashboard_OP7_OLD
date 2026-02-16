-- ==============================================================================
-- SCRIPT DE CORREÇÃO DE TRIGGERS - "Database error querying schema"
-- Execute is no Editor SQL do Supabase Dashboard.
-- ==============================================================================

-- O erro 500 no login geralmente ocorre porque ao logar, o Supabase atualiza
-- o campo 'last_sign_in_at' na tabela auth.users.
-- Se houver algum TRIGGER antigo de 'UPDATE' ouvindo essa tabela e tentando
-- acessar tabelas que não existem mais (ex: tb_franqueados), o login quebra.

-- 1. Remover gatilhos antigos que podem estar quebrando o UPDATE
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_user_updated ON auth.users;
DROP TRIGGER IF EXISTS update_user_profile ON auth.users;
DROP TRIGGER IF EXISTS sync_user_profile ON auth.users;
DROP TRIGGER IF EXISTS on_profile_update ON auth.users;

-- 2. Garantir que nossa função de INSERT está segura e correta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER 
SET search_path = public -- Boas práticas para evitar erros de schema
AS $$
BEGIN
  -- Tenta inserir, se falhar ou tabela não existir, não quebra o processo
  BEGIN
    INSERT INTO public.usuarios_sistema (id, email, nome, role)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'client')
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Loga o erro mas não impede o login/cadastro (Silent Fail para garantir acesso)
    RAISE WARNING 'Erro ao criar usuario_sistema: %', SQLERRM;
  END;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- 3. Recriar o Trigger SOMENTE para INSERT (Novos usuários)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Confirmação
SELECT 'Triggers de UPDATE removidos com sucesso. Tente logar novamente.' as status;
