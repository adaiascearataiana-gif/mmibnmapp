# Sugestões e melhorias — MM IBNM (v0.3.0)

## ✅ Corrigido nesta versão

**Cantor Cristão**
1. Número da estrofe e rótulo "Coro" ficavam por cima do primeiro acorde.
2. Palavras divididas entre acordes apareciam com buraco ("to   das") — agora "to-das".
3. Espaço exagerado entre as linhas; com "Cifras" desligado o espaço dos acordes continuava ocupado.
4. Barra do hino (‹ Hinos, ☆, A−, A+, ⚙) sumia atrás do topo ao rolar.
5. "Pausar" fechava a barra de rolagem; agora pausa/continua, volta ao início e avisa o fim.
6. Tela apagava no meio da rolagem — agora fica ligada enquanto rola.
7. Qualquer atualização da nuvem jogava o hino de volta ao topo no meio do louvor.
8. Transposição acumulava ("+14"); agora fica entre −6 e +6.
9. **Edições do ADM ficavam só no aparelho dele** — agora vão para a nuvem (tabela `cantor_edits`).
10. Marca "editado" aparecia para membros; agora só o ADM vê.

**App**
11. Transposição do editor de cifras não mudava bemóis (Bb, Eb), nem o baixo (D/F#), nem C7M.
12. Tempo real jogava qualquer tela (cifra, escala...) para o topo.
13. Faixa "AO VIVO" cobria a barra verde (menu e sino inacessíveis).
14. Sombra do menu lateral aparecia na borda esquerda mesmo fechado.
15. Rodapé da versão ficava por cima do conteúdo e duplicado no menu.
16. Botão "Tudo" do A–Z vazava; títulos com letra acentuada ("Ó…") não entravam no A–Z.
17. Busca de músicas dependia de acento.
18. Ícones errados no menu da Academia (Violão com bateria, Baixo com saxofone).
19. Dezenas de textos sem acento ("Confirmacoes", "Nao poderei", "transmissao"...).
20. Service worker nunca atualizava `hinos.js`/`cantor.js` para quem já tinha instalado.
21. Zoom da cifra voltava ao normal a cada abertura — agora é lembrado.

## 🆕 Novos recursos
- Tom −/+ e rolagem automática nas músicas do ministério.
- 🔴 Ao vivo com hinos do Cantor Cristão (membros acompanham automaticamente).
- ↗ Compartilhar hino: link `…/#hino-214` abre direto no hino.
- Atalhos no ícone do app instalado (Cantor, Escala, Playlist).
- Busca de músicas também por trecho da letra.

## ✅ Feito na v0.4.0
- Ordem do culto com músicas + hinos e "Próxima ▶".
- Tom do culto definido pelo ADM (todos abrem já transpostos).
- Modo projetor (letra grande por estrofe, coro repetido).
- Metrônomo com TAP e afinador pelo microfone.
- Modo escuro.
- Favoritos do Cantor na nuvem.
- Versão do supabase-js fixada (2.45.4).
- SQL para só usuários logados criarem notificações.

## 💡 Ainda pendentes (precisam de algo fora do app)
1. **Web Push com o app fechado** — precisa gerar chaves VAPID e criar uma
   Edge Function no Supabase que envie os avisos. Dá para fazer junto, com
   acesso ao painel.
2. **SRI (integrity) nos CDNs** — precisa calcular o hash do arquivo exato
   publicado; faça após confirmar que a versão 2.45.4 roda bem.
3. **Separar o `index.html` em módulos** — mudança grande de organização;
   melhor fazer com calma, depois de as novidades estarem testadas no culto.
