/* ============================================================
   MM IBNM — Tour guiado + dicas (v1.1.0)
   O tutorial percorre as telas de verdade: abre cada tela, destaca o
   botão (o resto escurece) e explica para que serve.
   - Tour do membro (todos) e Tour do ADM (só administradores)
   - Dica rápida na 1ª vez que a pessoa abre cada tela
   - Menu → "Como usar o app" recomeça quando quiser
============================================================ */
(function(){
'use strict';
const e = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $q = s => document.querySelector(s);
const adm = () => { try{ return typeof ehAdmin==='function' ? !!ehAdmin() : false; }catch(_){ return false; } };
const primeiraMusica = () => { const m=(DB.musicas||[]).find(x=>x.publicada!==false && x.cifra) || (DB.musicas||[])[0]; return m&&m.id; };
const fechaMenu = () => { try{ toggleMenu(false); }catch(_){} };
const abreMenu = () => { try{ toggleMenu(true); }catch(_){} };
const naTela = (r,a) => { fechaMenu(); try{ go(r,a); }catch(_){} };

/* ---------- roteiros ---------- */
const MEMBRO=[
  {t:'Bem-vindo(a)! 👋',x:'Vou te mostrar o app em 2 minutos, tela por tela. Toque em <b>Próximo</b> para seguir ou em <b>Pular</b> para sair.',ir:()=>naTela('inicio')},
  {a:'.hamb',t:'Menu',x:'Aqui ficam todas as seções do app: Playlist, Músicas, Cantor Cristão, Escala, Academia, Metrônomo e mais.',ir:()=>naTela('inicio')},
  {a:'#sidemenu .sm-nav',t:'Seções',x:'Toque numa seção para abrir. O <b>botão Voltar</b> do celular também volta tela a tela.',ir:()=>{ naTela('inicio'); setTimeout(abreMenu,80); }},
  {a:'.ico-btn',t:'🔔 Notificações',x:'O número mostra avisos novos: escala, playlist, músicas novas e recados do ministério. Tocar no aviso abre a página dele.',ir:()=>naTela('inicio')},
  {a:'#topAvatar',t:'Meu perfil',x:'Sua foto, seus dados, o modo escuro e quais notificações você quer receber no celular.',ir:()=>naTela('inicio')},
  {a:'.pl-tabs',t:'📅 Playlist',x:'A ordem do culto desta semana e da próxima. Quando sair a da próxima semana, quem está escalado é avisado.',ir:()=>naTela('playlist')},
  {a:'.sl-item',t:'Músicas do culto',x:'Toque numa música para ver cifra, letra e áudio, já no tom combinado para o culto.',ir:()=>naTela('playlist'),opc:true},
  {a:'.sl-acts .gold',t:'▶ Começar pelo 1º',x:'Abre a primeira música; depois use <b>Próxima ▶</b> no topo de cada música para ir na ordem do culto.',ir:()=>naTela('playlist'),opc:true},
  {a:'.tabs3',t:'Cifra · Letra · Áudio',x:'Cada música tem a cifra (acordes destacados), a letra e os áudios para ensaiar.',ir:()=>{ const id=primeiraMusica(); fechaMenu(); if(id) abrirMusica(id,'cifra'); },opc:true},
  {a:'.mm-tom',t:'Mudar o tom',x:'<b>−</b> e <b>+</b> mudam o tom só no seu celular. Os acordes mudam e a tela fica parada.',opc:true},
  {a:'#musRolBtn',t:'▶ Rolagem',x:'A cifra rola sozinha enquanto você toca. Dá para mudar a velocidade e pausar.',opc:true},
  {a:'.sl-acts',t:'Projetar e metrônomo',x:'<b>📺 Projetar letra</b>: letra grande, estrofe por estrofe. <b>🎛 Metrônomo / afinador</b>: TAP, compassos e afinador de violão e contrabaixo.',opc:true},
  {a:'#ccQ',t:'📖 Cantor Cristão',x:'Busque o hino pelo número, nome ou um trecho da letra.',ir:()=>naTela('cantor'),opc:true},
  {a:'.cc-tools',t:'No hino',x:'Ligue/desligue as cifras, mude o tom, use a rolagem e ouça no YouTube quando houver.',ir:()=>{ fechaMenu(); try{ cantorAbrir(214); }catch(_){} },opc:true},
  {a:'.esc-seg',t:'📋 Escala',x:'<b>Próximas</b>, <b>Todas</b> ou só as <b>Minhas</b>. O culto desta semana fica em dourado e o seu nome também.',ir:()=>naTela('escala'),opc:true},
  {a:'#presObs',t:'Confirmar presença',x:'Quando você estiver escalado(a), confirme aqui se vai participar. O ADM é avisado.',ir:()=>naTela('escala'),opc:true,alvo:el=>el.closest('.card')},
  {a:'.esc-modo',t:'Tabela',x:'Prefere ver em tabela? Toque aqui. A tabela rola para os lados e para baixo.',opc:true},
  {a:'.ps-card',t:'🔔 Notificações no celular',x:'Ative para receber os avisos na barra do celular, mesmo com o app fechado, e escolha o que quer receber.',ir:()=>naTela('perfil'),opc:true},
  {a:'.tema-opts',t:'🌙 Modo escuro',x:'Para os cultos à noite: menos brilho na tela.',ir:()=>naTela('perfil'),opc:true},
  {t:'Pronto! 🎉',x:'Se precisar rever, abra o menu → <b>Como usar o app</b>. Em cada tela nova, o app também dá uma dica rápida.',ir:()=>naTela('inicio')}
];
const ADM=[
  {t:'Tour do ADM 🛡️',x:'Agora as ferramentas de administrador.',ir:()=>naTela('inicio')},
  {a:'#smModo',t:'Modo ADM / Modo usuário',x:'Veja o app exatamente como um membro vê. O aviso no topo leva de volta ao modo ADM.',ir:()=>{ naTela('inicio'); setTimeout(abreMenu,80); },opc:true},
  {a:'[data-central]',t:'📣 Central de avisos',x:'Escolha o que avisar e para quem: músicas novas, materiais, playlist, escala, presença, cadastro e aniversários.',ir:()=>{ naTela('inicio'); setTimeout(abreMenu,80); },opc:true},
  {a:'.mini-btn',t:'Montar a playlist',x:'Monte a ordem do culto (músicas e hinos com busca), o tom de cada item e o link do YouTube. Na aba <b>Próxima semana</b>, quem está escalado é avisado.',ir:()=>naTela('playlist'),opc:true},
  {a:'#edTb',t:'Editar cifra',x:'Cole a cifra do Cifra Club (o alinhamento é mantido), importe de PDF, transponha e escolha a <b>🎨 cor dos acordes</b>. Ao salvar, a formatação fica padronizada.',ir:()=>{ const id=primeiraMusica(); fechaMenu(); if(id) editorCifra(id); },opc:true},
  {a:'#edIntro',t:'Introdução',x:'Escreva a introdução aqui (Enter abre outra linha). Os músicos veem no topo da cifra.',opc:true},
  {a:'.vz-card',t:'🎤 Áudios por voz',x:'Principal, Back 1 e Back 2: grave ou envie, marque quem canta e salve. A pessoa marcada é avisada.',ir:()=>{ const id=primeiraMusica(); fechaMenu(); if(id) abrirMusica(id,'audio'); },opc:true},
  {a:'.cfb-page .page-ttl',t:'🎸 Buscar cifras',x:'Lista as músicas sem cifra com link para o Cifra Club. Copie, toque em <b>Colar cifra copiada</b>, confira e importe.',ir:()=>naTela('cifras'),opc:true},
  {a:'.tg-file',t:'📥 Importar músicas',x:'Crie várias músicas de uma vez com título e letra (arquivo JSON ou exportação do Telegram).',ir:()=>naTela('telegram'),opc:true},
  {a:'.mb-kpis',t:'👥 Membros',x:'Todos os cadastros, quem está incompleto, aniversariantes, editar, tornar ADM, excluir e exportar para Excel.',ir:()=>naTela('membros'),opc:true},
  {t:'Fim do tour do ADM ✅',x:'Qualquer dúvida, o Painel do ADM reúne os atalhos.',ir:()=>naTela('inicio')}
];

/* ---------- motor do tour ---------- */
let T=null;
function esperaEl(sel,ms){ return new Promise(ok=>{ const fim=Date.now()+(ms||2200); (function v(){ const el=sel&&$q(sel); if(el && el.getBoundingClientRect().height>0) return ok(el); if(Date.now()>fim) return ok(null); setTimeout(v,120); })(); }); }
function desenha(el,passo){
  let bx=document.getElementById('tourBox'); if(!bx){ bx=document.createElement('div'); bx.id='tourBox'; bx.innerHTML='<div class="tr-buraco"></div><div class="tr-card" role="dialog" aria-live="polite"></div>'; document.body.appendChild(bx); }
  const bur=bx.querySelector('.tr-buraco'), card=bx.querySelector('.tr-card');
  const n=T.lista.length, i=T.i;
  card.innerHTML='<div class="tr-n">'+(i+1)+' de '+n+'</div><div class="tr-t">'+e(passo.t)+'</div><div class="tr-x">'+passo.x+'</div>'+
    '<div class="tr-bt"><button class="tr-pular" onclick="tourFim(true)">Pular</button><span></span>'+(i?'<button class="tr-ant" onclick="tourIr(-1)">‹ Voltar</button>':'')+'<button class="tr-prox" onclick="tourIr(1)">'+(i===n-1?'Concluir':'Próximo ›')+'</button></div>';
  if(el){
    const r=el.getBoundingClientRect(), pad=6;
    Object.assign(bur.style,{display:'block',left:(r.left-pad)+'px',top:(r.top-pad)+'px',width:(r.width+pad*2)+'px',height:(r.height+pad*2)+'px'});
    const ch=card.offsetHeight||180, abaixo=r.bottom+14+ch<innerHeight;
    card.style.top=(abaixo? r.bottom+14 : Math.max(10,r.top-ch-14))+'px'; card.style.bottom='auto';
  } else {
    Object.assign(bur.style,{display:'block',left:'50%',top:'40%',width:'0px',height:'0px'});
    card.style.top=Math.max(20,(innerHeight-(card.offsetHeight||200))/2)+'px';
  }
}
async function mostra(){
  if(!T) return; const passo=T.lista[T.i];
  if(passo.ir) passo.ir();
  await new Promise(r=>setTimeout(r,passo.ir?260:60));
  let el=passo.a? await esperaEl(passo.a) : null;
  if(passo.a && !el && passo.opc){ T.i+=T.dir; if(T.i<0||T.i>=T.lista.length) return tourFim(); return mostra(); }   /* botão não existe aqui: pula */
  if(el && passo.alvo) el=passo.alvo(el)||el;
  if(el){ const r=el.getBoundingClientRect(); if(r.top<80||r.bottom>innerHeight-220){ el.scrollIntoView({block:'center'}); await new Promise(r=>setTimeout(r,250)); } }
  desenha(el,passo);
}
window.tourIr=function(d){ if(!T) return; T.dir=d; T.i+=d; if(T.i>=T.lista.length) return tourFim(); if(T.i<0) T.i=0; mostra(); };
window.tourFim=function(pulou){
  const b=document.getElementById('tourBox'); if(b) b.remove();
  if(T){ try{ const u=usuarioAtual(); if(u) localStorage.setItem('ibnm_bv_'+u.email,'1'); localStorage.setItem('ibnm_tour_'+T.tipo,'1'); }catch(_){} }
  const tipo=T&&T.tipo; T=null; fechaMenu();
  if(tipo==='membro' && !pulou && adm()) setTimeout(()=>{ if(confirm('Quer ver também o tour das ferramentas de ADM?')) iniciarTour('adm'); else go('inicio'); },200);
};
window.iniciarTour=function(tipo){
  const b=document.getElementById('bvScreen'); if(b) b.innerHTML='';
  T={tipo:tipo||'membro',lista:(tipo==='adm'?ADM:MEMBRO),i:0,dir:1}; mostra();
};
addEventListener('resize',()=>{ if(T) mostra(); });
/* o botão Voltar do celular fecha o tour */
addEventListener('popstate',()=>{ if(document.getElementById('tourBox')) tourFim(true); },true);

/* ---------- boas-vindas: escolher o tour ---------- */
window.telaBoasVindas=telaBoasVindas=function(primeira){
  const u=usuarioAtual(); const nome=u? e((u.nome||'').split(' ')[0]) : '';
  const box=document.getElementById('bvScreen'); if(!box){ iniciarTour('membro'); return; }
  box.innerHTML='<div class="tr-bv"><div class="tr-bv-c"><div class="tr-bv-ic">🎵</div><h2>'+(primeira?'Bem-vindo(a), '+nome+'!':'Como usar o app')+'</h2>'+
    '<p>O tour mostra cada tela do app de verdade, destacando os botões. Leva uns 2 minutos.</p>'+
    '<button class="btn btn-primary" onclick="iniciarTour(\'membro\')">▶ Fazer o tour</button>'+
    (adm()?'<button class="btn btn-dark" style="margin-top:8px" onclick="iniciarTour(\'adm\')">🛡️ Tour das ferramentas de ADM</button>':'')+
    '<button class="tr-bv-x" onclick="tourAgoraNao()">'+(primeira?'Agora não':'Fechar')+'</button></div></div>';
};
window.tourAgoraNao=function(){ const u=usuarioAtual(); if(u) localStorage.setItem('ibnm_bv_'+u.email,'1'); const b=document.getElementById('bvScreen'); if(b) b.innerHTML=''; go('inicio'); };

/* ---------- dicas na 1ª vez de cada tela ---------- */
const DICAS=[
  {tela:()=>!!$q('.mm-tom'),id:'musica',a:'.mm-tom',x:'Dica: mude o tom com − e + (só no seu celular). ▶ Rolagem faz a cifra andar sozinha.'},
  {tela:()=>!!$q('.cc-tools'),id:'hino',a:'.cc-tools',x:'Dica: Cifras liga/desliga os acordes; A− e A+ no topo mudam o tamanho da letra.'},
  {tela:()=>!!$q('.esc-seg'),id:'escala',a:'.esc-seg',x:'Dica: veja só as suas escalas em "Minhas". Seu nome aparece em dourado.'},
  {tela:()=>!!$q('.pl-tabs'),id:'playlist',a:'.pl-tabs',x:'Dica: a playlist da próxima semana aparece aqui quando o ADM publicar.'},
  {tela:()=>!!$q('.fc-wrap'),id:'cantadas',a:'.ct-az',x:'Dica: filtre por letra, artista, culto ou data em ⚙️ Filtros.'},
  {tela:()=>!!$q('#edTb'),id:'editor',a:'#edTb',x:'Dica (ADM): cole a cifra do site direto aqui — o alinhamento é mantido. ✨ Acordes destaca de novo.',adm:true},
  {tela:()=>!!$q('.vz-card'),id:'vozes',a:'.vz-card .vz-slot',x:'Dica (ADM): grave ou envie o áudio, marque quem canta e toque em Salvar.',adm:true}
];
let _dt=0;
function verDica(){
  if(T || document.querySelector('.av-bg,#cadGate,#tourBox,.tr-bv') ) return;
  for(const d of DICAS){
    if(d.adm && !adm()) continue;
    if(localStorage.getItem('ibnm_dica_'+d.id)) continue;
    if(!d.tela()) continue;
    const el=$q(d.a); if(!el) continue;
    localStorage.setItem('ibnm_dica_'+d.id,'1');
    const b=document.createElement('div'); b.className='tr-dica'; b.innerHTML='<span>💡 '+e(d.x)+'</span><button aria-label="Fechar dica">Entendi</button>';
    el.insertAdjacentElement('afterend',b);
    b.querySelector('button').onclick=()=>b.remove();
    setTimeout(()=>{ if(b.isConnected) b.classList.add('sai'); setTimeout(()=>b.remove(),400); },12000);
    break;
  }
}
new MutationObserver(()=>{ clearTimeout(_dt); _dt=setTimeout(verDica,700); }).observe(document.getElementById('content')||document.body,{childList:true});

/* menu → "Como usar o app" */
if(typeof ROTAS!=='undefined'){ ROTAS.ajuda=function(){ setTimeout(()=>telaBoasVindas(false),30); return ROTAS.inicio(); }; }

const st=document.createElement('style'); st.textContent=`
#tourBox{position:fixed;inset:0;z-index:13000;pointer-events:auto}
#tourBox .tr-buraco{position:fixed;border-radius:12px;box-shadow:0 0 0 9999px rgba(4,22,16,.72);transition:all .25s ease;pointer-events:none;outline:3px solid var(--dourado);outline-offset:0}
#tourBox .tr-card{position:fixed;left:50%;transform:translateX(-50%);width:min(360px,calc(100vw - 24px));background:#fff;border-radius:16px;padding:14px 16px 12px;box-shadow:0 14px 40px rgba(0,0,0,.35);color:var(--verde-escuro)}
.tr-n{font-size:11px;font-weight:800;color:#8a9;letter-spacing:.04em}
.tr-t{font-size:17px;font-weight:900;margin:2px 0 6px}
.tr-x{font-size:14px;line-height:1.5;color:#334}
.tr-x b{color:var(--verde-escuro)}
.tr-bt{display:flex;align-items:center;gap:6px;margin-top:12px}
.tr-bt span{flex:1}
.tr-bt button{height:40px;border-radius:10px;font-weight:800;font-size:13.5px;padding:0 12px;border:1px solid #cfdad4;background:#fff;color:var(--verde-escuro)}
.tr-bt .tr-prox{background:var(--dourado);border-color:var(--dourado-esc);color:#3a2f00;min-width:110px}
.tr-bt .tr-pular{border:0;background:none;color:#8a9;padding:0 4px}
.tr-bv{position:fixed;inset:0;z-index:12500;background:linear-gradient(160deg,#0b3d2e,#145c44);display:flex;align-items:center;justify-content:center;padding:20px}
.tr-bv-c{width:100%;max-width:400px;background:#fff;border-radius:20px;padding:26px 20px 18px;text-align:center;color:var(--verde-escuro);box-shadow:0 20px 60px rgba(0,0,0,.35)}
.tr-bv-ic{font-size:46px}
.tr-bv-c h2{margin:6px 0 8px;font-size:21px}
.tr-bv-c p{font-size:14px;color:#556;margin-bottom:16px;line-height:1.5}
.tr-bv-x{margin-top:12px;border:0;background:none;color:#7a8f86;font-weight:700;font-size:14px}
.tr-dica{display:flex;align-items:center;gap:10px;margin:8px 0;background:#fff8dc;border:1px solid #f0d97a;border-radius:12px;padding:9px 12px;font-size:13px;color:#5a4700;animation:trIn .25s ease;transition:opacity .35s}
.tr-dica span{flex:1;line-height:1.4}
.tr-dica button{flex:none;border:0;background:var(--dourado);color:#3a2f00;font-weight:800;border-radius:8px;height:32px;padding:0 10px}
.tr-dica.sai{opacity:0}
@keyframes trIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
`; document.head.appendChild(st);
})();
