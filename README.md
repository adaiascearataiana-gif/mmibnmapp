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
| `culto.js` | Ordem do culto, tom do culto, projetor, metrônomo/afinador e modo escuro (v0.4.0) |
| `escala.js` | Escala em cartões (nomes em destaque, filtros) e semana vigente corrigida (v0.4.1) |
| `membros.js` | Modo ADM/usuário, cadastro obrigatório e tabela de membros (v0.5.0) |
| `avisos.js` | Notificações com link, popups, sons, aniversários e avisos de escala (v0.6.0) |
| `cantadas.js` | Filtros de Músicas que já cantamos (v0.6.0) |
| `melhorias.js` | Correções e recursos da v0.3.0 (tom/rolagem nas músicas, ao vivo com hinos, links diretos) |
| `cc-intro/` | Imagens de introdução dos hinos |
| `sw.js` | Service worker (offline) — `mmibnm-v10`, atualiza os arquivos sozinho |
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

## Novidades da v0.3.0

- **Músicas:** Tom −/+ (só para quem está vendo, não altera a cifra) e
  rolagem automática igual à do Cantor. A busca ignora acentos e também
  procura em trechos da letra.
- **Cantor Cristão:** edições do ADM vão para a nuvem (todos veem),
  botão **🔴 Ao vivo** para hinos, botão **↗ compartilhar** (link
  `#hino-123` abre direto no hino), rolagem com pausar/continuar e tela
  sempre ligada durante a rolagem.
- **Atalhos do ícone** (segure o ícone do app): Cantor, Escala, Playlist.

⚠️ Rode a seção **7** do `MMIBNM-SQL-completo.sql` no Supabase para as
edições do Cantor aparecerem para todos.

## Novidades da v0.4.0

- **Ordem do culto:** o ADM monta a playlist com músicas **e hinos**, na
  ordem, e define o **tom de cada item**. Todos veem "◀ Anterior · 2 de 6 ·
  Próxima ▶" e abrem já no tom do culto (cada um pode mudar só para si).
  Na tela de uma música/hino, o ADM pode tocar em **📌 Usar este tom no culto**.
- **📺 Projetar:** letra grande, sem acordes, por estrofe (o coro entra
  depois de cada estrofe). Toque/arraste ou use setas, controle de slides
  ou Bluetooth. "Projetar tudo" passa pela ordem do culto inteira.
- **🎛 Metrônomo** (TAP, compassos 2/4, 3/4, 4/4, 6/8, continua tocando em
  segundo plano) e **afinador** pelo microfone (Lá = 430–450 Hz).
- **🌙 Modo escuro** em Meu Perfil → Aparência (claro, escuro ou do celular).
- **Favoritos do Cantor na nuvem** (não somem ao trocar de celular).

⚠️ Rode as seções **8** e **9** do `MMIBNM-SQL-completo.sql` no Supabase.

## Novidades da v0.4.1

- **Escala em cartões:** um cartão por culto, data grande, cada função
  com os nomes em etiquetas; o seu nome aparece em dourado e o culto da
  semana em destaque. Filtros **Próximas · Todas · Minhas** e botão
  **▦ Tabela** para quem preferir a tabela.
- Campos com "XXXXXXXXX" aparecem como "a definir".
- A semana vigente agora reconhece datas como 7-Jun, 2-Aug, 07/06.

## v0.4.2

- **Importar escala:** grava só até a última coluna preenchida (colunas
  vazias do fim, colunas sem nome e sem dado e linhas em branco são
  ignoradas). A escala que já está no app também passa a esconder essas
  colunas, sem precisar importar de novo.

## v0.4.3
- Botão **VOLTAR** (Android/gesto do iPhone) em todo o app: fecha projetor,
  janelas, modais e menu; volta tela a tela (inclusive do editor de cifra,
  hinos, academia); ao acabar o histórico vai para o **Início**; no Início
  pergunta se quer sair. Cadastro/Recuperar senha voltam para o Login.
- Escala: barra **Próximas · Todas · Minhas · Tabela** fica fixa; no modo
  tabela só a tabela rola (para cima/baixo e para os lados).

## v0.5.0
- **Modo ADM / Modo usuário** no menu lateral (só para ADM). No modo
  usuário aparece um aviso no topo; tocar nele volta ao modo ADM.
- **Cadastro obrigatório:** nome e sobrenome, nascimento, telefone,
  WhatsApp (sim/não) e função. Quem estiver incompleto (ex.: entrou pelo
  Google) vê "Complete seu cadastro" ao abrir o app.
- **👥 Membros (tabela do ADM):** todos os dados, cadastro completo ou
  incompleto, busca, filtros (função, ADM, aniversariantes), ordenar,
  editar, tornar/tirar ADM, WhatsApp e exportar para Excel.

⚠️ Rode a seção **10** do `MMIBNM-SQL-completo.sql`.

## v0.6.0
- **Membros:** botão 🗑️ Excluir na tabela (apaga cadastro, dados e o login).
- **Aniversários:** no dia, todos recebem aviso; o aniversariante recebe
  uma mensagem especial em janela. O Início mostra os aniversariantes dos
  próximos 7 dias, com botão "Dar parabéns" no WhatsApp.
- **Escala:** a partir de segunda 00:01, quem está escalado vê uma janela
  prioritária ao abrir o app (Vou participar / Não poderei) até responder;
  e recebe aviso 1 semana antes ("Você está na escala da próxima semana").
- **Confirmação de presença:** a notificação vai só para os ADM.
- **Tocar na notificação** abre a página dela (escala, playlist, música…).
- **Avisos do ADM** em janela (popup) com X, para todos ou um grupo.
- **Sons de notificação:** 8 sons + sem som, com volume (Notificações e Perfil).
- **Músicas que já cantamos:** A–Z, cantor/artista, culto, evento, mês,
  data, dia da semana; ordenar por data, A–Z ou mais cantadas.
- **Afinador:** Violão, Contrabaixo 4 cordas e 5 cordas (com notas de referência).

⚠️ Rode a seção **11** do `MMIBNM-SQL-completo.sql`.

## v0.6.1
- ADM: na aba **Letra**, botões ✏️ Editar/Cadastrar letra e 🗑️ Excluir letra;
  nas abas Cifra e Letra, 🗑️ **Excluir música** (inteira: cifra, letra e áudios;
  sai também dos favoritos e da playlist). Rode a seção **12** do SQL.
