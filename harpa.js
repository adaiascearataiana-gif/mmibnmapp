/* ============================================================
   HARPA CRISTÃ — módulo integrado ao MM IBNM (clone do Cantor)
   640 hinos cifrados, busca, transposição, rolagem (padrão
   Cifra Club), favoritos e edição local — cifras extraídas do
   PDF oficial + letras de harpacrista.org.
   Temática: verde/dourado do MM IBNM.
============================================================ */
(function(){
'use strict';
const HINOS = (window.HARPA||[]).slice().sort((a,b)=>a.n-b.n);
const byN = new Map(HINOS.map(h=>[h.n,h]));

/* ---------- utilitários ---------- */
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
const esc = s => String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const strip = l => l.replace(/\[[^\]]*\]/g,'').replace(/\s+/g,' ').trim();
const clean = l => strip(l).replace(/(\S)\s*-\s+(?=\S)/g,'$1').replace(/(\S)\s+-\s*(?=\S)/g,'$1').replace(/-(?=[\s,.;:!?]|$)/g,'');

/* ---------- tema verde/dourado do MM IBNM ---------- */
/* ---------- preferências (leitura) ---------- */
const PREF_KEY='ibnm_hr_prefs';
let prefs={cifras:true,fs:19,tr:{},scrollSpeed:1};
try{ Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{}); }catch(e){}
function savePrefs(){ try{ localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); }catch(e){} }

/* ---------- estado do usuário / sessão MM ---------- */
function userEmail(){ try{ const u=(typeof usuarioAtual==='function')?usuarioAtual():null; return (u&&u.email)||'anon'; }catch(e){ return 'anon'; } }
function ehAdm(){ try{ return typeof ehAdmin==='function' && !!ehAdmin(); }catch(e){ return false; } }
function toast2(msg){ try{ if(typeof toast==='function') return toast(msg); }catch(e){} try{ alert(msg); }catch(e){} }

/* ---------- edições (somente ADM) ---------- */
const ED_KEY='ibnm_hr_ed';
let edits={};
try{ edits=JSON.parse(localStorage.getItem(ED_KEY)||'{}')||{}; }catch(e){ edits={}; }
function saveEdits(){ try{ localStorage.setItem(ED_KEY, JSON.stringify(edits)); }catch(e){ toast2('Não foi possível salvar a edição.'); } }
function getLine(h,pi,li){ const e=edits[h.n]; const k=pi+'-'+li; return (e && k in e) ? e[k] : h.partes[pi].linhas[li]; }
function setLine(h,pi,li,val){
  if(!ehAdm()) return;
  const k=pi+'-'+li; const orig=h.partes[pi].linhas[li];
  if(!edits[h.n]) edits[h.n]={};
  if(val===orig) delete edits[h.n][k]; else edits[h.n][k]=val;
  if(!Object.keys(edits[h.n]).length) delete edits[h.n];
  saveEdits(); rebuildIndex();
}
const isEdited = n => !!edits[n] && ehAdm();

/* ---------- favoritos (por usuário) ---------- */
function favKey(){ return 'ibnm_hr_favs_'+userEmail(); }
let favs=new Set();
function loadFavs(){ favs=new Set(); try{ (JSON.parse(localStorage.getItem(favKey())||'[]')||[]).forEach(n=>{ if(byN.has(+n)) favs.add(+n); }); }catch(e){}  }
function saveFavs(){ try{ localStorage.setItem(favKey(), JSON.stringify([...favs])); }catch(e){} }
function toggleFav(n){ const tinha=favs.has(n); if(tinha) favs.delete(n); else favs.add(n); saveFavs(); }
loadFavs();

/* ---------- links do YouTube (ADM grava; todos veem) ---------- */
const YT_KEY='ibnm_cc_yt';
let ytLinks={};
try{ ytLinks=JSON.parse(localStorage.getItem(YT_KEY)||'{}')||{}; }catch(e){ ytLinks={}; }
function saveYt(){ try{ localStorage.setItem(YT_KEY, JSON.stringify(ytLinks)); }catch(e){} }
function ytId(u){
  const m=String(u||'').trim().match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^&]*&)*v=|embed\/|shorts\/|live\/|v\/))([A-Za-z0-9_-]{6,})/);
  return m?m[1]:null;
}
function ytUrl(id){ return 'https://www.youtube.com/watch?v='+id; }
async function cloudLoadLinks(){
  try{
    if(typeof sb==='undefined'||!sb) return;
    const {data,error}=await sb.from('harpa_links').select('num,url');
    if(error) return;
    (data||[]).forEach(r=>{ if(byN.has(+r.num) && r.url){ ytLinks[r.num]=String(r.url).trim(); } });
    saveYt();
  }catch(e){}
}
async function cloudSaveLink(n,id){
  try{
    if(typeof sb==='undefined'||!sb) return;
    if(id) await sb.from('harpa_links').upsert({num:n,url:id,updated_at:new Date().toISOString()});
    else await sb.from('harpa_links').delete().eq('num',n);
  }catch(e){}
}
/* ---------- acordes / transposição ---------- */
const SH=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FL=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const IDX={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,'E#':5,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11,'B#':0};
const FLAT_KEYS=new Set(['F','Bb','Eb','Ab','Db','Gb','Dm','Gm','Cm','Fm','Bbm','Ebm']);
function trNote(note, st, flats){ const i=IDX[note]; if(i===undefined) return note; return (flats?FL:SH)[(i+st+120)%12]; }
function trChord(ch, st, flats){
  if(!ch) return ch;
  const pm=ch.match(/^\((.*)\)$/); if(pm) return '('+trChord(pm[1],st,flats)+')';
  return ch.split('/').map(part=>{
    const m = part.match(/^([A-G][#b]?)(.*)$/);
    if(!m) return part;
    return trNote(m[1],st,flats)+m[2];
  }).join('/');
}
function keyInfo(h, st){
  const m=(h.tom||'C').match(/^([A-G][#b]?)(m?)/); if(!m) return {key:h.tom,flats:false};
  let flats;
  if(!st){ const k=m[1]+m[2]; flats = FLAT_KEYS.has(k) || /b/.test(m[1]); return {key:h.tom,flats}; }
  const tryS = trNote(m[1],st,false)+m[2], tryF = trNote(m[1],st,true)+m[2];
  flats = FLAT_KEYS.has(tryF) && !FLAT_KEYS.has(tryS);
  return {key:(flats?tryF:tryS), flats};
}

/* ---------- linha com acordes alinhados às sílabas ---------- */
function toModel(line){
  let text='', chords=[]; const re=/\[([^\]]*)\]/g; let last=0, m;
  while((m=re.exec(line))){ text+=line.slice(last,m.index); chords.push({pos:text.length,c:m[1]}); last=m.index+m[0].length; }
  text+=line.slice(last);
  return {text,chords};
}
function fromModel(md){
  const cs=md.chords.slice().sort((a,b)=>a.pos-b.pos); let out='', last=0;
  for(const ch of cs){ const p=Math.min(Math.max(ch.pos,0),md.text.length); out+=md.text.slice(last,p)+'['+ch.c+']'; last=p; }
  return out+md.text.slice(last);
}
function lineHTML(line, st, flats){
  const md=toModel(line); const T=md.text;
  const cuts=new Set([0,T.length]); md.chords.forEach(c=>cuts.add(c.pos));
  for(let i=0;i<T.length;i++){ if(/\s/.test(T[i])){ cuts.add(i); cuts.add(i+1); } }
  const pts=[...cuts].sort((x,y)=>x-y);
  const byPos=new Map(); md.chords.forEach((c,i)=>{ if(!byPos.has(c.pos)) byPos.set(c.pos,[]); byPos.get(c.pos).push(i); });
  const words=[]; let cur=[];
  const flush=()=>{ if(cur.length){ words.push(cur); cur=[]; } };
  for(let k=0;k<pts.length;k++){
    const a=pts[k], b=k+1<pts.length?pts[k+1]:a;
    const t=T.slice(a,b), space=!!t && /^\s+$/.test(t), idxs=byPos.get(a)||[];
    idxs.forEach((ci,j)=>{
      const c=trChord(md.chords[ci].c,st,flats);
      if(j===idxs.length-1 && t && !space) cur.push({c,ci,t,pos:a});
      else { flush(); words.push([{c,ci,t:'',pos:a}]); }
    });
    if(!idxs.length && t && !space) cur.push({c:null,ci:-1,t,pos:a});
    if(space) flush();
  }
  flush();
  return words.map(w=>'<span class="w">'+w.map(p=>'<span class="p" data-pos="'+p.pos+'" data-ci="'+p.ci+'"><span class="c">'+(p.c?esc(p.c):'')+'</span><span class="t">'+esc(p.t)+'</span></span>').join('')+'</span>').join(' ');
}

/* ---------- busca ---------- */
let INDEX=[];
function rebuildIndex(){ INDEX = HINOS.map(h=>({h, t:norm(h.titulo), l:norm(h.partes.map((p,pi)=>p.linhas.map((l,li)=>{const x=strip(getLine(h,pi,li));return x+' '+clean(x);}).join(' ')).join(' '))})); }
rebuildIndex();
function search(q){
  const nq=norm(q);
  if(!nq) return {titulo:HINOS, letra:[]};
  if(/^\d+$/.test(nq)){
    const n=+nq;
    const res=HINOS.filter(h=>String(h.n).startsWith(String(n)));
    res.sort((a,b)=>(a.n===n?-1:b.n===n?1:a.n-b.n));
    return {titulo:res, letra:[]};
  }
  const terms=nq.split(' ');
  const titulo=INDEX.filter(x=>terms.every(t=>x.t.includes(t))).map(x=>x.h);
  const tset=new Set(titulo);
  const letra=INDEX.filter(x=>!tset.has(x.h) && terms.every(t=>x.l.includes(t))).map(x=>x.h);
  return {titulo, letra};
}

/* ---------- rolagem automática (padrão Cifra Club) ---------- */
const SCROLL_BASE=30; /* px/s na velocidade 1× */
let scrollOn=false, scrollRaf=null, scrollLast=0;
function spdLabel(){ return String(prefs.scrollSpeed.toFixed(1)).replace('.',',')+'×'; }
function setSpeed(v){
  prefs.scrollSpeed=Math.min(3,Math.max(0.4,Math.round(v*10)/10));
  savePrefs();
  const el=document.querySelector('.cc-scrollbar .spd'); if(el) el.textContent=spdLabel();
}
function scrollStep(ts){
  if(!scrollOn) return;
  const dt=Math.min((ts-scrollLast)/1000,.1); scrollLast=ts;
  scrollAcc+=SCROLL_BASE*prefs.scrollSpeed*dt;
  const px=Math.floor(scrollAcc); if(px>=1){ scrollAcc-=px; window.scrollBy(0,px); }
  if(window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-2){ pauseScroll(true); return; }
  scrollRaf=requestAnimationFrame(scrollStep);
}
let scrollAcc=0, wakeLock=null;
async function pedirTelaLigada(){ try{ if('wakeLock' in navigator && !wakeLock){ wakeLock=await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release',()=>{ wakeLock=null; }); } }catch(e){} }
function liberarTela(){ try{ if(wakeLock){ wakeLock.release(); wakeLock=null; } }catch(e){} }
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible' && scrollOn) pedirTelaLigada(); });
function renderScrollBar(){
  let bar=document.querySelector('.cc-scrollbar');
  if(!bar){
    bar=document.createElement('div'); bar.className='cc-scrollbar';
    bar.innerHTML='<button id="sb-pause" aria-label="Pausar ou continuar a rolagem"></button>'+
      '<button id="sb-slow" aria-label="Diminuir velocidade">−</button>'+
      '<span class="spd"></span>'+
      '<button id="sb-fast" aria-label="Aumentar velocidade">+</button>'+
      '<span class="sp"></span>'+
      '<button id="sb-top" aria-label="Voltar ao início do hino">⤒</button>'+
      '<button id="sb-stop" aria-label="Fechar a rolagem">✕</button>';
    document.body.appendChild(bar);
    bar.querySelector('#sb-pause').onclick=()=>{ scrollOn?pauseScroll():startScroll(); };
    bar.querySelector('#sb-stop').onclick=()=>{ stopScroll(); };
    bar.querySelector('#sb-top').onclick=()=>{ const m=document.querySelector('.cc-head'); window.scrollTo(0, m? Math.max(0,m.getBoundingClientRect().top+scrollY-130):0); };
    bar.querySelector('#sb-slow').onclick=()=>setSpeed(prefs.scrollSpeed-0.2);
    bar.querySelector('#sb-fast').onclick=()=>setSpeed(prefs.scrollSpeed+0.2);
  }
  bar.querySelector('.spd').textContent=spdLabel();
  bar.querySelector('#sb-pause').textContent=scrollOn?'⏸ Pausar':'▶ Rolar';
}
function syncScrollBtn(){
  const b=document.getElementById('tsc');
  if(b){ b.setAttribute('aria-pressed',scrollOn?'true':'false'); b.textContent=scrollOn?'⏸ Pausar rolagem':'▶ Rolagem'; }
}
function startScroll(){
  if(scrollOn) return;
  if(window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-2){ const m=document.querySelector('.cc-song'); if(m) window.scrollTo(0, Math.max(0,m.getBoundingClientRect().top+scrollY-130)); }
  scrollOn=true; scrollLast=performance.now(); scrollAcc=0;
  renderScrollBar(); syncScrollBtn(); pedirTelaLigada();
  scrollRaf=requestAnimationFrame(scrollStep);
}
function pauseScroll(fim){
  scrollOn=false;
  if(scrollRaf) cancelAnimationFrame(scrollRaf), scrollRaf=null;
  liberarTela(); renderScrollBar(); syncScrollBtn();
  if(fim) toast2('Fim do hino');
}
function stopScroll(){
  scrollOn=false;
  if(scrollRaf) cancelAnimationFrame(scrollRaf), scrollRaf=null;
  liberarTela();
  const bar=document.querySelector('.cc-scrollbar'); if(bar) bar.remove();
  syncScrollBtn();
}
function toggleScroll(){ scrollOn?pauseScroll():startScroll(); }

/* ---------- folhas (sheets) ---------- */
function sheet(html){
  const bg=document.createElement('div'); bg.className='cc-sheet-bg';
  bg.innerHTML='<div class="cc-sheet" role="dialog" aria-modal="true">'+html+'</div>';
  document.body.appendChild(bg);
  const close=()=>bg.remove();
  bg.addEventListener('click',e=>{ if(e.target===bg) close(); });
  return {el:bg.firstChild, close};
}

/* ---------- listagem ---------- */
let lastQuery=''; let editMode=false; let harpaNum=null;
function renderLista(){
  loadFavs();
  const adm=ehAdm();
  return '<div class="page cc-page">'+
    '<div class="page-ttl">📖 Cantor Cristão</div>'+
    '<p style="font-size:13px;color:#789;margin-bottom:12px">'+HINOS.length+' hinos cifrados · use a busca por número, título ou letra'+(adm?' · <b style="color:var(--verde-med)">você é ADM e pode editar as cifras</b>':' · somente o ADM edita as cifras')+'</p>'+
    '<input class="search-box" id="ccQ" placeholder="🔎 Número ou título do hino" value="'+esc(lastQuery)+'" oninput="harpaBuscar(this.value)" onkeydown="if(event.key===\'Enter\'){harpaAbrirPrimeiro()}">'+
    '<div id="ccRes">'+listaHtml()+'</div>'+
    '<p class="cc-foot">Harpa Cristã · 640 hinos · uso pessoal e cultos · integrado ao MM IBNM</p>'+
  '</div>';
}
function itemHtml(h){
  return '<li><a href="javascript:void(0)" onclick="harpaAbrir('+h.n+')"><span class="num">'+h.n+'</span><span><span class="tt">'+esc(h.titulo)+(isEdited(h.n)?'<span class="ed-mark">editado</span>':'')+'</span><span class="fl">'+esc(clean(getLine(h,0,0)))+'</span></span></a><button class="cc-favstar" data-n="'+h.n+'" onclick="harpaFav('+h.n+',event)" aria-label="Favoritar">'+(favs.has(h.n)?'★':'☆')+'</button></li>';
}
function listaHtml(){
  const q=lastQuery;
  const r=search(q);
  let html='';
  if(r.titulo.length) html+='<ul class="cc-list">'+r.titulo.map(itemHtml).join('')+'</ul>';
  if(r.letra.length) html+='<p class="cc-sec">Encontrado na letra</p><ul class="cc-list">'+r.letra.map(itemHtml).join('')+'</ul>';
  if(!html) html='<p class="cc-empty">Nenhum hino encontrado.</p>';
  return html;
}
function redesenharLista(){ const el=document.getElementById('hrRes'); if(el) el.innerHTML=listaHtml(); }

/* ---------- hino ---------- */
function abrirHino(n, keepScroll){
  const h=byN.get(n); if(!h) return harpaVoltar();
  harpaNum=n;
  try{ _viewAtual=function(){ abrirHino(n,true); }; }catch(e){}
  try{ if(window.__navReg) window.__navReg('hr|'+n); }catch(e){}
  const adm=ehAdm();
  const tc=(window.tomCulto?(+window.tomCulto('hr:'+n)||0):0);
  const pessoal=Object.prototype.hasOwnProperty.call(prefs.tr,n);
  const st=pessoal?(prefs.tr[n]||0):tc; const {key,flats}=keyInfo(h,st);
  let ei=0;
  const partes=h.partes.map((p,pi)=>{
    const lab = p.tipo==='coro' ? 'Coro' : String(++ei);
    return '<section class="cc-part cc-'+p.tipo+'"><span class="pn">'+lab+'</span>'+p.linhas.map((l,li)=>'<p class="ln" data-pi="'+pi+'" data-li="'+li+'">'+lineHTML(getLine(h,pi,li),st,flats)+(editMode?'<button class="lnedit" aria-label="Editar linha inteira">✎</button>':'')+'</p>').join('')+'</section>';
  }).join('');
  const modoLetra = !prefs.cifras && !editMode && !!h.letra;
  const corpoSong = modoLetra
    ? h.letra.split('\n').map(l=>'<p class="ln">'+esc(l)+'</p>').join('')
    : partes;
  const i=HINOS.indexOf(h), prev=HINOS[i-1], next=HINOS[i+1];
  const missingBox = h.missing ? '<div class="cc-missing">⚠️ '+(h.creditos&&h.creditos[0]?esc(h.creditos[0]):'Página não incluída no PDF de origem.')+'</div>' : '';
  const ytl=ytLinks[n];
  let vivoAqui=false, vivoOutro=false; try{ vivoAqui=!!(AO_VIVO&&AO_VIVO.ativo&&AO_VIVO.musica_id==='hr:'+n); vivoOutro=!!(AO_VIVO&&AO_VIVO.ativo)&&!vivoAqui; }catch(e){}
  const html=''+
  '<div class="cc-hbar">'+
    '<button class="ib" onclick="harpaVoltar()">‹ Hinos</button>'+
    '<button class="ib '+(favs.has(n)?'fav-on':'')+'" id="ccFav" onclick="harpaFavHino('+n+')" aria-label="Favoritos">'+(favs.has(n)?'★':'☆')+'</button>'+
    '<span class="sp"></span>'+
    '<button class="ib" onclick="harpaFs(-2)" aria-label="Diminuir letra">A−</button>'+
    '<button class="ib" onclick="harpaFs(2)" aria-label="Aumentar letra">A+</button>'+
    '<button class="ib" onclick="hrCompartilhar('+n+')" aria-label="Compartilhar hino">↗</button>'+
    '<button class="ib" onclick="hrWhats('+n+')" aria-label="Enviar no WhatsApp">📱</button>'+
    '<button class="ib" onclick="harpaCfg()" aria-label="Configurações">⚙</button>'+
  '</div>'+
  '<main class="cc-main">'+
    '<div class="cc-head">'+
      '<div class="n">'+h.n+'</div>'+
      '<h2>'+esc(h.titulo)+(isEdited(n)?'<span class="ed-mark">editado</span>':'')+'</h2>'+
      '<div class="cc-meta"><span>Tom <b>'+esc(key)+'</b>'+(!pessoal&&tc?'<span class="tom-culto">tom do culto</span>':'')+(st?' (original '+esc(h.tom)+')':'')+'</span>'+(h.ritmo?'<span>Ritmo <b>'+esc(h.ritmo)+'</b></span>':'')+'</div>'+
      (h.creditos&&h.creditos.length?'<p class="cc-cred">'+h.creditos.map(esc).join('<br>')+'</p>':'')+
    '</div>'+
    missingBox +
    '<div class="cc-tools">'+
      '<button class="tog" id="tc" aria-pressed="'+prefs.cifras+'" onclick="harpaCifras('+n+')">Cifras</button>'+
      '<button class="tog cc-part" onclick="harpaPartitura('+n+')">📜 PARTITURA</button>'+
      '<span class="chip" '+(prefs.cifras?'':'hidden')+'><button onclick="harpaTransp('+n+',-1)" aria-label="Baixar meio tom">−</button><span class="lbl">Tom <b>'+esc(key)+'</b></span><button onclick="harpaTransp('+n+',1)" aria-label="Subir meio tom">+</button></span>'+
      (st?'<button class="tog" onclick="harpaTomOriginal('+n+')">Tom original</button>':'')+
      '<button class="tog" id="tsc" aria-pressed="'+(scrollOn?'true':'false')+'" onclick="harpaScroll()">'+(scrollOn?'⏸ Pausar rolagem':'▶ Rolagem')+'</button>'+
      (ytl?'<a class="tog cc-yt-chip" href="'+ytUrl(ytl)+'" target="_blank" rel="noopener">▶ Ouvir no YouTube</a>':'')+
      (adm&&window.ccAoVivo?'<button class="tog cc-live'+(vivoAqui?' on':'')+'" onclick="ccAoVivo('+n+')">'+(vivoAqui?'⏹ Encerrar ao vivo':(vivoOutro?'🔴 Trazer ao vivo p/ este':'🔴 Ao vivo'))+'</button>':'')+
      (adm?'<button class="tog cc-edit" id="ted" aria-pressed="'+editMode+'" onclick="harpaEditToggle('+n+')">'+(editMode?'Concluir edição':'Editar cifras')+'</button>':'')+
    '</div>'+
    (editMode?'<div class="cc-hint">Toque numa sílaba para pôr ou trocar o acorde. Toque em ✎ para editar a linha inteira.'+(isEdited(n)?'<br><button class="tog" onclick="harpaRst('+n+')">Restaurar cifras originais deste hino</button>':'')+'</div>':'')+
    '<div class="cc-song '+(prefs.cifras||editMode?'':'nochords')+(modoLetra?' letra-pdf':'')+' '+(editMode?'editing':'')+'" style="--cc-fs:'+prefs.fs+'px">'+corpoSong+'</div>'+
    '<nav class="cc-nav">'+(prev?'<a href="javascript:void(0)" onclick="harpaAbrir('+prev.n+')"><small>Anterior</small>'+prev.n+' · '+esc(prev.titulo)+'</a>':'<span></span>')+(next?'<a class="r" href="javascript:void(0)" onclick="harpaAbrir('+next.n+')"><small>Próximo</small>'+next.n+' · '+esc(next.titulo)+'</a>':'<span></span>')+'</nav>'+
  '</main>';
  const c=document.getElementById('content');
  const _lb=(h.letra&&!modoLetra)? '<div class="cc-letbaix"><button class="tog'+(_hrLetra?' on':'')+'" onclick="harpaLetra('+n+')">\uD83D\uDCDC '+(_hrLetra?'OCULTAR LETRA':'LETRA DO HINO')+'</button>'+(_hrLetra? '<div class="cc-song'+(editMode?' editing':'')+'" style="--cc-fs:'+prefs.fs+'px">'+h.letra.split('\n').map(function(l){return '<p class="ln">'+esc(l)+'</p>';}).join('')+'</div>' : '')+'</div>' : '';
  if(c){ c.innerHTML='<div class="page cc-page">'+html+_lb+'</div>'; }
  if(typeof toggleMenu==='function'){ try{ toggleMenu(false); }catch(e){} }
  if(!keepScroll) window.scrollTo(0,0);
  fixGaps();
  if(editMode) bindEdicao(h,st,flats,()=>abrirHino(n,true));
  try{ if(window.ccPosHino) window.ccPosHino(n); }catch(e){}
}
function bindEdicao(h,st,flats,redraw){
  const song=document.querySelector('.cc-song'); if(!song) return;
  song.addEventListener('click',e=>{
    const ln=e.target.closest('.ln'); if(!ln) return;
    const pi=+ln.dataset.pi, li=+ln.dataset.li;
    if(e.target.closest('.lnedit')){ openLineSheet(h,pi,li,redraw); return; }
    const pc=e.target.closest('.p'); if(!pc) return;
    let pos=+pc.dataset.pos, ci=+pc.dataset.ci;
    if(e.target.closest('.t')){
      let off=null;
      if(document.caretRangeFromPoint){ const r=document.caretRangeFromPoint(e.clientX,e.clientY); if(r && pc.querySelector('.t').contains(r.startContainer)) off=r.startOffset; }
      else if(document.caretPositionFromPoint){ const r=document.caretPositionFromPoint(e.clientX,e.clientY); if(r && pc.querySelector('.t').contains(r.offsetNode)) off=r.offset; }
      if(off!==null && off>0 && off<pc.querySelector('.t').textContent.length){ pos+=off; ci=-1; }
    }
    openChordSheet(h,pi,li,pos,ci,st,flats,redraw);
  });
}
function fixGaps(){
  document.querySelectorAll('.cc-song .w').forEach(w=>{
    const ps=w.querySelectorAll('.p');
    ps.forEach((p,i)=>{ p.classList.remove('gap'); if(i<ps.length-1){ const t=p.querySelector('.t'); if(t.firstChild){ const r=document.createRange(); r.selectNodeContents(t); if(p.getBoundingClientRect().width - r.getBoundingClientRect().width > 6) p.classList.add('gap'); } } });
  });
}
addEventListener('resize',()=>fixGaps());

/* ---------- folhas de edição (somente ADM) ---------- */
function cleanChord(v){ return v.replace(/[\[\]]/g,'').replace(/\s+/g,'').trim(); }
function hymnChords(h){ const s=new Set(); h.partes.forEach((p,pi)=>p.linhas.forEach((l,li)=>toModel(getLine(h,pi,li)).chords.forEach(c=>s.add(c.c)))); return [...s]; }
function openChordSheet(h,pi,li,pos,ci,st,flats,done){
  if(!ehAdm()) return;
  const line=getLine(h,pi,li), md=toModel(line);
  let idx = ci>=0 ? ci : md.chords.findIndex(c=>c.pos===pos);
  const cur = idx>=0 ? md.chords[idx] : null;
  if(cur) pos=cur.pos;
  const shown = cur ? trChord(cur.c,st,flats) : '';
  const T=md.text; const wS=T.lastIndexOf(' ',pos-1)+1; let wE=T.indexOf(' ',pos); if(wE<0) wE=T.length;
  const ctx=esc(T.slice(Math.max(0,wS-12),pos))+'<b>▾</b>'+esc(T.slice(pos,Math.min(T.length,wE+12)));
  const chips=hymnChords(h).map(c=>trChord(c,st,flats)).filter((v,i,a)=>a.indexOf(v)===i);
  const {el,close}=sheet('<h3>'+(cur?'Trocar acorde':'Novo acorde')+'</h3><div class="ctx">…'+ctx+'…</div>'+
    '<input id="chv" value="'+esc(shown)+'" placeholder="Ex.: G, D7, Am, C/E" autocapitalize="characters" autocomplete="off" spellcheck="false">'+
    '<div class="chips">'+chips.map(c=>'<button data-c="'+esc(c)+'">'+esc(c)+'</button>').join('')+'</div>'+
    (cur?'<div class="row"><button id="mvl">◀ Mover</button><button id="mvr">Mover ▶</button></div>':'')+
    '<div class="row">'+(cur?'<button class="dan" id="del">Remover</button>':'')+'<button id="cnl">Cancelar</button><button class="pri" id="ok">Salvar</button></div>'+
    (st?'<p class="small">O hino está transposto. Digite o acorde como quer ver neste tom; ele é guardado já convertido para o tom original.</p>':''));
  const inp=el.querySelector('#chv'); setTimeout(()=>inp.focus(),50);
  el.querySelectorAll('.chips button').forEach(b=>b.onclick=()=>{ inp.value=b.dataset.c; inp.focus(); });
  const commit=()=>{ setLine(h,pi,li,fromModel(md)); close(); done(); };
  el.querySelector('#cnl').onclick=close;
  el.querySelector('#ok').onclick=()=>{
    const v=cleanChord(inp.value);
    if(!v){ if(cur){ md.chords.splice(idx,1); commit(); } else close(); return; }
    const orig=trChord(v,-st,keyInfo(h,0).flats);
    if(cur) cur.c=orig; else md.chords.push({pos,c:orig});
    commit();
  };
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter') el.querySelector('#ok').click(); });
  if(cur){
    el.querySelector('#del').onclick=()=>{ md.chords.splice(idx,1); commit(); };
    const mv=d=>{ let p=cur.pos+d; while(p>0 && p<T.length && /\s/.test(T[p]) && /\s/.test(T[p-1])) p+=d; cur.pos=Math.max(0,Math.min(T.length,p)); commit(); };
    el.querySelector('#mvl').onclick=()=>mv(-1);
    el.querySelector('#mvr').onclick=()=>mv(1);
  }
}
function openLineSheet(h,pi,li,done){
  if(!ehAdm()) return;
  const line=getLine(h,pi,li), orig=h.partes[pi].linhas[li];
  const {el,close}=sheet('<h3>Editar linha</h3><p class="small">Escreva cada acorde entre colchetes logo antes da sílaba: <b>[G]Ó gratos [D7]ao Se[G]nhor</b>. Os acordes ficam no tom original do hino.</p>'+
    '<textarea id="lnv" spellcheck="false">'+esc(line)+'</textarea>'+
    '<div class="row">'+(line!==orig?'<button id="und">Voltar ao original</button>':'')+'<button id="cnl">Cancelar</button><button class="pri" id="ok">Salvar</button></div>');
  const ta=el.querySelector('#lnv');
  el.querySelector('#cnl').onclick=close;
  el.querySelector('#ok').onclick=()=>{
    const v=ta.value.replace(/\n+/g,' ');
    if((v.match(/\[/g)||[]).length!==(v.match(/\]/g)||[]).length){ alert('Confira os colchetes: cada [ precisa de um ].'); return; }
    setLine(h,pi,li,v); close(); done();
  };
  const u=el.querySelector('#und'); if(u) u.onclick=()=>{ setLine(h,pi,li,orig); close(); done(); };
}

/* ---------- backup local (exportar/importar) ---------- */
function openBackupSheet(){
  const qtd=Object.keys(edits).length, qyt=Object.keys(ytLinks).length, qfav=favs.size;
  const {el,close}=sheet('<h3>Cópia de segurança</h3><p class="small">'+(qtd?('Você editou '+qtd+' hino'+(qtd>1?'s':'')+'. '):'')+(qyt?(qyt+' link'+(qyt>1?'s':'')+' do YouTube. '):'')+(qfav?(qfav+' favorito'+(qfav>1?'s':'')+'. '):'')+'Tudo fica neste aparelho. Exporte uma cópia para não perder ao trocar de celular.</p>'+
    '<div class="row"><button id="exp" '+((qtd||qyt||qfav)?'':'disabled')+'>Exportar cópia</button><button id="imp">Importar cópia</button></div>'+
    '<input type="file" id="fil" accept=".json,application/json" hidden>'+
    '<div class="row"><button id="cnl">Fechar</button></div>');
  el.querySelector('#cnl').onclick=close;
  el.querySelector('#exp').onclick=()=>{
    const blob=new Blob([JSON.stringify({app:'harpa-crista',versao:1,edicoes:edits,favoritos:[...favs]},null,1)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='harpa-crista-copia.json'; document.body.appendChild(a); a.click(); a.remove();
  };
  const fil=el.querySelector('#fil');
  el.querySelector('#imp').onclick=()=>fil.click();
  fil.onchange=()=>{
    const f=fil.files[0]; if(!f) return;
    f.text().then(t=>{
      let d; try{ d=JSON.parse(t); }catch(e){ alert('Arquivo inválido.'); return; }
      const e=d&&d.edicoes; const lk=d&&d.links; const fv=d&&d.favoritos;
      if((!e||typeof e!=='object') && (!lk||typeof lk!=='object') && !Array.isArray(fv)){ alert('Este arquivo não é uma cópia do app.'); return; }
      let k=0;
      if(e&&typeof e==='object') for(const n of Object.keys(e)){ if(byN.has(+n) && typeof e[n]==='object'){ edits[n]=Object.assign(edits[n]||{},e[n]); k++; } }
      if(Array.isArray(fv)) for(const n of fv){ if(byN.has(+n)){ favs.add(+n); k++; } }
      saveEdits(); saveYt(); saveFavs(); rebuildIndex(); close(); alert(k+' item(ns) importado(s).'); harpaVoltar();
    });
  };
}

/* ---------- configurações ---------- */
function openCfgSheet(){
  const adm=ehAdm();
  const draw=()=>{
    const {el,close}=sheet('<h3>Configurações da Harpa</h3>'+
      '<h4>Tamanho da letra</h4>'+
      '<div class="opt"><button class="tog" id="fsm">A−</button><span class="mode-pill">atual <b>'+prefs.fs+'px</b></span><button class="tog" id="fsp">A+</button></div>'+
      '<h4>Rolagem automática</h4>'+
      '<div class="opt"><button class="tog" id="ssm">−</button><span class="mode-pill">velocidade <b>'+spdLabel()+'</b></span><button class="tog" id="ssp">+</button><button class="tog" id="ssr">Padrão Cifra Club (1×)</button></div>'+
      '<h4>Cópia das edições</h4>'+
      '<div class="opt"><button class="tog" id="bkp">Abrir cópia das edições</button></div>'+
      '<h4>Modo de uso</h4>'+
      '<p class="small">'+(adm?'Você está como <b>Administrador</b> do MM IBNM: pode editar as cifras e os links do YouTube.':'Modo <b>usuário</b>: leitura com transposição e rolagem. Somente o <b>ADM</b> pode editar as cifras.')+'</p>'+
      '<h4>Sobre</h4>'+
      '<p class="small">Harpa Cristã · '+HINOS.length+' hinos · integrado ao MM IBNM · tema verde/dourado do ministério.</p>'+
      '<div class="row"><button class="pri" id="cnl">Fechar</button></div>');
    el.querySelector('#cnl').onclick=close;
    el.querySelector('#fsm').onclick=()=>{ prefs.fs=Math.min(34,Math.max(14,prefs.fs-2)); savePrefs(); close(); draw(); };
    el.querySelector('#fsp').onclick=()=>{ prefs.fs=Math.min(34,Math.max(14,prefs.fs+2)); savePrefs(); close(); draw(); };
    el.querySelector('#ssm').onclick=()=>{ setSpeed(prefs.scrollSpeed-0.2); close(); draw(); };
    el.querySelector('#ssp').onclick=()=>{ setSpeed(prefs.scrollSpeed+0.2); close(); draw(); };
    el.querySelector('#ssr').onclick=()=>{ setSpeed(1); close(); draw(); };
    el.querySelector('#bkp').onclick=()=>{ close(); openBackupSheet(); };
  };
  draw();
}

/* ---------- registro como rota (onclick inline do MM) ---------- */
window.Harpa={renderLista,abrirHino,search,toModel,fromModel,getLine,parseLine:toModel,lineHTML,trChord,keyInfo,norm,strip,ytId,stopScroll};
window.harpaBuscar=function(v){ lastQuery=v; redesenharLista(); };
window.harpaAbrirPrimeiro=function(){ const r=search(lastQuery); const f=r.titulo[0]||r.letra[0]; if(f) abrirHino(f.n); };
let _hrLetra=false;
window.harpaLetra=function(n){ _hrLetra=!_hrLetra; abrirHino(+n,true); };
window.harpaAbrir=function(n){ if(typeof navSave==='function') navSave(); if(typeof _pagAtual!=='undefined') _pagAtual='hino'; editMode=false; stopScroll(); abrirHino(+n); };
window.harpaVoltar=function(){ editMode=false; stopScroll(); if(typeof go==='function') go('harpa'); else renderLista(); };
window.harpaFav=function(n,ev){ if(ev){ ev.preventDefault(); ev.stopPropagation(); } toggleFav(+n); redesenharLista(); };
window.harpaFavHino=function(n){ toggleFav(+n); abrirHino(+n,true); };
window.harpaFs=function(d){ prefs.fs=Math.min(34,Math.max(14,prefs.fs+d)); savePrefs(); abrirHino(harpaNum,true); };
window.harpaCifras=function(n){ prefs.cifras=!prefs.cifras; savePrefs(); abrirHino(+n,true); };
window.harpaPartitura=function(n){
  const h=byN.get(n);
  const url=(h&&h.partitura)? h.partitura : ('partituras_harpa/p'+String(n).padStart(3,'0')+'.png');
  if(window.abrirPartitura) abrirPartitura(url, (h&&h.titulo? h.titulo : 'Hino '+n));
  else window.open(url,'_blank');
};
window.harpaTransp=function(n,d){ const tc=(window.tomCulto?(+window.tomCulto('hr:'+n)||0):0); const atual=Object.prototype.hasOwnProperty.call(prefs.tr,n)?(prefs.tr[n]||0):tc; let st=((atual+d)%12+12)%12; if(st>6) st-=12; if(st===tc) delete prefs.tr[n]; else prefs.tr[n]=st; savePrefs(); abrirHino(+n,true); };
window.harpaTomOriginal=function(n){ const tc=(window.tomCulto?(+window.tomCulto('hr:'+n)||0):0); if(tc) prefs.tr[n]=0; else delete prefs.tr[n]; savePrefs(); abrirHino(+n,true); };
window.harpaScroll=function(){ toggleScroll(); };
window.harpaEditToggle=function(n){ if(!ehAdm()) return; editMode=!editMode; abrirHino(+n,true); };
window.harpaRst=function(n){ if(!ehAdm()) return; if(confirm('Apagar todas as edições deste hino e voltar às cifras do livro?')){ delete edits[n]; saveEdits(); rebuildIndex(); abrirHino(+n,true); } };
window.harpaYtSheet=function(n){ openYtSheet(+n,()=>abrirHino(+n,true)); };
window.harpaCfg=function(){ openCfgSheet(); };
window.harpaRedesenhar=function(){ if(harpaNum && document.querySelector('.cc-song')) abrirHino(harpaNum,true); };

/* ---------- compartilhar (WhatsApp / sistema) ---------- */
window.hrCompartilhar=function(n){
  const hh=(window.HARPA||[]).find(x=>x.n===+n); const titulo=hh?hh.titulo:'';
  const url=location.origin+location.pathname+'#harpa-'+n;
  const txt='Harpa Cristã '+n+' — '+titulo;
  if(navigator.share){ navigator.share({title:txt,text:txt,url}).catch(()=>{}); }
  else if(navigator.clipboard){ navigator.clipboard.writeText(txt+'\n'+url).then(()=>toast('Link copiado!'),()=>prompt('Copie o link:',url)); }
  else prompt('Copie o link:',url);
};
window.hrWhats=function(n){
  const hh=(window.HARPA||[]).find(x=>x.n===+n); if(!hh) return;
  let corpo='';
  try{ corpo=(hh.partes||[]).map(p=>(p.tipo==='coro'?'\n— Coro —\n':'\n')+(p.linhas||[]).join('\n')).join('\n'); }catch(e){ corpo=''; }
  if(!corpo) corpo=String(hh.letra||'');
  if(!corpo) return toast('Hino sem letra/cifra para compartilhar.');
  const txt='*Hino '+n+' — '+hh.titulo+'*'+(hh.tom?' (Tom '+hh.tom+')':'')+'\n\n'+corpo+'\n\n— Harpa Cristã · app Música Ministração';
  window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');
};
/* link direto #harpa-123 */
(function(){
  const ir=()=>{ const m=location.hash.match(/^#harpa-(\d+)/); if(m && window.harpaAbrir){ window.harpaAbrir(+m[1]); history.replaceState(history.state,'',location.pathname); } };
  addEventListener('hashchange',ir); setTimeout(ir,800);
})();

/* ---------- registro como rota do MM ---------- */
try{
  if(typeof ROTAS!=='undefined'){
    ROTAS.harpa=function(){ editMode=false; return renderLista(); };
  }
}catch(e){}


})();
