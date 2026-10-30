/* ============================================================
   MM IBNM — recursos para o culto (v0.4.0)
   1) Setlist do culto: músicas + hinos, em ordem, com
      "◀ Anterior | 2 de 6 | Próxima ▶"
   2) Tom do culto: o ADM define o tom de cada item; todos
      abrem já transpostos (cada um ainda pode mudar só para si)
   3) Modo projetor: letra grande, sem acordes, por estrofe
   4) Metrônomo e afinador
   5) Modo escuro (claro / escuro / automático)
============================================================ */
(function(){
'use strict';
const H = () => window.HINOS||[];
const hino = n => H().find(x=>x.n===+n);
const e = s => String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const adm = () => { try{ return !!ehAdmin(); }catch(_){ return false; } };

/* ---------------- estilos ---------------- */
const css=`
.sl-nav{display:flex;align-items:stretch;gap:6px;margin:0 0 12px}
.sl-nav button{border:1px solid var(--verde-med);background:#fff;color:var(--verde-escuro);font-weight:800;font-size:13px;border-radius:10px;padding:8px 10px;min-height:42px;cursor:pointer;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sl-nav button:disabled{opacity:.35;cursor:default}
.sl-nav .mid{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 6px;font-size:11px;color:#789;font-weight:700;line-height:1.25;text-align:center}
.sl-nav .mid b{font-size:15px;color:var(--verde-escuro)}
.sl-acts{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
.sl-acts button{border:1px solid #c9ced6;background:#fff;color:var(--verde-escuro);font-weight:700;font-size:13px;border-radius:10px;height:38px;padding:0 12px;cursor:pointer}
.sl-acts button.gold{border-color:var(--dourado-esc);background:#fffbea}
.tom-culto{display:inline-block;background:var(--dourado);color:#3a2f00;font-size:10.5px;font-weight:800;border-radius:10px;padding:1px 7px;margin-left:6px;vertical-align:middle}
.sl-item .s-ic{font-size:15px;font-weight:900}
.sl-item .ord{font-size:11px;color:#789;font-weight:800;min-width:16px;text-align:center}
.sl-tom{font-size:11px;font-weight:800;color:#8a6a00;background:#fffbea;border:1px solid #efe1a5;border-radius:8px;padding:2px 7px;flex:none}
.pl-ed{border:1px solid #dde;border-radius:10px;padding:6px;max-height:260px;overflow:auto}
.pl-ed .it{display:flex;align-items:center;gap:6px;padding:6px 4px;border-bottom:1px solid #eef1ef;font-size:13.5px;color:var(--verde-escuro)}
.pl-ed .it:last-child{border:0}
.pl-ed .it .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.pl-ed .it button{border:1px solid #c9ced6;background:#fff;border-radius:7px;min-width:30px;height:30px;font-weight:800;color:var(--verde-escuro)}
.pl-ed .it .st{font-size:12px;font-weight:800;min-width:34px;text-align:center;color:#8a6a00}
.pl-add{display:flex;gap:6px;margin-top:8px}
.pl-add select,.pl-add input{flex:1;min-width:0;padding:9px 10px;border:1px solid #ccd;border-radius:8px;font-size:14px}
.pl-add button{border:0;background:var(--verde-med);color:#fff;font-weight:800;border-radius:8px;padding:0 12px}
/* projetor */
.proj{position:fixed;inset:0;z-index:12000;background:#05110d;color:#f4f1e8;display:flex;flex-direction:column;user-select:none;-webkit-user-select:none}
.proj .bar{display:flex;align-items:center;gap:8px;padding:calc(10px + env(safe-area-inset-top,0px)) 12px 6px;font-family:'Segoe UI',system-ui,sans-serif;font-size:13px;color:#9fb8ad}
.proj .bar .tt{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.proj .bar button{border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff;border-radius:9px;height:36px;min-width:40px;font-size:15px;font-weight:700;padding:0 10px}
.proj .tela{flex:1;display:flex;align-items:center;justify-content:center;padding:4vh 6vw;text-align:center;overflow:hidden}
.proj .txt{white-space:pre-line;line-height:1.3;font-family:'Trebuchet MS','Segoe UI',system-ui,sans-serif;font-weight:700}
.proj .txt .rot{display:block;font-size:.42em;color:#f1c40f;letter-spacing:.08em;margin-bottom:.5em;font-weight:800}
.proj .txt.capa{color:#f1c40f}
.proj .rod{display:flex;justify-content:space-between;align-items:center;padding:6px 14px calc(12px + env(safe-area-inset-bottom,0px));font-family:'Segoe UI',system-ui,sans-serif;color:#7d968b;font-size:13px}
.proj .dots{display:flex;gap:5px;flex-wrap:wrap;justify-content:center;flex:1}
.proj .dots i{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.22)}
.proj .dots i.on{background:#f1c40f}
/* ferramentas */
.ferr .big{font-size:54px;font-weight:900;text-align:center;color:var(--verde-escuro);line-height:1;margin:6px 0 2px;font-variant-numeric:tabular-nums}
.ferr .sub{text-align:center;font-size:12px;color:#789;margin-bottom:10px}
.ferr .linha{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:8px 0}
.ferr .linha button{border:1px solid #c9ced6;background:#f4f6f7;border-radius:10px;min-width:48px;height:42px;font-weight:800;font-size:15px;color:var(--verde-escuro);padding:0 12px}
.ferr .linha button.on{background:var(--verde-med);border-color:var(--verde-med);color:#fff}
.ferr .linha button.play{background:var(--dourado);border-color:var(--dourado-esc);color:#3a2f00;min-width:120px}
.ferr input[type=range]{width:100%;accent-color:var(--verde-med)}
.ferr .beats{display:flex;justify-content:center;gap:10px;margin:10px 0}
.ferr .beats i{width:18px;height:18px;border-radius:50%;background:#dfe6e2;transition:background .05s}
.ferr .beats i.on{background:var(--verde-med)}
.ferr .beats i.on.ac{background:var(--dourado)}
.ferr .tabs{display:flex;gap:6px;margin-bottom:10px}
.ferr .tabs button{flex:1;height:40px;border-radius:10px;border:1px solid var(--verde-med);background:#fff;color:var(--verde-escuro);font-weight:800}
.ferr .tabs button.on{background:var(--verde-med);color:#fff}
.afin .nota{font-size:64px;font-weight:900;text-align:center;color:var(--verde-escuro);line-height:1;margin-top:6px}
.afin .nota small{font-size:22px;color:#789}
.afin .med{position:relative;height:46px;margin:14px 6px 6px;border-radius:10px;background:linear-gradient(90deg,#f6d6d1,#fff5d6 40%,#d9f2e4 50%,#fff5d6 60%,#f6d6d1)}
.afin .med .c{position:absolute;left:50%;top:-4px;bottom:-4px;width:2px;background:var(--verde-escuro)}
.afin .med .p{position:absolute;top:4px;bottom:4px;width:6px;margin-left:-3px;border-radius:3px;background:#c0392b;left:50%;transition:left .08s}
.afin .med .p.ok{background:var(--verde-med)}
.afin .info{text-align:center;font-size:13px;color:#667;min-height:1.4em}
.metro-pill{position:fixed;right:12px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:9998;display:flex;align-items:center;gap:6px;background:var(--verde-escuro);color:#fff;border-radius:999px;padding:6px 6px 6px 12px;box-shadow:0 6px 18px rgba(0,0,0,.3);font-weight:800;font-size:14px}
.metro-pill .lt{width:10px;height:10px;border-radius:50%;background:#2a4}
.metro-pill .lt.on{background:#f1c40f}
.metro-pill button{border:0;background:rgba(255,255,255,.14);color:#fff;border-radius:999px;height:32px;min-width:32px;font-weight:800}
/* tema */
.tema-opts{display:flex;gap:6px}
.tema-opts button{flex:1;height:40px;border-radius:10px;border:1px solid var(--verde-med);background:#fff;color:var(--verde-escuro);font-weight:700;font-size:13px}
.tema-opts button.on{background:var(--verde-med);color:#fff}
/* modo escuro: inverte a área de conteúdo e as janelas, mantendo fotos/vídeos com as cores reais */
html.escuro body,html.escuro .app-shell{background:#0e1613}
html.escuro .content,html.escuro .modal,html.escuro .cc-sheet{filter:invert(.92) hue-rotate(180deg)}
html.escuro .content img:not(.cc-intro img),html.escuro .content iframe,html.escuro .content video,html.escuro .modal img,html.escuro .content .s-ic,html.escuro .cc-sheet img{filter:invert(1) hue-rotate(180deg)}
html.escuro .cc-intro img{opacity:.92}
html.escuro .watermark{opacity:.04}
`;
const st=document.createElement('style'); st.id='ibnmCulto'; st.textContent=css; document.head.appendChild(st);

/* ================= 5) TEMA ================= */
const TEMA_KEY='ibnm_tema';
function temaAtual(){ return localStorage.getItem(TEMA_KEY)||'claro'; }
const mq=window.matchMedia?matchMedia('(prefers-color-scheme: dark)'):null;
function aplicarTema(){
  const t=temaAtual(); const escuro = t==='escuro' || (t==='auto' && mq && mq.matches);
  document.documentElement.classList.toggle('escuro',escuro);
  const m=document.querySelector('meta[name=theme-color]'); if(m) m.setAttribute('content', escuro?'#07241b':'#0b3d2e');
}
window.definirTema=function(t){ localStorage.setItem(TEMA_KEY,t); aplicarTema(); if(typeof go==='function' && document.querySelector('.tema-opts')) go('perfil'); };
if(mq && mq.addEventListener) mq.addEventListener('change',aplicarTema);
aplicarTema();
function cardTema(){
  const t=temaAtual(); const b=(v,l)=>'<button class="'+(t===v?'on':'')+'" onclick="definirTema(\''+v+'\')">'+l+'</button>';
  return '<div class="card"><h3>🌙 Aparência</h3><p style="font-size:12.5px;color:#556;margin-bottom:8px">O modo escuro cansa menos a vista em cultos à noite e no palco.</p><div class="tema-opts">'+b('claro','☀️ Claro')+b('escuro','🌙 Escuro')+b('auto','📱 Do celular')+'</div></div>';
}
if(typeof ROTAS!=='undefined' && ROTAS.perfil){
  const _p=ROTAS.perfil;
  ROTAS.perfil=function(){ const html=_p.apply(this,arguments); const i=html.lastIndexOf('</div>'); return i>=0? html.slice(0,i)+cardTema()+html.slice(i) : html+cardTema(); };
}

/* ================= 1) SETLIST DO CULTO ================= */
function setlist(){
  const pl=(typeof DB!=='undefined'&&DB.playlist)||{};
  const s=(typeof APP_CFG!=='undefined'&&APP_CFG.setlist)||null;
  if(s && Array.isArray(s.itens) && s.itens.length && (!pl.inicio || String(s.inicio).slice(0,10)===String(pl.inicio).slice(0,10)))
    return {inicio:s.inicio,fim:s.fim,itens:s.itens.filter(existe),tons:s.tons||{}};
  if(pl.publicada && pl.musicas && pl.musicas.length) return {inicio:pl.inicio,fim:pl.fim,itens:pl.musicas.filter(existe),tons:{}};
  return null;
}
function existe(id){ id=String(id); if(id.indexOf('cc:')===0) return !!hino(id.slice(3)); return !!(DB.musicas||[]).find(m=>m.id===id); }
function info(id){
  id=String(id);
  if(id.indexOf('cc:')===0){ const h=hino(id.slice(3)); return {hino:true,ic:'📖',t:h?h.n+' · '+h.titulo:'Hino '+id.slice(3),s:'Cantor Cristão'+(h&&h.ritmo?' · '+h.ritmo:''),tom:h?h.tom:''}; }
  const m=(DB.musicas||[]).find(x=>x.id===id)||{}; return {hino:false,ic:'🎵',t:m.titulo||'(música removida)',s:m.artista||'',tom:''};
}
window.abrirItem=function(id){ id=String(id); if(id.indexOf('cc:')===0){ if(window.cantorAbrir) cantorAbrir(+id.slice(3)); } else abrirMusica(id,'cifra'); };
function rotuloSemitom(v){ return v? (v>0?'+':'')+v : ''; }
function linhaItem(id,i,sl){
  const f=info(id); const v=(sl.tons||{})[id]||0;
  let tom='';
  if(v && f.hino && window.Cantor){ try{ const h=hino(id.slice(3)); tom='Tom '+Cantor.keyInfo(h,v).key; }catch(_){} }
  else if(v) tom='Tom '+rotuloSemitom(v);
  return '<div class="song-row sl-item" onclick="abrirItem(\''+id+'\')"><span class="ord">'+(i+1)+'</span><div class="s-ic">'+f.ic+'</div><div style="flex:1;min-width:0"><div class="s-nm">'+e(f.t)+'</div><div class="s-ar">'+e(f.s)+'</div></div>'+(tom?'<span class="sl-tom">'+e(tom)+'</span>':'')+'</div>';
}
function cardSetlist(sl,titulo){
  return '<div class="card"><h3>'+titulo+'</h3>'+sl.itens.map((id,i)=>linhaItem(id,i,sl)).join('')+
    '<div class="sl-acts" style="margin:10px 0 0"><button class="gold" onclick="abrirItem(\''+sl.itens[0]+'\')">▶ Começar pelo 1º</button><button onclick="projetarSetlist()">📺 Projetar tudo</button></div></div>';
}
if(typeof ROTAS!=='undefined'){
  ROTAS.playlist=function(){
    const sl=setlist(); const a=adm();
    const topo='<div class="page-ttl">📅 Playlist da Semana</div>'+(a?'<button class="mini-btn" style="margin-bottom:14px" onclick="modalPlaylist()">✏️ Montar / editar playlist</button>':'');
    if(!sl||!sl.itens.length) return '<div class="page">'+topo+'<div class="empty"><div class="big">🎼</div>Nenhuma playlist publicada ainda.</div></div>';
    return '<div class="page">'+topo+'<div class="semana-badge"><div class="lbl">PLAYLIST DA SEMANA</div><div class="dt">'+fmtData(sl.inicio)+' - '+fmtData(sl.fim)+'</div></div>'+cardSetlist(sl,'Ordem do culto ('+sl.itens.length+')')+'</div>';
  };
  if(ROTAS.inicio){
    const _ini=ROTAS.inicio;
    ROTAS.inicio=function(){
      let html=_ini.apply(this,arguments); const sl=setlist();
      const k=html.indexOf('<div class="card"><h3>Músicas da playlist</h3>');
      if(k>=0){ const fim=html.lastIndexOf('</div>'); html=html.slice(0,k)+(sl?cardSetlist(sl,'Ordem do culto'):'')+html.slice(fim); }
      else if(sl){ const fim=html.lastIndexOf('</div>'); html=html.slice(0,fim)+cardSetlist(sl,'Ordem do culto')+html.slice(fim); }
      return html;
    };
  }
}

/* ---- editor da playlist (ADM): músicas + hinos, ordem e tom ---- */
let _ed=null;
window.modalPlaylist=function(){
  const sl=setlist()||{inicio:'',fim:'',itens:[],tons:{}};
  const pl=DB.playlist||{};
  _ed={inicio:(sl.inicio||pl.inicio||'').slice(0,10),fim:(sl.fim||pl.fim||'').slice(0,10),itens:sl.itens.slice(),tons:Object.assign({},sl.tons)};
  desenharEditor();
};
function desenharEditor(){
  const ops=(DB.musicas||[]).slice().sort((a,b)=>a.titulo.localeCompare(b.titulo,'pt')).map(m=>'<option value="'+m.id+'">'+e(m.titulo)+'</option>').join('');
  const lista=_ed.itens.map((id,i)=>{ const f=info(id); const v=_ed.tons[id]||0;
    return '<div class="it"><span>'+f.ic+'</span><span class="nm">'+e(f.t)+'</span>'+
      '<button onclick="plTom('+i+',-1)" aria-label="Baixar tom">−</button><span class="st">'+(v?rotuloSemitom(v):'tom')+'</span><button onclick="plTom('+i+',1)" aria-label="Subir tom">+</button>'+
      '<button onclick="plMov('+i+',-1)" aria-label="Subir na ordem">↑</button><button onclick="plMov('+i+',1)" aria-label="Descer na ordem">↓</button><button onclick="plDel('+i+')" aria-label="Remover" style="color:#c0392b">✕</button></div>'; }).join('')
    || '<p style="font-size:13px;color:#9aa;padding:8px">Adicione músicas e hinos abaixo.</p>';
  abrirModal('<h3>Playlist / ordem do culto</h3>'+
    '<div class="row2"><div class="field"><label>Início</label><input type="date" id="plIni" value="'+_ed.inicio+'" onchange="_plData()"></div><div class="field"><label>Fim</label><input type="date" id="plFim" value="'+_ed.fim+'" onchange="_plData()"></div></div>'+
    '<div class="field"><label>Itens na ordem do culto · tom (+/− meio tom)</label><div class="pl-ed">'+lista+'</div>'+
    '<div class="pl-add"><select id="plMus"><option value="">+ Música do ministério…</option>'+ops+'</select><button onclick="plAddMus()">Adicionar</button></div>'+
    '<div class="pl-add"><input id="plHino" inputmode="numeric" placeholder="+ Hino do Cantor (nº, ex.: 214)"><button onclick="plAddHino()">Adicionar</button></div></div>'+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Cancelar</button><button class="btn btn-primary" onclick="publicarPlaylist()">📢 Publicar</button></div>');
}
window._plData=function(){ _ed.inicio=document.getElementById('plIni').value; _ed.fim=document.getElementById('plFim').value; };
window.plTom=function(i,d){ _plData(); const id=_ed.itens[i]; let v=((((_ed.tons[id]||0)+d)%12)+12)%12; if(v>6) v-=12; if(v) _ed.tons[id]=v; else delete _ed.tons[id]; desenharEditor(); };
window.plMov=function(i,d){ _plData(); const j=i+d; if(j<0||j>=_ed.itens.length) return; const a=_ed.itens; [a[i],a[j]]=[a[j],a[i]]; desenharEditor(); };
window.plDel=function(i){ _plData(); const id=_ed.itens.splice(i,1)[0]; delete _ed.tons[id]; desenharEditor(); };
window.plAddMus=function(){ _plData(); const v=document.getElementById('plMus').value; if(!v) return; if(_ed.itens.includes(v)) return toast('Essa música já está na lista.'); _ed.itens.push(v); desenharEditor(); };
window.plAddHino=function(){ _plData(); const n=parseInt(document.getElementById('plHino').value,10); const h=hino(n);
  if(!h||h.missing) return toast('Hino não encontrado.'); const id='cc:'+n; if(_ed.itens.includes(id)) return toast('Esse hino já está na lista.'); _ed.itens.push(id); desenharEditor(); };
window.publicarPlaylist=async function(){
  _plData();
  if(!_ed.inicio||!_ed.fim) return toast('Informe início e fim.');
  if(!_ed.itens.length) return toast('Adicione ao menos uma música ou hino.');
  const mus=_ed.itens.filter(id=>String(id).indexOf('cc:')!==0);
  const {error}=await sb.from('playlist').insert({inicio:_ed.inicio,fim:_ed.fim,musicas:mus,publicada:true,updated_at:new Date().toISOString()});
  if(error) return toast('Erro: '+error.message);
  DB.playlist={inicio:_ed.inicio,fim:_ed.fim,musicas:mus,publicada:true};
  await salvarConfig('setlist',{inicio:_ed.inicio,fim:_ed.fim,itens:_ed.itens.slice(),tons:Object.assign({},_ed.tons)});
  notificarTodos('📅','PLAYLIST DISPONÍVEL','A ordem do culto ('+fmtData(_ed.inicio)+' - '+fmtData(_ed.fim)+') já está no app. Confira!');
  fecharModal(); toast('Playlist publicada e todos notificados!'); go('playlist');
};

/* ================= 2) TOM DO CULTO ================= */
window.tomCulto=function(id){ const sl=setlist(); return sl&&sl.tons? (sl.tons[String(id)]||0) : 0; };
window.fixarTomCulto=async function(id,v){
  if(!adm()) return; const sl=setlist(); if(!sl) return toast('Monte a playlist primeiro.');
  const tons=Object.assign({},sl.tons); if(v) tons[id]=v; else delete tons[id];
  await salvarConfig('setlist',{inicio:sl.inicio,fim:sl.fim,itens:sl.itens,tons});
  toast(v?'Tom do culto salvo. Todos abrem neste tom.':'Tom do culto: original.'); setTimeout(redesenhar,50);
};
function redesenhar(){ const y=scrollY; try{ if(typeof _viewAtual==='function') _viewAtual(); }catch(_){} scrollTo(0,y); }

/* ---- barra "Anterior | 2 de 6 | Próxima" + ações, nas telas de música e hino ---- */
function blocoCulto(id){
  const sl=setlist(); let h='';
  if(sl){ const i=sl.itens.indexOf(String(id));
    if(i>=0){ const p=sl.itens[i-1], n=sl.itens[i+1];
      h+='<div class="sl-nav"><button '+(p?'onclick="abrirItem(\''+p+'\')"':'disabled')+'>◀ '+(p?e(info(p).t):'Início')+'</button>'+
        '<div class="mid"><b>'+(i+1)+' de '+sl.itens.length+'</b>no culto</div>'+
        '<button '+(n?'onclick="abrirItem(\''+n+'\')"':'disabled')+'>'+(n?e(info(n).t):'Fim')+' ▶</button></div>'; } }
  h+='<div class="sl-acts"><button onclick="projetar(\''+id+'\')">📺 Projetar letra</button><button onclick="abrirFerramentas()">🎛 Metrônomo / afinador</button>';
  if(adm() && sl && sl.itens.indexOf(String(id))>=0) h+='<button class="gold" onclick="fixarTomAtual(\''+id+'\')">📌 Usar este tom no culto</button>';
  h+='</div>';
  return h;
}
window.fixarTomAtual=function(id){
  let v=0;
  if(String(id).indexOf('cc:')===0){ try{ const p=JSON.parse(localStorage.getItem('ibnm_cc_prefs')||'{}'); const n=String(id).slice(3); v=(p.tr&&n in p.tr)? p.tr[n] : tomCulto(id); }catch(_){} }
  else { try{ const t=JSON.parse(localStorage.getItem('ibnm_mus_tr')||'{}'); v=(id in t)? t[id] : tomCulto(id); }catch(_){} }
  fixarTomCulto(String(id),v);
};
/* música */
if(typeof renderMusica==='function'){
  const _rm=renderMusica;
  window.renderMusica=renderMusica=function(){ const html=_rm.apply(this,arguments); setTimeout(posMusica,0); return html; };
}
function posMusica(){
  const c=document.getElementById('content'); if(!c||typeof musicaAberta==='undefined'||!musicaAberta) return;
  const head=c.querySelector('.song-head'); if(!head||c.querySelector('.sl-nav,.sl-acts')) return;
  head.insertAdjacentHTML('afterend',blocoCulto(musicaAberta));
}
/* hino (chamado pelo cantor.js ao abrir) */
window.ccPosHino=function(n){
  const c=document.getElementById('content'); if(!c) return;
  const tools=c.querySelector('.cc-tools'); if(!tools||c.querySelector('.sl-acts')) return;
  tools.insertAdjacentHTML('beforebegin',blocoCulto('cc:'+n));
};

/* ================= 3) MODO PROJETOR ================= */
const ehLinhaAcordes=l=>{ const t=l.trim().split(/\s+/).filter(Boolean); return t.length>0 && t.every(x=>/^\(?[A-G](#|b)?[a-zA-Z0-9º°+#()\-]*(\/[A-G](#|b)?)?\)?$/.test(x)||/^[|/.\-x]+$/.test(x)); };
const CLITICOS=/^(me|te|se|nos|vos|lhe|lhes|o|a|os|as|lo|la|los|las|no|na|nos|nas|mo|ma|to|ta|lho|lha)$/i;
function limpaHino(l){
  l=l.replace(/\[[^\]]*\]/g,'').replace(/(\S)\s*-\s+(?=\S)/g,'$1').replace(/(\S)\s+-\s*(?=\S)/g,'$1');
  /* junta sílabas separadas ("divi-nal" → "divinal"), mas mantém "dá-nos", "vê-lo" */
  l=l.replace(/([A-Za-zÀ-ÿ]+)-([A-Za-zÀ-ÿ]+)/g,(m,a,b)=>CLITICOS.test(b)?m:a+b);
  return l.replace(/-(?=[\s,.;:!?]|$)/g,'').replace(/\s+/g,' ').trim();
}
function slidesHino(n){
  const h=hino(n); if(!h) return [];
  let getLine=(pi,li)=>h.partes[pi].linhas[li]; try{ if(window.Cantor&&Cantor.getLine) getLine=(pi,li)=>Cantor.getLine(h,pi,li); }catch(_){}
  const ps=h.partes.map((p,pi)=>({tipo:p.tipo,txt:p.linhas.map((l,li)=>limpaHino(getLine(pi,li))).join('\n')}));
  const coro=ps.find(p=>p.tipo==='coro');
  const out=[{capa:true,txt:h.n+'\n'+h.titulo}]; let k=0;
  /* canta-se o coro depois de cada estrofe */
  ps.forEach((p,i)=>{
    if(p.tipo==='coro'){ out.push({rot:'Coro',txt:p.txt}); return; }
    out.push({rot:String(++k),txt:p.txt});
    const prox=ps[i+1];
    if(coro && !(prox && prox.tipo==='coro')) out.push({rot:'Coro',txt:coro.txt});
  });
  return out;
}
function slidesMusica(id){
  const m=(DB.musicas||[]).find(x=>x.id===id); if(!m) return [];
  let txt=m.letra||'';
  if(!txt.trim() && m.cifra){ const d=document.createElement('div'); d.innerHTML=/<[a-z]/i.test(m.cifra)?m.cifra:e(m.cifra).replace(/\n/g,'<br>'); d.style.cssText='position:absolute;left:-9999px;white-space:pre-wrap'; document.body.appendChild(d); txt=d.innerText; d.remove();
    txt=txt.split('\n').filter(l=>!ehLinhaAcordes(l)).map(l=>l.replace(/\[[^\]]*\]/g,'')).join('\n'); }
  const blocos=txt.replace(/\r/g,'').split(/\n\s*\n/).map(b=>b.split('\n').map(x=>x.trim()).filter(Boolean)).filter(b=>b.length);
  const out=[{capa:true,txt:m.titulo+(m.artista?'\n'+m.artista:'')}];
  blocos.forEach(b=>{ const r=b[0].match(/^\[(.+)\]$/); if(r&&b.length>1) out.push({rot:r[1],txt:b.slice(1).join('\n')}); else for(let i=0;i<b.length;i+=6) out.push({txt:b.slice(i,i+6).join('\n')}); });
  if(out.length===1) out.push({txt:'(letra não cadastrada)'});
  return out;
}
function slidesDe(id){ id=String(id); return id.indexOf('cc:')===0? slidesHino(+id.slice(3)) : slidesMusica(id); }
let PJ=null;
window.projetar=function(id){ abrirProjetor([{id,slides:slidesDe(id)}]); };
window.projetarSetlist=function(){ const sl=setlist(); if(!sl) return; abrirProjetor(sl.itens.map(id=>({id,slides:slidesDe(id)}))); };
function abrirProjetor(grupos){
  fecharProjetor();
  const flat=[]; grupos.forEach(g=>g.slides.forEach((s,i)=>flat.push(Object.assign({titulo:info(g.id).t,ini:i===0},s))));
  if(!flat.length) return;
  const el=document.createElement('div'); el.className='proj'; el.setAttribute('role','dialog');
  el.innerHTML='<div class="bar"><span class="tt"></span><button class="fm" aria-label="Diminuir letra">A−</button><button class="fp" aria-label="Aumentar letra">A+</button><button class="fs" aria-label="Tela cheia">⛶</button><button class="x" aria-label="Fechar">✕</button></div><div class="tela"><div class="txt"></div></div><div class="rod"><span class="pos"></span><span class="dots"></span><span>toque ▶</span></div>';
  document.body.appendChild(el);
  PJ={el,flat,i:0,esc:parseFloat(localStorage.getItem('ibnm_proj_esc')||'1')};
  el.querySelector('.x').onclick=fecharProjetor;
  el.querySelector('.fs').onclick=()=>{ try{ document.fullscreenElement? document.exitFullscreen() : el.requestFullscreen(); }catch(_){} };
  el.querySelector('.fm').onclick=ev=>{ ev.stopPropagation(); PJ.esc=Math.max(.5,PJ.esc-.1); localStorage.setItem('ibnm_proj_esc',PJ.esc); mostra(); };
  el.querySelector('.fp').onclick=ev=>{ ev.stopPropagation(); PJ.esc=Math.min(2,PJ.esc+.1); localStorage.setItem('ibnm_proj_esc',PJ.esc); mostra(); };
  el.querySelector('.tela').onclick=ev=>{ (ev.clientX<innerWidth*.33)? anda(-1) : anda(1); };
  let x0=null; el.addEventListener('touchstart',ev=>{ x0=ev.touches[0].clientX; },{passive:true});
  el.addEventListener('touchend',ev=>{ if(x0==null) return; const dx=ev.changedTouches[0].clientX-x0; if(Math.abs(dx)>50){ anda(dx<0?1:-1); ev.preventDefault(); } x0=null; });
  document.addEventListener('keydown',teclas);
  addEventListener('resize',mostra);
  try{ if('wakeLock' in navigator) navigator.wakeLock.request('screen').then(w=>{ if(PJ) PJ.wl=w; }).catch(()=>{}); }catch(_){}
  mostra();
}
function teclas(ev){ if(!PJ) return; if(['ArrowRight','ArrowDown','PageDown',' ','Enter'].includes(ev.key)){ ev.preventDefault(); anda(1); } else if(['ArrowLeft','ArrowUp','PageUp','Backspace'].includes(ev.key)){ ev.preventDefault(); anda(-1); } else if(ev.key==='Escape') fecharProjetor(); }
function anda(d){ if(!PJ) return; const j=PJ.i+d; if(j<0||j>=PJ.flat.length) return; PJ.i=j; mostra(); }
function mostra(){
  if(!PJ||!PJ.el.isConnected){ fecharProjetor(); return; }
  const s=PJ.flat[PJ.i], t=PJ.el.querySelector('.txt'), tela=PJ.el.querySelector('.tela');
  PJ.el.querySelector('.tt').textContent=s.titulo;
  PJ.el.querySelector('.pos').textContent=(PJ.i+1)+'/'+PJ.flat.length;
  PJ.el.querySelector('.dots').innerHTML=PJ.flat.length<=30? PJ.flat.map((_,k)=>'<i class="'+(k===PJ.i?'on':'')+'"></i>').join('') : '';
  t.className='txt'+(s.capa?' capa':'');
  t.innerHTML=(s.rot?'<span class="rot">'+e(s.rot)+'</span>':'')+e(s.txt);
  /* ajusta o tamanho para caber na tela */
  let fs=Math.min(innerWidth*.075, innerHeight*.09)*PJ.esc; const maxW=tela.clientWidth*.98, maxH=tela.clientHeight*.96;
  t.style.fontSize=fs+'px';
  for(let k=0;k<40 && (t.scrollWidth>maxW||t.scrollHeight>maxH) && fs>12;k++){ fs*=.93; t.style.fontSize=fs+'px'; }
}
function fecharProjetor(){
  if(!PJ) return; try{ if(PJ.wl) PJ.wl.release(); }catch(_){} try{ if(document.fullscreenElement) document.exitFullscreen(); }catch(_){}
  document.removeEventListener('keydown',teclas); removeEventListener('resize',mostra);
  if(PJ.el.isConnected) PJ.el.remove(); PJ=null;
}
window.fecharProjetor=fecharProjetor;
/* botão VOLTAR do Android fecha o projetor */
addEventListener('popstate',()=>{ if(PJ){ fecharProjetor(); } },true);

/* ================= 4) METRÔNOMO E AFINADOR ================= */
const MT={bpm:+(localStorage.getItem('ibnm_bpm')||80),comp:+(localStorage.getItem('ibnm_comp')||4),on:false,ctx:null,prox:0,beat:0,timer:0,taps:[]};
function ctx(){ if(!MT.ctx){ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return null; MT.ctx=new AC(); } if(MT.ctx.state==='suspended') MT.ctx.resume(); return MT.ctx; }
function clique(t,acento){ const c=MT.ctx, o=c.createOscillator(), g=c.createGain(); o.frequency.value=acento?1600:1000; g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(acento?.9:.55,t+.002); g.gain.exponentialRampToValueAtTime(.0001,t+.06); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+.07); }
function agenda(){
  const c=MT.ctx; if(!c||!MT.on) return;
  while(MT.prox < c.currentTime+.12){
    const b=MT.beat, quando=MT.prox;
    clique(quando, b===0 && MT.comp>1);
    setTimeout(()=>pisca(b), Math.max(0,(quando-c.currentTime)*1000));
    MT.prox += 60/MT.bpm; MT.beat=(MT.beat+1)%MT.comp;
  }
  MT.timer=setTimeout(agenda,25);
}
function pisca(b){
  document.querySelectorAll('.ferr .beats i').forEach((i,k)=>i.classList.toggle('on',k===b));
  const lt=document.querySelector('.metro-pill .lt'); if(lt){ lt.classList.add('on'); setTimeout(()=>lt.classList.remove('on'),90); }
}
function metroPlay(){ if(!ctx()) return toast('Seu navegador não tem áudio para o metrônomo.'); if(MT.on) return; MT.on=true; MT.beat=0; MT.prox=MT.ctx.currentTime+.06; agenda(); pilula(); }
function metroStop(){ MT.on=false; clearTimeout(MT.timer); document.querySelectorAll('.ferr .beats i').forEach(i=>i.classList.remove('on')); pilula(); }
function setBpm(v){ MT.bpm=Math.max(30,Math.min(250,Math.round(v))); localStorage.setItem('ibnm_bpm',MT.bpm); const b=document.querySelector('.ferr .big'); if(b) b.textContent=MT.bpm; const r=document.getElementById('mtRange'); if(r) r.value=MT.bpm; pilula(); }
function tap(){ const t=performance.now(); MT.taps=MT.taps.filter(x=>t-x<3000); MT.taps.push(t); if(MT.taps.length>=2){ const d=[]; for(let i=1;i<MT.taps.length;i++) d.push(MT.taps[i]-MT.taps[i-1]); setBpm(60000/(d.reduce((a,b)=>a+b,0)/d.length)); } }
function pilula(){
  let p=document.querySelector('.metro-pill');
  const aberto=!!document.querySelector('.ferr');
  if(!MT.on||aberto){ if(p) p.remove(); return; }
  if(!p){ p=document.createElement('div'); p.className='metro-pill'; document.body.appendChild(p); }
  p.innerHTML='<span class="lt"></span><span onclick="abrirFerramentas()" style="cursor:pointer">♩ '+MT.bpm+'</span><button aria-label="Parar metrônomo">■</button>';
  p.querySelector('button').onclick=metroStop;
}
/* afinador */
const AF={on:false,stream:null,an:null,buf:null,raf:0,ref:+(localStorage.getItem('ibnm_a4')||440)};
const NOMES=['Dó','Dó#','Ré','Ré#','Mi','Fá','Fá#','Sol','Sol#','Lá','Lá#','Si'], CIF=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function autoCorr(b,sr){
  let rms=0; for(let i=0;i<b.length;i++) rms+=b[i]*b[i]; rms=Math.sqrt(rms/b.length); if(rms<.012) return -1;
  let r1=0,r2=b.length-1; const th=.2; for(let i=0;i<b.length/2;i++) if(Math.abs(b[i])<th){ r1=i; break; } for(let i=1;i<b.length/2;i++) if(Math.abs(b[b.length-i])<th){ r2=b.length-i; break; }
  const x=b.slice(r1,r2), n=x.length, c=new Float32Array(n);
  for(let i=0;i<n;i++) for(let j=0;j<n-i;j++) c[i]+=x[j]*x[j+i];
  let d=0; while(d<n-1&&c[d]>c[d+1]) d++;
  let mx=-1,mp=-1; for(let i=d;i<n;i++) if(c[i]>mx){ mx=c[i]; mp=i; }
  if(mp<=0) return -1; let T0=mp; const a=c[T0-1]||0,bb=c[T0],cc=c[T0+1]||0, A=(a+cc-2*bb)/2, B=(cc-a)/2; if(A) T0=T0-B/(2*A);
  return sr/T0;
}
async function afinLiga(){
  if(AF.on) return; const c=ctx(); if(!c) return toast('Seu navegador não tem áudio.');
  try{ AF.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}}); }
  catch(_){ const i=document.querySelector('.afin .info'); if(i) i.textContent='Permita o uso do microfone para afinar.'; return; }
  const src=c.createMediaStreamSource(AF.stream); AF.an=c.createAnalyser(); AF.an.fftSize=2048; src.connect(AF.an); AF.buf=new Float32Array(AF.an.fftSize); AF.on=true; loopAfin();
  const b=document.getElementById('afBtn'); if(b){ b.textContent='■ Parar'; }
}
function afinDesliga(){ AF.on=false; cancelAnimationFrame(AF.raf); try{ AF.stream&&AF.stream.getTracks().forEach(t=>t.stop()); }catch(_){} AF.stream=null; const b=document.getElementById('afBtn'); if(b) b.textContent='🎤 Começar'; }
let _ultFreq=[];
function loopAfin(){
  if(!AF.on) return;
  const box=document.querySelector('.afin'); if(!box){ afinDesliga(); return; }
  AF.an.getFloatTimeDomainData(AF.buf); const f=autoCorr(AF.buf,MT.ctx.sampleRate);
  if(f>40&&f<1500){ _ultFreq.push(f); if(_ultFreq.length>5) _ultFreq.shift(); const fm=_ultFreq.slice().sort((a,b)=>a-b)[Math.floor(_ultFreq.length/2)];
    const n=12*Math.log2(fm/AF.ref)+69, r=Math.round(n), cents=Math.round((n-r)*100), nome=((r%12)+12)%12, oit=Math.floor(r/12)-1;
    box.querySelector('.nota').innerHTML=CIF[nome]+'<small>'+oit+'</small>';
    box.querySelector('.info').textContent=NOMES[nome]+' · '+fm.toFixed(1)+' Hz · '+(cents>0?'+':'')+cents+' cents'+(Math.abs(cents)<=5?' ✔ afinado':(cents<0?' (suba)':' (desça)'));
    const p=box.querySelector('.med .p'); p.style.left=(50+Math.max(-50,Math.min(50,cents)))+'%'; p.classList.toggle('ok',Math.abs(cents)<=5);
  }
  AF.raf=requestAnimationFrame(loopAfin);
}
let abaFerr='metro';
window.abrirFerramentas=function(aba){
  if(aba) abaFerr=aba;
  document.querySelectorAll('.cc-sheet-bg.ferr-bg').forEach(b=>b.remove());
  const bg=document.createElement('div'); bg.className='cc-sheet-bg ferr-bg';
  const metro='<div class="big">'+MT.bpm+'</div><div class="sub">batidas por minuto</div>'+
    '<input type="range" id="mtRange" min="30" max="250" value="'+MT.bpm+'">'+
    '<div class="linha"><button data-d="-5">−5</button><button data-d="-1">−1</button><button id="mtTap">TAP</button><button data-d="1">+1</button><button data-d="5">+5</button></div>'+
    '<div class="beats">'+Array.from({length:MT.comp},(_,k)=>'<i class="'+(k===0?'ac':'')+'"></i>').join('')+'</div>'+
    '<div class="linha">'+[2,3,4,6].map(c=>'<button class="cp '+(MT.comp===c?'on':'')+'" data-c="'+c+'">'+c+'/'+(c===6?8:4)+'</button>').join('')+'</div>'+
    '<div class="linha"><button class="play" id="mtPlay">'+(MT.on?'■ Parar':'▶ Tocar')+'</button></div>'+
    '<p class="sub">Toque TAP no ritmo da música para achar o andamento. O metrônomo continua tocando com esta janela fechada.</p>';
  const afin='<div class="afin"><div class="nota">—</div><div class="med"><span class="c"></span><span class="p"></span></div><div class="info">Toque em Começar e toque uma corda ou cante uma nota.</div></div>'+
    '<div class="linha"><button class="play" id="afBtn">'+(AF.on?'■ Parar':'🎤 Começar')+'</button></div>'+
    '<div class="linha"><button id="afM">−</button><button disabled style="opacity:1">Lá = '+AF.ref+' Hz</button><button id="afP">+</button></div>'+
    '<p class="sub">Violão: Mi Lá Ré Sol Si Mi (E A D G B E) · Baixo: Mi Lá Ré Sol</p>';
  bg.innerHTML='<div class="cc-sheet ferr" role="dialog" aria-modal="true"><h3>🎛 Ferramentas do músico</h3><div class="tabs"><button class="'+(abaFerr==='metro'?'on':'')+'" data-a="metro">Metrônomo</button><button class="'+(abaFerr==='afin'?'on':'')+'" data-a="afin">Afinador</button></div>'+(abaFerr==='metro'?metro:afin)+'<div class="row"><button class="pri" id="ferrX">Fechar</button></div></div>';
  document.body.appendChild(bg);
  const fechar=()=>{ afinDesliga(); bg.remove(); pilula(); };
  bg.addEventListener('click',ev=>{ if(ev.target===bg) fechar(); });
  bg.querySelector('#ferrX').onclick=fechar;
  bg.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{ afinDesliga(); abrirFerramentas(b.dataset.a); });
  if(abaFerr==='metro'){
    bg.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>setBpm(MT.bpm+(+b.dataset.d)));
    bg.querySelector('#mtRange').oninput=ev=>setBpm(+ev.target.value);
    bg.querySelector('#mtTap').onclick=tap;
    bg.querySelectorAll('.cp').forEach(b=>b.onclick=()=>{ MT.comp=+b.dataset.c; localStorage.setItem('ibnm_comp',MT.comp); MT.beat=0; abrirFerramentas(); });
    bg.querySelector('#mtPlay').onclick=()=>{ MT.on?metroStop():metroPlay(); bg.querySelector('#mtPlay').textContent=MT.on?'■ Parar':'▶ Tocar'; };
  } else {
    bg.querySelector('#afBtn').onclick=()=>{ AF.on?afinDesliga():afinLiga(); };
    bg.querySelector('#afM').onclick=()=>{ AF.ref=Math.max(430,AF.ref-1); localStorage.setItem('ibnm_a4',AF.ref); abrirFerramentas(); };
    bg.querySelector('#afP').onclick=()=>{ AF.ref=Math.min(450,AF.ref+1); localStorage.setItem('ibnm_a4',AF.ref); abrirFerramentas(); };
  }
  pilula();
  /* se o botão VOLTAR do Android remover a janela, desliga o microfone */
  const obs=new MutationObserver(()=>{ if(!bg.isConnected){ afinDesliga(); pilula(); obs.disconnect(); } }); obs.observe(document.body,{childList:true});
};

/* ---------- menu: ferramentas e aparência ---------- */
if(typeof MENU!=='undefined' && Array.isArray(MENU) && !MENU.find(m=>m.id==='ferramentas')){
  const k=MENU.findIndex(m=>m.id==='perfil');
  MENU.splice(k>=0?k:MENU.length,0,{id:'ferramentas',ic:'🎛️',nm:'Metrônomo e afinador'});
  ROTAS.ferramentas=function(){ setTimeout(()=>abrirFerramentas(),30); return ROTAS.inicio(); };
}
if(typeof _booted!=='undefined' && _booted){ try{ montaMenu(); }catch(_){} }
})();
