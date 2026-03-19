CREATE OR REPLACE FUNCTION public.set_accounts_group(
    p_group_id   uuid,
    p_account_ids text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Remove group de contas que saíram do grupo
    UPDATE tb_meta_ads_contas
    SET group_id = NULL
    WHERE group_id = p_group_id
      AND account_id <> ALL(COALESCE(p_account_ids, ARRAY[]::text[]));

    -- Vincula as contas selecionadas ao grupo
    IF array_length(p_account_ids, 1) > 0 THEN
        UPDATE tb_meta_ads_contas
        SET group_id = p_group_id
        WHERE account_id = ANY(p_account_ids);
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_accounts_group(uuid, text[]) TO anon;
GRANT EXECUTE ON FUNCTION public.set_accounts_group(uuid, text[]) TO authenticated;
