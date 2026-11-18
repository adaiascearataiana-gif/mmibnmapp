-- ============================================================
-- MM IBNM — Áudios dos hinos (Cantor Cristão, Harpa Cristã e HCC)
-- Mesma ideia da tabela "partituras_hinos": uma linha por hino,
-- identificada por (livro, num), com a lista de áudios em JSON.
-- Rode isto uma vez no SQL Editor do Supabase.
-- Requer a função is_admin() já usada pelas outras tabelas do app
-- (cantor_links, cantor_edits, materiais etc.) — se seu projeto
-- ainda não tem is_admin(), rode primeiro o MMIBNM-SQL-completo.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS hinos_audios (
  livro text NOT NULL,                 -- 'cc' (Cantor Cristão) | 'hr' (Harpa Cristã) | 'hcc' (Hinário HCC)
  num integer NOT NULL,                -- número do hino naquele hinário
  audios jsonb NOT NULL DEFAULT '[]',  -- [{nome, url, drive?}, ...] — mesmo formato de musicas.audios
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (livro, num)
);

ALTER TABLE hinos_audios ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.hinos_audios'::regclass AND polname='ha_sel') THEN
    CREATE POLICY ha_sel ON hinos_audios FOR SELECT USING (true);
    CREATE POLICY ha_ins ON hinos_audios FOR INSERT WITH CHECK (is_admin());
    CREATE POLICY ha_upd ON hinos_audios FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
    CREATE POLICY ha_del ON hinos_audios FOR DELETE USING (is_admin());
  END IF;
END $$;

-- Tempo real (opcional, mas deixa o botão 🎧 Áudio atualizado pra todo mundo
-- assim que o ADM salva um áudio novo, sem precisar recarregar o app)
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE hinos_audios;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
