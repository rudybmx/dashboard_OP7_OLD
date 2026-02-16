-- Atualiza a view para buscar a URL de imagem mais recente para cada ad_id
-- Anteriormente estava pegando a mais antiga (ASC), que expirava.

CREATE OR REPLACE VIEW public.vw_ad_first_urls AS
SELECT DISTINCT ON (ad_id::text)
    ad_id::text AS ad_id,
    ad_image_url,
    date_start AS first_seen_date
FROM ads_insights
WHERE ad_image_url IS NOT NULL AND ad_image_url <> ''::text
ORDER BY ad_id::text, date_start DESC; -- Changed to DESC to get latest
