-- Fix: update_meta_account_settings RPC referenced non-existent column 'franqueado'
-- The actual column is 'franqueado_id' (uuid type).
-- This fix recreates the RPC with the correct column name and proper type cast.

CREATE OR REPLACE FUNCTION public.update_meta_account_settings(
    p_account_id text,
    p_display_name text DEFAULT NULL::text,
    p_client_visibility boolean DEFAULT NULL::boolean,
    p_franqueado text DEFAULT NULL::text,
    p_categoria_id uuid DEFAULT NULL::uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE tb_meta_ads_contas
  SET
    nome_ajustado = COALESCE(p_display_name, nome_ajustado),
    client_visibility = COALESCE(p_client_visibility, client_visibility),
    franqueado_id = COALESCE(p_franqueado::uuid, franqueado_id),
    categoria_id = COALESCE(p_categoria_id, categoria_id)
  WHERE account_id = p_account_id;
END;
$function$;
