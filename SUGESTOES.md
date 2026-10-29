# Sugestões e melhorias — MM IBNM (mmibnmapp)

Análise completa do app (index.html + Supabase + PWA) com o que já
foi corrigido nesta entrega e o que vale implementar a seguir.

---

## ✅ Corrigido nesta entrega (bugs reais)

1. **Login travava para usuários novos.** O RLS de `perfis` não tinha
   política de INSERT → o perfil nunca era gravado → `usuarioAtual()`
   não achava ninguém → o app voltava para a tela de login para sempre.
   *Corrigido no banco (`perfis_ins`).*
2. **Login com Google não funcionava** porque o provedor está desligado
   no Supabase. O código já estava certo; faltava a configuração.
   *Guia pronto: `MMIBNM-GOOGLE-LOGIN.md` (5 minutos).*
3. **Nome/foto do Google ignorados.** O cadastro usava só `user_metadata.nome`
   (que o Google não envia). Agora usa `full_name`/`name`/`avatar_url` —
   quem entra com Google já aparece com nome e foto corretos.
4. **Conta Google não era identificada** ("Trocar senha" aparecia para
   contas sem senha). Agora o campo `perfis.origem` distingue `google` × `local`.
5. **Tabela `musicas_cantadas` não existia** — o app consultava e caía
   silenciosamente no histórico embutido. *Tabela criada com RLS.*
6. **Sequência do Cantor Cristão incompleta** — faltavam os hinos
   377, 410, 411 e 579 (páginas ausentes no PDF). Agora aparecem como
   marcadores honestos ("página não incluída no PDF de origem").
7. **Service worker desatualizado** — agora em `mmibnm-v2`, com
   `hinos.js`, `cantor.js` e as intros na cache (funciona offline).

## 🎵 O que foi integrado (Cantor Cristão)

- Seção **📖 Cantor Cristão** no menu: 581 hinos em sequência, busca por
  número/título/letra, transposição (todos), tamanho de letra, rolagem
  automática padrão Cifra Club (30 px/s em 1×, 0,4×–3×), favoritos ⭐
  e **Intro destacada em imagem** em todos os hinos que têm intro.
- **Somente o ADM edita** — regra ligada ao `admin` do ministério
  (sem senha local; vale para cifras E links do YouTube) e reforçada
  no banco (RLS `is_admin()`).
- Links do YouTube por hino: ADM cadastra; **todos veem** o chip
  "▶ Ouvir no YouTube"; sincroniza na nuvem em tempo real
  (tabela `cantor_links`).
- Tema verde/dourado do MM em todo o módulo.

---

## 💡 Sugestões de melhoria (em ordem de prioridade)

### Segurança / estabilidade
1. **Restringir INSERT de `notificações`** — hoje `with_check: true`
   (qualquer pessoa, até anônima, insere). Sugestão de SQL no
   `MMIBNM-SQL-completo.sql`, seção 6 (basta descomentar).
2. **Exigir senha atual ao trocar senha** — no Supabase:
   *Authentication → Settings → Passwords*: ligue
   "Require current password when changing password".
3. **Fixar versões dos CDNs** (`supabase-js@2.x.y` e `xlsx@0.x.y`
   exatos) com `integrity=` (SRI), para o app não mudar sozinho.
4. **Backup automático sem Drive** — hoje o backup depende do
   Client ID do Google Drive. Sugestão: rotina de backup gravando o
   JSON numa tabela `backups` do Supabase (ADM), 1× por dia.

### Dados / conteúdo
5. **Interface para o histórico "cantadas"** — a tabela
   `musicas_cantadas` agora existe, mas o app só lê o seed embutido.
   Um painel ADM (colar CSV / importar XLSX) tornaria o histórico
   atualizável pelo celular.
6. **Sincronizar edições e favoritos do Cantor Cristão na nuvem**
   (`cantor_edits` / `cantor_favoritos`) — hoje ficam no aparelho
   (com exportar/importar). Como só o ADM edita, seria pequeno.
7. **Deep link dos hinos** (`#/hino/123`) para o ministério compartilhar
   "olhe o hino 214" em grupo e abrir direto.

### Experiência
8. **Web Push de verdade** (VAPID) — hoje a notificação só aparece
   com o app aberto. Com push, o aviso de escala chega com o app fechado.
9. **Player de áudio melhorado** — barra fixa de "tocando agora" e
   continuação automática da playlist.
10. **Atalhos do app instalado** (manifest `shortcuts`) para
    Escala, Playlist e Cantor Cristão.
11. **Pré-cache das intros em segundo plano** — hoje elas entram na
    cache na primeira visita de cada hino; um `prefetch` dos próximos
    3 hinos deixaria a rolagem sem esperas.
12. **Acessibilidade** — aumentar contraste do dourado em texto pequeno
    e revisar foco de teclado nas folhas (sheets) do Cantor.

### Código / organização
13. **Extrair o `index.html` em módulos** (auth, musicas, escala,
    cantor...) — hoje são ~236 KB num arquivo só com várias
    redefinições de função; funciona, mas dificulta manutenção.
14. **Testes automatizados** — as funções puras (norm, busca,
    transposição, `detectaPeriodo`) já são testáveis; um
    `npm test` simples evitaria regressões.
15. **Padronizar textos** dos toasts/mensagens (com/sem acento) e
    adicionar `aria-label` nos botões sem texto.

---

*Entrega de 29/10/2026 — integração Cantor Cristão + login Google +
correções de RLS/realtime.*
