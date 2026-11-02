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

## v0.6.2
- Nome: primeira letra de cada palavra sempre maiúscula (cadastro, completar
  cadastro, editar perfil e edição do ADM).
- WhatsApp: ao marcar **Não**, abre o campo "Número do WhatsApp" (obrigatório),
  com a opção "Não tenho WhatsApp". A tabela de membros mostra esse número.
  Rode a seção **13** do SQL.

## v0.6.3
- Playlist / ordem do culto: busca com prévia em "🎵 Músicas do ministério"
  (título ou artista) e "📖 Hinos do Cantor Cristão" (número ou nome);
  toque para adicionar. Campo para o link da **playlist do YouTube**
  (aparece como botão na Playlist e no Início).
- Corrigido o erro "duplicate key value violates unique constraint
  playlist_pkey" ao publicar (agora atualiza a playlist existente).

## v0.7.0
- **Playlist da próxima semana:** abas "📅 Esta semana" e "🗓️ Próxima semana"
  na Playlist. O ADM monta a da próxima semana do mesmo jeito (busca de
  músicas e hinos, ordem, tom, YouTube); as datas já vêm preenchidas.
- Ao publicar, quem está **escalado nas datas dessa playlist** recebe aviso
  em janela e acesso direto às letras, cifras e áudios (opção de avisar todos).
- Quando chega a semana, ela vira automaticamente a playlist "desta semana".
- Início mostra o cartão da próxima semana; itens mostram o que está
  disponível (cifra · letra · áudio). Sem SQL novo.

## v0.7.1
- **Áudios das músicas (ADM):** na aba **Áudio** de cada música, cartão com
  🎙️ Gravar (pelo microfone do celular), 📁 Enviar arquivo (mp3, m4a, wav…),
  🔗 Colar link (Google Drive, MP3, Dropbox), ✏️ renomear e 🗑️ excluir.
  Atalho "🎧 Áudios (n)" na aba Cifra. Rode a seção **14** do SQL.

## v0.7.2
- **Áudios vão direto para o Google Drive** (pasta "MM IBNM - Áudios"),
  inclusive gravações. Botão "🔗 Conectar ao Drive" na aba Áudio; botão para
  mover áudios antigos do Supabase para o Drive. A seção 14 do SQL deixou de
  ser necessária.
- **Editor de cifra: campo Introdução** (só o ADM vê o campo). Os músicos
  veem "Intro: ..." no topo da cifra; Tom −/+ e transpor também mudam a intro.

## v0.7.3
- **Colar cifra do Cifra Club (ou de outro site):** o editor cola como texto
  puro, linha por linha, mantendo os espaços que deixam o acorde em cima da
  sílaba certa (tabulações viram espaços).
- **Ver cifra:** as linhas não quebram mais no celular (era isso que
  desalinhava); a letra diminui para caber na tela (mín. 11 px; o resto rola
  de lado); acordes em verde, partes [Intro]/[Refrão] em dourado; ao mudar o
  tom, cada acorde fica na mesma coluna.

## v0.7.4
- **Editor de cifra: 📄 Importar cifra de PDF.** Lê o texto do PDF e coloca
  cada acorde em cima da mesma sílaba em que está no PDF (PDF escaneado/imagem
  não tem texto para ler).
- **Mudar o tom:** agora só os acordes mudam, sem recarregar a tela (ela não
  pula mais). Reconhece acordes como A7/9, C9/E, G7M(9)/B, Bm7(b5).

## v0.7.5
- **Maiúsculas em nomes e títulos:** primeira letra de cada palavra maiúscula
  em títulos e artistas das músicas, hinos, "Músicas que já cantamos", nomes
  de membros e nomes da escala. Texto TODO EM MAIÚSCULAS vira normal
  ("PORQUE ELE VIVE" → "Porque Ele Vive"); siglas como HCA e EBD ficam.
  Ao digitar título/artista ou nome, já sai certo; ao salvar, grava assim.

## v0.7.6
- **Só os acordes em destaque:** na cifra publicada, cada acorde fica em
  negrito na cor laranja-queimado (#a8350a); a letra fica normal (sem negrito
  e sem cores, mesmo que tenham sido aplicados no editor). Rótulos como
  [Refrão] e "Intro:" ficam em cinza discreto. Mesma cor nos hinos do Cantor.
  Contraste medido: 6,5:1 no modo claro e 8,6:1 no modo escuro.

## v0.7.7
- Nomes e títulos: primeira letra maiúscula, mas palavras pequenas no meio
  ficam minúsculas ("Cristo Chama por Ti", "Maria da Silva", "Alfa e Ômega").
- Corrigida uma corrida no carregamento: notificações em janela, nomes com
  maiúsculas e número do WhatsApp agora sempre aparecem na 1ª abertura.

## 🚀 Como publicar (tudo de uma vez)
1. Substitua **todos** os arquivos do repositório pelo conteúdo deste zip.
2. No Supabase → SQL Editor, rode o arquivo **SQL-PARA-RODAR-AGORA.sql**.
3. Google Cloud → APIs e serviços → Biblioteca → **Google Drive API → Ativar**.
4. No app (ADM) → Painel do ADM → 📁 Google Drive → cole o Client ID e salve.
5. Abra o app 2 vezes no celular para ele pegar a versão nova.

## v0.8.0
- **📣 Central de avisos (ADM)** no menu e no Painel do ADM. O ADM escolhe o
  que avisar e para quem (todos, escalados desta/próxima semana, vocal,
  instrumentistas, uma função, só ADM), em janela ou não:
  - 🎵 Músicas novas: lista com todas as músicas publicadas que ainda não
    foram avisadas (marcar/desmarcar); depois do envio elas saem da lista.
  - 📚 Materiais de estudo da Academia, do mesmo jeito.
  - 📅 Playlist desta semana / da próxima semana.
  - 📋 Escala atualizada e lembrete de presença (só para quem não respondeu).
  - 📝 Lembrete para quem está com cadastro faltando (foto, WhatsApp…).
  - 🎂 Aniversariantes dos próximos 7 dias. ✍️ Aviso livre.
  - Publicar música não avisa mais sozinho (dá para religar na Central).
- **Lembrete a cada 7 dias (membros):** janela "Falta pouco" com o que está
  pendente: confirmar presença na escala (Sim/Não), foto de perfil,
  WhatsApp e ativar notificações. Sem SQL novo.

## v0.9.0
- **Economia de dados (Supabase):**
  - Tempo real aplica só a linha que mudou (antes cada mudança fazia todos os
    celulares baixarem todas as tabelas).
  - Músicas, escala, histórico e notificações ficam guardados no aparelho;
    ao abrir, o app baixa só o que mudou (2ª abertura ≈ 1% do volume).
  - Ao voltar do segundo plano, sincroniza só o que mudou.
  - Fotos de perfil reduzidas para ~30 KB ao enviar; a sua foto antiga é
    otimizada sozinha; o celular guarda as fotos (não baixa de novo).
  - O app só inicia depois de carregar todos os módulos (sem "corrida").
  - Rode a seção **15** do SQL (coluna updated_at): é o que permite baixar só
    o que mudou. Ela também apaga notificações lidas com mais de 60 dias.
- **Academia de Música:** em todas as seções, botão **📁 Importar arquivos**
  (vários de uma vez: vídeos, PDFs e áudios) → Google Drive (pasta
  "MM IBNM - Academia"); tipos novos 🎬 Vídeo e 🎧 Áudio; ▶ Assistir /
  🎧 Ouvir / 📄 Ver PDF dentro do app. Envios grandes (até 1 GB) com progresso.

## v0.9.1
- **📥 Importar letras do Telegram (ADM):** menu lateral e Painel do ADM.
  Exporte o grupo no Telegram Desktop (formato JSON) e escolha o `result.json`.
  Cada tópico (♫ Título) vira uma música; "Título - Artista" e
  "Título (Artista)" separam o artista; mensagens do tópico viram a letra
  (com acordes, entra também como cifra). Lista para revisar antes:
  🆕 novas, ✍️ já existe sem letra (completa), ✔️ já tem, ∅ sem letra.

## v0.9.2
- **📥 Importar músicas (JSON):** botão "Importar várias (JSON)" na lista de
  Músicas (ADM), no menu e no Painel do ADM. Aceita o result.json do Telegram
  ou uma lista de músicas em JSON (título e letra; artista, cifra, tom e
  YouTube opcionais; nomes em português ou inglês). Botão para baixar um
  modelo. Revisão antes de importar; depois completa os outros campos.

## v0.9.3
- **🎸 Buscar cifras (ADM):** menu, Painel do ADM e botão na lista de Músicas.
  Lista as músicas sem cifra; para cada uma: link direto para a cifra no
  Cifra Club (artista/título), busca no Cifra Club e no Google, botão
  "📋 Colar cifra copiada". O app confere o texto colado com a letra
  cadastrada (✅ confere X% / ⚠️ / ❌ outra música), mostra a prévia com o
  link da original e só importa quando o ADM toca em "Conferi — importar".
  A cifra entra com o alinhamento original e continua editável.
- Música sem cifra mostra o mesmo cartão na própria tela (ADM); ao salvar
  uma letra numa música sem cifra, o app já abre o assistente.

## v0.9.4
- Destaque dos acordes agora funciona em **qualquer cifra**, inclusive as
  coladas/editadas antes (um bloco por linha, linhas com <br>, negrito/cor
  aplicados à mão): o app lê a cifra linha por linha e destaca só os acordes
  (negrito, laranja-queimado), com a letra normal e o alinhamento original.

## v0.9.5
- **Toda cifra gravada no padrão:** ao salvar/publicar no editor (e em toda
  importação), a cifra é gravada limpa — uma linha por bloco, espaços
  originais, sem negrito/cor/fonte manuais. Na tela, só os acordes ficam em
  negrito laranja; a letra normal.
- Painel do ADM: **🧹 Formatação das cifras** — padroniza de uma vez as
  cifras antigas com formatação manual.

## v0.9.6
- Cifras importadas de PDF/sites que vinham "e s p a ç a d a s" (uma letra,
  um espaço) agora voltam ao normal, com cada acorde em cima da sílaba
  certa — e todos os acordes são reconhecidos e destacados.
- Limpeza de caracteres invisíveis, espaços especiais e ♯/♭ do PDF/site;
  "Intro]" sem colchete é corrigido para "[Intro]".
- Importar PDF: PDFs com fonte de largura fixa (Cifra Club etc.) são lidos
  coluna por coluna — fica exatamente como no PDF.
- Fonte única do app na cifra (sem espaçamento de letras herdado).
- As cifras já gravadas são corrigidas sozinhas quando o ADM abre o app
  (uma vez); o botão 🧹 do Painel continua disponível.

## v0.9.7
- **Função "🎛️ Mesa de som"** no cadastro, completar cadastro, editar perfil
  e edição do ADM (mesmas regras de vozes e instrumentos). Quem está na
  escala (coluna "Mesa de Som"/"Som" ou qualquer outra) recebe os alertas
  da escala normalmente; filtros da Central e da tabela de membros incluem.
- **Escala em tabela redesenhada:** sem linhas cortando; cabeçalho e coluna
  do culto fixos; cada nome numa etiqueta, um embaixo do outro; linhas
  alternadas; semana atual em dourado; seu nome destacado; filtros
  Próximas/Todas/Minhas também na tabela.

## v1.0.0
- **Áudios por voz (ADM), na aba Áudio:** 🎤 PRINCIPAL, 🎶 BACK 1, 🎶 BACK 2 —
  cada um com Gravar / Enviar arquivo / Link (vai para o Google Drive),
  campo "Quem canta" com prévia ao digitar (só quem tem voz no cadastro) e
  💾 Salvar. Quem é marcado recebe notificação que abre o áudio.
  "Outros áudios" continua para playback/ensaio.
- **Notificações na barra do celular (Web Push)**, com o app fechado, e
  **preferências**: cada pessoa escolhe o que quer receber (Perfil e 🔔).
  Configuração única no Supabase: arquivo PUSH-CONFIGURAR.md (fora do GitHub).
- **Cor dos acordes:** paleta de 6 cores (ADM escolhe no editor 🎨 ou no
  Painel); vale para músicas e hinos. No editor os acordes já aparecem
  destacados; botão ✨ Acordes. Barra do editor sem fonte/tamanho/cores manuais.
- **Introdução** em caixa de várias linhas, que cresce e pode ser puxada.
- **Enter** nos campos de letra, cifra e introdução sempre abre nova linha.
- **Tela parada:** o editor não tem mais rolagem interna (não pula ao digitar);
  o app não redesenha a tela enquanto alguém está digitando.
