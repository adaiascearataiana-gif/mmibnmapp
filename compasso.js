/* ============================================================
   MM IBNM — Detector de BPM, compasso e tom (v1.0)
   Ferramentas musicais → 📈 BPM, compasso e tom
   Escolha um áudio (do aparelho ou do app), toque ▶ e o app:
     • toca a música e já analisa (motor Compasso, 100% no aparelho)
     • mostra BPM, compasso (2/4, 3/4, 4/4, 6/8), tom e o pulso
       piscando no tempo, com a forma de onda e as batidas
     • clique opcional junto com a música e "levar para o metrônomo"
   Motor de tempo: compasso-dsp.js (window.DPF)
   Motor de tom:   dsp_core.js / tom-worker.js (o mesmo do "Detectar tom")
============================================================ */
(function(){
'use strict';
const e = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sem = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
const $ = (s,r) => (r||document).querySelector(s);
const aviso = t => { try{ toast(t); }catch(_){ console.log(t); } };
const mmss = t => { t=Math.max(0,t||0); return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0'); };

/* ---------- estado ---------- */
const CP = { buf:null, nome:'', res:null, tom:null, fase:'', prog:0, ctx:null, src:null, gain:null,
             t0:0, off:0, tocando:false, raf:0, clique:false, agIdx:0, ultBeat:-1, mult:1, janela:8, gen:0 };
window.__compasso = CP;

function ctxAudio(){
  if(CP.ctx && CP.ctx.state!=='closed') return CP.ctx;
  const C = window.AudioContext || window.webkitAudioContext; if(!C) return null;
  CP.ctx = new C(); return CP.ctx;
}
const pos = () => CP.tocando && CP.ctx ? Math.min(CP.buf?CP.buf.duration:0, CP.ctx.currentTime - CP.t0) : CP.off;

/* ---------- fontes de áudio do app ---------- */
function audiosDoApp(){
  const l=[];
  ((typeof DB!=='undefined'&&DB.musicas)||[]).forEach(m=>(m.audios||[]).forEach(a=>{ if(a&&a.url) l.push({t:m.titulo, s:a.nome||'Áudio', url:a.url, drive:a.drive||''}); }));
  let H={}; try{ H=JSON.parse(localStorage.getItem('ibnm_haudios')||'{}')||{}; }catch(_){}
  const livros={cc:['Cantor Cristão',()=>window.HINOS||[]],hr:['Harpa Cristã',()=>window.HARPA||[]],hcc:['HCC',()=>typeof window.hccTodos==='function'?window.hccTodos():[]]};
  Object.keys(H).forEach(k=>{ const [lv,n]=k.split(':'); const L=livros[lv]; if(!L) return; let tit='Hino '+n;
    try{ const h=L[1]().find(x=>String(x.n)===String(n)); if(h) tit=n+'. '+h.titulo; }catch(_){}
    (H[k]||[]).forEach(a=>{ if(a&&a.url) l.push({t:tit, s:L[0]+(a.nome?' · '+a.nome:''), url:a.url, drive:a.drive||''}); }); });
  return l;
}
const DRV = u => { const m=String(u||'').match(/(?:drive\.google\.com\/(?:uc\?(?:[^#]*?&)?id=|file\/d\/|open\?id=)|drive\.usercontent\.google\.com\/(?:download|uc)\?(?:[^#]*?&)?id=|googleapis\.com\/drive\/v3\/files\/)([-\w]{20,})/); return m? m[1] : ''; };
async function baixa(url, drive){
  const id = drive || DRV(url); const tent=[];
  if(id){
    try{ if(window.caches){ const c=await caches.open('mmibnm-audios'); const r=await c.match('https://au.ibnm/'+id); if(r) return await r.arrayBuffer(); } }catch(_){}
    let k=''; try{ const v=APP_CFG.drive_api_key; k=String((v&&v.key)||v||'').trim(); }catch(_){}
    if(k) tent.push(()=>fetch('https://www.googleapis.com/drive/v3/files/'+id+'?alt=media&key='+encodeURIComponent(k)));
    let tok=''; try{ if(_gisTok && Date.now()<_gisExp-60000) tok=_gisTok; }catch(_){}
    if(tok) tent.push(()=>fetch('https://www.googleapis.com/drive/v3/files/'+id+'?alt=media',{headers:{Authorization:'Bearer '+tok}}));
    tent.push(()=>fetch('https://drive.usercontent.google.com/download?id='+id+'&export=download'));
  } else tent.push(()=>fetch(url));
  for(const f of tent){ try{ const r=await f(); if(r.ok) return await r.arrayBuffer(); }catch(_){} }
  throw new Error('não consegui baixar este áudio');
}

/* ---------- carregar ---------- */
async function carregar(arrayBuffer, nome){
  paraTudo();
  const gen=++CP.gen;
  Object.assign(CP,{buf:null,nome,res:null,tom:null,off:0,agIdx:0,ultBeat:-1,mult:1,fase:'Abrindo o áudio…',prog:2});
  desenha();
  const c=ctxAudio(); if(!c){ CP.fase='Este navegador não processa áudio.'; desenha(); return; }
  try{ CP.buf = await new Promise((ok,er)=>{ const p=c.decodeAudioData(arrayBuffer.slice(0),ok,er); if(p&&p.then) p.then(ok,er); }); }
  catch(_){ CP.fase='❌ Não consegui abrir este arquivo. Use MP3, M4A, WAV ou OGG.'; CP.prog=0; desenha(); return; }
  if(gen!==CP.gen) return;
  CP.fase='Pronto para tocar — a análise começa agora.'; desenha();
  analisa(gen);
}
async function analisa(gen){
  const b=CP.buf; if(!b) return;
  try{
    if(!window.DPF) throw new Error('motor de BPM não carregou');
    const r = await DPF.analyze(b, st=>{ if(gen!==CP.gen) return; CP.prog=Math.round(st.progress*.85); CP.fase=st.stage; atualizaFase(); }, ()=>gen!==CP.gen);
    if(gen!==CP.gen) return;
    CP.res=r; CP.agIdx=0; CP.ultBeat=-1; CP.fase='Detectando o tom…'; CP.prog=90; desenha();
  }catch(err){ if(gen!==CP.gen || (err&&err.name==='AbortError')) return; CP.fase='❌ Não consegui analisar o ritmo deste áudio.'; desenha(); return; }
  try{ CP.tom = await tomDe(b); }catch(_){ CP.tom=null; }
  if(gen!==CP.gen) return;
  CP.fase=''; CP.prog=100; desenha();
}
let W=null, WID=0; const WP={};
function tomDe(b){
  return new Promise((ok,er)=>{
    if(typeof DSP==='undefined' || typeof Worker==='undefined') return ok(null);
    const n=b.numberOfChannels, len=b.length, mono=new Float32Array(len);
    for(let c=0;c<n;c++){ const d=b.getChannelData(c); for(let i=0;i<len;i++) mono[i]+=d[i]/n; }
    const ds=DSP.downsample(mono,b.sampleRate,22050); const cp=ds.samples.slice();
    if(!W){ W=new Worker('tom-worker.js'); W.onmessage=ev=>{ const d=ev.data||{}; const p=WP[d.id]; if(!p) return; delete WP[d.id]; d.ok? p.ok(d.resultado) : p.er(new Error(d.erro)); }; }
    const id='cp'+(++WID); WP[id]={ok,er}; setTimeout(()=>{ if(WP[id]){ delete WP[id]; ok(null); } },45000);
    W.postMessage({id,cmd:'detectar',samples:cp.buffer,sr:ds.sr},[cp.buffer]);
  });
}

/* ---------- tocar ---------- */
function play(){
  if(!CP.buf) return; const c=ctxAudio(); if(!c) return;
  if(c.state==='suspended') c.resume();
  try{ document.querySelectorAll('audio,video').forEach(a=>{ if(!a.paused) a.pause(); }); }catch(_){}
  if(CP.off>=CP.buf.duration-0.05) CP.off=0;
  const s=c.createBufferSource(); s.buffer=CP.buf;
  if(!CP.gain){ CP.gain=c.createGain(); CP.gain.connect(c.destination); }
  s.connect(CP.gain); s.start(0,CP.off); CP.src=s; CP.t0=c.currentTime-CP.off; CP.tocando=true; CP.agIdx=idxEm(CP.off);
  s.onended=()=>{ if(CP.src!==s) return; if(CP.tocando && pos()>=CP.buf.duration-0.1){ CP.tocando=false; CP.off=0; CP.src=null; botoes(); } };
  cancelAnimationFrame(CP.raf); CP.raf=requestAnimationFrame(loop); botoes();
}
function pausa(){ if(!CP.tocando) return; CP.off=pos(); CP.tocando=false; try{ CP.src.onended=null; CP.src.stop(); }catch(_){} CP.src=null; botoes(); quadro(); }
function paraTudo(){ pausa(); cancelAnimationFrame(CP.raf); }
function vaiPara(t){ const era=CP.tocando; if(era) pausa(); CP.off=Math.max(0,Math.min(t,(CP.buf?CP.buf.duration:0)-0.05)); CP.ultBeat=-1; if(era) play(); else quadro(); }
function beats(){ return CP.res? CP.res.beats : []; }
function idxEm(t){ const b=beats(); let lo=0,hi=b.length; while(lo<hi){ const m=(lo+hi)>>1; if(b[m].time<t) lo=m+1; else hi=m; } return lo; }
function clique(quando, forte){
  const c=CP.ctx; const o=c.createOscillator(), g=c.createGain();
  o.frequency.value=forte?1500:1000; g.gain.setValueAtTime(0.0001,quando); g.gain.exponentialRampToValueAtTime(forte?0.5:0.3,quando+0.002); g.gain.exponentialRampToValueAtTime(0.0001,quando+0.05);
  o.connect(g); g.connect(c.destination); o.start(quando); o.stop(quando+0.06);
}
function loop(){
  if(!CP.tocando){ quadro(); return; }
  const p=pos(), b=beats();
  if(CP.clique && b.length){ while(CP.agIdx<b.length && b[CP.agIdx].time < p+0.2){ const bt=b[CP.agIdx]; if(bt.time>=p-0.02) clique(CP.t0+bt.time, bt.isDownbeat); CP.agIdx++; } }
  else CP.agIdx=idxEm(p);
  quadro();
  if(!$('.cps-bg')){ pausa(); return; }
  CP.raf=requestAnimationFrame(loop);
}

/* ---------- desenho ---------- */
function quadro(){
  const bg=$('.cps-bg'); if(!bg) return;
  const p=pos(), b=beats(), dur=CP.buf?CP.buf.duration:0;
  const tm=$('#cpsTempo',bg); if(tm) tm.textContent=mmss(p)+' / '+mmss(dur);
  /* pulso: qual batida está soando agora */
  const i=idxEm(p+0.03)-1;
  if(i!==CP.ultBeat){
    CP.ultBeat=i; const bt=b[i];
    if(bt && CP.tocando && p-bt.time<0.25){
      const pl=$('#cpsPulso',bg); if(pl){ pl.classList.remove('bate','forte'); void pl.offsetWidth; pl.classList.add('bate'); if(bt.isDownbeat) pl.classList.add('forte'); }
      bg.querySelectorAll('.cps-tempos i').forEach((d,k)=>d.classList.toggle('on',k===(bt.beatInMeasure||1)-1));
      const cm=$('#cpsCompN',bg); if(cm) cm.textContent=bt.measure? 'compasso '+bt.measure : 'anacruse';
    }
  }
  onda(bg,p);
}
function onda(bg,p){
  const cv=$('#cpsOnda',bg); if(!cv||!CP.buf) return;
  const dpr=Math.min(2,window.devicePixelRatio||1), w=cv.clientWidth||300, h=cv.clientHeight||110;
  if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){ cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr); }
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,w,h);
  const J=CP.janela, ini=p-J*0.35, px=t=>(t-ini)/J*w, mid=h/2;
  const css=getComputedStyle(document.documentElement); const dour=(css.getPropertyValue('--dourado')||'#d4a017').trim()||'#d4a017';
  /* onda */
  const pk=CP.res&&CP.res.peaks; g.fillStyle='rgba(30,122,82,.35)';
  if(pk){ const bs=pk.bucketSec; const a=Math.max(0,Math.floor(ini/bs)), z=Math.min(pk.max.length,Math.ceil((ini+J)/bs));
    let mx=0; for(let k=0;k<pk.max.length;k+=50) mx=Math.max(mx,pk.max[k],-pk.min[k]); mx=mx||1;
    const passo=Math.max(1,Math.floor((z-a)/w));
    for(let k=a;k<z;k+=passo){ const x=px(k*bs); const hi=Math.min(1,pk.max[k]/mx)*mid*0.92, lo=Math.min(1,-pk.min[k]/mx)*mid*0.92; g.fillRect(x,mid-hi,Math.max(1,w/((z-a)/passo)),hi+lo||1); } }
  else { g.fillRect(0,mid-1,w,2); }
  /* batidas */
  const b=beats(); for(let k=idxEm(ini);k<b.length && b[k].time<ini+J;k++){ const x=px(b[k].time);
    g.fillStyle=b[k].isDownbeat? dour : 'rgba(11,61,46,.45)'; g.fillRect(x-(b[k].isDownbeat?1.5:0.5),0,b[k].isDownbeat?3:1,h);
    if(b[k].isDownbeat && b[k].measure){ g.fillStyle=dour; g.font='bold 10px system-ui,sans-serif'; g.fillText(String(b[k].measure),x+4,11); } }
  /* agulha */
  const xa=px(p); g.fillStyle='#c0392b'; g.fillRect(xa-1,0,2,h); g.beginPath(); g.moveTo(xa-5,0); g.lineTo(xa+5,0); g.lineTo(xa,6); g.fill();
}
function bpmMostrado(){ return CP.res? Math.round(CP.res.bpm*CP.mult*10)/10 : 0; }
function atualizaFase(){ const f=$('#cpsFase'); if(f) f.textContent=CP.fase||''; const b=$('#cpsBarra'); if(b) b.style.width=(CP.prog||0)+'%'; }
function botoes(){ const b=$('#cpsPlay'); if(b) b.innerHTML=CP.tocando?'⏸ Pausar':'▶ Tocar'; const c=$('#cpsClique'); if(c){ c.classList.toggle('on',CP.clique); c.textContent=CP.clique?'🔔 Clique ligado':'🔕 Clique'; } }

function fontesHTML(){
  return '<div class="cps-fontes"><button class="cps-f" onclick="cpsArquivo()"><b>📁</b><span>Do aparelho<small>MP3, M4A, WAV…</small></span></button>'+
    '<button class="cps-f" onclick="cpsDoApp()"><b>🎵</b><span>Áudio do app<small>músicas e hinos</small></span></button></div>'+
    '<input type="file" id="cpsArq" hidden accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.flac" onchange="cpsArquivoEscolhido(this)">'+
    '<div id="cpsLista"></div>';
}
function painelHTML(){
  const r=CP.res, sig=r? r.timeSignature : null, n=r? r.beatsPerMeasure : 4;
  const tom=CP.tom? (CP.tom.nome&&CP.tom.nome.pt)||'' : '';
  const conf=r? r.confidence : 0;
  return '<div class="cps-nome"><span>🎧 '+e(CP.nome)+'</span><button onclick="cpsTrocar()">Trocar</button></div>'+
    '<div class="cps-painel">'+
      '<div class="cps-bpm"><div class="cps-pulso" id="cpsPulso"></div><div><div class="n">'+(r? String(bpmMostrado()).replace('.',',') : '…')+'</div><div class="l">BPM</div></div>'+
        (r?'<div class="cps-mult"><button onclick="cpsMult(.5)" '+(CP.mult===.5?'class="on"':'')+'>½</button><button onclick="cpsMult(1)" '+(CP.mult===1?'class="on"':'')+'>1×</button><button onclick="cpsMult(2)" '+(CP.mult===2?'class="on"':'')+'>2×</button></div>':'')+'</div>'+
      '<div class="cps-cards">'+
        '<div><small>Compasso</small><b>'+(sig?e(sig.label):'…')+'</b><i>'+(sig?e(sig.sub.split(' · ')[0]):'')+'</i></div>'+
        '<div><small>Tom</small><b>'+(CP.tom&&CP.tom.nome?e(CP.tom.nome.letra):(r&&CP.prog>=100?'—':'…'))+'</b><i>'+(tom?e(tom)+(CP.tom.confianca!=null?' · '+CP.tom.confianca+'%':''):'')+'</i></div>'+
        '<div><small>Certeza do ritmo</small><b>'+(r?conf+'%':'…')+'</b><i>'+(r?(conf>=80?'alta':conf>=55?'média':'baixa — confira'):'')+'</i></div>'+
      '</div>'+
      '<div class="cps-tempos">'+Array.from({length:n},(_,k)=>'<i class="'+(k===0?'ac':'')+'">'+(k+1)+'</i>').join('')+'<span id="cpsCompN"></span></div>'+
    '</div>'+
    '<canvas id="cpsOnda" class="cps-onda" aria-label="Forma de onda com as batidas — toque para pular"></canvas>'+
    '<div class="cps-tl"><span id="cpsTempo">0:00 / '+mmss(CP.buf?CP.buf.duration:0)+'</span><span class="cps-zoom"><button onclick="cpsZoom(1.5)" aria-label="Afastar">−</button><button onclick="cpsZoom(1/1.5)" aria-label="Aproximar">+</button></span></div>'+
    (CP.fase?'<div class="cps-prog"><div id="cpsBarra" style="width:'+(CP.prog||0)+'%"></div></div><div class="cps-fase" id="cpsFase">'+e(CP.fase)+'</div>':'')+
    '<div class="cps-ctl"><button onclick="cpsVolta()" aria-label="Voltar ao início">⏮</button><button class="play" id="cpsPlay" onclick="cpsPlay()">▶ Tocar</button><button id="cpsClique" onclick="cpsClique()" '+(r?'':'disabled')+'>🔕 Clique</button></div>'+
    (r?'<button class="cps-metro" onclick="cpsMetro()">🥁 Levar '+Math.round(bpmMostrado())+' BPM · '+e(sig.label)+' para o metrônomo</button>':'');
}
function desenha(){
  const bg=$('.cps-bg'); if(!bg) return;
  const corpo=$('#cpsCorpo',bg); if(!corpo) return;
  corpo.innerHTML = CP.buf? painelHTML() : (CP.fase? '<div class="cps-nome"><span>🎧 '+e(CP.nome)+'</span></div><div class="cps-prog"><div id="cpsBarra" style="width:'+(CP.prog||0)+'%"></div></div><div class="cps-fase" id="cpsFase">'+e(CP.fase)+'</div>'+(/❌/.test(CP.fase)?fontesHTML():'') : fontesHTML());
  const cv=$('#cpsOnda',bg);
  if(cv){ cv.onclick=ev=>{ const r=cv.getBoundingClientRect(); const J=CP.janela, ini=pos()-J*0.35; vaiPara(ini+(ev.clientX-r.left)/r.width*J); }; }
  CP.ultBeat=-1; botoes(); quadro();
}

/* ---------- ações ---------- */
window.cpsArquivo=()=>{ const i=$('#cpsArq'); if(i) i.click(); };
window.cpsArquivoEscolhido=async inp=>{ const f=inp.files&&inp.files[0]; inp.value=''; if(!f) return;
  try{ await carregar(await f.arrayBuffer(), f.name.replace(/\.[^.]+$/,'')); }catch(_){ aviso('Não consegui ler o arquivo.'); } };
window.cpsDoApp=()=>{
  const box=$('#cpsLista'); if(!box) return;
  const L=audiosDoApp(); window.__cpsL=L;
  if(!L.length){ box.innerHTML='<p class="cps-vazio">Ainda não há áudios salvos no app. Use “Do aparelho”.</p>'; return; }
  box.innerHTML='<input id="cpsBusca" placeholder="🔍 Buscar música ou hino…" oninput="cpsFiltra()" autocomplete="off"><div class="cps-res" id="cpsRes"></div>';
  cpsFiltra(); setTimeout(()=>{ const i=$('#cpsBusca'); if(i) i.focus(); },50);
};
window.cpsFiltra=()=>{ const q=sem(($('#cpsBusca')||{}).value), L=window.__cpsL||[], r=$('#cpsRes'); if(!r) return;
  const t=q.split(/\s+/).filter(Boolean); const f=L.map((a,i)=>[a,i]).filter(([a])=>t.every(x=>sem(a.t+' '+a.s).includes(x))).slice(0,40);
  r.innerHTML=f.length? f.map(([a,i])=>'<button onclick="cpsUsa('+i+')"><b>'+e(a.t)+'</b><small>'+e(a.s)+'</small></button>').join('') : '<p class="cps-vazio">Nada encontrado.</p>'; };
window.cpsUsa=async i=>{ const a=(window.__cpsL||[])[i]; if(!a) return;
  paraTudo(); const gen=++CP.gen; Object.assign(CP,{buf:null,res:null,tom:null,nome:a.t+' — '+a.s,fase:'Baixando o áudio…',prog:1}); desenha();
  try{ const ab=await baixa(a.url,a.drive); if(gen!==CP.gen) return; await carregar(ab, a.t+' — '+a.s); }
  catch(_){ if(gen!==CP.gen) return; CP.fase='❌ Não consegui baixar este áudio agora (sem internet ou arquivo privado no Drive). Tente “Do aparelho”.'; CP.prog=0; desenha(); } };
window.cpsTrocar=()=>{ paraTudo(); CP.gen++; Object.assign(CP,{buf:null,res:null,tom:null,fase:'',prog:0,nome:''}); desenha(); };
window.cpsPlay=()=>{ CP.tocando? pausa() : play(); };
window.cpsVolta=()=>vaiPara(0);
window.cpsClique=()=>{ CP.clique=!CP.clique; CP.agIdx=idxEm(pos()); try{ localStorage.setItem('ibnm_cps_clique',CP.clique?'1':''); }catch(_){} botoes(); };
window.cpsMult=m=>{ CP.mult=m; const t=CP.tocando; desenha(); if(t) botoes(); };
window.cpsZoom=f=>{ CP.janela=Math.max(2,Math.min(40,CP.janela*f)); quadro(); };
window.cpsMetro=()=>{ if(!CP.res) return; const bpm=Math.max(30,Math.min(250,Math.round(bpmMostrado()))), comp=CP.res.beatsPerMeasure||4;
  pausa(); fechar();
  if(typeof window.__metroDefinir==='function') window.__metroDefinir(bpm,comp); else { try{ localStorage.setItem('ibnm_bpm',bpm); localStorage.setItem('ibnm_comp',comp); }catch(_){} }
  if(typeof window.abrirFerramentas==='function') abrirFerramentas('metro');
  aviso('Metrônomo em '+bpm+' BPM · '+(CP.res.timeSignature?CP.res.timeSignature.label:comp+'/4')+'. Toque ▶ Tocar.'); };

/* ---------- janela ---------- */
function fechar(){ paraTudo(); document.querySelectorAll('.cps-bg').forEach(b=>b.remove()); }
window.abrirCompasso=function(fonte){
  try{ document.querySelectorAll('.cc-sheet-bg.ferr-bg').forEach(b=>{ const x=b.querySelector('#ferrX'); if(x) x.click(); else b.remove(); }); }catch(_){}
  document.querySelectorAll('.cps-bg').forEach(b=>b.remove());
  try{ CP.clique=localStorage.getItem('ibnm_cps_clique')==='1'; }catch(_){}
  const bg=document.createElement('div'); bg.className='cc-sheet-bg cps-bg';
  bg.innerHTML='<div class="cc-sheet ferr cps" role="dialog" aria-modal="true" aria-label="BPM, compasso e tom">'+
    '<h3>🎛 Ferramentas do músico</h3>'+
    '<div class="tabs"><button data-a="metro">Metrônomo</button><button data-a="afin">Afinador</button><button class="on">BPM / Tom</button></div>'+
    '<p class="cps-intro">Escolha uma música e toque <b>▶</b>: o app toca e já mostra o <b>BPM</b>, o <b>compasso</b>, o <b>tom</b> e o <b>pulso</b> no tempo.</p>'+
    '<div id="cpsCorpo"></div>'+
    '<div class="row"><button class="pri" id="cpsX">Fechar</button></div></div>';
  document.body.appendChild(bg);
  bg.addEventListener('click',ev=>{ if(ev.target===bg) fechar(); });
  $('#cpsX',bg).onclick=fechar;
  bg.querySelectorAll('.tabs button[data-a]').forEach(b=>b.onclick=()=>{ fechar(); if(window.abrirFerramentas) abrirFerramentas(b.dataset.a); });
  const obs=new MutationObserver(()=>{ if(!bg.isConnected){ pausa(); obs.disconnect(); } }); obs.observe(document.body,{childList:true});
  desenha();
  if(fonte && fonte.url){ window.__cpsL=[{t:fonte.titulo||'Áudio',s:fonte.nome||'',url:fonte.url,drive:fonte.drive||''}]; cpsUsa(0); }
};

/* ---------- aba "BPM / Tom" na janela das ferramentas ---------- */
if(typeof window.abrirFerramentas==='function' && !window.abrirFerramentas.__cps){
  const orig=window.abrirFerramentas;
  const nova=function(){ const r=orig.apply(this,arguments);
    try{ const t=document.querySelector('.cc-sheet-bg.ferr-bg:not(.cps-bg) .tabs'); if(t && !t.querySelector('.cps-tab')){ const b=document.createElement('button'); b.className='cps-tab'; b.textContent='BPM / Tom'; b.onclick=()=>abrirCompasso(); t.appendChild(b); } }catch(_){}
    return r; };
  nova.__cps=true; window.abrirFerramentas=nova;
}

/* ---------- menu: Ferramentas musicais → BPM, compasso e tom ---------- */
(function menu(){
  try{
    if(typeof ROTAS!=='undefined') ROTAS.compasso=function(){ setTimeout(()=>abrirCompasso(),30); return ROTAS.inicio(); };
    if(typeof MENU==='undefined'||!Array.isArray(MENU)) return;
    const f=MENU.find(m=>m.id==='ferramentas'&&Array.isArray(m.sub)); if(!f || f.sub.some(s=>s.id==='compasso')) return;
    const k=f.sub.findIndex(s=>s.arg==='afin'); f.sub.splice(k>=0?k+1:f.sub.length,0,{id:'compasso',ic:'📈',nm:'BPM, compasso e tom'});
    if(typeof _booted!=='undefined' && _booted && typeof montaMenu==='function') montaMenu();
  }catch(_){}
})();

/* ---------- botão nos áudios por voz (ADM) ---------- */
window.cpsDoAudio=function(url,drive,titulo,nome){ abrirCompasso({url,drive,titulo,nome}); };

const st=document.createElement('style'); st.textContent=`
.cps .tabs button.on{background:var(--verde-med);color:#fff}
.ferr .tabs .cps-tab{flex:1}
.cps-intro{font-size:12.5px;color:#667;margin:0 0 10px;line-height:1.5}
.cps-fontes{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cps-f{display:flex;align-items:center;gap:10px;text-align:left;border:1px solid var(--verde-med);background:#f3faf5;border-radius:14px;padding:14px 12px;color:var(--verde-escuro);cursor:pointer;min-height:64px}
.cps-f b{font-size:24px}
.cps-f span{display:flex;flex-direction:column;font-weight:800;font-size:14px}
.cps-f small{font-weight:600;font-size:11.5px;color:#6b8378}
#cpsLista input{width:100%;box-sizing:border-box;height:42px;border:1px solid #cfdad4;border-radius:10px;padding:0 12px;font-size:14px;margin:10px 0 6px}
.cps-res{display:flex;flex-direction:column;gap:4px;max-height:38vh;overflow:auto}
.cps-res button{display:flex;flex-direction:column;align-items:flex-start;text-align:left;border:1px solid #dfe7e3;background:#fff;border-radius:10px;padding:8px 10px;cursor:pointer}
.cps-res b{font-size:14px;color:var(--verde-escuro)}
.cps-res small{font-size:11.5px;color:#6b8378}
.cps-vazio{font-size:12.5px;color:#899;text-align:center;margin:10px 0}
.cps-nome{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px;font-weight:700;color:var(--verde-escuro)}
.cps-nome span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cps-nome button{border:1px solid #c9ced6;background:#f4f6f7;border-radius:8px;padding:5px 10px;font-weight:800;font-size:12px;color:var(--verde-escuro)}
.cps-painel{background:linear-gradient(160deg,var(--verde-escuro),var(--verde-med));border-radius:16px;padding:14px;color:#fff}
.cps-bpm{display:flex;align-items:center;gap:14px}
.cps-bpm .n{font-size:50px;font-weight:900;line-height:1;font-variant-numeric:tabular-nums}
.cps-bpm .l{font-size:11px;font-weight:800;letter-spacing:2px;opacity:.75}
.cps-pulso{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.35);flex:none}
.cps-pulso.bate{animation:cpsBate .28s ease-out}
.cps-pulso.bate.forte{animation:cpsForte .34s ease-out}
@keyframes cpsBate{0%{background:#fff;transform:scale(1.18)}100%{background:rgba(255,255,255,.15);transform:scale(1)}}
@keyframes cpsForte{0%{background:var(--dourado);border-color:var(--dourado);transform:scale(1.3);box-shadow:0 0 0 8px rgba(241,196,15,.3)}100%{background:rgba(255,255,255,.15);transform:scale(1)}}
.cps-mult{margin-left:auto;display:flex;gap:4px}
.cps-mult button{border:1px solid rgba(255,255,255,.4);background:transparent;color:#fff;border-radius:8px;min-width:36px;height:32px;font-weight:800}
.cps-mult button.on{background:var(--dourado);border-color:var(--dourado);color:#3a2f00}
.cps-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:12px}
.cps-cards div{background:rgba(255,255,255,.12);border-radius:12px;padding:8px;display:flex;flex-direction:column;min-width:0}
.cps-cards small{font-size:10.5px;font-weight:800;opacity:.75;text-transform:uppercase;letter-spacing:.5px}
.cps-cards b{font-size:19px;font-weight:900;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cps-cards i{font-style:normal;font-size:10.5px;opacity:.75;min-height:1.2em;line-height:1.3}
.cps-tempos{display:flex;align-items:center;gap:8px;margin-top:12px}
.cps-tempos i{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:900;font-size:13px;transition:background .06s,transform .06s}
.cps-tempos i.on{background:#fff;color:var(--verde-escuro);transform:scale(1.12)}
.cps-tempos i.ac.on{background:var(--dourado);color:#3a2f00}
.cps-tempos span{margin-left:auto;font-size:11px;opacity:.75}
.cps-onda{display:block;width:100%;height:110px;margin-top:10px;background:#f6f8f7;border:1px solid #e3ece7;border-radius:12px;cursor:pointer;touch-action:manipulation}
.cps-tl{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#667;margin-top:4px;font-variant-numeric:tabular-nums}
.cps-zoom{display:flex;gap:4px}
.cps-zoom button{border:1px solid #c9ced6;background:#f4f6f7;border-radius:8px;width:32px;height:28px;font-weight:900;color:var(--verde-escuro)}
.cps-prog{height:6px;background:#e3ece7;border-radius:4px;overflow:hidden;margin-top:10px}
.cps-prog div{height:100%;background:var(--verde-med);transition:width .2s}
.cps-fase{font-size:12px;color:#667;margin-top:4px;text-align:center}
.cps-ctl{display:flex;gap:6px;margin-top:10px}
.cps-ctl button{border:1px solid #c9ced6;background:#f4f6f7;border-radius:12px;height:48px;font-weight:800;font-size:14px;color:var(--verde-escuro);padding:0 12px}
.cps-ctl button.play{flex:1;background:var(--dourado);border-color:var(--dourado-esc,#b8860b);color:#3a2f00;font-size:16px}
.cps-ctl button.on{background:var(--verde-med);border-color:var(--verde-med);color:#fff}
.cps-ctl button:disabled{opacity:.45}
.cps-metro{width:100%;margin-top:8px;height:44px;border-radius:12px;border:1px solid var(--verde-med);background:#f3faf5;color:var(--verde-escuro);font-weight:800;font-size:13.5px}
.vz-bpm{display:block;width:100%;margin:0 0 8px;border:1px dashed var(--verde-med);background:#f3faf5;border-radius:10px;height:38px;padding:0 10px;font-weight:800;font-size:13px;color:var(--verde-escuro)}
`; document.head.appendChild(st);
})();
