-- ============================================================
-- MM IBNM — Sincronização IMEDIATA das edições do ADM
-- (letra/cifra do Cantor Cristão, Harpa Cristã e HCC)
-- ============================================================
-- Antes desta correção:
--  • Cantor Cristão  -> já tinha "tempo real", mas só funciona se a tabela
--                       estiver na publicação supabase_realtime (abaixo).
--  • Harpa Cristã    -> só sincronizava a cada 15 minutos (ou nunca, se o
--                       usuário não reabrisse o app).
--  • HCC             -> só carregava 1x, ao abrir o app — nunca sincronizava
--                       de novo enquanto o app ficava aberto.
-- Com esta correção + o novo código do app (já no zip), qualquer alteração
-- do ADM aparece OUTRO USUÁRIO quase instantaneamente, sem precisar recarregar.
--
-- Rode isto UMA VEZ no SQL Editor do Supabase. É seguro rodar de novo
-- (idempotente) se precisar.
-- ============================================================

DO $$
DECLARE
  t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['cantor_edits','cantor_links','harpa_links','harpa_edits','hcc_hinos','hinos_audios']
    LOOP
      IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables
          WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
        ) THEN
          EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
      END IF;
    END LOOP;
  END IF;
END $$;
