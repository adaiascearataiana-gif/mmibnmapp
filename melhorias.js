/* ============================================================
   MM IBNM — correções e melhorias (carregado por último)
   - topo fixo correto (barra do hino e faixa AO VIVO)
   - tempo real sem pular para o topo
   - transposição correta (bemóis, baixo, 7M...) no editor
   - Tom −/+ e rolagem automática também nas músicas
   - busca sem acento; A–Z com títulos acentuados
   - zoom da cifra lembrado entre aberturas
   - AO VIVO com hinos do Cantor Cristão
   - link direto (#hino-123, ?go=cantor) e atalhos do app
============================================================ */
(function(){
'use strict';
const $q = s => document.querySelector(s);
const normTxt = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

/* ---------- 1) altura real do topo (barra verde + faixa AO VIVO) ---------- */
function medirTopo(){
  const tb=$q('.topbar'); const vivo=document.getElementById('vivoBanner');
  const hv=vivo? vivo.offsetHeight : 0;
  document.documentElement.style.setProperty('--ibnm-vivo', hv+'px');
  document.documentElement.style.setProperty('--ibnm-topbar', ((tb?tb.offsetHeight:62)+hv)+'px');
}
addEventListener('resize', medirTopo);
setInterval(medirTopo, 1500);
if(typeof atualizaBannerVivo==='function'){
  const _abv=atualizaBannerVivo;
  window.atualizaBannerVivo=atualizaBannerVivo=function(){
    _abv();
    const b=document.getElementById('vivoBanner');
    document.body.style.paddingTop='';                 /* a faixa agora empurra a barra verde, não o conteúdo */
    document.body.classList.toggle('ao-vivo', !!b);
    if(b && AO_VIVO && String(AO_VIVO.musica_id||'').indexOf('cc:')===0){
      const n=+String(AO_VIVO.musica_id).slice(3);
      const h=(window.HINOS||[]).find(x=>x.n===n);
      b.innerHTML='🔴 AO VIVO — Hino '+n+(h?' · '+esc(h.titulo):'')+(ehAdmin()?' <span style="font-weight:400">(toque p/ encerrar)</span>':' <span style="font-weight:400">(acompanhando)</span>');
      b.onclick=function(){ if(ehAdmin()){ if(confirm('Encerrar a transmissão ao vivo?')) encerrarAoVivo(); } else if(window.cantorAbrir) window.cantorAbrir(n); };
    }
    medirTopo();
  };
}

/* ---------- 2) tempo real: atualiza a tela SEM pular para o topo ---------- */
if(typeof agendarReload==='function'){
  window.agendarReload=agendarReload=function(){
    clearTimeout(_rtTimer);
    _rtTimer=setTimeout(async()=>{
      await cloudCarregarTudo();
      if(!$('#appShell').classList.contains('hidden')){
        montaMenu(); atualizaBadge();
        if(!_editando && _viewAtual && !document.querySelector('.modal-bg.show')){
          const y=window.scrollY;
          try{ _viewAtual(); }catch(e){}
          window.scrollTo(0,y);
        }
      }
      try{ aplicarAoVivo(); }catch(e){}
    },350);
  };
}

/* ---------- 3) transposição correta ---------- */
const SUS=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const BEM=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const IDX={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,'E#':5,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11,'B#':0};
/* acorde: raiz + complemento (m, 7M, 7(9), sus4, add9, º, +, b5…) + baixos/extensões depois da barra (A/C#, A7/9, C9/E) */
const ACORDE=/^\(?([A-G](?:#|b)?)((?:m|M|maj|min|dim|aug|sus|add|º|°|\+|-|\d|\(|\)|#|b)*)((?:\/(?:[A-G](?:#|b)?|\d+(?:[#b+\-]|\(\d+\))?|\(\d+\)))*)\)?$/;
function nota(n,st,bem){ const i=IDX[n]; return i===undefined? n : (bem?BEM:SUS)[(i+st+120)%12]; }
function transpAcorde(tok,st,bem){
  const m=tok.match(ACORDE); if(!m) return tok;
  const pre=tok.startsWith('(')?'(':'', pos=tok.endsWith(')')&&tok.startsWith('(')?')':'';
  const baixos=(m[3]||'').replace(/\/([A-G](?:#|b)?)/g,(x,n)=>'/'+nota(n,st,bem));
  return pre+nota(m[1],st,bem)+m[2]+baixos+pos;
}
function ehAcorde(tok){ return ACORDE.test(tok); }
window.__ehAcorde=ehAcorde;
/* linha só de acordes (aceita rótulos tipo [Intro], (2x), |, -, x2) */
function ehLinhaCifra(l){ const toks=String(l).trim().split(/\s+/).filter(Boolean); if(!toks.length) return false; let ac=0;
  for(const t of toks){ if(ehAcorde(t)){ ac++; continue; } if(/^\[[^\]]*\]$/.test(t)||/^(\(?\d*x\d*\)?|[|/.\-()]+)$/i.test(t)) continue; return false; } return ac>0; }
window.__ehLinhaCifra=ehLinhaCifra;
window.__transpTexto=(t,st)=>transporTexto('Intro: '+t,st,bemolNoDestino('Intro: '+t,st)).replace(/^Intro: /,'');
function usaBemol(texto){ const b=(texto.match(/\b[A-G]b/g)||[]).length, s=(texto.match(/\b[A-G]#/g)||[]).length; return b>s; }
/* transpõe só linhas que são de acordes (evita mexer em "A graça", "E o Senhor"...) e acordes entre [ ] */
function transporTexto(txt,st,bem){
  return txt.split('\n').map(l=>{
    l=l.replace(/\[([^\]\s]+)\]/g,(m,c)=>'['+transpAcorde(c,st,bem)+']');
    const pi=l.match(/^(\s*intro(?:du[cç][aã]o)?\s*[:\-–]\s*)(.*)$/i);
    if(pi) return pi[1]+pi[2].replace(/\S+/g,t=>{ const k=t.replace(/[(),]/g,''); return ehAcorde(k)? t.replace(k,transpAcorde(k,st,bem)) : t; });
    const toks=l.trim().split(/\s+/).filter(Boolean);
    if(ehLinhaCifra(l)){
      /* mantém cada acorde na mesma coluna (alinhado com a sílaba de baixo) */
      let out='', col=0;
      l.replace(/(\s*)(\S+)/g,(m,esp,tok)=>{ const ini=col+esp.length; const novo=ehAcorde(tok)?transpAcorde(tok,st,bem):tok;
        const pad=Math.max(out.length?1:0, ini-out.length); out+=' '.repeat(pad)+novo; col=ini+tok.length; return m; });
      return out;
    }
    return l;
  }).join('\n');
}
const TONS_BEMOL=new Set(['F','Bb','Eb','Ab','Db','Gb','Dm','Gm','Cm','Fm','Bbm','Ebm']);
function primeiroAcorde(texto){
  for(const l of String(texto).split('\n')){ const t=l.trim().split(/\s+/).filter(Boolean); if(t.length&&t.every(x=>ehAcorde(x)||/^[|/.\-x()]+$/.test(x))){ const c=t.find(ehAcorde); if(c) return c.match(ACORDE); } }
  const b=String(texto).match(/\[([^\]\s]+)\]/); return b? b[1].match(ACORDE) : null;
}
function bemolNoDestino(texto,st){
  const m=primeiroAcorde(texto); if(!m) return usaBemol(texto);
  const menor=/^m(?!aj)/.test(m[2])?'m':'';
  const alvo=nota(m[1],st,true)+menor;
  return TONS_BEMOL.has(alvo);
}
function transporElemento(el,st){
  if(!el||!st) return;
  const bem=bemolNoDestino(el.innerText||el.textContent||'',st);
  const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null); const ns=[]; while(w.nextNode()) ns.push(w.currentNode);
  ns.forEach(tn=>{ tn.nodeValue=transporTexto(tn.nodeValue,st,bem); });
}
/* editor de cifra (ADM): substitui a versão antiga que não mexia em bemóis nem no baixo */
if(typeof transpor==='function'){
  window.transpor=transpor=function(ev,passo){
    if(ev) ev.preventDefault(); const el=edEl(); if(!el) return; edCommit();
    transporElemento(el,passo); edCommit(); atualizaTom();
    toast(passo>0?'Subiu meio tom':'Desceu meio tom');
  };
}

/* ---------- 4) Tom −/+ e rolagem nas músicas ---------- */
const MPREF='ibnm_mus_tr';
function trMus(){ try{ return JSON.parse(localStorage.getItem(MPREF)||'{}')||{}; }catch(e){ return {}; } }
function tcMus(id){ try{ return window.tomCulto? (+window.tomCulto(id)||0) : 0; }catch(e){ return 0; } }
function stMus(id){ const t=trMus(); return Object.prototype.hasOwnProperty.call(t,id)? (t[id]||0) : tcMus(id); }
function setTrMus(id,v,original){ const t=trMus(); v=((v%12)+12)%12; if(v>6) v-=12; const tc=tcMus(id);
  if(original){ if(tc) t[id]=0; else delete t[id]; } else if(v===tc) delete t[id]; else t[id]=v;
  localStorage.setItem(MPREF,JSON.stringify(t)); }
function nomeTom(id){ const el=document.getElementById('zoomTarget'); if(!el) return '';
  const lin=(el.innerText||'').split('\n').find(l=>{ const t=l.trim().split(/\s+/).filter(Boolean); return t.length&&t.every(ehAcorde); });
  let m=lin? lin.trim().split(/\s+/)[0].match(ACORDE) : null;
  if(!m){ const b=(el.innerText||'').match(/\[([^\]\s]+)\]/); m=b? b[1].match(ACORDE) : null; }
  return m? m[1]+(/^m(?!aj)/.test(m[2])?'m':'') : ''; }
function aplicaTomNaTela(id){
  const alvo=document.getElementById('zoomTarget');
  if(!alvo || alvo.__orig==null){ const y=scrollY; abrirMusica(id,'cifra'); scrollTo(0,y); return; }
  const y=scrollY, h=alvo.offsetHeight; alvo.style.minHeight=h+'px';      /* segura a altura: a tela não pula */
  const st=stMus(id);
  alvo.innerHTML=alvo.__orig; if(st) transporElemento(alvo,st);
  try{ if(window.__marcarAcordes) window.__marcarAcordes(alvo); }catch(_){}
  scrollTo(0,y); requestAnimationFrame(()=>{ alvo.style.minHeight=''; scrollTo(0,y); });
  const tom=nomeTom(id); const doCulto=!Object.prototype.hasOwnProperty.call(trMus(),id) && st!==0;
  const lb=document.querySelector('.mm-tom > span'); if(lb) lb.innerHTML='Tom <b>'+(tom||'—')+'</b>'+(st?' <small>('+(st>0?'+':'')+st+')</small>':'')+(doCulto?'<span class="tom-culto">culto</span>':'');
  const zb=document.querySelector('#content .zoom-bar'); let rs=zb&&zb.querySelector('.rst');
  if(st && !rs && zb){ const mt=zb.querySelector('.mm-tom'); if(mt) mt.insertAdjacentHTML('afterend','<button type="button" class="rst" onclick="musTomOriginal(\''+id+'\')">Tom original</button>'); }
  if(!st && rs) rs.remove();
}
window.musTransp=function(id,d){ setTrMus(id,stMus(id)+d); aplicaTomNaTela(id); };
window.musTomOriginal=function(id){ setTrMus(id,0,true); aplicaTomNaTela(id); };

/* rolagem automática (mesmo padrão do Cantor: 30 px/s em 1×) */
let rolOn=false, rolRaf=0, rolLast=0, rolAcc=0, rolWake=null;
function ccPrefs(){ try{ return JSON.parse(localStorage.getItem('ibnm_cc_prefs')||'{}')||{}; }catch(e){ return {}; } }
function vel(){ const v=+ccPrefs().scrollSpeed; return v>=0.4&&v<=3? v : 1; }
function setVel(v){ const p=ccPrefs(); p.scrollSpeed=Math.min(3,Math.max(0.4,Math.round(v*10)/10)); localStorage.setItem('ibnm_cc_prefs',JSON.stringify(p)); barRol(); }
function velTxt(){ return vel().toFixed(1).replace('.',',')+'×'; }
function passo(ts){ if(!rolOn) return; const dt=Math.min((ts-rolLast)/1000,.1); rolLast=ts;
  rolAcc+=30*vel()*dt; const px=Math.floor(rolAcc); if(px>=1){ rolAcc-=px; scrollBy(0,px); }
  if(innerHeight+scrollY>=document.documentElement.scrollHeight-2){ pausaRol(); toast('Fim da música'); return; }
  rolRaf=requestAnimationFrame(passo); }
async function telaLigada(){ try{ if('wakeLock' in navigator && !rolWake){ rolWake=await navigator.wakeLock.request('screen'); rolWake.addEventListener('release',()=>{ rolWake=null; }); } }catch(e){} }
function soltarTela(){ try{ if(rolWake){ rolWake.release(); rolWake=null; } }catch(e){} }
function barRol(){
  let b=$q('.mus-scrollbar');
  if(!b){ b=document.createElement('div'); b.className='cc-scrollbar mus-scrollbar';
    b.innerHTML='<button class="pp" aria-label="Pausar ou continuar"></button><button class="sl" aria-label="Mais devagar">−</button><span class="spd"></span><button class="fs" aria-label="Mais rápido">+</button><span class="sp"></span><button class="tp" aria-label="Voltar ao início">⤒</button><button class="x" aria-label="Fechar rolagem">✕</button>';
    document.body.appendChild(b);
    b.querySelector('.pp').onclick=()=>{ rolOn?pausaRol():iniciaRol(); };
    b.querySelector('.sl').onclick=()=>setVel(vel()-0.2);
    b.querySelector('.fs').onclick=()=>setVel(vel()+0.2);
    b.querySelector('.tp').onclick=()=>{ const t=document.getElementById('zoomTarget'); scrollTo(0, t? Math.max(0,t.getBoundingClientRect().top+scrollY-140):0); };
    b.querySelector('.x').onclick=()=>pararRol();
  }
  b.querySelector('.spd').textContent=velTxt();
  b.querySelector('.pp').textContent=rolOn?'⏸ Pausar':'▶ Rolar';
  const bt=document.getElementById('musRolBtn'); if(bt) bt.textContent=rolOn?'⏸ Pausar':'▶ Rolagem';
}
function iniciaRol(){ if(rolOn) return;
  if(innerHeight+scrollY>=document.documentElement.scrollHeight-2){ const t=document.getElementById('zoomTarget'); if(t) scrollTo(0,Math.max(0,t.getBoundingClientRect().top+scrollY-140)); }
  rolOn=true; rolLast=performance.now(); rolAcc=0; barRol(); telaLigada(); rolRaf=requestAnimationFrame(passo); }
function pausaRol(){ rolOn=false; cancelAnimationFrame(rolRaf); soltarTela(); barRol(); }
function pararRol(){ rolOn=false; cancelAnimationFrame(rolRaf); soltarTela(); const b=$q('.mus-scrollbar'); if(b) b.remove(); const bt=document.getElementById('musRolBtn'); if(bt) bt.textContent='▶ Rolagem'; }
window.musRolagem=function(){ rolOn?pausaRol():iniciaRol(); };
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&rolOn) telaLigada(); });

/* pós-processa a tela da música (vale para toda forma de abrir: menu, voltar, tempo real, ao vivo) */
function posMusica(){
  const m=(typeof musicaAberta!=='undefined')&&DB.musicas.find(x=>x.id===musicaAberta);
  const alvo=document.getElementById('zoomTarget');
  if(!m || !alvo || !document.getElementById('content').contains(alvo)) return;
  const zb=$q('#content .zoom-bar'); if(!zb || zb.dataset.mm) return; zb.dataset.mm='1';
  const ehCifra=(typeof abaAtual!=='undefined' && abaAtual==='cifra') && !!m.cifra;
  const st=stMus(m.id); const doCulto=!Object.prototype.hasOwnProperty.call(trMus(),m.id) && st!==0;
  if(ehCifra) alvo.__orig=alvo.innerHTML;          /* guarda o original para mudar o tom sem recarregar */
  if(ehCifra && st) transporElemento(alvo,st);
  let h='';
  if(ehCifra){
    const tom=nomeTom(m.id);
    h+='<span class="mm-tom"><button type="button" onclick="musTransp(\''+m.id+'\',-1)" aria-label="Baixar meio tom">−</button><span>Tom <b>'+(tom||'—')+'</b>'+(st?' <small>('+(st>0?'+':'')+st+')</small>':'')+(doCulto?'<span class="tom-culto">culto</span>':'')+'</span><button type="button" onclick="musTransp(\''+m.id+'\',1)" aria-label="Subir meio tom">+</button></span>';
    if(st) h+='<button type="button" class="rst" onclick="musTomOriginal(\''+m.id+'\')">Tom original</button>';
  }
  h+='<button type="button" id="musRolBtn" class="mm-rol" onclick="musRolagem()">'+(rolOn?'⏸ Pausar':'▶ Rolagem')+'</button>';
  zb.insertAdjacentHTML('beforeend',h);
}
if(typeof renderMusica==='function'){
  const _rm=renderMusica;
  window.renderMusica=renderMusica=function(){ const html=_rm.apply(this,arguments); setTimeout(posMusica,0); return html; };
}
/* zoom da cifra/letra: lembra o tamanho escolhido */
if(typeof bindZoomView==='function'){
  const _bz=bindZoomView;
  window.bindZoomView=bindZoomView=function(){ _bz(); const v=parseFloat(localStorage.getItem('ibnm_zoom')||'1'); if(v>=0.7&&v<=2.8){ _zoomScale=v; _applyZoom(); } };
  const _az=_applyZoom;
  window._applyZoom=_applyZoom=function(){ _az(); try{ localStorage.setItem('ibnm_zoom',String(_zoomScale)); }catch(e){} };
}
/* parar a rolagem das músicas ao trocar de tela */
function pararTudo(){ pararRol(); try{ if(window.Cantor&&window.Cantor.stopScroll) window.Cantor.stopScroll(); }catch(e){} }
window.__pararRolagens=pararTudo;
if(typeof window.go==='function'){ const _g=window.go; window.go=function(){ pararTudo(); return _g.apply(this,arguments); }; }
if(typeof window.abrirMusica==='function'){ const _am=window.abrirMusica; window.abrirMusica=function(id){ if(id!==window.__musRolId){ pararTudo(); } window.__musRolId=id; return _am.apply(this,arguments); }; }
if(typeof window.cantorAbrir==='function'){ const _ca=window.cantorAbrir; window.cantorAbrir=function(){ pararRol(); return _ca.apply(this,arguments); }; }

/* ---------- 5) busca e A–Z sem depender de acento ---------- */
const letra1 = t => normTxt(t).replace(/^[^a-z0-9]+/,'').charAt(0).toUpperCase() || '#';
if(typeof listaMusicasHTML==='function'){
  window.listaMusicasHTML=listaMusicasHTML=function(soFav){
    const u=usuarioAtual(); let musicas=DB.musicas.slice();
    if(soFav){ const fv=DB.favoritos[u.email]||[]; musicas=musicas.filter(m=>fv.includes(m.id)); }
    const q=normTxt(filtroBusca).trim().split(/\s+/).filter(Boolean);
    const vis=musicas.filter(m=>{
      const okL = filtroLetra==='TODAS' || letra1(m.titulo)===filtroLetra;
      const alvo=normTxt(m.titulo+' '+(m.artista||'')+' '+String(m.letra||'').slice(0,4000));
      return okL && q.every(t=>alvo.includes(t)); });
    vis.sort((a,b)=>a.titulo.localeCompare(b.titulo,'pt'));
    return vis.length? vis.map(m=>`<div class="song-row" onclick="abrirMusica('${m.id}')">
      <div class="s-ic">🎵</div><div style="flex:1;min-width:0"><div class="s-nm">${esc(m.titulo)}</div><div class="s-ar">${esc(m.artista||'')}</div></div>
      <span class="star ${ehFav(m.id)?'on':''}" role="button" aria-label="Favoritar" onclick="toggleFav('${m.id}',event)">★</span></div>`).join('')
      : `<div class="empty"><div class="big">${soFav?'⭐':'🎵'}</div>${soFav?'Você ainda não tem favoritos. Toque na estrela de uma música.':'Nenhuma música encontrada.'}</div>`;
  };
}
if(typeof renderListaMusicas==='function'){
  const _rl=renderListaMusicas;
  window.renderListaMusicas=renderListaMusicas=function(soFav){
    let html=_rl(soFav);
    const tem=new Set(DB.musicas.map(m=>letra1(m.titulo)));
    html=html.replace(/<button class="([^"]*)" onclick="setLetra\('([A-Z])'\)">/g,(x,cls,l)=>'<button class="'+cls.replace(/\bhas\b/g,'').trim()+(tem.has(l)?' has':'')+'" onclick="setLetra(\''+l+'\')">');
    html=html.replace('placeholder="🔍 Buscar música ou artista..."','placeholder="🔍 Buscar por título, artista ou trecho da letra"');
    return html;
  };
}

/* ---------- 6) AO VIVO com hinos do Cantor Cristão ---------- */
window.ccAoVivo=function(n){
  const id='cc:'+n;
  if(!ehAdmin()) return;
  if(AO_VIVO&&AO_VIVO.ativo){
    if(AO_VIVO.musica_id===id){ if(confirm('Encerrar a transmissão ao vivo?')) encerrarAoVivo(); return; }
    trocarAoVivo(id,'cifra');
  } else iniciarAoVivo(id,'cifra');
  setTimeout(()=>{ try{ if(window.cantorRedesenhar) window.cantorRedesenhar(); }catch(e){} },500);
};
if(typeof aplicarAoVivo==='function'){
  const _av=aplicarAoVivo;
  window.aplicarAoVivo=aplicarAoVivo=function(force){
    const id=AO_VIVO&&AO_VIVO.ativo? String(AO_VIVO.musica_id||'') : '';
    if(id.indexOf('cc:')!==0) return _av(force);
    atualizaBannerVivo();
    if(ehAdmin()) return;
    const key=id+'|hino'; if(!force && key===_liveLast) return; _liveLast=key;
    if(window.cantorAbrir) window.cantorAbrir(+id.slice(3));
  };
}

/* ---------- 7) link direto e atalhos (#hino-123, ?go=cantor) ---------- */
function abrirLinkDireto(){
  try{
    const h=location.hash.match(/^#hino-(\d+)/);
    const g=new URLSearchParams(location.search).get('go');
    if(h && window.cantorAbrir){ window.cantorAbrir(+h[1]); }
    else if(g && typeof ROTAS!=='undefined' && ROTAS[g]){ go(g); }
    if(h||g) history.replaceState(history.state,'',location.pathname);
  }catch(e){}
}
window.ccCompartilhar=function(n){
  const hh=(window.HINOS||[]).find(x=>x.n===+n); const titulo=hh?hh.titulo:'';
  const url=location.origin+location.pathname+'#hino-'+n;
  const txt='Cantor Cristão '+n+' — '+titulo;
  if(navigator.share){ navigator.share({title:txt,text:txt,url}).catch(()=>{}); }
  else if(navigator.clipboard){ navigator.clipboard.writeText(txt+'\n'+url).then(()=>toast('Link copiado!'),()=>prompt('Copie o link:',url)); }
  else prompt('Copie o link:',url);
};
if(typeof iniciarApp==='function'){
  const _ia=iniciarApp;
  window.iniciarApp=iniciarApp=function(){ _ia.apply(this,arguments); setTimeout(()=>{ medirTopo(); abrirLinkDireto(); },50); };
}
addEventListener('hashchange',()=>{ if(/^#hino-\d+/.test(location.hash) && !$('#appShell').classList.contains('hidden')) abrirLinkDireto(); });
/* se o app já tinha iniciado antes deste arquivo carregar */
if(typeof _booted!=='undefined' && _booted) setTimeout(()=>{ medirTopo(); try{ atualizaBannerVivo(); aplicarAoVivo(true); }catch(e){} abrirLinkDireto(); },50);
medirTopo();
})();

/* ============================================================
   (v0.6.1) ADM: editar/excluir LETRA e excluir a MÚSICA inteira
============================================================ */
(function(){
'use strict';
if(typeof renderMusica!=='function') return;
const e = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const _rm=renderMusica;
window.renderMusica=renderMusica=function(){
  let h=_rm.apply(this,arguments);
  try{
    if(!ehAdmin() || typeof h!=='string') return h;
    const m=DB.musicas.find(x=>x.id===musicaAberta); if(!m) return h;
    const btMus='<button class="mini-btn sec mm-del" style="margin-bottom:10px;margin-left:6px" onclick="excluirMusicaInteira(\''+m.id+'\')">🗑️ Excluir música</button>';
    if(abaAtual==='cifra'){
      const k=h.indexOf('<div class="zoom-bar">'); if(k>=0) h=h.slice(0,k)+btMus+h.slice(k);
    } else if(abaAtual==='letra'){
      const bts='<button class="mini-btn" style="margin-bottom:10px" onclick="editarLetra(\''+m.id+'\')">✏️ '+(m.letra?'Editar letra':'Cadastrar letra')+'</button>'+
        (m.letra?'<button class="mini-btn sec" style="margin-bottom:10px;margin-left:6px" onclick="excluirLetra(\''+m.id+'\')">🗑️ Excluir letra</button>':'')+btMus;
      const k=h.indexOf('<div class="zoom-bar">'); if(k>=0) h=h.slice(0,k)+bts+h.slice(k);
    }
  }catch(_){}
  return h;
};
window.editarLetra=function(id){
  const m=DB.musicas.find(x=>x.id===id); if(!m||!ehAdmin()) return;
  abrirModal('<h3>Letra — '+e(m.titulo)+'</h3>'+
    '<div class="field"><label>Letra (deixe uma linha em branco entre as estrofes)</label><textarea id="lrTxt" rows="14" style="width:100%;font-size:15px;line-height:1.45">'+e(m.letra||'')+'</textarea></div>'+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarLetra(\''+id+'\')">Salvar</button></div>');
};
window.salvarLetra=async function(id){
  const m=DB.musicas.find(x=>x.id===id); if(!m) return;
  const letra=document.getElementById('lrTxt').value.replace(/\r/g,'').replace(/\n{3,}/g,'\n\n').trim();
  if(typeof sb!=='undefined'&&sb){ const {error}=await sb.from('musicas').update({letra}).eq('id',id); if(error) return toast('Erro ao salvar: '+error.message); }
  m.letra=letra; try{ saveDB(); }catch(_){} fecharModal(); toast('Letra salva.'); abrirMusica(id,'letra');
};
window.excluirLetra=async function(id){
  const m=DB.musicas.find(x=>x.id===id); if(!m||!ehAdmin()) return;
  if(!confirm('Excluir a letra de "'+m.titulo+'"? A cifra e o áudio continuam salvos. Esta ação não pode ser desfeita.')) return;
  if(typeof sb!=='undefined'&&sb){ const {error}=await sb.from('musicas').update({letra:''}).eq('id',id); if(error) return toast('Erro: '+error.message); }
  m.letra=''; try{ saveDB(); }catch(_){} toast('Letra excluída.'); abrirMusica(id,'letra');
};
window.excluirMusicaInteira=async function(id){
  const m=DB.musicas.find(x=>x.id===id); if(!m||!ehAdmin()) return;
  if(!confirm('Excluir a música "'+m.titulo+'" inteira (cifra, letra e áudios)?\n\nEla sai da lista de músicas, dos favoritos e da playlist.')) return;
  if(!confirm('Tem certeza? Esta ação não pode ser desfeita.')) return;
  if(typeof sb!=='undefined'&&sb){
    const r=await sb.rpc('excluir_musica',{p_id:String(id)});
    if(r.error){
      const {error}=await sb.from('musicas').delete().eq('id',id);
      if(error) return toast('Não foi possível excluir: '+error.message+' (rode a seção 12 do SQL).');
    }
    const ok=await sb.from('musicas').select('id').eq('id',id).maybeSingle();
    if(ok&&ok.data) return toast('O banco não permitiu excluir. Rode a seção 12 do SQL no Supabase.');
    /* tira da ordem do culto, se estiver lá */
    try{ const s=APP_CFG&&APP_CFG.setlist; if(s&&Array.isArray(s.itens)&&s.itens.includes(id)){ const tons=Object.assign({},s.tons); delete tons[id]; await salvarConfig('setlist',Object.assign({},s,{itens:s.itens.filter(x=>x!==id),tons})); } }catch(_){}
  }
  DB.musicas=DB.musicas.filter(x=>x.id!==id);
  if(DB.playlist&&Array.isArray(DB.playlist.musicas)) DB.playlist.musicas=DB.playlist.musicas.filter(x=>x!==id);
  Object.keys(DB.favoritos||{}).forEach(k=>{ DB.favoritos[k]=(DB.favoritos[k]||[]).filter(x=>x!==id); });
  try{ saveDB(); }catch(_){}
  toast('Música excluída.'); go(typeof paginaMusicas!=='undefined'?paginaMusicas:'musicas');
};
const st=document.createElement('style'); st.textContent='.mini-btn.mm-del{color:#b3261e!important;border-color:#efc2ba!important;background:#fff5f3!important}'; document.head.appendChild(st);
})();

/* ============================================================
   (v0.7.1) ADM: ÁUDIOS na aba Áudio da música
   🎙️ gravar pelo celular · 📁 enviar arquivo · 🔗 colar link · 🗑️ remover
   Destino: Google Drive (se configurado no Painel do ADM) ou
   Supabase Storage (bucket "audios", seção 14 do SQL).
============================================================ */
(function(){
'use strict';
if(typeof renderMusica!=='function') return;
const e = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $i = id => document.getElementById(id);
const MAX_MB=100;
const driveOk = () => { try{ return typeof driveClientId==='function' && !!driveClientId(); }catch(_){ return false; } };
const conectado = () => { try{ return typeof _gisTok!=='undefined' && !!_gisTok && Date.now()<_gisExp-60000; }catch(_){ return false; } };
/* conectar ao Drive precisa de um toque (o Google abre uma janela) */
window.conectarDrive=async function(){
  if(!driveOk()){ toast('Configure o Client ID do Google no Painel do ADM → Google Drive.'); return false; }
  try{ await ensureDriveToken(); toast('Conectado ao Google Drive ✔'); atualizaStatusDrive(); return true; }
  catch(err){ toast('Não conectou ao Drive: '+(err.message||err)); return false; }
};
function atualizaStatusDrive(){ const b=$i('auDrive'); if(b) b.outerHTML=statusDrive(); }
function statusDrive(){
  if(!driveOk()) return '<div id="auDrive" class="au-drv no">⚠️ Google Drive não configurado. Abra o <b>Painel do ADM → 📁 Google Drive</b> e cole o Client ID (o mesmo do login com Google).</div>';
  return conectado()? '<div id="auDrive" class="au-drv ok">✅ Conectado ao Google Drive — os áudios vão para a pasta <b>MM IBNM - Áudios</b>.</div>'
    : '<div id="auDrive" class="au-drv"><span>Os áudios vão para o Google Drive do Ministério.</span><button onclick="conectarDrive()">🔗 Conectar ao Drive</button></div>';
}
/* pasta "MM IBNM - Áudios" no Drive (criada uma vez e guardada na configuração) */
async function pastaDrive(token){
  const cfg=(typeof APP_CFG!=='undefined'&&APP_CFG.google_drive)||{};
  if(cfg.pasta) return cfg.pasta;
  const q=encodeURIComponent("name='MM IBNM - Áudios' and mimeType='application/vnd.google-apps.folder' and trashed=false");
  let r=await fetch('https://www.googleapis.com/drive/v3/files?q='+q+'&fields=files(id)',{headers:{Authorization:'Bearer '+token}});
  let j=r.ok? await r.json() : {}; let id=j.files&&j.files[0]&&j.files[0].id;
  if(!id){ r=await fetch('https://www.googleapis.com/drive/v3/files?fields=id',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({name:'MM IBNM - Áudios',mimeType:'application/vnd.google-apps.folder'})});
    if(!r.ok) throw new Error('Não consegui criar a pasta no Drive ('+r.status+'). Ative a "Google Drive API" no Google Cloud.'); id=(await r.json()).id; }
  try{ await salvarConfig('google_drive',Object.assign({},cfg,{client_id:driveClientId(),pasta:id})); }catch(_){}
  return id;
}
async function sobeDrive(blob,nomeArq){
  const token=await ensureDriveToken();
  const pasta=await pastaDrive(token);
  const fd=new FormData();
  fd.append('metadata',new Blob([JSON.stringify({name:nomeArq,parents:[pasta]})],{type:'application/json'}));
  fd.append('file',blob,nomeArq);
  const up=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{Authorization:'Bearer '+token},body:fd});
  if(!up.ok){ if(up.status===403) throw new Error('O Google recusou (403). Ative a "Google Drive API" no Google Cloud.'); if(up.status===401){ try{ _gisTok=null; }catch(_){} throw new Error('Conexão com o Drive expirou. Toque em "Conectar ao Drive".'); } throw new Error('Envio ao Drive falhou ('+up.status+').'); }
  const fid=(await up.json()).id;
  await fetch('https://www.googleapis.com/drive/v3/files/'+fid+'/permissions',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({role:'reader',type:'anyone'})}).catch(()=>{});
  return fid;
}
/* mantém compatível com o envio do editor de cifra (também vai para a pasta) */
window.uploadParaDrive=uploadParaDrive=async function(file,nome){ return sobeDrive(file,nome||file.name); };
const _rm=renderMusica;
window.renderMusica=renderMusica=function(){
  let h=_rm.apply(this,arguments);
  try{
    if(typeof h!=='string' || abaAtual!=='audio' || !ehAdmin()) return h;
    const m=DB.musicas.find(x=>x.id===musicaAberta); if(!m) return h;
    const k=h.lastIndexOf('</div>'); if(k<0) return h;
    h=h.slice(0,k)+cardAudios(m)+h.slice(k);
  }catch(_){}
  return h;
};
function cardAudios(m){
  const lista=(m.audios||[]).map((a,i)=>'<div class="au-it"><button class="au-pl" onclick="tocarAudioAdm(\''+m.id+'\','+i+',this)" aria-label="Ouvir">▶</button><span class="au-nm">'+e(a.nome||'Áudio '+(i+1))+'</span>'+
    '<button onclick="renomearAudio(\''+m.id+'\','+i+')" aria-label="Renomear">✏️</button><button onclick="excluirAudio(\''+m.id+'\','+i+')" aria-label="Excluir" class="au-del">🗑️</button></div>').join('')
    || '<p class="au-vz">Nenhum áudio ainda. Grave, envie um arquivo ou cole um link.</p>';
  const chips=['Voz guia','Playback','Ensaio','Original','Soprano','Contralto','Tenor','Baixo'].map(n=>'<button type="button" onclick="document.getElementById(\'auNome\').value=\''+n+'\'">'+n+'</button>').join('');
  return '<div class="card au-card"><h3>🎧 Áudios da música <span class="admin-tag">ADM</span></h3>'+
    '<div class="au-lista">'+lista+'</div>'+
    '<div class="field"><label>Nome do novo áudio</label><input id="auNome" placeholder="Ex.: Voz guia"><div class="au-chips">'+chips+'</div></div>'+
    statusDrive()+
    '<div class="au-acts">'+
      '<button class="au-b rec" id="auRecBt" onclick="gravarAudio(\''+m.id+'\')">🎙️ Gravar</button>'+
      '<button class="au-b" onclick="escolherArquivoAudio()">📁 Enviar arquivo</button><input id="auArq" type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac" hidden onchange="enviarArquivoAudio(\''+m.id+'\',this)">'+
      '<button class="au-b" onclick="linkAudio(\''+m.id+'\')">🔗 Colar link</button>'+
    '</div><div id="auRec"></div>'+
    (migraveis(m)?'<button class="au-b mig" onclick="moverParaDrive(\''+m.id+'\')">☁️ Mover '+migraveis(m)+' áudio(s) antigo(s) para o Drive</button>':'')+
    '<p class="au-dica">Gravações e arquivos vão direto para o Google Drive (pasta "MM IBNM - Áudios"), sem gastar a cota do Supabase.</p></div>';
}
function redesenha(){ const y=scrollY; abrirMusica(musicaAberta,'audio'); scrollTo(0,y); }
async function salvaLista(m){
  m.audios=m.audios||[];
  if(typeof sb!=='undefined'&&sb){ const {error}=await sb.from('musicas').update({audios:m.audios}).eq('id',m.id); if(error){ toast('Erro ao salvar: '+error.message); return false; } }
  else { try{ saveDB(); }catch(_){} }
  return true;
}
function nomeNovo(padrao){ const v=(($i('auNome')||{}).value||'').trim(); return v||padrao; }
async function sobe(m,blob,nome,ext){
  if(blob.size>MAX_MB*1024*1024) throw new Error('Arquivo grande demais (máx. '+MAX_MB+' MB).');
  if(!driveOk()) throw new Error('Configure o Google Drive no Painel do ADM.');
  const arq=(m.titulo+' - '+nome).replace(/[\\/:*?"<>|]+/g,' ').slice(0,90)+'.'+ext;
  const fid=await sobeDrive(blob,arq); return {url:driveUrl(fid),drive:fid};
}
async function adiciona(m,nome,url){
  const extra=(url&&typeof url==='object')? url : {url}; url=extra.url;
  m.audios=m.audios||[]; m.audios.push(Object.assign({nome},extra));
  if(await salvaLista(m)){ toast('Áudio "'+nome+'" adicionado! 🎧'); redesenha(); }
  else m.audios.pop();
}
window.escolherArquivoAudio=function(){
  if(!driveOk()) return toast('Configure o Google Drive no Painel do ADM primeiro.');
  if(!conectado()){ conectarDrive(); toast('Depois de conectar, toque de novo em "Enviar arquivo".'); return; }
  const i=$i('auArq'); if(i) i.click();
};
window.enviarArquivoAudio=async function(id,inp){
  const f=inp.files[0]; inp.value=''; if(!f) return;
  const m=DB.musicas.find(x=>x.id===id); if(!m) return;
  const nome=nomeNovo(f.name.replace(/\.[^.]+$/,'')); const ext=(f.name.split('.').pop()||'mp3').toLowerCase();
  toast('Enviando "'+nome+'" ao Google Drive…');
  try{ await adiciona(m,nome,await sobe(m,f,nome,ext)); }catch(err){ toast('Não foi possível enviar: '+(err.message||err)); }
};
window.linkAudio=function(id){
  const m=DB.musicas.find(x=>x.id===id); if(!m) return;
  let v=prompt('Cole o link do áudio (Google Drive, MP3, Dropbox…):'); if(!v) return; v=v.trim();
  let url=v; const drv=v.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=)([-\w]{20,})/);
  if(drv) url=driveUrl(drv[1]);
  else if(/^[-\w]{25,}$/.test(v)) url=driveUrl(v);
  else if(/dropbox\.com/.test(v)) url=v.replace(/[?&]dl=0/,'').replace('www.dropbox.com','dl.dropboxusercontent.com');
  else if(!/^https?:\/\//i.test(v)) return toast('Link inválido.');
  adiciona(m,nomeNovo('Áudio '+((m.audios||[]).length+1)),url);
};
window.renomearAudio=async function(id,i){
  const m=DB.musicas.find(x=>x.id===id); if(!m||!m.audios[i]) return;
  const n=prompt('Novo nome do áudio:',m.audios[i].nome||''); if(!n||!n.trim()) return;
  m.audios[i].nome=n.trim(); if(await salvaLista(m)) redesenha();
};
window.excluirAudio=async function(id,i){
  const m=DB.musicas.find(x=>x.id===id); if(!m||!m.audios[i]) return;
  const a=m.audios[i]; if(!confirm('Excluir o áudio "'+(a.nome||'')+'"?')) return;
  m.audios.splice(i,1);
  if(await salvaLista(m)){
    try{ const p=String(a.url).split('/storage/v1/object/public/audios/')[1]; if(p&&sb) await sb.storage.from('audios').remove([decodeURIComponent(p)]); }catch(_){}
    try{ const fid=a.drive||((String(a.url).match(/[?&]id=([-\w]{20,})/)||[])[1]); if(fid && conectado()) await fetch('https://www.googleapis.com/drive/v3/files/'+fid,{method:'DELETE',headers:{Authorization:'Bearer '+_gisTok}}); }catch(_){}
    toast('Áudio excluído.'); redesenha();
  } else m.audios.splice(i,0,a);
};
window.tocarAudioAdm=function(id,i,bt){
  const m=DB.musicas.find(x=>x.id===id); if(!m) return; const a=m.audios[i];
  const pl=$i('plAudio'); if(pl){ pl.src=a.url; pl.play().catch(()=>{}); const n=$i('plNome'); if(n) n.textContent=a.nome; scrollTo({top:0,behavior:'smooth'}); }
  else redesenha();
};

/* ---- áudios antigos guardados no Supabase → Drive ---- */
const ehSupabase = a => /\/storage\/v1\/object\/public\/audios\//.test(String(a&&a.url||''));
function migraveis(m){ return (m.audios||[]).filter(ehSupabase).length; }
window.moverParaDrive=async function(id){
  const m=DB.musicas.find(x=>x.id===id); if(!m) return;
  if(!driveOk()) return toast('Configure o Google Drive no Painel do ADM primeiro.');
  if(!conectado()){ const ok=await conectarDrive(); if(!ok) return; }
  let n=0;
  for(const a of (m.audios||[])){ if(!ehSupabase(a)) continue;
    try{ toast('Movendo "'+a.nome+'"…');
      const r=await fetch(a.url); if(!r.ok) throw new Error(r.status); const b=await r.blob();
      const ext=(String(a.url).split('.').pop()||'mp3').split('?')[0].slice(0,4);
      const fid=await sobeDrive(b,(m.titulo+' - '+a.nome).replace(/[\\/:*?"<>|]+/g,' ').slice(0,90)+'.'+ext);
      const velho=a.url; a.url=driveUrl(fid); a.drive=fid; n++;
      try{ const p=velho.split('/storage/v1/object/public/audios/')[1]; if(p) await sb.storage.from('audios').remove([decodeURIComponent(p)]); }catch(_){}
    }catch(err){ toast('Falhou em "'+a.nome+'": '+(err.message||err)); }
  }
  if(n && await salvaLista(m)){ toast(n+' áudio(s) movido(s) para o Drive.'); redesenha(); }
};

/* ---- gravação pelo microfone ---- */
let REC=null;
function tipoGravacao(){
  const ts=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/webm'];
  for(const t of ts){ try{ if(window.MediaRecorder && MediaRecorder.isTypeSupported(t)) return t; }catch(_){} }
  return '';
}
window.gravarAudio=async function(id){
  if(REC && REC.mr && REC.mr.state==='recording'){ REC.mr.stop(); return; }
  if(!window.MediaRecorder||!navigator.mediaDevices) return toast('Este navegador não grava áudio. Use "Enviar arquivo".');
  if(!driveOk()) return toast('Configure o Google Drive no Painel do ADM primeiro.');
  if(!conectado()){ const ok=await conectarDrive(); if(!ok) return; }
  let stream; try{ stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}}); }
  catch(_){ return toast('Permita o uso do microfone para gravar.'); }
  const tipo=tipoGravacao(); const mr=new MediaRecorder(stream,tipo?{mimeType:tipo,audioBitsPerSecond:64000}:{audioBitsPerSecond:64000});
  REC={mr,stream,partes:[],ini:Date.now(),id,timer:0};
  mr.ondataavailable=ev=>{ if(ev.data&&ev.data.size) REC.partes.push(ev.data); };
  mr.onstop=()=>{ clearInterval(REC.timer); REC.stream.getTracks().forEach(t=>t.stop());
    const blob=new Blob(REC.partes,{type:mr.mimeType||tipo||'audio/webm'}); REC.blob=blob; mostraPrevia(); };
  mr.start(1000);
  const bt=$i('auRecBt'); if(bt){ bt.classList.add('on'); bt.textContent='⏹ Parar (0:00)'; }
  REC.timer=setInterval(()=>{ const s=Math.floor((Date.now()-REC.ini)/1000); const b=$i('auRecBt'); if(b) b.textContent='⏹ Parar ('+Math.floor(s/60)+':'+String(s%60).padStart(2,'0')+')'; if(s>=600){ mr.stop(); toast('Gravação limitada a 10 minutos.'); } },500);
  try{ if('wakeLock' in navigator) navigator.wakeLock.request('screen').then(w=>{ REC.wl=w; }).catch(()=>{}); }catch(_){}
};
function mostraPrevia(){
  const box=$i('auRec'); const bt=$i('auRecBt'); if(bt){ bt.classList.remove('on'); bt.textContent='🎙️ Gravar'; }
  try{ if(REC.wl) REC.wl.release(); }catch(_){}
  if(!box||!REC||!REC.blob) return;
  const url=URL.createObjectURL(REC.blob); const kb=Math.round(REC.blob.size/1024);
  box.innerHTML='<div class="au-prev"><b>Gravação pronta</b> <small>('+(kb>1024?(kb/1024).toFixed(1)+' MB':kb+' KB')+')</small><audio controls src="'+url+'"></audio>'+
    '<div class="au-acts"><button class="au-b ok" onclick="salvarGravacao()">💾 Salvar na música</button><button class="au-b" onclick="descartarGravacao()">✕ Descartar</button></div></div>';
}
window.salvarGravacao=async function(){
  if(!REC||!REC.blob) return; const m=DB.musicas.find(x=>x.id===REC.id); if(!m) return;
  const t=REC.blob.type||''; const ext=/mp4|m4a|aac/.test(t)?'m4a':/ogg/.test(t)?'ogg':'webm';
  const nome=nomeNovo('Gravação '+new Date().toLocaleDateString('pt-BR'));
  const box=$i('auRec'); if(box) box.innerHTML='<p class="au-vz">Enviando gravação ao Google Drive…</p>';
  try{ const url=await sobe(m,REC.blob,nome,ext); REC=null; await adiciona(m,nome,url); }
  catch(err){ toast('Não foi possível salvar: '+(err.message||err)); mostraPrevia(); }
};
window.descartarGravacao=function(){ REC=null; const b=$i('auRec'); if(b) b.innerHTML=''; };

/* ---- atalho na aba Cifra para o ADM ---- */
const _rm2=renderMusica;
window.renderMusica=renderMusica=function(){
  let h=_rm2.apply(this,arguments);
  try{ if(typeof h==='string' && abaAtual==='cifra' && ehAdmin()){ const m=DB.musicas.find(x=>x.id===musicaAberta);
    const k=h.indexOf('<div class="zoom-bar">'); if(m && k>=0) h=h.slice(0,k)+'<button class="mini-btn sec" style="margin-bottom:10px;margin-left:6px" onclick="abrirMusica(\''+m.id+'\',\'audio\')">🎧 Áudios ('+((m.audios||[]).length)+')</button>'+h.slice(k); } }catch(_){}
  return h;
};

const st=document.createElement('style'); st.textContent=`
.au-card h3{display:flex;align-items:center;gap:8px}
.au-lista{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
.au-it{display:flex;align-items:center;gap:6px;background:#f4f7f5;border-radius:10px;padding:6px}
.au-it .au-nm{flex:1;min-width:0;font-weight:700;font-size:14px;color:var(--verde-escuro);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.au-it button{border:1px solid #cfdad4;background:#fff;border-radius:8px;min-width:36px;height:34px;font-size:14px}
.au-it .au-pl{background:var(--verde-med);color:#fff;border-color:var(--verde-med)}
.au-it .au-del{color:#b3261e}
.au-vz{font-size:13px;color:#8a9;padding:4px 2px}
.au-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
.au-chips button{border:1px solid #d6e2dc;background:#fff;border-radius:14px;padding:3px 10px;font-size:12px;font-weight:700;color:var(--verde-escuro)}
.au-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.au-b{flex:1;min-width:110px;height:44px;border-radius:12px;border:1px solid var(--verde-med);background:#fff;color:var(--verde-escuro);font-weight:800;font-size:14px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.au-b.rec{background:#c0392b;border-color:#c0392b;color:#fff}
.au-b.rec.on{animation:auPulse 1s infinite}
.au-b.ok{background:var(--verde-med);color:#fff}
@keyframes auPulse{50%{opacity:.6}}
.au-prev{margin-top:10px;background:#fff8dc;border:1px solid #f0d97a;border-radius:12px;padding:10px}
.au-prev audio{width:100%;margin:8px 0 2px}
.au-drv{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12.5px;background:#eef3fb;border:1px solid #c9d6ee;color:#25406b;border-radius:10px;padding:8px 10px;margin:8px 0 4px}
.au-drv span{flex:1;min-width:160px}
.au-drv button{border:0;background:#1a73e8;color:#fff;font-weight:800;border-radius:8px;height:34px;padding:0 12px}
.au-drv.ok{background:#e1f4ea;border-color:#b8e0c9;color:#1c6b47}
.au-drv.no{background:#fff3e6;border-color:#f3cf9f;color:#7a4a00}
.au-b.mig{flex-basis:100%;margin-top:6px;border-color:#1a73e8;color:#1a73e8}
.au-dica{font-size:11.5px;color:#7a8f86;margin-top:10px}
`; document.head.appendChild(st);
})();

/* ============================================================
   (v0.7.2) Painel do ADM: Google Drive explicado
============================================================ */
if(typeof cardDriveCfg==='function'){
  window.cardDriveCfg=cardDriveCfg=function(){
    const cid=(typeof driveClientId==='function'&&driveClientId())||''; const esc2=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    return '<div class="card"><h3>📁 Google Drive (áudios)</h3>'+
      '<p style="font-size:12.5px;color:#556;margin-bottom:8px">Todos os áudios gravados ou enviados no app vão para a pasta <b>MM IBNM - Áudios</b> no Google Drive. Cole aqui o <b>mesmo Client ID</b> do login com Google (termina em <i>.apps.googleusercontent.com</i>).</p>'+
      '<div class="field"><label>Client ID OAuth</label><input id="cfgGcid" value="'+esc2(cid)+'" placeholder="xxxx.apps.googleusercontent.com"></div>'+
      '<button class="mini-btn" onclick="salvarDriveCfg()">💾 Salvar Client ID</button>'+
      (cid?'<p style="font-size:11.5px;color:var(--verde-claro);margin-top:8px">✅ Client ID configurado.</p>':'')+
      '<p style="font-size:11.5px;color:#7a8f86;margin-top:8px">No Google Cloud, ative também a <b>Google Drive API</b> (APIs e serviços → Biblioteca → Google Drive API → Ativar).</p></div>';
  };
}

/* ============================================================
   (v0.7.2) Editor de cifra: campo INTRODUÇÃO (só o ADM vê o campo;
   os músicos veem a introdução no topo da cifra)
============================================================ */
(function(){
'use strict';
if(typeof editorCifra!=='function') return;
const e = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const RE_INTRO=/^\s*intro(?:du[cç][aã]o)?\s*[:\-–]\s*/i;
/* separa a introdução (1ª linha "Intro: ...") do resto da cifra */
function tirarIntro(el){
  let intro='';
  for(const n of [...el.childNodes]){
    const t=(n.textContent||'').replace(/\u00a0/g,' ');
    if(n.nodeType===1 && n.tagName==='BR') { n.remove(); continue; }
    if(!t.trim()){ if(n.nodeType===3 || !n.querySelector('img')) { n.remove(); continue; } }
    const prim=t.split('\n')[0];
    if(RE_INTRO.test(prim)){
      intro=prim.replace(RE_INTRO,'').trim();
      if(n.nodeType===3 && t.indexOf('\n')>=0) n.textContent=t.slice(t.indexOf('\n')+1);
      else n.remove();
      while(el.firstChild && ((el.firstChild.nodeType===1&&el.firstChild.tagName==='BR') || (!(el.firstChild.textContent||'').trim() && !(el.firstChild.querySelector&&el.firstChild.querySelector('img'))))) el.firstChild.remove();
    }
    break;
  }
  return intro;
}
const _ed=editorCifra;
window.editorCifra=editorCifra=function(id){
  const r=_ed.apply(this,arguments);
  try{
    const el=document.getElementById('edCifra'); if(!el || document.getElementById('edIntro')) return r;
    const intro=tirarIntro(el);
    const tb=document.getElementById('edTb');
    const campo='<div class="field ed-intro"><label>🎼 Introdução <small>(campo do ADM — os músicos veem a introdução no início da cifra)</small></label>'+
      '<input id="edIntro" value="'+e(intro)+'" placeholder="Ex.: G  D/F#  Em  C  (2x)" autocomplete="off" spellcheck="false"></div>';
    if(tb) tb.insertAdjacentHTML('beforebegin',campo); else el.insertAdjacentHTML('beforebegin',campo);
    try{ if(typeof edCommit==='function') edCommit(); }catch(_){}
  }catch(_){}
  return r;
};
/* ao salvar: a introdução entra no topo da cifra, em destaque */
if(typeof getCifraHtml==='function'){
  const _g=getCifraHtml;
  window.getCifraHtml=getCifraHtml=function(){
    const html=_g.apply(this,arguments);
    if(!window.__comIntro) return html;
    const v=((document.getElementById('edIntro')||{}).value||'').trim();
    return v? '<p><b style="color:#b8860b">Intro:</b> '+e(v)+'</p>'+html : html;
  };
}
if(typeof salvarCifra==='function'){
  const _s=salvarCifra;
  window.salvarCifra=salvarCifra=function(){ window.__comIntro=true; try{ return _s.apply(this,arguments); } finally { window.__comIntro=false; } };
}
/* transpor no editor também muda a introdução */
if(typeof transpor==='function'){
  const _t=transpor;
  window.transpor=transpor=function(ev,passo){
    _t.apply(this,arguments);
    try{ const i=document.getElementById('edIntro'); if(i && i.value.trim() && window.__transpTexto) i.value=window.__transpTexto(i.value,passo); }catch(_){}
  };
}
const st=document.createElement('style'); st.textContent='.ed-intro{background:#fffbea;border:1px solid #efe1a5;border-radius:10px;padding:8px 10px;margin-bottom:10px}.ed-intro label small{font-weight:600;color:#8a7a3a}.ed-intro input{font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:700;letter-spacing:.02em}';
document.head.appendChild(st);
})();

/* ============================================================
   (v0.7.3) CIFRA COLADA DO JEITO QUE VEM (Cifra Club etc.)
   - colar: texto puro, sem tabulação/espaço especial, alinhamento preservado
   - ver: sem quebra de linha (o acorde não sai de cima da sílaba);
     a letra diminui para caber na tela; acordes destacados
============================================================ */
(function(){
'use strict';
/* 1) colar no editor */
function normalizaColagem(t){
  return String(t||'').replace(/\r\n?/g,'\n').replace(/\u00a0/g,' ')
    .split('\n').map(l=>{ let o='',c=0; for(const ch of l){ if(ch==='\t'){ const n=4-(c%4); o+=' '.repeat(n); c+=n; } else { o+=ch; c++; } } return o.replace(/\s+$/,''); })
    .join('\n').replace(/\n{3,}/g,'\n\n').replace(/^\n+|\n+$/g,'');
}
document.addEventListener('paste',function(ev){
  const el=ev.target && ev.target.closest && ev.target.closest('#edCifra'); if(!el) return;
  ev.preventDefault(); ev.stopImmediatePropagation();
  const t=normalizaColagem((ev.clipboardData||window.clipboardData).getData('text')||'');
  if(!t) return;
  const html=t.split('\n').map(l=>'<div>'+(l? l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '<br>')+'</div>').join('');
  document.execCommand('insertHTML',false,html);
  try{ if(typeof edCommit==='function') edCommit(); if(typeof atualizaTom==='function') atualizaTom(); }catch(_){}
  toast('Cifra colada com o alinhamento original.');
},true);

/* 2) ver a cifra: sem quebrar linhas + caber na tela + destacar acordes */
function larguraLetra(el){
  const s=document.createElement('span'); s.textContent='M'.repeat(50);
  s.style.cssText='position:absolute;visibility:hidden;white-space:pre;font-size:100px;font-family:'+getComputedStyle(el).fontFamily;
  document.body.appendChild(s); const w=s.getBoundingClientRect().width/5000; s.remove(); return w||0.6;
}
window.__marcarAcordes=function(el){ marcarAcordes(el); };
/* destaca SOMENTE os acordes; a letra fica normal */
const COR_ACORDE='#a8350a';
function escH(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
const ehAc = t => (window.__ehAcorde||(()=>false))(t);
const ehLinhaC = t => (window.__ehLinhaCifra||(()=>false))(t);
const RE_INTRO=/^(\s*intro(?:du[cç][aã]o)?\s*[:\-–]\s*)(.*)$/i;
/* linha de acordes (ou "Intro: G D"): cada acorde vira <span class="cf-ac"> mantendo os espaços */
function htmlLinhaAcordes(l){
  const pi=l.match(RE_INTRO); let pre='', resto=l;
  if(pi){ pre='<span class="cf-lb">'+escH(pi[1])+'</span>'; resto=pi[2]; }
  return pre+resto.replace(/(\S+)|(\s+)/g,(m,tok,esp)=>{ if(esp) return esp; const k=tok.replace(/[(),]/g,''); return ehAc(k)? escH(tok).replace(escH(k),'<span class="cf-ac">'+escH(k)+'</span>') : (/^\[[^\]]*\]$/.test(tok)?'<span class="cf-lb">'+escH(tok)+'</span>':escH(tok)); });
}
function ehLinhaDeAcordes(t){ return ehLinhaC(t) || (RE_INTRO.test(t) && t.replace(RE_INTRO,'$2').trim().split(/\s+/).some(x=>ehAc(x.replace(/[(),]/g,'')))); }
/* acordes entre colchetes no meio da letra: [G]Senhor */
function marcaColchetes(root){
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null); const ns=[]; while(w.nextNode()) ns.push(w.currentNode);
  ns.forEach(n=>{ if(n.parentElement&&n.parentElement.closest('.cf-ac')) return; const v=n.nodeValue; if(!/\[[^\]\s]+\]/.test(v)) return;
    const sp=document.createElement('span'); sp.innerHTML=escH(v).replace(/\[([^\]\s]+)\]/g,(m,c)=>ehAc(c)?'[<span class="cf-ac">'+c+'</span>]':m);
    n.replaceWith(...sp.childNodes); });
}
function marcarAcordes(el){
  /* blocos (cada <div>/<p> é uma linha) */
  el.querySelectorAll('div,p').forEach(d=>{ if(d.querySelector('div,p')) return; const t=(d.textContent||'').replace(/\u00a0/g,' ');
    if(ehLinhaDeAcordes(t)){ d.innerHTML=htmlLinhaAcordes(t); d.classList.add('cf-ch'); }
    else if(/^\s*[A-Ga-g]?\|[-\d|hpbr\/\\~x\s]+\|?\s*$/.test(t)) d.classList.add('cf-tab');
    else if(/^\s*\[[^\]]+\]\s*$/.test(t)) d.classList.add('cf-sec'); });
  /* texto solto (cifra em texto puro e 1ª linha fora de bloco) */
  const soltos=[...el.childNodes].filter(n=>n.nodeType===3 || (n.nodeType===1 && n.matches('span.ch')));
  soltos.forEach(n=>{ const v=(n.textContent||''); if(!v.trim()) return;
    const sp=document.createElement('span');
    sp.innerHTML=v.split('\n').map(l=>{ const t=l.replace(/\u00a0/g,' '); return ehLinhaDeAcordes(t)? htmlLinhaAcordes(t) : escH(l); }).join('\n');
    n.replaceWith(...sp.childNodes); });
  marcaColchetes(el);
}
window.__marcarAcordes=function(el){ marcarAcordes(el); };
function ajustar(){
  const el=document.getElementById('zoomTarget'); if(!el||!el.classList.contains('cifra-box')) return;
  el.classList.add('cf-fit');
  const linhas=(el.innerText||'').replace(/\u00a0/g,' ').split('\n'); const max=Math.max(1,...linhas.map(l=>l.replace(/\s+$/,'').length));
  const cs=getComputedStyle(el); const disp=el.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)-2;
  const ideal=disp/(max*larguraLetra(el));
  const base=Math.max(11,Math.min(16,Math.floor(ideal*10)/10));
  el.dataset.base=String(base);
  try{ if(typeof _applyZoom==='function') _applyZoom(); }catch(_){}
}
function posCifra(){
  const el=document.getElementById('zoomTarget'); if(!el||!el.classList.contains('cifra-box')||el.dataset.cf) return;
  el.dataset.cf='1'; try{ marcarAcordes(el); }catch(_){} ajustar();
}
if(typeof renderMusica==='function'){
  const _rm=renderMusica;
  window.renderMusica=renderMusica=function(){ const h=_rm.apply(this,arguments); setTimeout(posCifra,5); return h; };
}
let _rz=0; addEventListener('resize',()=>{ clearTimeout(_rz); _rz=setTimeout(ajustar,150); });
const st=document.createElement('style'); st.textContent=`
.cifra-box.cf-fit{white-space:pre;overflow-x:auto;line-height:1.55;-webkit-text-size-adjust:none;text-size-adjust:none}
.cifra-box.cf-fit div,.cifra-box.cf-fit p{white-space:pre;margin:0}
.cifra-box.cf-fit,.cifra-box.cf-fit *{font-weight:400!important;font-style:normal!important;color:#262626!important;text-decoration:none!important;background:none!important;font-family:'Courier New',ui-monospace,monospace!important}
.cifra-box.cf-fit{background:#fffdf5!important}
.cifra-box.cf-fit .cf-ac{font-weight:800!important;color:#a8350a!important}
.cifra-box.cf-fit .cf-lb{color:#6b7c74!important}
.cifra-box.cf-fit .cf-sec{color:#6b7c74!important}
.editor-rich{white-space:pre!important;overflow-x:auto}
`; document.head.appendChild(st);
})();

/* ============================================================
   (v0.7.4) EDITOR DE CIFRA: 📄 IMPORTAR PDF
   Lê o texto do PDF (pdf.js) e monta a cifra mantendo cada acorde
   em cima da mesma sílaba em que está no PDF.
============================================================ */
(function(){
'use strict';
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
function carregaScript(src){ return new Promise((ok,er)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=()=>er(new Error('Sem internet para abrir o leitor de PDF.')); document.head.appendChild(s); }); }
async function pdfjs(){
  if(!window.pdfjsLib){ await carregaScript(PDFJS+'pdf.min.js'); }
  try{ pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+'pdf.worker.min.js'; }catch(_){}
  return window.pdfjsLib;
}
/* larguras relativas de cada letra (fonte proporcional do PDF) */
const cv=document.createElement('canvas').getContext('2d');
function largurasRel(str,neg){ cv.font=(neg?'bold ':'')+'100px Arial, Helvetica, sans-serif'; return [...str].map(c=>cv.measureText(c).width||50); }
/* cada item vira letras com posição x */
function letrasDoItem(it){
  const s=it.str||''; if(!s) return [];
  const ws=largurasRel(s,/bold|black|heavy/i.test(it.fontName||'')); const tot=ws.reduce((a,b)=>a+b,0)||1; const W=it.width||tot/100*it.fs;
  let x=it.x; return [...s].map((c,i)=>{ const o={c,x,w:ws[i]/tot*W}; x+=o.w; return o; });
}
const ehLinhaC = t => (window.__ehLinhaCifra||(()=>false))(t);
/* monta as linhas de uma página */
function linhasDaPagina(items){
  const its=items.filter(i=>i.str!=null).map(i=>({str:i.str,x:i.transform[4],y:i.transform[5],fs:Math.hypot(i.transform[2],i.transform[3])||i.height||10,width:i.width,fontName:i.fontName}));
  if(!its.length) return [];
  its.sort((a,b)=>b.y-a.y||a.x-b.x);
  const linhas=[];
  its.forEach(it=>{ const l=linhas.find(L=>Math.abs(L.y-it.y)<Math.min(L.fs,it.fs)*0.45); if(l){ l.its.push(it); l.fs=Math.max(l.fs,it.fs); } else linhas.push({y:it.y,fs:it.fs,its:[it]}); });
  linhas.sort((a,b)=>b.y-a.y);
  linhas.forEach(L=>{ L.its.sort((a,b)=>a.x-b.x); L.letras=[].concat(...L.its.map(letrasDoItem)); L.texto=L.letras.map(o=>o.c).join(''); });
  return linhas;
}
/* texto "normal": junta as letras e põe espaço onde há vão */
function textoNormal(L){
  let s='', ant=null;
  L.letras.forEach(o=>{ if(ant){ const gap=o.x-(ant.x+ant.w); if(gap>L.fs*0.18 && ant.c!==' ' && o.c!==' ') s+=' '.repeat(Math.max(1,Math.round(gap/(L.fs*0.28)))); } s+=o.c; ant=o; });
  return s.replace(/\s+$/,'');
}
/* linha de acordes: cada acorde vai para a coluna da letra (sílaba) que está embaixo dele */
function acordesSobre(Lc,Ll,txtLetra){
  const toks=[]; let atual=null;
  Lc.letras.forEach(o=>{ if(/\s/.test(o.c)){ atual=null; return; } if(!atual || o.x-(atual.fim)>Lc.fs*0.18){ atual={t:'',x:o.x,fim:o.x}; toks.push(atual); } atual.t+=o.c; atual.fim=o.x+o.w; });
  /* posição x de cada coluna do texto da letra */
  const cols=[]; { let s='', ant=null; Ll.letras.forEach(o=>{ if(ant){ const gap=o.x-(ant.x+ant.w); if(gap>Ll.fs*0.18 && ant.c!==' ' && o.c!==' '){ const n=Math.max(1,Math.round(gap/(Ll.fs*0.28))); for(let k=0;k<n;k++) cols.push(ant.x+ant.w+gap*k/n); } } cols.push(o.x); ant=o; }); }
  const larg=Ll.fs*0.5;
  let out='';
  toks.forEach(tk=>{
    let c=cols.findIndex(x=>x>=tk.x-larg*0.35);
    if(c<0) c=cols.length+Math.round((tk.x-(cols.length?cols[cols.length-1]:tk.x))/larg);
    if(c<out.length+(out.length?1:0)) c=out.length+(out.length?1:0);
    out+=' '.repeat(c-out.length)+tk.t;
  });
  return out;
}
function montaCifra(paginas){
  const out=[];
  paginas.forEach((linhas,pi)=>{
    if(pi>0 && out.length && out[out.length-1]!=='') out.push('');
    linhas.forEach((L,i)=>{
      const ant=linhas[i-1];
      if(ant && (ant.y-L.y)>Math.max(ant.fs,L.fs)*2.1 && out.length && out[out.length-1]!=='') out.push('');   /* espaço entre estrofes */
      const t=textoNormal(L);
      if(ehLinhaC(t)){
        const prox=linhas[i+1];
        if(prox && (L.y-prox.y)<L.fs*2.2 && !ehLinhaC(textoNormal(prox)) && prox.letras.length) out.push(acordesSobre(L,prox,textoNormal(prox)));
        else out.push(t);
      } else out.push(t);
    });
  });
  return out.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
window.__montaCifraPdf=montaCifra; window.__linhasPdf=linhasDaPagina;
window.importarPdfCifra=async function(inp){
  const f=inp.files&&inp.files[0]; inp.value=''; if(!f) return;
  try{
    toast('Lendo o PDF…');
    const lib=await pdfjs();
    const pdf=await lib.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;
    const paginas=[];
    for(let p=1;p<=pdf.numPages;p++){ const pg=await pdf.getPage(p); const tc=await pg.getTextContent(); paginas.push(linhasDaPagina(tc.items)); }
    const txt=montaCifra(paginas);
    if(!txt.trim()) return toast('Este PDF é uma imagem (escaneado). Não há texto para importar.');
    const el=document.getElementById('edCifra'); if(!el) return;
    const temAlgo=(el.innerText||'').trim().length>0;
    if(temAlgo && !confirm('Substituir a cifra atual pela do PDF?\n(Cancelar = adicionar no final)')){ el.focus(); const r=document.createRange(); r.selectNodeContents(el); r.collapse(false); const s=getSelection(); s.removeAllRanges(); s.addRange(r); }
    else { el.innerHTML=''; el.focus(); }
    const html=txt.split('\n').map(l=>'<div>'+(l? l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '<br>')+'</div>').join('');
    document.execCommand('insertHTML',false,html);
    try{ if(typeof edCommit==='function') edCommit(); if(typeof atualizaTom==='function') atualizaTom(); }catch(_){}
    toast('Cifra importada do PDF ('+pdf.numPages+' pág.). Confira e salve.');
  }catch(err){ toast('Não consegui ler o PDF: '+(err.message||err)); }
};
if(typeof editorCifra==='function'){
  const _ec=editorCifra;
  window.editorCifra=editorCifra=function(){
    const r=_ec.apply(this,arguments);
    try{ const tb=document.getElementById('edTb'); if(tb && !document.getElementById('edPdfBt')){
      tb.insertAdjacentHTML('beforebegin','<div class="ed-pdf"><label id="edPdfBt" class="mini-btn">📄 Importar cifra de PDF<input type="file" accept="application/pdf,.pdf" hidden onchange="importarPdfCifra(this)"></label><span>O texto vem com os acordes no mesmo lugar do PDF.</span></div>'); } }catch(_){}
    return r;
  };
}
const st=document.createElement('style'); st.textContent='.ed-pdf{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 10px}.ed-pdf label{cursor:pointer;margin:0}.ed-pdf span{font-size:12px;color:#6b8378}';
document.head.appendChild(st);
})();

/* ============================================================
   (v0.7.5) NOMES PRÓPRIOS E NOMES DE MÚSICAS: primeira letra de
   cada palavra maiúscula (siglas curtas como HCA, EBD ficam como estão)
============================================================ */
(function(){
'use strict';
/* palavras que ficam minúsculas no meio do nome/título */
const MINUSC=new Set(['a','o','as','os','e','de','da','do','das','dos','d','em','na','no','nas','nos','por','pelo','pela','pelos','pelas','para','pra','com','ao','aos','à','às','du','van','von','y']);
const SIGLAS=new Set(['HCA','EBD','IBNM','PIB','MM','CC','CCB','JMN','UMP','UPA','SAF','MDA','GLS','DVD','CD']);
let _frasesMaiusc=false;
function capPalavra(w){
  const letras=w.replace(/[^\p{L}]/gu,'');
  if(!letras) return w;
  const tudoMaiusc = letras===letras.toLocaleUpperCase('pt-BR') && letras!==letras.toLocaleLowerCase('pt-BR');
  if(tudoMaiusc && SIGLAS.has(letras)) return w;                                 /* siglas conhecidas */
  if(tudoMaiusc && letras.length<=3 && !_frasesMaiusc) return w;                 /* sigla curta no meio de texto normal */
  if(/^(i{1,3}|iv|v|vi{0,3}|ix|x)$/i.test(letras) && tudoMaiusc) return w;        /* números romanos */
  let base = tudoMaiusc ? w.toLocaleLowerCase('pt-BR') : w;                      /* TUDO MAIÚSCULO → normal */
  return base.replace(/\p{L}/u, c=>c.toLocaleUpperCase('pt-BR'));
}
window.capTitulo=function(s){
  if(s==null) return s; s=String(s);
  if(/^x+$/i.test(s.trim())) return s;                                            /* "xxxxxxxx" = não informado */
  const ls=s.replace(/[^\p{L}]/gu,''); _frasesMaiusc = ls.length>4 && ls===ls.toLocaleUpperCase('pt-BR');
  let primeira=true;
  const r=s.replace(/([^\s\-'’]+)|([\s\-'’]+)/g,(m,w,sep)=>{ if(sep) return sep;
    const x=capPalavra(w);
    if(!primeira && MINUSC.has(w.toLocaleLowerCase('pt-BR'))) { primeira=false; return w.toLocaleLowerCase('pt-BR'); }
    if(/\p{L}/u.test(w)) primeira=false; return x; });
  _frasesMaiusc=false; return r;
};
/* enquanto digita: maiúscula no início de cada palavra, menos "da, de, do, e, por…" (exceto a 1ª palavra) */
window.capDigitando=function(v){
  let primeira=true;
  return String(v).replace(/([^\s\-'’]+)|([\s\-'’]+)/g,(m,w,sep)=>{ if(sep) return sep;
    const low=w.toLocaleLowerCase('pt-BR');
    if(!primeira && MINUSC.has(low)){ return low; }
    if(/\p{L}/u.test(w)) primeira=false;
    return w.replace(/\p{L}/u,c=>c.toLocaleUpperCase('pt-BR')); });
};
const cap=window.capTitulo;
/* músicas: ao carregar */
function normMusicas(){ (DB.musicas||[]).forEach(m=>{ m.titulo=cap(m.titulo); m.artista=cap(m.artista); }); }
function normUsuarios(){ (DB.usuarios||[]).forEach(u=>{ if(u.nome) u.nome=cap(u.nome); }); }
if(typeof cloudMusicas==='function'){ const _cm=cloudMusicas; window.cloudMusicas=cloudMusicas=async function(){ await _cm.apply(this,arguments); normMusicas(); }; }
if(typeof cloudPerfis==='function'){ const _cp=cloudPerfis; window.cloudPerfis=cloudPerfis=async function(){ await _cp.apply(this,arguments); normUsuarios(); }; }
try{ normMusicas(); normUsuarios(); }catch(_){}
if(typeof iniciarApp==='function'){ const _ia3=iniciarApp; window.iniciarApp=iniciarApp=function(){ try{ normMusicas(); normUsuarios(); }catch(_){} return _ia3.apply(this,arguments); }; }
/* hinos e "músicas que já cantamos" */
try{ (window.HINOS||[]).forEach(h=>{ if(h.titulo) h.titulo=cap(h.titulo); }); }catch(_){}
try{ if(typeof MUSICAS_CANTADAS!=='undefined') MUSICAS_CANTADAS.forEach(m=>{ m.m=cap(m.m); if(m.a) m.a=cap(m.a); }); }catch(_){}
/* campos de digitação: título/artista da música e nomes de pessoas */
const CAMPOS=['nmTit','nmArt','edTit','edArt','cNome','cgNome','ePnome','mbNome'];
document.addEventListener('input',ev=>{
  const el=ev.target; if(!el || !CAMPOS.includes(el.id)) return;
  const p=el.selectionStart; const v=window.capDigitando(el.value);
  if(v!==el.value){ el.value=v; try{ el.setSelectionRange(p,p); }catch(_){} }
},true);
document.addEventListener('blur',ev=>{ const el=ev.target; if(el && CAMPOS.includes(el.id)) el.value=cap(el.value.replace(/\s+/g,' ').trim()); },true);
/* ao salvar música nova ou editada, grava já com as maiúsculas */
if(typeof sb!=='undefined' && sb && sb.from){
  const _from=sb.from.bind(sb);
  sb.from=function(t){
    const q=_from(t); if(t!=='musicas') return q;
    const fix=o=>{ if(o&&typeof o==='object'){ if('titulo' in o) o.titulo=cap(o.titulo); if('artista' in o) o.artista=cap(o.artista); } return o; };
    const ins=q.insert&&q.insert.bind(q), upd=q.update&&q.update.bind(q);
    if(ins) q.insert=(o,...r)=>ins(Array.isArray(o)?o.map(fix):fix(o),...r);
    if(upd) q.update=(o,...r)=>upd(fix(o),...r);
    return q;
  };
}
})();
