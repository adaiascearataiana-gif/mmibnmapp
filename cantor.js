/* ============================================================
   CANTOR CRISTÃO — módulo integrado ao MM IBNM
   581 hinos cifrados, busca, transposição, rolagem (padrão
   Cifra Club), favoritos, links do YouTube e edição — somente
   o ADM do ministério pode editar ("Somente o ADM pode editar").
   Temática: verde/dourado do MM IBNM.
============================================================ */
(function(){
'use strict';
const HINOS = (window.HINOS||[]).slice().sort((a,b)=>a.n-b.n);
const byN = new Map(HINOS.map(h=>[h.n,h]));

/* ---------- utilitários ---------- */
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
const esc = s => String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const strip = l => l.replace(/\[[^\]]*\]/g,'').replace(/\s+/g,' ').trim();
const clean = l => strip(l).replace(/(\S)\s*-\s+(?=\S)/g,'$1').replace(/(\S)\s+-\s*(?=\S)/g,'$1').replace(/-(?=[\s,.;:!?]|$)/g,'');

/* ---------- tema verde/dourado do MM IBNM ---------- */
(function injectCss(){
  const css=`
.cc-page{padding-bottom:30px}
.cc-foot{font-size:11.5px;color:#9aa;text-align:center;margin:18px 0 6px}
.cc-sec{font-size:13px;font-weight:800;color:var(--verde-escuro);margin:14px 2px 8px;text-transform:uppercase;letter-spacing:.6px}
.cc-fav-head{color:#b8860b}
.cc-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.cc-list li{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #eef0f3;border-left:3px solid var(--verde-med);border-radius:10px;padding:10px 12px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
.cc-list li a{display:flex;align-items:center;gap:12px;flex:1;min-width:0;text-decoration:none;color:inherit}
.cc-list .num{flex-shrink:0;width:38px;height:38px;border-radius:50%;background:var(--verde-med);color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center}
.cc-list .tt{display:block;font-weight:700;color:var(--verde-escuro);font-size:14px;line-height:1.3}
.cc-list .fl{display:block;font-size:12px;color:#8a9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:52vw}
.cc-favstar{flex-shrink:0;border:none;background:none;font-size:21px;cursor:pointer;color:#c9a200;padding:2px 4px;line-height:1}
.cc-empty{color:#9aa;font-size:14px;text-align:center;padding:26px 0}
.ed-mark{font-size:10px;font-weight:800;color:#fff;background:#b8860b;border-radius:20px;padding:2px 8px;margin-left:8px;vertical-align:middle;letter-spacing:.5px}
.cc-hbar{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:6px;background:var(--verde-escuro);margin:-14px -14px 10px;padding:10px 12px;box-shadow:0 2px 10px rgba(0,0,0,.22)}
.cc-hbar .ib{border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#fff;font-weight:700;font-size:13.5px;border-radius:9px;padding:7px 11px;cursor:pointer}
.cc-hbar .ib:active{opacity:.8}
.cc-hbar .ib.fav-on{color:#f1c40f;border-color:#f1c40f}
.cc-hbar .sp{flex:1}
.cc-head{position:relative;padding-left:6px}
.cc-head .n{position:absolute;right:2px;top:0;width:46px;height:46px;border-radius:50%;background:var(--dourado);color:var(--verde-escuro);font-weight:800;font-size:17px;display:flex;align-items:center;justify-content:center;box-shadow:var(--sombra)}
.cc-head h2{margin:0 56px 6px 0;font-size:21px;line-height:1.22;color:var(--verde-escuro)}
.cc-meta{display:flex;flex-wrap:wrap;gap:8px 16px;font-size:13px;color:#556;margin:6px 0}
.cc-meta b{color:var(--verde-escuro)}
.cc-cred{font-size:12.5px;color:#789;line-height:1.55;margin:8px 0 2px}
.cc-intro{margin:14px 0 6px;padding:13px 15px 11px;background:linear-gradient(180deg,#fdf6ea,#fbf1e2);border:1.5px solid var(--dourado-esc);border-radius:12px}
.cc-intro .tag{display:inline-block;background:var(--dourado);color:var(--verde-escuro);font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;padding:3px 11px;border-radius:999px;margin-bottom:8px}
.cc-intro img{width:100%;max-width:860px;display:block;background:#fff;border-radius:6px;border:1px solid #ead9c0}
.cc-missing{margin:14px 0;padding:13px 15px;background:#fff8e1;border:1.5px dashed var(--dourado-esc);border-radius:12px;color:#7a5c00;font-size:13.5px;font-weight:600;line-height:1.5}
.cc-tools{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0;align-items:center}
.cc-tools .tog{height:38px;padding:0 13px;border:1px solid var(--verde-med);background:#f3faf5;color:var(--verde-escuro);font-weight:700;font-size:13px;border-radius:10px;cursor:pointer;display:inline-flex;align-items:center;text-decoration:none}
.cc-tools .tog[aria-pressed="true"]{background:var(--verde-med);color:#fff}
.cc-tools .tog.cc-edit[aria-pressed="true"]{background:var(--dourado);border-color:var(--dourado-esc);color:var(--verde-escuro)}
.cc-tools .cc-yt-chip{border-color:#c0392b;color:#c0392b;background:#fdf1ef}
.cc-tools .chip{display:inline-flex;align-items:center;gap:2px;height:38px;padding:0 6px;border:1px solid var(--dourado-esc);background:#fffbea;border-radius:10px}
.cc-tools .chip button{border:none;background:none;font-size:19px;font-weight:800;color:var(--verde-escuro);cursor:pointer;padding:2px 9px}
.cc-tools .chip .lbl{font-size:13px;color:#556}
.cc-tools .chip .lbl b{color:var(--verde-escuro)}
.cc-hint{background:#fffbea;border:1px dashed var(--dourado-esc);border-radius:10px;padding:11px 13px;font-size:12.5px;color:#7a5c00;line-height:1.55;margin:4px 0 10px}
.cc-song{background:#fff;border:1px solid #eef0f3;border-radius:14px;padding:18px 16px 22px;box-shadow:0 1px 5px rgba(0,0,0,.05);font-family:'Trebuchet MS','Segoe UI',system-ui,sans-serif;font-size:var(--cc-fs,19px);line-height:2.5}
.cc-part{position:relative;margin:0 0 12px}
.cc-part .pn{position:absolute;left:-4px;top:2px;font-size:10.5px;font-weight:800;color:var(--verde-med);background:#eef7f0;border-radius:20px;padding:2px 8px;letter-spacing:.5px}
.cc-part.coro{background:#fffbea;border-left:3px solid var(--dourado);border-radius:8px;padding:8px 10px 2px 22px;margin-top:14px}
.cc-part.coro .pn{background:var(--dourado);color:var(--verde-escuro);left:2px}
.cc-part.estrofe{padding-left:22px}
.cc-song .ln{margin:0 0 2px;position:relative;line-height:2.6;min-height:2.6em}
.cc-song .w{display:inline-flex;white-space:pre;vertical-align:top}
.cc-song .p{display:inline-flex;flex-direction:column;align-items:flex-start;vertical-align:top}
.cc-song .p.gap{padding-right:.32em}
.cc-song .c{display:block;height:1.42em;line-height:1.42em;font-weight:800;color:#a67c00;font-family:'Courier New',ui-monospace,monospace;font-size:.86em;letter-spacing:-.2px;cursor:pointer;user-select:none}
.cc-song .t{display:block;white-space:pre;color:#12281f}
.cc-song.nochords .c{visibility:hidden}
.cc-song.editing .ln{outline:1px dashed transparent;border-radius:6px}
.cc-song.editing .ln:hover{outline:1px dashed #c9a200;background:#fffdf3}
.cc-song.editing .c{color:#b8860b;background:#fff6d8;border-radius:4px;padding:0 2px}
.lnedit{position:absolute;right:-6px;top:2px;border:1px solid var(--dourado-esc);background:#fffbea;color:#7a5c00;font-size:12px;border-radius:8px;padding:3px 8px;cursor:pointer;opacity:.9}
.cc-nav{display:flex;gap:10px;margin:16px 0 8px}
.cc-nav a{flex:1;display:flex;flex-direction:column;gap:2px;background:#fff;border:1px solid #eef0f3;border-left:3px solid var(--verde-med);border-radius:10px;padding:10px 12px;text-decoration:none;color:var(--verde-escuro);font-size:13px;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cc-nav a.r{text-align:right;border-left:none;border-right:3px solid var(--verde-med)}
.cc-nav small{font-size:10.5px;font-weight:800;color:#8a9;text-transform:uppercase;letter-spacing:.8px}
.cc-sheet-bg{position:fixed;inset:0;background:rgba(6,30,22,.55);z-index:10000;display:flex;align-items:flex-end;justify-content:center;animation:ccfade .18s ease}
@keyframes ccfade{from{opacity:0}to{opacity:1}}
.cc-sheet{background:#fff;width:min(560px,100%);max-height:82vh;overflow:auto;border-radius:18px 18px 0 0;padding:20px 18px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -8px 34px rgba(0,0,0,.3)}
.cc-sheet h3{margin:0 0 10px;font-size:17px;color:var(--verde-escuro)}
.cc-sheet h4{margin:16px 0 8px;font-size:13px;color:var(--verde-med);text-transform:uppercase;letter-spacing:.7px}
.cc-sheet .small{font-size:12.5px;color:#667;line-height:1.55;margin:6px 0}
.cc-sheet .ctx{font-size:13px;color:#556;background:#f6f8f7;border-radius:8px;padding:8px 10px;margin:8px 0;word-break:break-word}
.cc-sheet .ctx b{color:#b8860b}
.cc-sheet input,.cc-sheet textarea{width:100%;box-sizing:border-box;border:1px solid #c9ced6;border-radius:10px;padding:11px 12px;font-size:15px;margin:8px 0;font-family:inherit}
.cc-sheet textarea{min-height:96px;font-family:'Courier New',monospace;font-size:14px}
.cc-sheet .chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.cc-sheet .chips button{border:1px solid var(--verde-med);background:#f3faf5;color:var(--verde-escuro);font-weight:700;font-size:13px;border-radius:20px;padding:5px 11px;cursor:pointer;font-family:'Courier New',monospace}
.cc-sheet .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.cc-sheet .row button{flex:1;min-width:96px;border:1px solid #c9ced6;background:#f4f6f7;color:#2b2b2b;font-weight:700;font-size:13.5px;border-radius:10px;padding:11px 12px;cursor:pointer}
.cc-sheet .row button.pri{background:var(--verde-med);border-color:var(--verde-med);color:#fff}
.cc-sheet .row button.dan{background:#fdf1ef;border-color:#c0392b;color:#c0392b}
.cc-sheet .row button:disabled{opacity:.45;cursor:default}
.cc-sheet .opt{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.cc-sheet .opt .tog{height:38px;padding:0 13px;border:1px solid var(--verde-med);background:#f3faf5;color:var(--verde-escuro);font-weight:700;font-size:13px;border-radius:10px;cursor:pointer}
.cc-sheet .mode-pill{font-size:13px;color:#556;background:#f6f8f7;border-radius:20px;padding:6px 13px}
.cc-sheet .mode-pill b{color:var(--verde-escuro)}
.cc-scrollbar{position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:center;gap:8px;background:var(--verde-escuro);padding:10px 12px calc(10px + env(safe-area-inset-bottom));box-shadow:0 -4px 18px rgba(0,0,0,.3)}
.cc-scrollbar button{border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.1);color:#fff;font-size:16px;font-weight:800;border-radius:9px;width:40px;height:38px;cursor:pointer}
.cc-scrollbar .spd{color:#f1c40f;font-weight:800;font-size:14px;min-width:44px;text-align:center}
.cc-scrollbar .sp{flex:1}
@media (max-width:480px){
  .cc-song{padding:14px 11px 18px}
  .cc-part.coro{padding-left:18px}
  .cc-part.estrofe{padding-left:18px}
  .cc-head .n{width:40px;height:40px;font-size:15px}
  .cc-head h2{font-size:18px}
  .cc-list .fl{max-width:44vw}
}`;
  const st=document.createElement('style'); st.id='ccTemaIBNM'; st.textContent=css; document.head.appendChild(st);
})();

/* ---------- preferências (leitura) ---------- */
const PREF_KEY='ibnm_cc_prefs';
let prefs={cifras:true,fs:19,tr:{},scrollSpeed:1};
try{ Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{}); }catch(e){}
function savePrefs(){ try{ localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); }catch(e){} }

/* ---------- estado do usuário / sessão MM ---------- */
function userEmail(){ try{ const u=(typeof usuarioAtual==='function')?usuarioAtual():null; return (u&&u.email)||'anon'; }catch(e){ return 'anon'; } }
function ehAdm(){ try{ return typeof ehAdmin==='function' && !!ehAdmin(); }catch(e){ return false; } }
function toast2(msg){ try{ if(typeof toast==='function') return toast(msg); }catch(e){} try{ alert(msg); }catch(e){} }

/* ---------- edições (somente ADM) ---------- */
const ED_KEY='ibnm_cc_ed';
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
const isEdited = n => !!edits[n];

/* ---------- favoritos (por usuário) ---------- */
function favKey(){ return 'ibnm_cc_favs_'+userEmail(); }
let favs=new Set();
function loadFavs(){ favs=new Set(); try{ (JSON.parse(localStorage.getItem(favKey())||'[]')||[]).forEach(n=>{ if(byN.has(+n)) favs.add(+n); }); }catch(e){} }
function saveFavs(){ try{ localStorage.setItem(favKey(), JSON.stringify([...favs])); }catch(e){} }
function toggleFav(n){ if(favs.has(n)) favs.delete(n); else favs.add(n); saveFavs(); }
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
    const {data,error}=await sb.from('cantor_links').select('num,url');
    if(error) return;
    (data||[]).forEach(r=>{ if(byN.has(+r.num) && r.url){ ytLinks[r.num]=String(r.url).trim(); } });
    saveYt();
  }catch(e){}
}
async function cloudSaveLink(n,id){
  try{
    if(typeof sb==='undefined'||!sb) return;
    if(id) await sb.from('cantor_links').upsert({num:n,url:id,updated_at:new Date().toISOString()});
    else await sb.from('cantor_links').delete().eq('num',n);
  }catch(e){}
}
/* tempo real: links atualizados por qualquer ADM refletem para todos */
(function ligarRtCantor(){
  try{
    if(typeof sb==='undefined'||!sb||!sb.channel) return;
    const ch=sb.channel('cantor-rt');
    ch.on('postgres_changes',{event:'*',schema:'public',table:'cantor_links'},()=>{ cloudLoadLinks().then(()=>{ const b=document.querySelector('.cc-yt-chip'); if(b&&cantorNum) abrirHino(cantorNum); }); });
    ch.subscribe();
  }catch(e){}
})();

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
  window.scrollBy(0, SCROLL_BASE*prefs.scrollSpeed*dt);
  if(window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-2){ stopScroll(); return; }
  scrollRaf=requestAnimationFrame(scrollStep);
}
function renderScrollBar(){
  let bar=document.querySelector('.cc-scrollbar');
  if(!bar){
    bar=document.createElement('div'); bar.className='cc-scrollbar';
    bar.innerHTML='<button id="sb-pause" aria-label="Pausar rolagem">⏸</button>'+
      '<button id="sb-slow" aria-label="Diminuir velocidade">−</button>'+
      '<span class="spd">'+spdLabel()+'</span>'+
      '<button id="sb-fast" aria-label="Aumentar velocidade">+</button>'+
      '<span class="sp"></span>'+
      '<button id="sb-stop" aria-label="Parar rolagem">✕</button>';
    document.body.appendChild(bar);
    bar.querySelector('#sb-pause').onclick=()=>{ stopScroll(); };
    bar.querySelector('#sb-stop').onclick=()=>{ stopScroll(); };
    bar.querySelector('#sb-slow').onclick=()=>setSpeed(prefs.scrollSpeed-0.2);
    bar.querySelector('#sb-fast').onclick=()=>setSpeed(prefs.scrollSpeed+0.2);
  }
  bar.querySelector('.spd').textContent=spdLabel();
}
function syncScrollBtn(){
  const b=document.getElementById('tsc');
  if(b){ b.setAttribute('aria-pressed',scrollOn?'true':'false'); b.textContent=scrollOn?'⏸ Pausar rolagem':'▶ Rolagem'; }
}
function startScroll(){
  if(scrollOn) return;
  scrollOn=true; scrollLast=performance.now();
  renderScrollBar(); syncScrollBtn();
  scrollRaf=requestAnimationFrame(scrollStep);
}
function stopScroll(){
  scrollOn=false;
  if(scrollRaf) cancelAnimationFrame(scrollRaf), scrollRaf=null;
  const bar=document.querySelector('.cc-scrollbar'); if(bar) bar.remove();
  syncScrollBtn();
}
function toggleScroll(){ scrollOn?stopScroll():startScroll(); }

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
let lastQuery=''; let editMode=false; let cantorNum=null;
function renderLista(){
  loadFavs(); cloudLoadLinks();
  const adm=ehAdm();
  return '<div class="page cc-page">'+
    '<div class="page-ttl">📖 Cantor Cristão</div>'+
    '<p style="font-size:13px;color:#789;margin-bottom:12px">'+HINOS.length+' hinos cifrados · use a busca por número, título ou letra'+(adm?' · <b style="color:var(--verde-med)">você é ADM e pode editar as cifras</b>':' · somente o ADM edita as cifras')+'</p>'+
    '<input class="search-box" id="ccQ" placeholder="🔎 Número ou título do hino" value="'+esc(lastQuery)+'" oninput="cantorBuscar(this.value)" onkeydown="if(event.key===\'Enter\'){cantorAbrirPrimeiro()}">'+
    '<div id="ccRes">'+listaHtml()+'</div>'+
    '<p class="cc-foot">Hinário Cantor Cristão · uso pessoal e cultos · integrado ao MM IBNM</p>'+
  '</div>';
}
function itemHtml(h){
  return '<li><a href="javascript:void(0)" onclick="cantorAbrir('+h.n+')"><span class="num">'+h.n+'</span><span><span class="tt">'+esc(h.titulo)+(isEdited(h.n)?'<span class="ed-mark">editado</span>':'')+'</span><span class="fl">'+esc(clean(getLine(h,0,0)))+'</span></span></a><button class="cc-favstar" data-n="'+h.n+'" onclick="cantorFav('+h.n+',event)" aria-label="Favoritar">'+(favs.has(h.n)?'★':'☆')+'</button></li>';
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
function redesenharLista(){ const el=document.getElementById('ccRes'); if(el) el.innerHTML=listaHtml(); }

/* ---------- hino ---------- */
function abrirHino(n, keepScroll){
  const h=byN.get(n); if(!h) return cantorVoltar();
  cantorNum=n;
  try{ _viewAtual=function(){ abrirHino(n); }; }catch(e){}
  try{ if(window.__navReg) window.__navReg('cc|'+n); }catch(e){}
  const adm=ehAdm();
  const st=prefs.tr[n]||0; const {key,flats}=keyInfo(h,st);
  let ei=0;
  const partes=h.partes.map((p,pi)=>{
    const lab = p.tipo==='coro' ? 'Coro' : String(++ei);
    return '<section class="cc-part cc-'+p.tipo+'"><span class="pn">'+lab+'</span>'+p.linhas.map((l,li)=>'<p class="ln" data-pi="'+pi+'" data-li="'+li+'">'+lineHTML(getLine(h,pi,li),st,flats)+(editMode?'<button class="lnedit" aria-label="Editar linha inteira">✎</button>':'')+'</p>').join('')+'</section>';
  }).join('');
  const i=HINOS.indexOf(h), prev=HINOS[i-1], next=HINOS[i+1];
  const introImg = introExiste(h.n) ? '<div class="cc-intro"><span class="tag">Intro</span><img loading="lazy" src="cc-intro/p'+String(h.n).padStart(3,'0')+'.jpg" alt="Introdução do hino '+h.n+'"></div>' : '';
  const missingBox = h.missing ? '<div class="cc-missing">⚠️ '+(h.creditos&&h.creditos[0]?esc(h.creditos[0]):'Página não incluída no PDF de origem.')+'</div>' : '';
  const ytl=ytLinks[n];
  const html=''+
  '<div class="cc-hbar">'+
    '<button class="ib" onclick="cantorVoltar()">‹ Hinos</button>'+
    '<button class="ib '+(favs.has(n)?'fav-on':'')+'" id="ccFav" onclick="cantorFavHino('+n+')" aria-label="Favoritos">'+(favs.has(n)?'★':'☆')+'</button>'+
    '<span class="sp"></span>'+
    '<button class="ib" onclick="cantorFs(-2)" aria-label="Diminuir letra">A−</button>'+
    '<button class="ib" onclick="cantorFs(2)" aria-label="Aumentar letra">A+</button>'+
    '<button class="ib" onclick="cantorCfg()" aria-label="Configurações">⚙</button>'+
  '</div>'+
  '<main class="cc-main">'+
    '<div class="cc-head">'+
      '<div class="n">'+h.n+'</div>'+
      '<h2>'+esc(h.titulo)+(isEdited(n)?'<span class="ed-mark">editado</span>':'')+'</h2>'+
      '<div class="cc-meta"><span>Tom <b>'+esc(key)+'</b>'+(st?' (original '+esc(h.tom)+')':'')+'</span>'+(h.ritmo?'<span>Ritmo <b>'+esc(h.ritmo)+'</b></span>':'')+'</div>'+
      (h.creditos&&h.creditos.length?'<p class="cc-cred">'+h.creditos.map(esc).join('<br>')+'</p>':'')+
    '</div>'+
    introImg + missingBox +
    '<div class="cc-tools">'+
      '<button class="tog" id="tc" aria-pressed="'+prefs.cifras+'" onclick="cantorCifras('+n+')">Cifras</button>'+
      '<span class="chip" '+(prefs.cifras?'':'hidden')+'><button onclick="cantorTransp('+n+',-1)" aria-label="Baixar meio tom">−</button><span class="lbl">Tom <b>'+esc(key)+'</b></span><button onclick="cantorTransp('+n+',1)" aria-label="Subir meio tom">+</button></span>'+
      (st?'<button class="tog" onclick="cantorTomOriginal('+n+')">Tom original</button>':'')+
      '<button class="tog" id="tsc" aria-pressed="'+(scrollOn?'true':'false')+'" onclick="cantorScroll()">'+(scrollOn?'⏸ Pausar rolagem':'▶ Rolagem')+'</button>'+
      (ytl?'<a class="tog cc-yt-chip" href="'+ytUrl(ytl)+'" target="_blank" rel="noopener">▶ Ouvir no YouTube</a>':'')+
      (adm?'<button class="tog" onclick="cantorYtSheet('+n+')">'+(ytl?'✎ Link do YouTube':'🔗 Link do YouTube')+'</button>':'')+
      (adm?'<button class="tog cc-edit" id="ted" aria-pressed="'+editMode+'" onclick="cantorEditToggle('+n+')">'+(editMode?'Concluir edição':'Editar cifras')+'</button>':'')+
    '</div>'+
    (editMode?'<div class="cc-hint">Toque numa sílaba para pôr ou trocar o acorde. Toque em ✎ para editar a linha inteira.'+(isEdited(n)?'<br><button class="tog" onclick="cantorRst('+n+')">Restaurar cifras originais deste hino</button>':'')+'</div>':'')+
    '<div class="cc-song '+(prefs.cifras||editMode?'':'nochords')+' '+(editMode?'editing':'')+'" style="--cc-fs:'+prefs.fs+'px">'+partes+'</div>'+
    '<nav class="cc-nav">'+(prev?'<a href="javascript:void(0)" onclick="cantorAbrir('+prev.n+')"><small>Anterior</small>'+prev.n+' · '+esc(prev.titulo)+'</a>':'<span></span>')+(next?'<a class="r" href="javascript:void(0)" onclick="cantorAbrir('+next.n+')"><small>Próximo</small>'+next.n+' · '+esc(next.titulo)+'</a>':'<span></span>')+'</nav>'+
  '</main>';
  const c=document.getElementById('content');
  if(c){ c.innerHTML='<div class="page cc-page">'+html+'</div>'; }
  if(typeof toggleMenu==='function'){ try{ toggleMenu(false); }catch(e){} }
  if(!keepScroll) window.scrollTo(0,0);
  fixGaps();
  if(editMode) bindEdicao(h,st,flats,()=>abrirHino(n,true));
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

/* ---------- link do YouTube (somente ADM grava) ---------- */
function openYtSheet(n,done){
  if(!ehAdm()) return;
  const cur=ytLinks[n]||'';
  const {el,close}=sheet('<h3>Link do YouTube — hino '+n+'</h3>'+
    '<p class="small">Cole o endereço do vídeo deste hino (youtube.com/watch?v=…, youtu.be/… ou shorts). Todos os usuários verão o botão <b>▶ Ouvir no YouTube</b>.</p>'+
    '<input id="ytv" value="'+esc(cur?ytUrl(cur):'')+'" placeholder="https://www.youtube.com/watch?v=…" inputmode="url" autocomplete="off" spellcheck="false">'+
    '<div class="row">'+
      (cur?'<button class="dan" id="del">Remover link</button>':'')+
      (cur?'<button id="tst">Abrir vídeo</button>':'')+
      '<button id="cnl">Cancelar</button><button class="pri" id="ok">Salvar</button>'+
    '</div>');
  const inp=el.querySelector('#ytv'); setTimeout(()=>inp.focus(),50);
  el.querySelector('#cnl').onclick=close;
  const tst=el.querySelector('#tst'); if(tst) tst.onclick=()=>{ const id=ytId(inp.value)||cur; if(id) window.open(ytUrl(id),'_blank','noopener'); };
  const del=el.querySelector('#del'); if(del) del.onclick=()=>{ delete ytLinks[n]; saveYt(); cloudSaveLink(n,null); close(); done(); };
  const ok=()=>{
    const v=inp.value.trim();
    if(!v){ delete ytLinks[n]; saveYt(); cloudSaveLink(n,null); close(); done(); return; }
    const id=ytId(v);
    if(!id){ alert('Endereço do YouTube não reconhecido.\nUse youtube.com/watch?v=… ou youtu.be/…'); return; }
    ytLinks[n]=id; saveYt(); cloudSaveLink(n,id); close(); done();
  };
  el.querySelector('#ok').onclick=ok;
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter') ok(); });
}

/* ---------- cópia de segurança ---------- */
function openBackupSheet(){
  const qtd=Object.keys(edits).length, qyt=Object.keys(ytLinks).length, qfav=favs.size;
  const {el,close}=sheet('<h3>Cópia de segurança</h3><p class="small">'+(qtd?('Você editou '+qtd+' hino'+(qtd>1?'s':'')+'. '):'')+(qyt?(qyt+' link'+(qyt>1?'s':'')+' do YouTube. '):'')+(qfav?(qfav+' favorito'+(qfav>1?'s':'')+'. '):'')+'Edições e favoritos ficam neste aparelho; os links do YouTube também são sincronizados na nuvem. Exporte uma cópia para não perder ao trocar de celular.</p>'+
    '<div class="row"><button id="exp" '+((qtd||qyt||qfav)?'':'disabled')+'>Exportar cópia</button><button id="imp">Importar cópia</button></div>'+
    '<input type="file" id="fil" accept=".json,application/json" hidden>'+
    '<div class="row"><button id="cnl">Fechar</button></div>');
  el.querySelector('#cnl').onclick=close;
  el.querySelector('#exp').onclick=()=>{
    const blob=new Blob([JSON.stringify({app:'cantor-cristao',versao:2,edicoes:edits,links:ytLinks,favoritos:[...favs]},null,1)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='cantor-cristao-copia.json'; document.body.appendChild(a); a.click(); a.remove();
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
      if(lk&&typeof lk==='object') for(const n of Object.keys(lk)){ const id=lk[n]; if(byN.has(+n) && typeof id==='string' && /^[A-Za-z0-9_-]{6,}$/.test(id)){ ytLinks[n]=id; cloudSaveLink(+n,id); k++; } }
      if(Array.isArray(fv)) for(const n of fv){ if(byN.has(+n)){ favs.add(+n); k++; } }
      saveEdits(); saveYt(); saveFavs(); rebuildIndex(); close(); alert(k+' item(ns) importado(s).'); cantorVoltar();
    });
  };
}

/* ---------- configurações ---------- */
function openCfgSheet(){
  const adm=ehAdm();
  const draw=()=>{
    const {el,close}=sheet('<h3>Configurações do Cantor</h3>'+
      '<h4>Tamanho da letra</h4>'+
      '<div class="opt"><button class="tog" id="fsm">A−</button><span class="mode-pill">atual <b>'+prefs.fs+'px</b></span><button class="tog" id="fsp">A+</button></div>'+
      '<h4>Rolagem automática</h4>'+
      '<div class="opt"><button class="tog" id="ssm">−</button><span class="mode-pill">velocidade <b>'+spdLabel()+'</b></span><button class="tog" id="ssp">+</button><button class="tog" id="ssr">Padrão Cifra Club (1×)</button></div>'+
      '<h4>Cópia das edições</h4>'+
      '<div class="opt"><button class="tog" id="bkp">Abrir cópia das edições</button></div>'+
      '<h4>Modo de uso</h4>'+
      '<p class="small">'+(adm?'Você está como <b>Administrador</b> do MM IBNM: pode editar as cifras e os links do YouTube.':'Modo <b>usuário</b>: leitura com transposição e rolagem. Somente o <b>ADM</b> pode editar as cifras.')+'</p>'+
      '<h4>Sobre</h4>'+
      '<p class="small">Cantor Cristão Cifrado · '+HINOS.length+' hinos · integrado ao MM IBNM · tema verde/dourado do ministério.</p>'+
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

/* ---------- intros (arquivos em cc-intro/pNNN.jpg) ---------- */
/* hinos sem imagem de intro no PDF de origem (não mostrar bloco quebrado) */
const SEM_INTRO=new Set([1,38,58,61,116,138,139,273,279,304,319,322,323,325,326,328,329,330,342,344,357,358,359,360,362,377,383,393,394,410,411,431,442,453,503,504,509,538,551,576,579]);
const INTROS=new Set();
for(const h of HINOS){ if(!h.missing && !SEM_INTRO.has(h.n)) INTROS.add(h.n); }
function introExiste(n){ return INTROS.has(n); }

/* ---------- API global (onclick inline do MM) ---------- */
window.Cantor={renderLista,abrirHino,search,toModel,fromModel,getLine,parseLine:toModel,lineHTML,trChord,keyInfo,norm,strip,ytId,stopScroll};
window.cantorBuscar=function(v){ lastQuery=v; redesenharLista(); };
window.cantorAbrirPrimeiro=function(){ const r=search(lastQuery); const f=r.titulo[0]||r.letra[0]; if(f) abrirHino(f.n); };
window.cantorAbrir=function(n){ editMode=false; stopScroll(); abrirHino(+n); };
window.cantorVoltar=function(){ editMode=false; stopScroll(); if(typeof go==='function') go('cantor'); else renderLista(); };
window.cantorFav=function(n,ev){ if(ev){ ev.preventDefault(); ev.stopPropagation(); } toggleFav(+n); redesenharLista(); };
window.cantorFavHino=function(n){ toggleFav(+n); abrirHino(+n,true); };
window.cantorFs=function(d){ prefs.fs=Math.min(34,Math.max(14,prefs.fs+d)); savePrefs(); abrirHino(cantorNum,true); };
window.cantorCifras=function(n){ prefs.cifras=!prefs.cifras; savePrefs(); abrirHino(+n,true); };
window.cantorTransp=function(n,d){ const st=(prefs.tr[n]||0)+d; if(st===0) delete prefs.tr[n]; else prefs.tr[n]=st; savePrefs(); abrirHino(+n,true); };
window.cantorTomOriginal=function(n){ delete prefs.tr[n]; savePrefs(); abrirHino(+n,true); };
window.cantorScroll=function(){ toggleScroll(); };
window.cantorEditToggle=function(n){ if(!ehAdm()) return; editMode=!editMode; abrirHino(+n,true); };
window.cantorRst=function(n){ if(!ehAdm()) return; if(confirm('Apagar todas as edições deste hino e voltar às cifras do livro?')){ delete edits[n]; saveEdits(); rebuildIndex(); abrirHino(+n,true); } };
window.cantorYtSheet=function(n){ openYtSheet(+n,()=>abrirHino(+n,true)); };
window.cantorCfg=function(){ openCfgSheet(); };

/* ---------- registro como rota do MM ---------- */
try{
  if(typeof ROTAS!=='undefined'){
    ROTAS.cantor=function(){ editMode=false; return renderLista(); };
  }
}catch(e){}

/* ---------- FAVORITOS UNIFICADOS (músicas + hinos) ----------
   A seção "Favoritos" do menu lateral reúne tudo o que o usuário
   marcou com ⭐ — músicas do ministério e hinos do Cantor Cristão. */
function renderFavoritosUnificado(){
  if(typeof paginaMusicas!=='undefined') paginaMusicas='favoritos';
  loadFavs();
  const u=(typeof usuarioAtual==='function')?usuarioAtual():null;
  const favIds=(u&&typeof DB!=='undefined'&&DB.favoritos&&DB.favoritos[u.email])||[];
  const musicas=(typeof DB!=='undefined'&&DB.musicas?DB.musicas:[]).filter(m=>favIds.indexOf(m.id)>=0);
  const hinos=HINOS.filter(h=>favs.has(h.n));
  const rowMusica=m=>'<div class="song-row" onclick="abrirMusica(\''+m.id+'\')"><div class="s-ic">🎵</div><div style="flex:1"><div class="s-nm">'+esc(m.titulo)+'</div><div class="s-ar">'+esc(m.artista||'')+'</div></div><span class="star on" onclick="toggleFav(\''+m.id+'\',event)">★</span></div>';
  const rowHino=h=>'<div class="song-row" onclick="cantorAbrir('+h.n+')"><div class="s-ic">📖</div><div style="flex:1"><div class="s-nm">'+h.n+' · '+esc(h.titulo)+'</div><div class="s-ar">Cantor Cristão'+(h.ritmo?' · '+esc(h.ritmo):'')+'</div></div><span class="star on" onclick="cantorFavUnificado('+h.n+',event)">★</span></div>';
  const vazio=(!musicas.length && !hinos.length)
    ? '<div class="empty"><div class="big">⭐</div>Você ainda não tem favoritos.<br>Toque na estrela ★ de uma música ou de um hino para salvá-los aqui.</div>'
    : '';
  return '<div class="page"><div class="page-ttl">⭐ Favoritos</div>'+
    '<p style="font-size:13px;color:#789;margin-bottom:12px">Tudo o que você marcou com ★ — músicas do ministério e hinos do Cantor Cristão, juntos aqui.</p>'+
    vazio+
    (musicas.length?'<div class="cc-sec" style="margin-top:6px">🎵 Músicas ('+musicas.length+')</div>'+musicas.map(rowMusica).join(''):'')+
    (hinos.length?'<div class="cc-sec" style="margin-top:18px">📖 Cantor Cristão ('+hinos.length+')</div>'+hinos.map(rowHino).join(''):'')+
    '</div>';
}
try{
  if(typeof ROTAS!=='undefined'){ ROTAS.favoritos=renderFavoritosUnificado; }
}catch(e){}
window.cantorFavUnificado=function(n,ev){ if(ev){ ev.preventDefault(); ev.stopPropagation(); } toggleFav(+n); if(typeof go==='function') go('favoritos'); else renderLista(); };

/* carrega links da nuvem na abertura */
cloudLoadLinks();
})();
