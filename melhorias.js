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
const ACORDE=/^\(?([A-G](?:#|b)?)((?:m|M|maj|min|dim|aug|sus|add|º|°|\+|-|\d|\(|\)|#|b)*)(?:\/([A-G](?:#|b)?))?\)?$/;
function nota(n,st,bem){ const i=IDX[n]; return i===undefined? n : (bem?BEM:SUS)[(i+st+120)%12]; }
function transpAcorde(tok,st,bem){
  const m=tok.match(ACORDE); if(!m) return tok;
  const pre=tok.startsWith('(')?'(':'', pos=tok.endsWith(')')&&tok.startsWith('(')?')':'';
  return pre+nota(m[1],st,bem)+m[2]+(m[3]?'/'+nota(m[3],st,bem):'')+pos;
}
function ehAcorde(tok){ return ACORDE.test(tok); }
function usaBemol(texto){ const b=(texto.match(/\b[A-G]b/g)||[]).length, s=(texto.match(/\b[A-G]#/g)||[]).length; return b>s; }
/* transpõe só linhas que são de acordes (evita mexer em "A graça", "E o Senhor"...) e acordes entre [ ] */
function transporTexto(txt,st,bem){
  return txt.split('\n').map(l=>{
    l=l.replace(/\[([^\]\s]+)\]/g,(m,c)=>'['+transpAcorde(c,st,bem)+']');
    const toks=l.trim().split(/\s+/).filter(Boolean);
    if(toks.length && toks.every(t=>ehAcorde(t)||/^[|/.\-x()]+$/.test(t)))
      return l.replace(/\S+/g,t=>ehAcorde(t)?transpAcorde(t,st,bem):t);
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
window.musTransp=function(id,d){ setTrMus(id,stMus(id)+d); const y=scrollY; abrirMusica(id,'cifra'); scrollTo(0,y); };
window.musTomOriginal=function(id){ setTrMus(id,0,true); const y=scrollY; abrirMusica(id,'cifra'); scrollTo(0,y); };

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
