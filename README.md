# 📦 LOTE 8 + 9 + 10 — Entrega completa (13 pedidos + 3 melhorias + zoom + letras)

**Você está pelo Android:** por enquanto, leia este README, rode os **SQLs**
pelo SQL Editor do Supabase e suba o **código** pelo GitHub web (os 9 arquivos).
Quando estiver no **Linux**, me avise que eu mando os comandos do Python + testes + git push.

---

## 📁 O que tem aqui

| Arquivo | O que é | Quando rodar |
|---|---|---|
| `lote8_ui.py` | Correções dos13 pedidos (scroll, ESC, partitura tela cheia, botão letra, áudios, excluir ao lado do lápis, histórico só ao concluir, rename…) | Só no Linux |
| `lote9_features.py` | Melhorias escolhidas: **abas/paginação na tela Músicas**, **coleções/tema**, **WhatsApp** | Só no Linux (depois do lote8) |
| `lote10_zoom.py` | **Zoom na partitura** (A−/%/A+/Resetar + pinça de2 dedos) | Só no Linux (depois do lote9) |
| `lote11_letras.py` | **Reconstrói as27 letras corrompidas** do `hinos.js` a partir do `fix_letras.json` | Só no Linux (idempotente) |
| `lote12_home_yt.py` | **Zoom livre na partitura + 🎬 playlist do YouTube na home + scroll fix** do "Editar registros" | Só no Linux (idempotente) |
| `fix_letras.json` | As27 letras montadas na fonte web (letras.com.br / letras.mus / revistaebd) | Dado do lote11 |
| `sql/lote8_a_duplicatas.sql` | Remove **músicas duplicadas** (mesmo título), mantendo a melhor | Agora, no SQL Editor |
| `sql/lote8_b_fora_padrao.sql` | Remove **97 títulos fora do padrão** que duplicam hinos oficiais | Depois do SQL A |
| `sql/lote9_tema.sql` | Cria a coluna **`tema`** (coleções) | Depois do SQL B |
| `codigo_pra_subir_github/` | **9 arquivos** prontos p/ upload (o app novo + `hinos.js` com as letras) | Agora, no GitHub web |
| `testes/` | Bateria: t1–t7 + harness (11 verificações) | Só no Linux |

---

## ▶️ Ordem de execução

**Agora (celular):**
1. SQL Editor → `sql/lote8_a_duplicatas.sql` → **Run**
2. SQL Editor → `sql/lote8_b_fora_padrao.sql` → **Run**
3. SQL Editor → `sql/lote9_tema.sql` → **Run** (confere que aparece `tema`)
4. Anote: `SELECT count(*) FROM musicas;`
5. GitHub → **Add file → Upload files** → os **9** de `codigo_pra_subir_github/`
   → commit direto na main (mensagem sugerida em `00_ORDEM.txt`)
6. Abrir o app → puxar a página **2×** → checklist abaixo

> **ATUALIZAÇÃO (lote12):** você já subiu tudo? Então suba só os **4 alterados**:
> `index.html`, `culto.js`, `temp-acervo.js`, `sw.js` (mesmo modo: Upload files).

**Depois (Linux — me avise):**
7. `python3 lote8_ui.py` → esperar `TODOS OS PATCHES LOTE8 OK`
8. `python3 lote9_features.py` → esperar `TODOS OS PATCHES LOTE9 OK`
9. `python3 lote10_zoom.py` → esperar `TODOS OS PATCHES LOTE10 OK`
10. `python3 lote11_letras.py` → esperar `LOTE11 OK`
11. `python3 lote12_home_yt.py` → esperar `LOTE12 OK`
12. Testes → `t1–t7 OK` + `TODOS OS TESTES OK (11/11)`
13. `git add` + `commit` + `push` (no seu terminal, como sempre)
14. Recarregar o app no celular

---

## ✅ Checklist — LOTE8 (13 pedidos)

| # | Pedido | Como testar |
|---|---|---|
| a | Botão PARTITURA alinhado | Cifra → barra de botões na mesma altura |
| b | Botões organizados / mobile | Abas da cifra sem quebrar, títulos sem cortar |
| c | Músicas duplicadas → UMA | Seção Músicas: menos repetidas (SQL A) |
| d | Link "🎧 Áudios (0)" removido | Detalhe da música: sumiu (só o de cima fica) |
| e | Hinos fora do padrão removidos | Sumiram "Título - 123" duplicados (SQL B) |
| f | Voltar restaura rolagem | Lista → abrir música → voltar → mesmo ponto |
| g | Botão "LETRA DO HINO" | Fim da página do hino |
| h | PDF do hino em tela cheia | Celular → PARTITURA → imagem full |
| i | Varredura mobile | Nada estourando a tela |
| j | ESC fecha modal | Teclado externo → ESC fecha |
| k | Excluir ao lado do lápis | 🗑 na linha do ✏️ (não dentro do form) |
| l | Histórico só ao CONCLUIR | Montar/publicar NÃO registra; só CONCLUIR EVENTO |
| m | Nome trocado | Menu: **"Histórico de músicas"** (rota `cantadas` intacta) |

## ✅ Checklist — LOTE9 (melhorias escolhidas)

| # | Melhoria | Como testar |
|---|---|---|
| 1 | **Tela Músicas reorganizada** | Abas **Todos/Culto/Telegram** com contagem; busca sem acento (digite "fernandin"); paginação "▶ Ver mais"; favoritos continua igual |
| 2 | **Coleções/temas** | Edite uma música (✎) → campo **Coleção / tema** (Ceia, Páscoa…) → salve; chips 🏷️ aparecem na lista; no **Histórico** há o filtro "🏷️ Coleção / tema" |
| 3 | **WhatsApp** | Detalhe da música → botão **📱 WhatsApp** (manda cifra ou letra conforme a aba aberta); hino do Cantor Cristão → **📱** na barra de cima (manda com os acordes) |

## ✅ Checklist — LOTE10 + LETRAS

| # | Novidade | Como testar |
|---|---|---|
| 10 | **Zoom na partitura** | Hino → PARTITURA → barra **A− 100% A+ Resetar**; toque na imagem alterna100%↔220%; pinça de2 dedos dá zoom |
| 11 | **Letras dos581 hinos** | Hino → LETRA DO HINO → estrofas legíveis; confira os hinos **7,24,191,391,447,451,456,536** (estavam com letra corrompida) |

## ✅ Checklist — LOTE12 (zoom livre + home + scroll)

| # | Novidade | Como testar |
|---|---|---|
| 1 | **Zoom livre** | PARTITURA → **arraste com1 dedo p/ onde quiser** com zoom; pinça amplia onde estão os dedos; rodo do mouse também (desktop); A+/A− centralizam |
| 2 | **YouTube na home** | Tela inicial → card PLAYLIST DA SEMANA com botão vermelho **▶ Assistir no YouTube** + "Ver playlist completa ›"; no card da semana também aparece **▶ Playlist no YouTube** |
| 3 | **Home reorganizada** | Saudação → playlist (+YT) → Acesso rápido → escala (resumida) → Ordem do culto |
| 4 | **Excluir sem pular** | ✏️ Editar registros → role a lista → 🗑 → **a lista fica onde estava** (e a busca é preservada) |

---

## ⚠️ Observações

- Os3 SQLs são **idempotentes** (rodar de novo não quebra nada).
- Sem a coluna `tema`, o app avisa "rode o SQL" em vez de quebrar.
- O SQL B apaga **por título** só o que foi conferido contra os581 hinos
  oficiais — "A Colheita" da Alda Célia **fica**; "Louvamos - 12" **sai**.
- **`hinos.js` é a fonte das letras/cifras** — o upload dos9 arquivos já
  inclui as27 letras reconstruídas (o PDF do hinário tem a fonte quebrada
  nessas páginas; a letra veio da web e bate com os fragmentos do PDF).
- Código só tem efeito depois do **push + recarregar** (cache **sw v41**).

---

*Gerado em 03/11/2026 — lote8 (a–m) + lote9 (abas, coleções, WhatsApp) + lote10 (zoom) + letras (27 reconstruídas) + lote12 (zoom livre, YouTube na home, scroll fix).*
