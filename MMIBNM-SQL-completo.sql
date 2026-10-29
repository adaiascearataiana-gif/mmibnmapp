-- ============================================================
-- MM IBNM — SQL completo (backup / reimplantação)
-- Projeto Supabase: whtbzermbyuxicswyvsy (mmibnm)
-- Este script JÁ FOI APLICADO automaticamente via conexão em
-- 29/10/2026. Guarde-o como referência ou para reaplicar em
-- outro projeto. É idempotente (pode rodar de novo sem erro).
-- ============================================================

-- ------------------------------------------------------------
-- 1) CORREÇÃO CRÍTICA DO LOGIN
--    O RLS de `perfis` estava SEM política de INSERT: usuários
--    novos (e-mail ou Google) nunca eram gravados e ficavam
--    presos na tela de login (usuarioAtual() não achava perfil).
-- ------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.perfis'::regclass AND polname='perfis_ins') THEN
    CREATE POLICY perfis_ins ON perfis FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2) Origem da conta (local = e-mail/senha, google = OAuth)
--    Usado no app para mostrar "Senha gerenciada pelo Google".
-- ------------------------------------------------------------
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS origem text DEFAULT 'local';

-- ------------------------------------------------------------
-- 3) Tabela do histórico "Músicas que já cantamos"
--    O app consultava `musicas_cantadas`, mas a tabela não
--    existia (o app caía no seed embutido). Criada + RLS:
--    todo mundo lê; somente o ADM escreve.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS musicas_cantadas (
  id serial PRIMARY KEY,
  data text,          -- dd/mm/aaaa
  dia text,           -- DOMINGO, QUARTA...
  evento text,        -- CULTO DA NOITE...
  musica text,
  artista text,
  tom text,
  web text,           -- link do YouTube
  ordem integer DEFAULT 0
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.musicas_cantadas'::regclass AND polname='mc_sel') THEN
    CREATE POLICY mc_sel ON musicas_cantadas FOR SELECT USING (true);
    CREATE POLICY mc_ins ON musicas_cantadas FOR INSERT WITH CHECK (is_admin());
    CREATE POLICY mc_upd ON musicas_cantadas FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
    CREATE POLICY mc_del ON musicas_cantadas FOR DELETE USING (is_admin());
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4) Links do YouTube do Cantor Cristão (integrado)
--    "Somente o ADM pode editar": reforçado NO BANCO via
--    is_admin() nas políticas de escrita.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cantor_links (
  num integer PRIMARY KEY,          -- número do hino (1..581)
  url text,                          -- ID do vídeo (ex.: dQw4w9WgXcQ)
  updated_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.cantor_links'::regclass AND polname='cl_sel') THEN
    CREATE POLICY cl_sel ON cantor_links FOR SELECT USING (true);
    CREATE POLICY cl_ins ON cantor_links FOR INSERT WITH CHECK (is_admin());
    CREATE POLICY cl_upd ON cantor_links FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
    CREATE POLICY cl_del ON cantor_links FOR DELETE USING (is_admin());
  END IF;
END $$;

-- ------------------------------------------------------------
-- 5) Tempo real (as telas atualizam sozinhas)
--    Tabelas novas entram na publicação do Supabase Realtime.
-- ------------------------------------------------------------
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE musicas_cantadas;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE cantor_links;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ------------------------------------------------------------
-- 6) (Opcional, recomendado) endurecer INSERT de notificações:
--    hoje QUALQUER pessoa (até anônimo) consegue inserir.
--    Descomente para restringir a usuários logados.
-- ------------------------------------------------------------
-- DROP POLICY IF EXISTS notif_ins ON notificacoes;
-- CREATE POLICY notif_ins ON notificacoes FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- NÃO É SQL (precisa do painel): ativar o login com Google.
-- Siga o guia MMIBNM-GOOGLE-LOGIN.md — leva ~5 minutos e
-- precisa de um Client ID criado no Google Cloud Console.
-- ============================================================
