-- =========================================================
-- MM IBNM — SQL PARA RODAR AGORA (versão 0.7.7)
-- Cole tudo no Supabase → SQL Editor → Run.
-- Pode rodar mesmo que alguma parte já tenha sido rodada antes:
-- nada é apagado e nada dá erro de duplicado.
-- Inclui: 10 (ADM edita membros / proteção do ADM),
--         11 (avisos e excluir membro), 12 (excluir música),
--         13 (número do WhatsApp).
-- Não precisa da seção 14: os áudios agora vão para o Google Drive.
-- =========================================================

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

-- ------------------------------------------------------------
-- 13) (v0.6.2) Número do WhatsApp quando o telefone não é WhatsApp
-- ------------------------------------------------------------
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS wpp_num text DEFAULT '';
