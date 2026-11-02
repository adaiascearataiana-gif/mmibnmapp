/* ============================================================
   MM IBNM — Cor dos acordes + editor com o mesmo visual (v1.0.0)
   - Paleta curta (6 cores). O ADM escolhe a cor dos acordes do app
     (vale para músicas e hinos, todos os aparelhos).
   - No "Editar cifra" os acordes já aparecem em negrito na cor
     escolhida (ao abrir, ao colar, ao transpor e ao tocar em ✨).
   - Formatação única: a barra do editor deixa só o que faz sentido
     (fonte, tamanho e cores manuais saem — o app padroniza ao salvar).
============================================================ */
(function(){
'use strict';
const PALETA=[
  ['#a8350a','Laranja-queimado (padrão)'],
  ['#8b1a2b','Vinho'],
  ['#1d4ed8','Azul'],
  ['#0f7a4a','Verde'],
  ['#6b21a8','Roxo'],
  ['#1f1f1f','Preto']
];
const corAtual = () => { const c=(typeof APP_CFG!=='undefined'&&APP_CFG.cifra_cfg&&APP_CFG.cifra_cfg.cor)||localStorage.getItem('ibnm_cor_acorde')||PALETA[0][0]; return PALETA.some(p=>p[0]===c)? c : PALETA[0][0]; };
function aplicaCor(){ const c=corAtual(); document.documentElement.style.setProperty('--cor-acorde',c); try{ localStorage.setItem('ibnm_cor_acorde',c); }catch(_){} }
aplicaCor(); setInterval(aplicaCor,3000);
window.escolherCorAcorde=async function(c){
  if(!ehAdmin()) return;
  try{ await salvarConfig('cifra_cfg',Object.assign({},(APP_CFG&&APP_CFG.cifra_cfg)||{},{cor:c})); }catch(_){}
  if(typeof APP_CFG!=='undefined'){ APP_CFG.cifra_cfg=Object.assign({},APP_CFG.cifra_cfg||{},{cor:c}); }
  aplicaCor(); document.querySelectorAll('.cor-ac-op').forEach(b=>b.classList.toggle('on',b.dataset.c===c));
  const pop=document.getElementById('corAcPop'); if(pop) pop.classList.remove('show');
  toast('Cor dos acordes atualizada para todos.');
};
function paletaHTML(){ const c=corAtual();
  return PALETA.map(([v,n])=>'<button type="button" class="cor-ac-op '+(v===c?'on':'')+'" data-c="'+v+'" title="'+n+'" onmousedown="event.preventDefault()" onclick="escolherCorAcorde(\''+v+'\')"><span style="background:'+v+'"></span><b style="color:'+v+'">G7M</b><small>'+n.replace(' (padrão)','')+'</small></button>').join(''); }

/* ---------- editor: destacar os acordes ---------- */
function linhaDoCursor(el){
  const s=getSelection(); if(!s.rangeCount) return -1; let n=s.getRangeAt(0).startContainer;
  while(n && n.parentNode!==el) n=n.parentNode; if(!n) return -1;
  return [...el.childNodes].indexOf(n);
}
window.edDestacar=function(){
  const el=document.getElementById('edCifra'); if(!el || !window.__linhasDoHtml || !window.__htmlLinhaAcordes) return;
  const li=linhaDoCursor(el);
  const ls=window.__linhasDoHtml(el);
  const esc1=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  el.innerHTML=ls.map(l=>'<div>'+(l? (window.__ehLinhaDeAcordes(l)? window.__htmlLinhaAcordes(l) : esc1(l)) : '<br>')+'</div>').join('') || '<div><br></div>';
  if(li>=0){ const alvo=el.childNodes[Math.min(li,el.childNodes.length-1)]; if(alvo){ const r=document.createRange(); r.selectNodeContents(alvo); r.collapse(false); const s=getSelection(); s.removeAllRanges(); s.addRange(r); } }
  try{ if(typeof edCommit==='function') edCommit(); }catch(_){}
};
function arrumaBarra(){
  const tb=document.getElementById('edTb'); if(!tb || tb.dataset.cores) return; tb.dataset.cores='1';
  /* fora: tipo de fonte, tamanho, itálico, sublinhado e a cor manual (o app padroniza) */
  tb.querySelectorAll('select.edsel').forEach(x=>x.remove());
  tb.querySelectorAll('button').forEach(b=>{ const t=b.getAttribute('title')||''; if(/Itálico|Sublinhado|Cor do texto|Negrito/.test(t)) b.remove(); });
  tb.querySelectorAll('.sep').forEach((s,i,arr)=>{ if(s.previousElementSibling && s.previousElementSibling.classList.contains('sep')) s.remove(); });
  tb.insertAdjacentHTML('afterbegin','');
  const lp=[...tb.querySelectorAll('button')].find(b=>/Limpar/.test(b.getAttribute('title')||''));
  const html='<button type="button" class="ed-dest" title="Destacar os acordes" onmousedown="event.preventDefault()" onclick="edDestacar()">✨ Acordes</button>'+
    '<button type="button" class="ed-cor" title="Cor dos acordes" onmousedown="event.preventDefault()" onclick="document.getElementById(\'corAcPop\').classList.toggle(\'show\')">🎨 Cor<span class="sw" style="background:var(--cor-acorde)"></span></button>';
  if(lp) lp.insertAdjacentHTML('beforebegin',html); else tb.insertAdjacentHTML('beforeend',html);
  tb.insertAdjacentHTML('beforeend','<div class="cor-ac-pop" id="corAcPop"><div class="t">Cor dos acordes (vale para todo o app)</div><div class="g">'+paletaHTML()+'</div></div>');
}
if(typeof editorCifra==='function'){
  const _ed=editorCifra;
  window.editorCifra=editorCifra=function(){
    const r=_ed.apply(this,arguments);
    setTimeout(()=>{ try{ arrumaBarra(); edDestacar(); window.scrollTo(0,0); }catch(_){} },30);
    return r;
  };
}
/* depois de colar, transpor ou importar PDF, destaca de novo */
document.addEventListener('paste',ev=>{ if(ev.target && ev.target.closest && ev.target.closest('#edCifra')) setTimeout(()=>edDestacar(),60); },false);
if(typeof transpor==='function'){ const _t=transpor; window.transpor=transpor=function(){ const r=_t.apply(this,arguments); setTimeout(()=>edDestacar(),30); return r; }; }
if(typeof window.importarPdfCifra==='function'){ const _ip=window.importarPdfCifra; window.importarPdfCifra=async function(){ await _ip.apply(this,arguments); setTimeout(()=>edDestacar(),60); }; }

/* ---------- Painel do ADM: escolher a cor ---------- */
if(typeof ROTAS!=='undefined' && ROTAS.admin){
  const _ad=ROTAS.admin;
  ROTAS.admin=function(){ const h=_ad.apply(this,arguments); if(!ehAdmin()) return h;
    const card='<div class="card"><h3>🎨 Cor dos acordes</h3><p style="font-size:13px;color:#556;margin-bottom:10px">Os acordes aparecem sempre em negrito nesta cor, em todas as músicas e hinos.</p><div class="cor-ac-g">'+paletaHTML()+'</div></div>';
    const i=h.indexOf('<div class="card">'); return i>=0? h.slice(0,i)+card+h.slice(i) : h+card; };
}
const st=document.createElement('style'); st.textContent=`
.editor-rich .cf-ac{font-weight:800;color:var(--cor-acorde,#a8350a)}
.editor-rich .cf-lb{color:#6b7c74}
.ed-dest,.ed-cor{font-weight:800!important;font-size:12.5px!important;width:auto!important;padding:0 8px!important}
.ed-cor .sw{display:inline-block;width:12px;height:12px;border-radius:50%;margin-left:5px;vertical-align:-1px;border:1px solid rgba(0,0,0,.2)}
.cor-ac-pop{display:none;position:absolute;right:6px;top:calc(100% + 4px);z-index:30;background:#fff;border:1px solid #dfe7e3;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:10px;width:min(320px,90vw)}
.cor-ac-pop.show{display:block}
.cor-ac-pop .t{font-size:12px;font-weight:800;color:#5d7c6e;margin-bottom:8px}
.cor-ac-pop .g,.cor-ac-g{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.cor-ac-op{display:flex;flex-direction:column;align-items:center;gap:2px;border:2px solid #e3ece7;background:#fffdf5;border-radius:10px;padding:6px 2px}
.cor-ac-op span{display:none}
.cor-ac-op b{font-family:'Courier New',monospace;font-size:16px;font-weight:900}
.cor-ac-op small{font-size:10.5px;color:#556}
.cor-ac-op.on{border-color:var(--verde-med);box-shadow:0 0 0 2px rgba(31,122,85,.2)}
#edTb{position:sticky}
`; document.head.appendChild(st);
})();

/* ============================================================
   (v1.0.0) ENTER = nova linha nos campos de letra/cifra/intro
   e caixa da introdução que cresce sozinha (e pode ser puxada)
============================================================ */
(function(){
'use strict';
const CAMPOS='#edIntro,#edLetra,#lrTxt,#cfTxt,#edCifra,textarea.editor-area';
function prepara(raiz){
  (raiz||document).querySelectorAll(CAMPOS).forEach(el=>{
    el.setAttribute('enterkeyhint','enter');          /* teclado do Android mostra "↵ nova linha" */
    if(el.tagName==='TEXTAREA'){ el.style.resize='vertical'; if(el.id==='edIntro' && !el.dataset.cresce){ el.dataset.cresce='1'; const ajusta=()=>{ el.style.height='auto'; el.style.height=Math.min(420,el.scrollHeight+4)+'px'; }; el.addEventListener('input',ajusta); setTimeout(ajusta,0); } }
  });
}
/* o Enter nesses campos sempre abre uma linha — nunca envia/fecha nada */
document.addEventListener('keydown',ev=>{
  if(ev.key!=='Enter' || ev.ctrlKey || ev.metaKey) return;
  const el=ev.target; if(!el || !el.matches || !el.matches(CAMPOS)) return;
  ev.stopPropagation();                                   /* nenhum outro atalho "pega" o Enter */
  if(el.tagName==='TEXTAREA'){ /* comportamento normal da caixa: nova linha */ return; }
},true);
document.addEventListener('keypress',ev=>{ if(ev.key==='Enter' && ev.target && ev.target.matches && ev.target.matches(CAMPOS)) ev.stopPropagation(); },true);
new MutationObserver(()=>prepara()).observe(document.body,{childList:true,subtree:true});
prepara();
})();
