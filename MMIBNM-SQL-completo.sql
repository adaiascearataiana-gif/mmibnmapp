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
-- 4b) Academia de Música — materiais (links, YouTube, PDFs)
--     Escrita também restrita ao ADM (is_admin()).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secao text NOT NULL,               -- tecnicas-vocais, bateria, piano, guitarra, baixo, violao, teoria-musical
  tipo text NOT NULL DEFAULT 'link', -- youtube | pdf | link
  titulo text NOT NULL,
  descricao text DEFAULT '',
  url text NOT NULL,
  ordem integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.materiais'::regclass AND polname='mat_sel') THEN
    CREATE POLICY mat_sel ON materiais FOR SELECT USING (true);
    CREATE POLICY mat_ins ON materiais FOR INSERT WITH CHECK (is_admin());
    CREATE POLICY mat_upd ON materiais FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
    CREATE POLICY mat_del ON materiais FOR DELETE USING (is_admin());
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
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE materiais;
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

-- ------------------------------------------------------------
-- 7) (v0.3.0) Edições de cifra do Cantor Cristão na nuvem
--    O ADM edita e TODOS os membros veem (tempo real).
--    Sem esta tabela, as edições ficam só no aparelho do ADM.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cantor_edits (
  num integer PRIMARY KEY,           -- número do hino (1..581)
  linhas jsonb NOT NULL,             -- { "parte-linha": "[G]linha com [D]acordes" }
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE cantor_edits ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.cantor_edits'::regclass AND polname='ce_sel') THEN
    CREATE POLICY ce_sel ON cantor_edits FOR SELECT USING (true);
    CREATE POLICY ce_ins ON cantor_edits FOR INSERT WITH CHECK (is_admin());
    CREATE POLICY ce_upd ON cantor_edits FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
    CREATE POLICY ce_del ON cantor_edits FOR DELETE USING (is_admin());
  END IF;
END $$;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE cantor_edits;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ------------------------------------------------------------
-- 8) (v0.4.0) Favoritos do Cantor Cristão na nuvem
--    Cada pessoa só vê e mexe nos próprios favoritos.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cantor_favoritos (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  num integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, num)
);
ALTER TABLE cantor_favoritos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.cantor_favoritos'::regclass AND polname='cf_sel') THEN
    CREATE POLICY cf_sel ON cantor_favoritos FOR SELECT USING (user_id = auth.uid());
    CREATE POLICY cf_ins ON cantor_favoritos FOR INSERT WITH CHECK (user_id = auth.uid());
    CREATE POLICY cf_upd ON cantor_favoritos FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    CREATE POLICY cf_del ON cantor_favoritos FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- ------------------------------------------------------------
-- 9) (v0.4.0) Segurança: só quem está logado cria notificações
--    (antes, até visitante anônimo podia inserir).
-- ------------------------------------------------------------
DROP POLICY IF EXISTS notif_ins ON notificacoes;
CREATE POLICY notif_ins ON notificacoes FOR INSERT TO authenticated WITH CHECK (true);

-- ------------------------------------------------------------
-- 10) (v0.5.0) Tabela de membros: ADM edita os dados de qualquer
--     membro; ninguém (exceto ADM) consegue se tornar ADM sozinho.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS perfis_upd_adm ON perfis;
CREATE POLICY perfis_upd_adm ON perfis FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE OR REPLACE FUNCTION perfis_protege_admin() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.admin IS DISTINCT FROM OLD.admin AND NOT is_admin() THEN
      NEW.admin := OLD.admin;            -- membro comum não muda o próprio "admin"
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.admin,false) AND EXISTS (SELECT 1 FROM perfis) AND NOT is_admin() THEN
      NEW.admin := false;                -- só o 1º cadastro do sistema nasce ADM
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_perfis_protege_admin ON perfis;
CREATE TRIGGER trg_perfis_protege_admin BEFORE INSERT OR UPDATE ON perfis
  FOR EACH ROW EXECUTE FUNCTION perfis_protege_admin();

-- ------------------------------------------------------------
-- 11) (v0.6.0) Avisos e exclusão de membros
-- ------------------------------------------------------------
-- notificação com link (tocar abre a página) e em janela (popup)
ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS link text DEFAULT '';
ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS popup boolean DEFAULT false;

-- avisos automáticos (escala, aniversário) saem UMA vez só,
-- mesmo que vários celulares abram o app ao mesmo tempo
CREATE TABLE IF NOT EXISTS avisos_enviados (
  chave text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE avisos_enviados ENABLE ROW LEVEL SECURITY;   -- só a função abaixo mexe

CREATE OR REPLACE FUNCTION enviar_aviso(p_chave text, p_emails text[], p_ic text, p_titulo text,
                                        p_corpo text, p_link text DEFAULT '', p_popup boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE novo int;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  INSERT INTO avisos_enviados(chave) VALUES (p_chave) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS novo = ROW_COUNT;
  IF novo = 0 THEN RETURN false; END IF;            -- já enviado antes
  INSERT INTO notificacoes(destino_email, ic, titulo, corpo, data, lida, link, popup)
    SELECT lower(e), p_ic, p_titulo, p_corpo, now(), false, coalesce(p_link,''), coalesce(p_popup,false)
    FROM unnest(p_emails) AS e WHERE coalesce(e,'') <> '';
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION enviar_aviso(text,text[],text,text,text,text,boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION enviar_aviso(text,text[],text,text,text,text,boolean) TO authenticated;

-- ADM exclui membro (apaga perfil, dados e o login)
DROP POLICY IF EXISTS perfis_del_adm ON perfis;
CREATE POLICY perfis_del_adm ON perfis FOR DELETE TO authenticated USING (is_admin());

CREATE OR REPLACE FUNCTION excluir_membro(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_email text;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Somente o ADM pode excluir membros'; END IF;
  IF p_id = auth.uid() THEN RAISE EXCEPTION 'Você não pode excluir a si mesmo'; END IF;
  SELECT lower(email) INTO v_email FROM perfis WHERE id = p_id;
  DELETE FROM notificacoes WHERE lower(destino_email) = v_email;
  BEGIN DELETE FROM presencas WHERE user_id = p_id; EXCEPTION WHEN others THEN NULL; END;
  BEGIN DELETE FROM favoritos WHERE user_id = p_id; EXCEPTION WHEN others THEN NULL; END;
  BEGIN DELETE FROM cantor_favoritos WHERE user_id = p_id; EXCEPTION WHEN others THEN NULL; END;
  DELETE FROM perfis WHERE id = p_id;
  DELETE FROM auth.users WHERE id = p_id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION excluir_membro(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION excluir_membro(uuid) TO authenticated;

-- ------------------------------------------------------------
-- 12) (v0.6.1) ADM exclui uma música inteira (e tira dos favoritos/playlist)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS musicas_del_adm ON musicas;
CREATE POLICY musicas_del_adm ON musicas FOR DELETE TO authenticated USING (is_admin());

CREATE OR REPLACE FUNCTION excluir_musica(p_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Somente o ADM pode excluir músicas'; END IF;
  BEGIN DELETE FROM favoritos WHERE musica_id::text = p_id; EXCEPTION WHEN others THEN NULL; END;
  BEGIN UPDATE playlist SET musicas = array_remove(musicas, p_id) WHERE p_id = ANY(musicas::text[]); EXCEPTION WHEN others THEN NULL; END;
  DELETE FROM musicas WHERE id::text = p_id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION excluir_musica(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION excluir_musica(text) TO authenticated;
