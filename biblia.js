/* ============================================================
   MM IBNM — 📖 Bíblia + Versículo do momento (v1.0)
   • Menu → 📖 Bíblia: leitura completa (livro, capítulo, busca,
     tamanho da letra, copiar/compartilhar). O texto (biblia-texto.js)
     só é baixado na 1ª vez que abre e depois fica no aparelho.
   • Versículo do momento: manhã (5h–11h59), tarde (12h–17h59) e
     noite (18h–23h59) — o mesmo para todo o ministério naquele período.
     Aparece numa janela ao abrir o app; com o app em segundo plano,
     chega como notificação. Sem genealogias nem listas de nomes.
   Texto: Bíblia Livre — CC BY 3.0 BR (bibliaportugues.com)
============================================================ */
(function(){
'use strict';
if(typeof window.BIBLIA_VERSOS==='undefined') return;
const e = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sem = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const LS = { g:k=>{ try{ return localStorage.getItem(k); }catch(_){ return null; } }, s:(k,v)=>{ try{ localStorage.setItem(k,v); }catch(_){} } };
const LIV = window.BIBLIA_LIVROS, CAPS = window.BIBLIA_CAPS, VS = window.BIBLIA_VERSOS;
const ref = (b,c,v) => LIV[b][0]+' '+c+':'+v;
const CREDITO = 'Bíblia Livre · CC BY 3.0 BR';

/* ---------- versículo do período ---------- */
const PER = [ {k:'manha',nm:'da manhã',ic:'☀️',ini:5,fim:12}, {k:'tarde',nm:'da tarde',ic:'🌤️',ini:12,fim:18}, {k:'noite',nm:'da noite',ic:'🌙',ini:18,fim:24} ];
function periodo(d){ d=d||new Date(); const h=d.getHours(); for(let i=0;i<PER.length;i++) if(h>=PER[i].ini && h<PER[i].fim) return i; return -1; }
const gcd=(a,b)=>b?gcd(b,a%b):a;
const PASSO=(()=>{ const n=VS.length; for(let p=409;;p++) if(gcd(p,n)===1) return p; })();
function versoDe(d,p){
  const dia=Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(2026,0,1))/864e5);
  const n=VS.length, k=((dia*3+p)%n+n)%n;
  return VS[(k*PASSO+17)%n];
}
const chave = (d,p) => d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()+'-'+PER[p].k;
const desligado = () => LS.g('ibnm_vers_off')==='1';

function popup(v,p,manual){
  document.querySelectorAll('.vd-bg').forEach(x=>x.remove());
  const P=PER[p>=0?p:0], [b,c,n,t]=v;
  const bg=document.createElement('div'); bg.className='vd-bg';
  bg.innerHTML='<div class="vd" role="dialog" aria-modal="true" aria-label="Versículo '+e(P.nm)+'">'+
    '<div class="vd-top"><span>'+P.ic+' Versículo '+e(P.nm)+'</span><button class="vd-x" aria-label="Fechar">✕</button></div>'+
    '<blockquote class="vd-txt">'+e(t)+'</blockquote><div class="vd-ref">'+e(ref(b,c,n))+'</div>'+
    '<div class="vd-acts"><button class="vd-b" data-a="ler">📖 Ler o capítulo</button><button class="vd-b" data-a="comp">📤 Compartilhar</button></div>'+
    '<button class="vd-amem">Amém 🙏</button>'+
    '<div class="vd-pe"><span>'+CREDITO+'</span>'+(manual?'':'<button data-a="off">Não mostrar mais</button>')+'</div></div>';
  document.body.appendChild(bg);
  const fecha=()=>bg.remove();
  bg.addEventListener('click',ev=>{ if(ev.target===bg) fecha(); });
  bg.querySelector('.vd-x').onclick=fecha; bg.querySelector('.vd-amem').onclick=fecha;
  bg.querySelectorAll('[data-a]').forEach(x=>x.onclick=()=>{ const a=x.dataset.a;
    if(a==='ler'){ fecha(); BB.b=b; BB.c=c; BB.v=n; BB.modo='ler'; salvaPos(); go('biblia'); }
    else if(a==='comp') compartilha(t+'\n— '+ref(b,c,n));
    else if(a==='off'){ LS.s('ibnm_vers_off','1'); fecha(); try{ toast('Versículos desligados. Para ligar de novo: Menu → 📖 Bíblia.'); }catch(_){} } });
}
window.versiculoAgora=function(){ const d=new Date(); let p=periodo(d); if(p<0) p=2; popup(versoDe(d,p),p,true); };
async function compartilha(txt){
  try{ if(navigator.share){ await navigator.share({text:txt}); return; } }catch(_){ return; }
  try{ await navigator.clipboard.writeText(txt); toast('Copiado! Cole no WhatsApp. 📋'); }catch(_){ prompt('Copie o versículo:',txt); }
}
/* pode mostrar? (logado, sem outra janela aberta na frente) */
function podeMostrar(){
  try{ if(!(typeof usuarioAtual==='function' && usuarioAtual())) return false; }catch(_){ return false; }
  if(document.querySelector('.vd-bg,.modal-bg.show,.cc-sheet-bg,#bvScreen,#cadGate,.av-bg,#tourBox,.tr-bv')) return false;
  const m=document.getElementById('modal'); if(m && (m.classList.contains('show')||m.classList.contains('open')||getComputedStyle(m).display!=='none')) return false;
  return true;
}
async function notifica(v,p){
  try{ if(!('Notification' in window) || Notification.permission!=='granted' || !navigator.serviceWorker) return false;
    const r=await navigator.serviceWorker.getRegistration(); if(!r) return false;
    await r.showNotification(PER[p].ic+' Versículo '+PER[p].nm, {body:v[3]+'\n— '+ref(v[0],v[1],v[2]), icon:'notif-icon-192.png', badge:'badge-96.png', tag:'ibnm-versiculo', data:{link:'versiculo'}});
    return true; }catch(_){ return false; }
}
let _verif=false;
async function verifica(){
  if(_verif || desligado()) return; const d=new Date(), p=periodo(d); if(p<0) return;
  const k=chave(d,p); if(LS.g('ibnm_vers_vis')===k) return;
  _verif=true;
  try{
    const v=versoDe(d,p);
    if(document.visibilityState==='hidden'){ if(LS.g('ibnm_vers_not')!==k && await notifica(v,p)) LS.s('ibnm_vers_not',k); }
    else if(podeMostrar()){ LS.s('ibnm_vers_vis',k); popup(v,p); }
  } finally { _verif=false; }
}
setTimeout(verifica,6000); setInterval(verifica,60*1000);
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') setTimeout(verifica,1500); });
/* toque na notificação */
if(typeof window.abrirLinkNotif==='function'){ const _a=window.abrirLinkNotif;
  window.abrirLinkNotif=function(l){ if(l==='versiculo'){ const d=new Date(); let p=periodo(d); if(p<0) p=2; LS.s('ibnm_vers_vis',chave(d,p)); popup(versoDe(d,p),p); return true; } return _a.apply(this,arguments); }; }
try{ const q=new URLSearchParams(location.search).get('n'); if(q==='versiculo') setTimeout(()=>{ const d=new Date(); let p=periodo(d); if(p<0) p=2; LS.s('ibnm_vers_vis',chave(d,p)); popup(versoDe(d,p),p); },2500); }catch(_){}

/* ---------- leitura ---------- */
const BB=(()=>{ let o={}; try{ o=JSON.parse(LS.g('ibnm_biblia')||'{}')||{}; }catch(_){} return Object.assign({b:42,c:3,v:0,modo:'livros',fs:18,q:''},o); })();
function salvaPos(){ LS.s('ibnm_biblia',JSON.stringify({b:BB.b,c:BB.c,fs:BB.fs})); }
let _carregando=null;
function carregaTexto(){
  if(window.BIBLIA_TXT) return Promise.resolve();
  if(_carregando) return _carregando;
  _carregando=new Promise((ok,er)=>{ const s=document.createElement('script'); s.src='biblia-texto.js?'+(window.APP_V||''); s.onload=()=>window.BIBLIA_TXT?ok():er(); s.onerror=()=>{ _carregando=null; er(); }; document.head.appendChild(s); });
  return _carregando;
}
function desenha(){
  const box=document.getElementById('bbBox'); if(!box) return;
  const topo='<div class="bb-bar"><button class="bb-b'+(BB.modo==='livros'?' on':'')+'" onclick="bbModo(\'livros\')">📚 Livros</button>'+
    '<button class="bb-b'+(BB.modo==='ler'?' on':'')+'" onclick="bbModo(\'ler\')">📖 '+e(LIV[BB.b][1]+' '+BB.c)+'</button>'+
    '<button class="bb-b'+(BB.modo==='busca'?' on':'')+'" onclick="bbModo(\'busca\')" aria-label="Buscar">🔍</button></div>';
  if(BB.modo==='livros'){
    const g=(a,z,t)=>'<h4>'+t+'</h4><div class="bb-livros">'+LIV.slice(a,z).map((l,i)=>'<button class="'+(a+i===BB.b?'on':'')+'" onclick="bbLivro('+(a+i)+')">'+e(l[0])+'</button>').join('')+'</div>';
    box.innerHTML=topo+(BB.selLivro!=null? capsHTML(BB.selLivro) : g(0,39,'Antigo Testamento')+g(39,66,'Novo Testamento'))+rodape();
    return;
  }
  if(BB.modo==='busca'){
    box.innerHTML=topo+'<input id="bbQ" class="bb-q" placeholder="Buscar palavras (ex.: paz, bom pastor)…" value="'+e(BB.q)+'" autocomplete="off"><div id="bbRes" class="bb-res"></div>'+rodape();
    const i=document.getElementById('bbQ'); let t=0; i.oninput=()=>{ clearTimeout(t); t=setTimeout(()=>{ BB.q=i.value; busca(); },250); }; setTimeout(()=>i.focus(),50);
    if(BB.q) busca(); return;
  }
  if(!window.BIBLIA_TXT){ box.innerHTML=topo+'<div class="bb-load">⏳ Carregando a Bíblia… (só na 1ª vez)</div>';
    carregaTexto().then(desenha,()=>{ const b=document.getElementById('bbBox'); if(b) b.innerHTML=topo+'<div class="bb-load">Não consegui carregar a Bíblia agora. Verifique a internet e tente de novo.<br><button class="bb-b" onclick="bbModo(\'ler\')">Tentar de novo</button></div>'; }); return; }
  const vs=BIBLIA_TXT[BB.b][BB.c-1]||[];
  box.innerHTML=topo+'<h2 class="bb-cap">'+e(LIV[BB.b][0])+' '+BB.c+'</h2>'+
    '<div class="bb-txt" style="font-size:'+BB.fs+'px">'+vs.map((t,i)=>t?'<p id="bbv'+(i+1)+'" class="'+(BB.v===i+1?'mar':'')+'" onclick="bbVerso('+(i+1)+')"><sup>'+(i+1)+'</sup>'+e(t)+'</p>':'').join('')+'</div>'+
    '<div class="bb-nav"><button onclick="bbPula(-1)" '+(BB.b===0&&BB.c===1?'disabled':'')+'>◀ Anterior</button><span><button onclick="bbFonte(-1)" aria-label="Diminuir letra">A−</button><button onclick="bbFonte(1)" aria-label="Aumentar letra">A+</button></span><button onclick="bbPula(1)" '+(BB.b===65&&BB.c===CAPS[65]?'disabled':'')+'>Próximo ▶</button></div>'+rodape();
  if(BB.v){ const v=BB.v; setTimeout(()=>{ const p=document.getElementById('bbv'+v); if(p) p.scrollIntoView({block:'center'}); },60); }
}
function capsHTML(b){ return '<h4>'+e(LIV[b][0])+' — escolha o capítulo</h4><div class="bb-caps">'+Array.from({length:CAPS[b]},(_,i)=>'<button onclick="bbCap('+b+','+(i+1)+')">'+(i+1)+'</button>').join('')+'</div><button class="bb-b" style="margin-top:10px" onclick="bbLivro(-1)">◀ Todos os livros</button>'; }
function rodape(){ return '<div class="bb-pe">'+CREDITO+'<br><label><input type="checkbox" '+(desligado()?'':'checked')+' onchange="bbVersOn(this.checked)"> Mostrar o <b>versículo da manhã, da tarde e da noite</b></label> · <a href="javascript:versiculoAgora()">ver o de agora</a></div>'; }
function busca(){
  const r=document.getElementById('bbRes'); if(!r) return; const q=sem(BB.q).trim();
  if(q.length<3){ r.innerHTML='<p class="bb-dica">Digite pelo menos 3 letras.</p>'; return; }
  if(!window.BIBLIA_TXT){ r.innerHTML='<p class="bb-dica">⏳ Carregando a Bíblia…</p>'; carregaTexto().then(busca,()=>{ r.innerHTML='<p class="bb-dica">Sem internet para carregar a Bíblia.</p>'; }); return; }
  const t=q.split(/\s+/).filter(Boolean), out=[]; let tot=0;
  for(let b=0;b<66;b++) for(let c=0;c<BIBLIA_TXT[b].length;c++){ const C=BIBLIA_TXT[b][c]; for(let v=0;v<C.length;v++){ const s=C[v]; if(!s) continue; const n=sem(s); if(t.every(x=>n.includes(x))){ tot++; out.push([b,c+1,v+1,s,n.includes(q)?0:1]); } } }
  out.sort((x,y)=>x[4]-y[4]); out.length=Math.min(out.length,100);
  r.innerHTML='<p class="bb-dica">'+(tot?tot+' versículo(s)'+(tot>100?' — mostrando os 100 primeiros':''):'Nada encontrado.')+'</p>'+
    out.map(([b,c,v,s])=>'<button onclick="bbCap('+b+','+c+','+v+')"><b>'+e(ref(b,c,v))+'</b><span>'+e(s)+'</span></button>').join('');
}
window.bbModo=m=>{ BB.modo=m; BB.selLivro=null; desenha(); };
window.bbLivro=b=>{ BB.selLivro=b<0?null:b; desenha(); window.scrollTo(0,0); };
window.bbCap=(b,c,v)=>{ BB.b=b; BB.c=c; BB.v=v||0; BB.selLivro=null; BB.modo='ler'; salvaPos(); desenha(); if(!v) window.scrollTo(0,0); };
window.bbPula=d=>{ let b=BB.b,c=BB.c+d; if(c<1){ if(b===0) return; b--; c=CAPS[b]; } else if(c>CAPS[b]){ if(b===65) return; b++; c=1; } bbCap(b,c); };
window.bbFonte=d=>{ BB.fs=Math.max(14,Math.min(30,BB.fs+d*2)); salvaPos(); const t=document.querySelector('.bb-txt'); if(t) t.style.fontSize=BB.fs+'px'; };
window.bbVerso=v=>{ const t=(BIBLIA_TXT[BB.b][BB.c-1]||[])[v-1]; if(!t) return; BB.v=v;
  document.querySelectorAll('.bb-txt p.mar').forEach(p=>p.classList.remove('mar')); const p=document.getElementById('bbv'+v); if(p) p.classList.add('mar');
  compartilha(t+'\n— '+ref(BB.b,BB.c,v)); };
window.bbVersOn=on=>{ LS.s('ibnm_vers_off',on?'':'1'); try{ toast(on?'Versículos ligados ☀️🌤️🌙':'Versículos desligados.'); }catch(_){} };

if(typeof ROTAS!=='undefined'){
  ROTAS.biblia=function(arg){
    if(arg && /^\d+:\d+(:\d+)?$/.test(arg)){ const [b,c,v]=arg.split(':').map(Number); BB.b=b; BB.c=c; BB.v=v||0; BB.modo='ler'; }
    setTimeout(desenha,0);
    if(BB.modo==='ler') carregaTexto().catch(()=>{});
    return '<div class="page bb-page"><div class="page-ttl">📖 Bíblia</div><div class="card" id="bbBox"></div></div>';
  };
}
(function menu(){
  try{ if(typeof MENU==='undefined'||!Array.isArray(MENU)||MENU.some(m=>m.id==='biblia')) return;
    let k=MENU.findIndex(m=>m.id==='ferramentas'); if(k<0) k=MENU.findIndex(m=>m.id==='academia')+1; if(k<=0) k=MENU.length;
    MENU.splice(k,0,{id:'biblia',ic:'📖',nm:'Bíblia'});
    if(typeof _booted!=='undefined' && _booted && typeof montaMenu==='function') montaMenu(); }catch(_){}
})();

const st=document.createElement('style'); st.textContent=`
.vd-bg{position:fixed;inset:0;z-index:9990;background:rgba(5,30,22,.55);display:flex;align-items:center;justify-content:center;padding:18px;animation:vdIn .25s ease-out}
@keyframes vdIn{from{opacity:0}to{opacity:1}}
.vd{width:min(440px,100%);background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.35);animation:vdUp .3s ease-out}
@keyframes vdUp{from{transform:translateY(24px)}to{transform:none}}
.vd-top{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,var(--verde-escuro),var(--verde-med));color:#fff;padding:14px 16px;font-weight:900;font-size:15px;letter-spacing:.3px}
.vd-x{border:0;background:rgba(255,255,255,.18);color:#fff;width:32px;height:32px;border-radius:50%;font-weight:900}
.vd-txt{margin:0;padding:20px 20px 6px;font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:1.55;color:#1d2b25;position:relative}
.vd-txt:before{content:'“';position:absolute;left:6px;top:2px;font-size:44px;color:var(--dourado);line-height:1}
.vd-ref{padding:0 20px 14px;text-align:right;font-weight:900;color:var(--verde-med);font-size:14.5px}
.vd-acts{display:flex;gap:8px;padding:0 16px}
.vd-b{flex:1;height:42px;border-radius:12px;border:1px solid var(--verde-med);background:#f3faf5;color:var(--verde-escuro);font-weight:800;font-size:13px}
.vd-amem{display:block;width:calc(100% - 32px);margin:10px 16px 0;height:46px;border:0;border-radius:12px;background:var(--dourado);color:#3a2f00;font-weight:900;font-size:15px}
.vd-pe{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 16px 14px;font-size:11px;color:#8a9a92}
.vd-pe button{border:0;background:none;color:#8a9a92;text-decoration:underline;font-size:11.5px;padding:4px}
.bb-bar{display:flex;gap:6px;margin-bottom:12px}
.bb-b{flex:1;height:42px;border-radius:12px;border:1px solid var(--verde-med);background:#fff;color:var(--verde-escuro);font-weight:800;font-size:13.5px;padding:0 10px}
.bb-bar .bb-b:last-child{flex:0 0 52px}
.bb-b.on{background:var(--verde-med);color:#fff}
.bb-page h4{margin:12px 0 8px;font-size:12.5px;color:var(--verde-med);text-transform:uppercase;letter-spacing:.7px}
.bb-livros{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:6px}
.bb-livros button{min-height:40px;border:1px solid #dfe7e3;background:#f8fbf9;border-radius:10px;font-weight:700;font-size:13px;color:var(--verde-escuro);padding:4px 6px}
.bb-livros button.on{border-color:var(--dourado);background:#fff8dc}
.bb-caps{display:grid;grid-template-columns:repeat(auto-fill,minmax(48px,1fr));gap:6px}
.bb-caps button{height:46px;border:1px solid #dfe7e3;background:#f8fbf9;border-radius:10px;font-weight:800;font-size:15px;color:var(--verde-escuro)}
.bb-cap{font-family:Georgia,serif;color:var(--verde-escuro);margin:4px 0 10px;font-size:22px}
.bb-txt{font-family:Georgia,'Times New Roman',serif;line-height:1.65;color:#1d2b25}
.bb-txt p{margin:0 0 8px;padding:2px 4px;border-radius:6px;cursor:pointer}
.bb-txt p.mar{background:#fff3c4}
.bb-txt sup{font-family:system-ui,sans-serif;font-size:.6em;font-weight:900;color:var(--verde-med);margin-right:4px}
.bb-nav{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:14px}
.bb-nav button{height:42px;border-radius:12px;border:1px solid #c9ced6;background:#f4f6f7;font-weight:800;color:var(--verde-escuro);padding:0 12px}
.bb-nav button:disabled{opacity:.4}
.bb-nav span{display:flex;gap:4px}
.bb-q{width:100%;box-sizing:border-box;height:44px;border:1px solid #cfdad4;border-radius:12px;padding:0 12px;font-size:15px}
.bb-res{display:flex;flex-direction:column;gap:6px;margin-top:8px}
.bb-res button{display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-align:left;border:1px solid #e3ece7;background:#fff;border-radius:12px;padding:9px 11px}
.bb-res b{color:var(--verde-med);font-size:13px}
.bb-res span{font-size:14px;color:#2a3a33;line-height:1.45}
.bb-dica,.bb-load{font-size:13px;color:#789;text-align:center;margin:12px 0}
.bb-pe{margin-top:16px;padding-top:10px;border-top:1px solid #e9efec;font-size:11.5px;color:#8a9a92;text-align:center;line-height:1.7}
.bb-pe a{color:var(--verde-med);font-weight:800}
`; document.head.appendChild(st);
})();
