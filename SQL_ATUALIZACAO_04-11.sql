-- ============================================================
-- MM IBNM — ATUALIZAÇÃO de 04/11/2026 (SOMENTE AS SEÇÕES NOVAS)
-- Rode SÓ este arquivo no SQL Editor do Supabase.
-- Idempotente: pode rodar de novo sem erro.
-- (As seções 1–15 já foram aplicadas em 29/10 — não precisa rodar de novo)
-- ============================================================

-- 16) (04/11/2026) SETLIST — Tema da Pregação + Texto Base
--     Colunas novas na tabela playlist (o app já grava; a coluna
--     ainda não existia → o "publicar" dava erro de coluna).
-- ------------------------------------------------------------
ALTER TABLE playlist ADD COLUMN IF NOT EXISTS tema text DEFAULT '';
ALTER TABLE playlist ADD COLUMN IF NOT EXISTS "textoBase" text DEFAULT '';

-- ------------------------------------------------------------
-- 17) is_admin() — garante que a função exista (projeto novo).
--     Já existe no projeto atual; nada muda ao rodar de novo.
-- ------------------------------------------------------------
DO $fn$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'is_admin' AND n.nspname = 'public'
  ) THEN
    EXECUTE $f$CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS
      $body$SELECT EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND admin = true)$body$ $f$;
  END IF;
END $fn$;

-- ------------------------------------------------------------
-- 18) Tabelas de suporte — criadas APENAS se não existirem.
--     No projeto atual elas já existem e são intocadas aqui.
--     (config, escala, favoritos, presencas, push_subs, ao_vivo, harpa_links)
-- ------------------------------------------------------------
DO $fn$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='config') THEN
    CREATE TABLE public.config (
      chave text PRIMARY KEY,
      valor jsonb,
      updated_at timestamptz DEFAULT now()
    );
    ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
    CREATE POLICY cfg_sel ON public.config FOR SELECT USING (true);
    CREATE POLICY cfg_ins ON public.config FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY cfg_upd ON public.config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY cfg_del ON public.config FOR DELETE TO authenticated USING (true);
  END IF;
END $fn$;

DO $fn$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='escala') THEN
    CREATE TABLE public.escala (
      id integer PRIMARY KEY,
      colunas jsonb DEFAULT '[]'::jsonb,
      linhas  jsonb DEFAULT '[]'::jsonb,
      updated_at timestamptz DEFAULT now()
    );
    INSERT INTO public.escala (id, colunas, linhas) VALUES (1, '[]'::jsonb, '[]'::jsonb) ON CONFLICT (id) DO NOTHING;
    ALTER TABLE public.escala ENABLE ROW LEVEL SECURITY;
    CREATE POLICY esc_sel ON public.escala FOR SELECT USING (true);
    CREATE POLICY esc_ins ON public.escala FOR INSERT TO authenticated WITH CHECK (public.is_admin());
    CREATE POLICY esc_upd ON public.escala FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $fn$;

DO $fn$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='favoritos') THEN
    CREATE TABLE public.favoritos (
      user_id uuid NOT NULL,
      musica_id text NOT NULL,
      PRIMARY KEY (user_id, musica_id)
    );
    ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;
    CREATE POLICY fav_sel ON public.favoritos FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
    CREATE POLICY fav_ins ON public.favoritos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin());
    CREATE POLICY fav_del ON public.favoritos FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());
  END IF;
END $fn$;

DO $fn$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='presencas') THEN
    CREATE TABLE public.presencas (
      user_id uuid NOT NULL,
      semana text NOT NULL,
      email text,
      nome text,
      status text DEFAULT '',
      obs text DEFAULT '',
      updated_at timestamptz DEFAULT now(),
      PRIMARY KEY (user_id, semana)
    );
    ALTER TABLE public.presencas ENABLE ROW LEVEL SECURITY;
    CREATE POLICY prs_sel ON public.presencas FOR SELECT TO authenticated USING (true);
    CREATE POLICY prs_ins ON public.presencas FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin());
    CREATE POLICY prs_upd ON public.presencas FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());
    CREATE POLICY prs_del ON public.presencas FOR DELETE TO authenticated USING (public.is_admin());
  END IF;
END $fn$;

DO $fn$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='push_subs') THEN
    CREATE TABLE public.push_subs (
      endpoint text PRIMARY KEY,
      user_id uuid,
      email text,
      sub jsonb NOT NULL,
      prefs jsonb DEFAULT '{}'::jsonb,
      updated_at timestamptz DEFAULT now()
    );
    ALTER TABLE public.push_subs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY ps_sel ON public.push_subs FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
    CREATE POLICY ps_ins ON public.push_subs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
    CREATE POLICY ps_upd ON public.push_subs FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $fn$;

DO $fn$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='ao_vivo') THEN
    CREATE TABLE public.ao_vivo (
      id integer PRIMARY KEY,
      ativo boolean DEFAULT false,
      musica_id text,
      aba text DEFAULT 'cifra',
      por_nome text DEFAULT '',
      updated_at timestamptz DEFAULT now()
    );
    INSERT INTO public.ao_vivo (id, ativo) VALUES (1, false) ON CONFLICT (id) DO NOTHING;
    ALTER TABLE public.ao_vivo ENABLE ROW LEVEL SECURITY;
    CREATE POLICY av_sel ON public.ao_vivo FOR SELECT USING (true);
    CREATE POLICY av_ins ON public.ao_vivo FOR INSERT TO authenticated WITH CHECK (public.is_admin());
    CREATE POLICY av_upd ON public.ao_vivo FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $fn$;

DO $fn$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='harpa_links') THEN
    CREATE TABLE public.harpa_links (
      num integer PRIMARY KEY,
      url text,
      updated_at timestamptz DEFAULT now()
    );
    ALTER TABLE public.harpa_links ENABLE ROW LEVEL SECURITY;
    CREATE POLICY hl_sel ON public.harpa_links FOR SELECT USING (true);
    CREATE POLICY hl_ins ON public.harpa_links FOR INSERT TO authenticated WITH CHECK (public.is_admin());
    CREATE POLICY hl_upd ON public.harpa_links FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
    CREATE POLICY hl_del ON public.harpa_links FOR DELETE TO authenticated USING (public.is_admin());
  END IF;
END $fn$;

-- ------------------------------------------------------------
-- 19) REALTIME — garante que o app recebe as mudanças em tempo
--     real de todas as tabelas que ele assina. Idempotente:
--     só adiciona a que faltar na publicação supabase_realtime.
-- ------------------------------------------------------------
DO $fn$ DECLARE t text; BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY[
      'perfis','musicas','playlist','escala','notificacoes','favoritos',
      'config','presencas','ao_vivo','musicas_cantadas','materiais',
      'cantor_edits','cantor_links','harpa_links'
    ] LOOP
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables
          WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
        ) THEN
          EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL;  /* ignora só essa tabela, continua as demais */
      END;
    END LOOP;
  END IF;
END $fn$;

-- ------------------------------------------------------------
-- 20) Buckets de Storage (fotos/audios) — só cria se faltar.
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos', 'fotos', true), ('audios', 'audios', true)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 21) (04/11/2026) Histórico — coluna "Cantor(a)" de cada registro
--     (quem estava escalado no dia; preenchido no editor ADM)
-- ------------------------------------------------------------
ALTER TABLE musicas_cantadas ADD COLUMN IF NOT EXISTS cantor text DEFAULT '';

-- ============================================================
-- FIM — arquivo completo: seções 1 a 21. Idempotente:
-- pode rodar inteiro de novo sem erro.
-- ============================================================
