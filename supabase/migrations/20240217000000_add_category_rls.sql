-- Fix: app uses custom auth (perfil_acesso + localStorage), NOT Supabase Auth.
-- Therefore auth.uid() is always null and policies targeting 'authenticated' role won't work.
-- This policy allows the anon role full CRUD access to tb_categorias_clientes.

drop policy if exists "Admin pode gerenciar categorias" on public.tb_categorias_clientes;

create policy "Allow full access for anon users"
on public.tb_categorias_clientes
for all
to anon
using (true)
with check (true);
