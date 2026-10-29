# MM IBNM — Ministério de Música IBNM

App PWA do Ministério de Música: playlist da semana, cifras, letras,
áudios (Google Drive), escala semanal, confirmação de presença, culto
ao vivo, notificações, histórico de músicas cantadas — e agora com o
**📖 Cantor Cristão** integrado (581 hinos cifrados).

## Login

- **E-mail e senha** (com confirmação de e-mail).
- **Google** — siga o guia [`MMIBNM-GOOGLE-LOGIN.md`](MMIBNM-GOOGLE-LOGIN.md)
  para ativar (5 minutos, no painel do Supabase + Google Cloud).

O primeiro usuário cadastrado vira **ADM**. Somente o ADM pode editar
cifras, playlist, escala e links do YouTube (do app e do Cantor Cristão).

## Cantor Cristão (integrado)

- 581 hinos em sequência, com intro destacada, autor/ritmo/tom.
- Busca por número, título ou letra; transposição; rolagem Cifra Club.
- Favoritos ⭐ e "▶ Ouvir no YouTube" por hino.
- **Somente o ADM edita** as cifras (toque na sílaba) e os links.

## Estrutura

| Arquivo | Descrição |
|---------|-----------|
| `index.html` | App principal (Supabase, telas, editor de cifra) |
| `hinos.js` | Base dos 581 hinos do Cantor Cristão |
| `cantor.js` | Módulo do Cantor Cristão (tema verde/dourado) |
| `academia.js` | Academia de Música (materiais gerenciados pelo ADM) |
| `cc-intro/` | Imagens de introdução dos hinos |
| `sw.js` | Service worker (offline) — `mmibnm-v3` |
| `MMIBNM-GOOGLE-LOGIN.md` | Guia do login com Google |
| `MMIBNM-SQL-completo.sql` | SQL aplicado no Supabase (backup) |
| `SUGESTOES.md` | Análise e melhorias sugeridas |

## Menu

- **Músicas** ▸ Todas as músicas · Cantor Cristão (581 hinos)
- **⭐ Favoritos** — músicas e hinos favoritos, juntos
- **Academia de Música** ▸ Técnicas vocais · Instrumentos
  (Bateria, Piano, Guitarra, Baixo, Violão) · Teoria musical —
  o ADM adiciona links, vídeos do YouTube e PDFs (com upload
  direto ao Google Drive); os usuários visualizam e baixam.

O botão **VOLTAR** do Android funciona em todo o app (fecha
menus e folhas, volta entre telas e pergunta antes de sair).

## Banco (Supabase)

Projeto `mmibnm` (`whtbzermbyuxicswyvsy`): tabelas `perfis`, `musicas`,
`playlist`, `escala`, `notificacoes`, `favoritos`, `presencas`,
`config`, `ao_vivo`, `musicas_cantadas` e `cantor_links`, com RLS —
escrita de conteúdo restrita ao ADM (`is_admin()`).
