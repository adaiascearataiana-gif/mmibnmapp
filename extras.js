/* ============================================================
   MM IBNM — Extras (v1.30.0)
   1) ⛪ Modo Culto: tela cheia, tela sempre acesa, deslizar o dedo
      para passar de música (na ordem do SETLIST)
   2) 🎚️ Ensaio com áudio: velocidade (sem mudar o tom) e repetir trecho A–B
   3) 📊 Estatísticas (ADM principal): mais cantadas, esquecidas,
      por mês e quem mais serviu
   4) 🧠 Escala inteligente: funções sem ninguém e pessoas escaladas
      muitas semanas seguidas
   5) 💰 Financeiro: gráfico de entradas e saídas dos últimos 6 meses
   6) 🧾 Recibo da doação PIX ao confirmar (WhatsApp ou copiar)
   7) 📥 Preparar o culto para usar sem internet
   8) 🔒 Comprovantes do Financeiro em espaço PRIVADO (só quem está
      logado vê) — precisa do SQL "comprovantes"; sem ele, segue como antes
============================================================ */
(function(){
'use strict';
const e = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* ===== um único "vigia" de tela para todo o extras (antes eram 18, cada um rodando a cada mudança) =====
   Junta as tarefas e roda todas juntas, uma vez, logo depois que a tela para de mudar. */
const _tarefas=[]; let _hubT=0, _hubN=0, _hubJan=Date.now();
function aoMudar(fn){ _tarefas.push(fn); }
function rodaTarefas(){ _hubT=0; const ag=Date.now(); if(ag-_hubJan>2000){ _hubJan=ag; _hubN=0; } _hubN++;
  for(const f of _tarefas){ try{ f(); }catch(err){ try{ console.warn('extras:',err); }catch(_){} } } }
new MutationObserver(()=>{ if(_hubT) return; _hubT=setTimeout(rodaTarefas, _hubN>25? 300 : 45); })
  .observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
const sem = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const $q = s => document.querySelector(s);
const admP = () => { try{ return (window.ehPrincipal? ehPrincipal() : ehAdmin()) && !(window.modoUsuario&&modoUsuario()); }catch(_){ return false; } };
const brl = v => (Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const MESES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const MES_EN={jan:0,feb:1,fev:1,mar:2,apr:3,abr:3,may:4,mai:4,jun:5,jul:6,aug:7,ago:7,sep:8,set:8,oct:9,out:9,nov:10,dec:11,dez:11};
function data(t){ /* aceita 2026-11-08, 08/11/2026, 08/11, 8-Nov */
  t=String(t||'').trim(); if(!t) return null; let m;
  if((m=t.match(/^(\d{4})-(\d{2})-(\d{2})/))) return new Date(+m[1],+m[2]-1,+m[3]);
  if((m=t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/))){ let a=m[3]? +m[3] : new Date().getFullYear(); if(a<100) a+=2000; return new Date(a,+m[2]-1,+m[1]); }
  if((m=t.match(/^(\d{1,2})[-\s]([A-Za-zç]{3})/))){ const mm=MES_EN[m[2].toLowerCase()]; if(mm!=null) return new Date(new Date().getFullYear(),mm,+m[1]); }
  return null;
}

/* ======================= 1) MODO CULTO ======================= */
let MC=null;
window.modoCultoIniciar=async function(){
  const bt=$q('.sl-acts .gold'); if(!bt){ toast('Monte o SETLIST antes de usar o Modo Culto.'); return; }
  MC={wl:null};
  try{ if(document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); }catch(_){}
  try{ if('wakeLock' in navigator) MC.wl=await navigator.wakeLock.request('screen'); }catch(_){}
  document.body.classList.add('modo-culto');
  bt.click();
  barraMC();
};
window.modoCultoSair=function(){
  document.body.classList.remove('modo-culto');
  try{ if(MC&&MC.wl) MC.wl.release(); }catch(_){}
  try{ if(document.fullscreenElement) document.exitFullscreen(); }catch(_){}
  MC=null; const b=$q('#mcBar'); if(b) b.remove();
};
function passo(d){ const nav=$q('.sl-nav'); if(!nav) return; const bs=nav.querySelectorAll('button'); const b=d<0? bs[0] : bs[bs.length-1]; if(b && !b.disabled){ b.click(); setTimeout(()=>scrollTo(0,0),60); } }
window.modoCultoPasso=passo;
function barraMC(){
  if($q('#mcBar')) return;
  document.body.insertAdjacentHTML('beforeend','<div id="mcBar"><button onclick="modoCultoPasso(-1)">◀ Anterior</button><button class="x" onclick="modoCultoSair()">✕ Sair</button><button onclick="modoCultoPasso(1)">Próxima ▶</button></div>');
}
let tx=0,ty=0;
document.addEventListener('touchstart',ev=>{ if(!MC) return; const t=ev.touches[0]; tx=t.clientX; ty=t.clientY; },{passive:true});
document.addEventListener('touchend',ev=>{ if(!MC) return; const t=ev.changedTouches[0]; const dx=t.clientX-tx, dy=t.clientY-ty;
  if(Math.abs(dx)>80 && Math.abs(dx)>Math.abs(dy)*1.8) passo(dx<0?1:-1); },{passive:true});
document.addEventListener('fullscreenchange',()=>{ if(MC && !document.fullscreenElement) modoCultoSair(); });
document.addEventListener('visibilitychange',async()=>{ if(MC && document.visibilityState==='visible'){ try{ MC.wl=await navigator.wakeLock.request('screen'); }catch(_){} } });

/* ======================= 2) ÁUDIO DE ENSAIO ======================= */
function barraAudio(a){
  if(a.dataset.ens || a.closest('.vz-novo,#modalBox')) return; a.dataset.ens='1';
  const id='ens'+Math.random().toString(36).slice(2,7); a.dataset.ensid=id;
  a.insertAdjacentHTML('afterend','<div class="ens-bar" id="'+id+'"><span>Velocidade</span>'+[0.5,0.75,1,1.25].map(v=>'<button data-v="'+v+'" class="'+(v===1?'on':'')+'">'+String(v).replace('.',',')+'x</button>').join('')+
    '<span class="sp"></span><button data-ab="a">A</button><button data-ab="b">B</button><button data-ab="x" title="Desligar repetição">⟲</button></div>');
  const bar=document.getElementById(id); let A=null,B=null;
  try{ a.preservesPitch=true; a.mozPreservesPitch=true; a.webkitPreservesPitch=true; }catch(_){}
  bar.addEventListener('click',ev=>{ const b=ev.target.closest('button'); if(!b) return;
    if(b.dataset.v){ a.playbackRate=+b.dataset.v; bar.querySelectorAll('[data-v]').forEach(x=>x.classList.toggle('on',x===b)); }
    if(b.dataset.ab==='a'){ A=a.currentTime; B=null; b.classList.add('on'); bar.querySelector('[data-ab="b"]').classList.remove('on'); toast('Início do trecho marcado ('+Math.floor(A)+'s). Toque em B no fim.'); }
    if(b.dataset.ab==='b'){ if(A==null) return toast('Marque o A primeiro.'); B=a.currentTime; if(B<=A+0.5){ B=null; return toast('O B precisa vir depois do A.'); } b.classList.add('on'); a.currentTime=A; a.play(); toast('Repetindo o trecho 🔁'); }
    if(b.dataset.ab==='x'){ A=B=null; bar.querySelectorAll('[data-ab]').forEach(x=>x.classList.remove('on')); toast('Repetição desligada.'); }
  });
  a.addEventListener('timeupdate',()=>{ if(A!=null && B!=null && a.currentTime>=B){ a.currentTime=A; } });
}
aoMudar(()=>document.querySelectorAll('#content audio').forEach(barraAudio));

/* ======================= 3+4) ESTATÍSTICAS + ESCALA INTELIGENTE ======================= */
function cantadas(){ try{ return (typeof MUSICAS_CANTADAS!=='undefined' && Array.isArray(MUSICAS_CANTADAS))? MUSICAS_CANTADAS : []; }catch(_){ return []; } }
function escala(){ try{ const E=DB.escala; return (E&&E.colunas&&E.linhas)? E : null; }catch(_){ return null; } }
function nomesCel(v){ return String(v||'').split(/[\/,;&+]|\s+e\s+/i).map(s=>s.trim()).filter(s=>s && !/^[-–—x.]+$/i.test(s) && !/^(a definir|ninguem|ninguém)$/i.test(s)); }
function analisaEscala(){
  const E=escala(); if(!E) return null;
  const cData=E.colunas.find(c=>/data/i.test(c)), cEv=E.colunas.find(c=>/evento|culto/i.test(c)), cDia=E.colunas.find(c=>/^dia/i.test(c));
  const papeis=E.colunas.filter(c=>c!==cData && c!==cEv && c!==cDia);
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  const linhas=E.linhas.map(l=>({l,d:data(cData? l.celulas[cData] : '')})).filter(x=>x.d);
  const prox=linhas.filter(x=>x.d>=hoje).slice(0,4);
  const vazios=[]; prox.forEach(x=>{ papeis.forEach(p=>{ if(!nomesCel(x.l.celulas[p]).length) vazios.push({d:x.d,ev:cEv? x.l.celulas[cEv]:'',p}); }); });
  /* sequência: a mesma pessoa em semanas seguidas */
  const seq={}; const ordem=linhas.filter(x=>x.d>=new Date(hoje.getTime()-56*864e5)).sort((a,b)=>a.d-b.d);
  const porSemana=[]; ordem.forEach(x=>{ const w=Math.floor(x.d.getTime()/(7*864e5)); let s=porSemana.find(y=>y.w===w); if(!s){ s={w,n:new Set()}; porSemana.push(s); } papeis.forEach(p=>nomesCel(x.l.celulas[p]).forEach(n=>s.n.add(n))); });
  const run={}, max={};
  porSemana.sort((a,b)=>a.w-b.w).forEach((s,i)=>{ const prev=i? porSemana[i-1] : null; const cont=prev && s.w-prev.w===1;
    s.n.forEach(n=>{ run[n]= cont && prev.n.has(n) ? (run[n]||1)+1 : 1; max[n]=Math.max(max[n]||0,run[n]); }); });
  const seguidas=Object.keys(max).filter(n=>max[n]>=3).map(n=>({n,q:max[n]})).sort((a,b)=>b.q-a.q);
  /* quem mais serviu (todas as datas passadas) */
  const conta={}; linhas.filter(x=>x.d<hoje).forEach(x=>papeis.forEach(p=>nomesCel(x.l.celulas[p]).forEach(n=>{ conta[n]=(conta[n]||0)+1; })));
  const top=Object.keys(conta).map(n=>({n,q:conta[n]})).sort((a,b)=>b.q-a.q).slice(0,10);
  return {vazios,seguidas,top};
}
function cardEscalaInteligente(){
  const A=analisaEscala(); if(!A) return '';
  const fd=d=>String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0');
  return '<div class="card ex-card"><h3>🧠 Escala inteligente</h3>'+
    (A.vazios.length? '<p class="ex-t">⚠️ Funções sem ninguém nos próximos cultos:</p><ul class="ex-l">'+A.vazios.slice(0,12).map(v=>'<li><b>'+fd(v.d)+'</b> '+e(v.ev||'')+' — '+e(v.p)+'</li>').join('')+'</ul>' : '<p class="ex-ok">✅ Todas as funções dos próximos cultos estão preenchidas.</p>')+
    (A.seguidas.length? '<p class="ex-t">🔁 Escalados muitas semanas seguidas (cansaço):</p><ul class="ex-l">'+A.seguidas.slice(0,10).map(s=>'<li>'+e(s.n)+' — <b>'+s.q+' semanas</b></li>').join('')+'</ul>' : '')+
    '</div>';
}
function barras(lista,cor){ const mx=Math.max(1,...lista.map(x=>x.q));
  return '<div class="ex-bars">'+lista.map(x=>'<div class="ex-bar"><span class="n">'+e(x.n)+'</span><span class="b"><i style="width:'+Math.max(4,Math.round(x.q*100/mx))+'%;background:'+cor+'"></i></span><span class="q">'+x.q+'</span></div>').join('')+'</div>'; }
if(typeof ROTAS!=='undefined'){
  ROTAS.estatisticas=function(){
    if(!admP()) return '<div class="page"><div class="empty">Acesso restrito ao ADM principal.</div></div>';
    const C=cantadas(); const hoje=new Date();
    const cont={}, ult={};
    C.forEach(r=>{ const k=sem(r.m); if(!k) return; cont[k]=(cont[k]||{n:r.m,q:0}); cont[k].q++; const d=data(r.d); if(d && (!ult[k]||d>ult[k])) ult[k]=d; });
    const top=Object.values(cont).sort((a,b)=>b.q-a.q).slice(0,10);
    const rep=(DB.musicas||[]).filter(m=>m.publicada!==false);
    const esquecidas=rep.map(m=>{ const k=sem(m.titulo); return {n:m.titulo,d:ult[k]||null}; }).filter(x=>!x.d || (hoje-x.d)>90*864e5).sort((a,b)=>(a.d?a.d.getTime():0)-(b.d?b.d.getTime():0)).slice(0,15);
    const meses=[]; for(let i=5;i>=0;i--){ const d=new Date(hoje.getFullYear(),hoje.getMonth()-i,1); meses.push({k:d.getFullYear()+'-'+d.getMonth(),n:MESES[d.getMonth()],q:0}); }
    C.forEach(r=>{ const d=data(r.d); if(!d) return; const m=meses.find(x=>x.k===d.getFullYear()+'-'+d.getMonth()); if(m) m.q++; });
    const A=analisaEscala();
    return '<div class="page"><div class="page-ttl">📊 Estatísticas do ministério</div>'+
      '<div class="card"><h3>🎵 Mais cantadas</h3>'+(top.length? barras(top.map(x=>({n:x.n,q:x.q})),'var(--verde-med)') : '<p class="ex-vz">Sem histórico de músicas cantadas ainda.</p>')+'</div>'+
      '<div class="card"><h3>📅 Músicas cantadas por mês</h3>'+barras(meses,'var(--dourado)')+'</div>'+
      '<div class="card"><h3>💤 Esquecidas (mais de 3 meses sem cantar)</h3>'+(esquecidas.length? '<ul class="ex-l">'+esquecidas.map(x=>'<li>'+e(x.n)+' — <small>'+(x.d? 'última vez em '+x.d.toLocaleDateString('pt-BR') : 'nunca cantada')+'</small></li>').join('')+'</ul>' : '<p class="ex-ok">✅ Todo o repertório foi cantado nos últimos 3 meses.</p>')+'</div>'+
      (A&&A.top.length? '<div class="card"><h3>🙌 Quem mais serviu (escala)</h3>'+barras(A.top,'#2e86c1')+'</div>' : '')+
      cardEscalaInteligente()+'</div>';
  };
  if(ROTAS.admin){ const _ad=ROTAS.admin; ROTAS.admin=function(){ const h=_ad.apply(this,arguments); if(!admP()) return h;
    const card='<div class="card"><h3>📊 Estatísticas</h3><p style="font-size:13px;color:#556;margin-bottom:10px">Mais cantadas, esquecidas, por mês, quem mais serviu e alertas da escala.</p><button class="mini-btn" onclick="go(\'estatisticas\')">Abrir estatísticas</button></div>';
    const i=h.indexOf('<div class="card">'); return i>=0? h.slice(0,i)+card+h.slice(i) : h+card; }; }
  if(ROTAS.escala){ const _es=ROTAS.escala; ROTAS.escala=function(){ const h=_es.apply(this,arguments); if(!admP()) return h; const c=cardEscalaInteligente(); if(!c) return h;
    const i=h.lastIndexOf('</div>'); return i>=0? h.slice(0,i)+c+h.slice(i) : h+c; }; }
  /* Playlist: Modo Culto + preparar sem internet */
  if(ROTAS.playlist){ const _pl=ROTAS.playlist; ROTAS.playlist=function(){ const h=_pl.apply(this,arguments); if(h.indexOf('class="gold"')<0) return h;
    const bt='<div class="ex-pl"><button class="mini-btn" onclick="modoCultoIniciar()">⛪ Modo Culto (tela cheia)</button><button class="mini-btn sec" onclick="prepararOffline()">📥 Preparar para usar sem internet</button></div>';
    const k=h.indexOf('</div>',h.indexOf('page-ttl')); return k>=0? h.slice(0,k+6)+bt+h.slice(k+6) : bt+h; }; }
  /* Financeiro: gráfico */
  if(ROTAS.financeiro){ const _fi=ROTAS.financeiro; ROTAS.financeiro=function(){ let h=_fi.apply(this,arguments); setTimeout(graficoFin,80);
    if(!podeFin()){ h=soSaidas(h); setTimeout(saldoMembro,60); }
    h=finCompacto(h);
    return h+'<div class="card" id="exFin"><h3>📈 '+(podeFin()?'Entradas e saídas':'Saídas')+' (6 meses)</h3><p class="ex-vz">Carregando…</p></div>'; }; }
}
/* Financeiro: ADM principal (fora do Modo usuário) e o ADM secundário a quem o principal
   LIBEROU o Financeiro no Painel de ADMs veem e fazem TUDO.
   Todos os outros (membros e ADMs sem essa liberação): saldo em tempo real + SAÍDAS no relatório. */
function podeFin(){ try{
  if(window.ehPrincipal && ehPrincipal()) return !(window.modoUsuario && modoUsuario());
  return !!(window.secaoLiberada && secaoLiberada('financeiro'));
}catch(_){ return false; } }
if(typeof window.podeSetor==='function'){
  const _ps=window.podeSetor;
  window.podeSetor=function(p){ if(p==='financeiro') return podeFin(); return _ps.apply(this,arguments); };
}
function soSaidas(h){
  const box=document.createElement('div'); box.innerHTML=h;
  /* cartão do saldo: continua o saldo em tempo real; sai só o valor das entradas */
  const cards=[...box.querySelectorAll('.card')];
  const saldo=cards.find(c=>/Saldo do m/i.test(c.textContent));
  if(saldo){ [...saldo.querySelectorAll('span')].forEach(x=>{ if(/Entradas/.test(x.textContent)) x.remove(); });
    const big=[...saldo.querySelectorAll('div')].find(d=>/font-size:\s*3\d/.test(d.getAttribute('style')||'')); if(big) big.id='exSaldoMes';
    const sai=[...saldo.querySelectorAll('span')].find(x=>/Saídas/.test(x.textContent)); if(sai) sai.id='exSaiMes';
    const tot=saldo.querySelector('b'); if(tot) tot.id='exSaldoTot'; }
  /* lista: tira as entradas */
  box.querySelectorAll('.info-row').forEach(r=>{ const t=(r.textContent||'').trim(); if(/^▲/.test(t)) r.remove(); });
  box.querySelectorAll('h3').forEach(x=>{ x.innerHTML=x.innerHTML.replace(/^Lançamentos de/,'Saídas de'); });
  box.querySelectorAll('button').forEach(b=>{ if(/Lançamentos/.test(b.textContent)) b.textContent='📄 Saídas'; });
  const lista=[...box.querySelectorAll('.card')].find(c=>/^Saídas de/.test((c.querySelector('h3')||{}).textContent||''));
  if(lista && !lista.querySelector('.info-row')) lista.insertAdjacentHTML('beforeend','<div class="empty">Nenhuma saída neste mês.</div>');
  return box.innerHTML;
}
/* membros não recebem as entradas uma a uma: o saldo vem do resumo do banco (fin_resumo) */
/* botões compactos, abas numa linha só e "＋ Entrada" sempre presente para quem pode lançar */
function finCompacto(h){
  const box=document.createElement('div'); box.innerHTML=h;
  const pg=box.querySelector('.fin-page')||box;
  pg.classList.add('fin-cmp');
  /* sem botão "＋ Entrada": as entradas vêm das doações confirmadas */
  pg.querySelectorAll('button').forEach(b=>{ if(/Entrada/.test(b.textContent) && /finForm/.test(b.getAttribute('onclick')||'')) b.remove(); });
  pg.querySelectorAll('button').forEach(b=>{
    const t=b.textContent.trim();
    if(/finSetAba/.test(b.getAttribute('onclick')||'')){
      if(/Lançamentos/.test(t)) b.textContent='Lançamentos';
      else if(/Saídas/.test(t)) b.textContent='Saídas';
      else if(/Doações recebidas|Recebidas/.test(t)) b.textContent='Doações recebidas';
      else if(/Minhas/.test(t)) b.textContent= podeFin()? 'Minhas' : 'Minhas doações';
    }
    else if(/Excluir$/.test(t) && /doaExcluir|finExcluir/.test(b.getAttribute('onclick')||'')){ b.textContent='🗑'; b.title='Excluir'; b.classList.add('fin-ic'); }
    if(/doaConf|doaRej/.test(b.getAttribute('onclick')||'')){ b.classList.add('fin-ic'); b.title=/doaConf/.test(b.getAttribute('onclick'))?'Confirmar':'Recusar'; }
  });
  const abas=[...pg.querySelectorAll('div')].find(d=>d.querySelectorAll(':scope > button').length>=2 && [...d.querySelectorAll(':scope > button')].every(b=>/finSetAba/.test(b.getAttribute('onclick')||'')));
  if(abas) abas.classList.add('fin-abas');
  return box.innerHTML;
}
async function saldoMembro(){
  try{ const sel=document.getElementById('finMes'); const mes=(sel&&sel.value)||new Date().toISOString().slice(0,7);
    const {data:r,error}=await sb.rpc('fin_resumo',{p_mes:mes}); if(error||!r) return;
    const a=document.getElementById('exSaldoMes'), b=document.getElementById('exSaiMes'), c=document.getElementById('exSaldoTot');
    const sm=(Number(r.ent)||0)-(Number(r.sai)||0);
    if(a){ a.textContent=brl(sm); a.style.color= sm>=0? '#1c7a4e' : '#b33'; }
    if(b) b.textContent='▼ Saídas '+brl(r.sai);
    if(c) c.textContent=brl(r.total);
  }catch(_){}
}
async function graficoFin(){
  const box=document.getElementById('exFin'); if(!box||typeof sb==='undefined') return;
  try{
    const {data:rs,error}=await sb.from('financeiro').select('tipo,valor,data'); if(error) throw error;
    const hoje=new Date(); const ms=[]; for(let i=5;i>=0;i--){ const d=new Date(hoje.getFullYear(),hoje.getMonth()-i,1); ms.push({k:d.getFullYear()+'-'+d.getMonth(),n:MESES[d.getMonth()],en:0,sa:0}); }
    (rs||[]).forEach(r=>{ const d=data(r.data); if(!d) return; const m=ms.find(x=>x.k===d.getFullYear()+'-'+d.getMonth()); if(!m) return; if(r.tipo==='entrada') m.en+=Number(r.valor)||0; else m.sa+=Number(r.valor)||0; });
    const mx=Math.max(1,...ms.map(m=>Math.max(m.en,m.sa)));
    const P=podeFin(); const mx2=P? mx : Math.max(1,...ms.map(m=>m.sa));
    box.innerHTML='<h3>📈 '+(P?'Entradas e saídas':'Saídas')+' (6 meses)</h3><div class="ex-fin">'+ms.map(m=>'<div class="c"><div class="bb">'+(P?'<i class="en" style="height:'+Math.round(m.en*100/mx2)+'%" title="'+brl(m.en)+'"></i>':'')+'<i class="sa" style="height:'+Math.round(m.sa*100/mx2)+'%" title="'+brl(m.sa)+'"></i></div><small>'+m.n+'</small></div>').join('')+'</div>'+
      (P? '<div class="ex-leg"><span><i class="en"></i>Entradas</span><span><i class="sa"></i>Saídas</span></div><p class="ex-vz">Neste mês: entradas <b>'+brl(ms[5].en)+'</b> · saídas <b>'+brl(ms[5].sa)+'</b></p>'
         : '<p class="ex-vz">Saídas neste mês: <b>'+brl(ms[5].sa)+'</b></p>');
  }catch(_){ box.innerHTML='<h3>📈 Entradas e saídas</h3><p class="ex-vz">Não foi possível carregar o gráfico agora.</p>'; }
}

/* ======================= 6) RECIBO DA DOAÇÃO ======================= */
if(typeof window.doaConf==='function'){
  const _dc=window.doaConf;
  window.doaConf=async function(id){
    let d=null; try{ const r=await sb.from('doacoes').select('*').eq('id',id).single(); d=r.data; }catch(_){}
    await _dc.apply(this,arguments);
    try{ const r=await sb.from('doacoes').select('status').eq('id',id).single(); if(r.data && r.data.status==='confirmada' && d) recibo(d); }catch(_){}
  };
}
function recibo(d){
  const quem=(DB.usuarios||[]).find(u=>u.id===d.user_id)||{};
  const tel=String(quem.wpp_num||quem.tel||'').replace(/\D/g,''); const fone=tel? (tel.length<=11?'55'+tel:tel) : '';
  const txt='🧾 *Recibo de doação — Ministério de Música IBNM*\n\nRecebemos de *'+(d.nome||quem.nome||'irmão(ã)')+'* a doação de *'+brl(d.valor)+'* em '+new Date().toLocaleDateString('pt-BR')+'.\n\nMuito obrigado! Deus abençoe a sua vida. 🙏';
  window.__reciboTxt=txt;
  abrirModal('<h3>🧾 Recibo da doação</h3><pre class="ex-rec">'+e(txt)+'</pre><div class="modal-acts"><button class="btn btn-dark" onclick="navigator.clipboard&&navigator.clipboard.writeText(window.__reciboTxt);toast(\'Recibo copiado.\')">Copiar</button>'+
    '<a class="btn btn-primary" style="text-align:center;text-decoration:none" target="_blank" rel="noopener" href="https://wa.me/'+fone+'?text='+encodeURIComponent(txt)+'">Enviar no WhatsApp</a></div>');
}

/* ======================= 7) SEM INTERNET ======================= */
window.prepararOffline=async function(){
  toast('Preparando… mantenha o app aberto.');
  const arqs=['./','index.html','hinos.js','harpa_data.js'];
  try{ const P=(APP_CFG&&(APP_CFG.setlist||{}).itens)||[]; P.forEach(id=>{ if(String(id).indexOf('hr:')===0) arqs.push('partituras_harpa/h'+String(id).slice(3).padStart(3,'0')+'.jpg'); }); }catch(_){}
  let ok=0; for(const a of arqs){ try{ const r=await fetch(a,{cache:'reload'}); if(r.ok) ok++; }catch(_){} }
  toast('✅ Pronto: músicas, cifras, hinos e letras do culto ficam disponíveis sem internet. (Áudios do Drive precisam de internet.)');
};

/* ======================= 8) COMPROVANTES PRIVADOS ======================= */
/* Os comprovantes (pasta financeiro/ do espaço "anexos") passam a ir para o espaço
   PRIVADO "comprovantes". O endereço guardado tem a marca /__priv__/ e o app gera
   um link temporário (1 h) na hora de ver. Se o espaço privado ainda não existir,
   continua tudo como antes. */
const MARCA='/storage/v1/object/public/anexos/__priv__/';
const privPath = u => { const s=String(u||''); const i=s.indexOf(MARCA); return i>=0? s.slice(i+MARCA.length).split('?')[0] : ''; };
async function linkPriv(u){ const p=privPath(u); if(!p) return u; const r=await sb.storage.from('comprovantes').createSignedUrl(p,3600); if(r.error) throw r.error; return r.data.signedUrl; }
try{
  if(typeof sb!=='undefined' && sb && sb.storage && !sb.storage.__priv){
    const _from=sb.storage.from.bind(sb.storage); const redir=new Set();
    sb.storage.from=function(bucket){
      const b=_from(bucket); if(bucket!=='anexos') return b;
      const up=b.upload.bind(b), pub=b.getPublicUrl.bind(b);
      b.upload=async function(path,body,opts){
        if(String(path).indexOf('financeiro/')===0){
          try{ const r=await _from('comprovantes').upload(path,body,opts); if(!r.error){ redir.add(path); return r; } }catch(_){}
        }
        return up(path,body,opts);
      };
      b.getPublicUrl=function(path){ if(redir.has(path)){ const base=String(pub('x').data.publicUrl).split('/storage/v1/')[0]; return {data:{publicUrl:base+MARCA+path}}; } return pub(path); };
      return b;
    };
    sb.storage.__priv=true;
  }
}catch(_){}
/* ver o comprovante */
if(typeof window.finVerAnexo==='function'){
  const _va=window.finVerAnexo;
  window.finVerAnexo=async function(u){ if(!privPath(u)) return _va(u); try{ return _va(await linkPriv(u)); }catch(err){ toast('Não consegui abrir o comprovante: '+(err.message||err)); } };
}
/* cópia automática para o Drive do ADM: busca o arquivo privado pelo link temporário */
const _fetch=window.fetch.bind(window);
window.fetch=async function(input,init){ try{ const u=typeof input==='string'? input : (input&&input.url); if(u && privPath(u)) return _fetch(await linkPriv(u),init); }catch(_){} return _fetch(input,init); };

/* ======================= 9) CAMPOS DE VALOR EM R$ ======================= */
/* Os números entram da direita para a esquerda: 6 → R$ 0,06 · 64 → R$ 0,64 · 649 → R$ 6,49 …
   O campo original (que o app lê) fica escondido e recebe o número puro (ex.: 6.49). */
const fmtBR = c => 'R$ '+(c/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
function mascara(orig){
  if(orig.dataset.rs) return; orig.dataset.rs='1';
  const vis=document.createElement('input');
  vis.type='text'; vis.inputMode='numeric'; vis.autocomplete='off'; vis.className='rs-in';
  vis.setAttribute('style',orig.getAttribute('style')||''); vis.placeholder=(orig.placeholder||'Valor').replace(/\s*\(R\$\)\s*/,'')+' (R$ 0,00)';
  let cent=Math.round((parseFloat(orig.value)||0)*100);
  const pinta=()=>{ vis.value= cent? fmtBR(cent) : ''; };
  const grava=()=>{ orig.value= cent? (cent/100).toFixed(2) : ''; orig.dispatchEvent(new Event('input',{bubbles:true})); orig.dispatchEvent(new Event('change',{bubbles:true})); };
  pinta();
  vis.addEventListener('beforeinput',ev=>{
    ev.preventDefault();
    if(ev.inputType && ev.inputType.indexOf('delete')===0) cent=Math.floor(cent/10);
    else { const d=String(ev.data||'').replace(/\D/g,''); for(const ch of d){ if(String(cent).length<11) cent=cent*10+(+ch); } }
    pinta(); grava(); requestAnimationFrame(()=>{ try{ vis.setSelectionRange(vis.value.length,vis.value.length); }catch(_){} });
  });
  vis.addEventListener('input',()=>{ const d=vis.value.replace(/\D/g,''); cent=d? Math.min(+d,99999999999) : 0; pinta(); grava(); });   /* teclados que não enviam beforeinput */
  vis.addEventListener('focus',()=>setTimeout(()=>{ try{ vis.setSelectionRange(vis.value.length,vis.value.length); }catch(_){} },0));
  orig.style.display='none'; orig.insertAdjacentElement('afterend',vis);
  /* valores colocados pelo app (botões de valor pronto, edição) */
  const t=setInterval(()=>{ if(!orig.isConnected){ clearInterval(t); return; } if(document.activeElement===vis) return;
    const c=Math.round((parseFloat(orig.value)||0)*100); if(c!==cent){ cent=c; pinta(); } },300);
}
function procuraValores(){ document.querySelectorAll('#lfValor,#finValor,#ivValor,input[type=number][placeholder*="R$"]').forEach(mascara); }
aoMudar(procuraValores);

/* ======================= 11) LANÇAMENTO = SÓ SAÍDA ======================= */
/* As entradas vêm das doações confirmadas. No formulário some o "Entrada/Saída":
   lançamento novo é sempre SAÍDA; ao editar, mantém o tipo que já era. */
function soSaidaNoForm(){
  const sel=document.querySelector('#modalBox #lfTipo'); if(!sel || sel.dataset.sx) return; sel.dataset.sx='1';
  const h=document.querySelector('#modalBox h3'); const novo=h && /Novo/.test(h.textContent);
  if(novo){ sel.value='saida'; sel.dispatchEvent(new Event('change',{bubbles:true})); }
  sel.style.display='none';
  if(h){ const x=h.querySelector('.mx-x'); h.textContent= novo? '－ Nova saída' : (sel.value==='entrada'? '✏ Editar entrada' : '✏ Editar saída'); if(x) h.appendChild(x); }
  const d=document.querySelector('#modalBox #lfDesc'); if(d && novo) d.placeholder='O que foi? (ex.: Cordas, manutenção, cabo, toner...)';
}
aoMudar(soSaidaNoForm);

/* datas pelo horário do Brasil: depois das 21h o app gravava o dia seguinte (fuso UTC) */
const hojeLocal = () => { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
const hojeUTC = () => new Date().toISOString().slice(0,10);
function dataCerta(){ const i=document.querySelector('#modalBox #lfData'); if(!i||i.dataset.dl) return; i.dataset.dl='1'; if(i.value===hojeUTC() && hojeUTC()!==hojeLocal()) i.value=hojeLocal(); }
aoMudar(dataCerta);
try{ if(typeof sb!=='undefined' && sb && !sb.__dataBR){ const _f=sb.from.bind(sb);
  sb.from=function(t){ const q=_f(t); if(t!=='financeiro'||!q||!q.insert) return q; const ins=q.insert.bind(q);
    q.insert=function(o,...r){ const fx=x=>{ if(x && x.data===hojeUTC() && hojeUTC()!==hojeLocal()) x=Object.assign({},x,{data:hojeLocal()}); return x; };
      return ins(Array.isArray(o)? o.map(fx) : fx(o),...r); };
    return q; }; sb.__dataBR=true; } }catch(_){}

/* ======================= 12) 📖 LETRA DOS HINOS (Cantor Cristão e Harpa) ======================= */
/* Usa as letras que o app já tem (581 hinos do Cantor e 640 da Harpa): tira os acordes,
   junta as sílabas separadas do PDF ("fortale-za" → "fortaleza") e mostra só a letra. */
const PRON=/^(me|te|se|nos|vos|lhe|lhes|o|a|os|as|lo|la|los|las|no|na|mos|ia|ei)$/i;
function limpaLetra(l){
  let t=String(l||'').replace(/\[[^\]]*\]/g,'');
  t=t.replace(/(\p{L})\s+-\s+(\p{L})/gu,'$1$2');                         /* "Chu - vas" → "Chuvas" */
  t=t.replace(/(\p{L})-(\p{L}+)/gu,(m,a,b)=> (PRON.test(b) || a.toLowerCase()===b[0].toLowerCase())? m : a+b);   /* "fortale-za" → "fortaleza", mantém "Manda-nos" */
  return t.replace(/\s{2,}/g,' ').replace(/\s+([,.;:!?])/g,'$1').trim();
}
function hinoAtual(){
  const hp=document.querySelector('#content .hcc-page[data-n]');
  if(hp){ const n=+hp.dataset.n; return {harpa:'hcc', h:hccHino(n)}; }
  let top=''; try{ const st=window.__navStack? __navStack() : []; top=st[st.length-1]||''; }catch(_){}
  const harpa=/^hr\|/.test(top) || (!/^cc\|/.test(top) && /Harpa/.test((document.querySelector('.cc-hbar')||{}).textContent||''));
  const n=+((top.match(/\|(\d+)/)||[])[1] || ((document.querySelector('.cc-head .n')||{}).textContent||'').replace(/\D/g,''));
  const lista= harpa? (window.HARPA||[]) : (window.HINOS||[]);
  let h=lista.find(x=>x.n===n);
  /* letras corrigidas só para a visão Letra (conferidas com o PDF) */
  const ov= harpa? (window.HARPA_LETRA||{})[n] : (window.CANTOR_LETRA||{})[n];
  if(h && ov) h=Object.assign({},h,{partes:ov});
  return {harpa, h};
}
/* edições feitas pelo ADM em "Editar cifras" (o app guarda no aparelho de todos) */
function edicoesDe(n,harpa){ if(harpa==='hcc'){ const r=(HCC_DB||{})[n]; return r&&r.texto? {__texto:r.texto} : null; } try{ return (JSON.parse(localStorage.getItem(harpa?'ibnm_hr_ed':'ibnm_cc_ed')||'{}')||{})[n]||null; }catch(_){ return null; } }
function letraHTML(h,harpa){
  let est=0; const fs=harpa==='hcc'?'hccFs':harpa?'harpaFs':'cantorFs'; const ed=edicoesDe(h.n,harpa);
  if(ed && ed.__texto){ const blocos=[]; let cur=null;
    ed.__texto.split('\n').forEach(l=>{ const t=l.trim(); if(!t){ cur=null; return; }
      if(/^\[[^\]]+\]$/.test(t)){ cur={coro:/coro|refr/i.test(t),ls:[]}; blocos.push(cur); return; }
      if(window.__ehLinhaDeAcordes && __ehLinhaDeAcordes(l)) return;
      if(!cur){ cur={coro:false,ls:[]}; blocos.push(cur); } cur.ls.push(t); });
    return '<div class="cc-letra"><div class="cl-top"><div class="cl-t">'+e(h.n+' · '+h.titulo)+'</div><div class="cl-z"><button onclick="'+fs+'(-2)">A−</button><button onclick="'+fs+'(2)">A+</button></div></div>'+
      blocos.filter(b=>b.ls.length).map(b=>{ if(!b.coro) est++; return '<div class="cl-p'+(b.coro?' coro':'')+'"><span class="cl-r">'+(b.coro?'Coro':est)+'</span>'+b.ls.map(x=>'<div>'+e(limpaLetra(x))+'</div>').join('')+'</div>'; }).join('')+'</div>'; }
  return '<div class="cc-letra"><div class="cl-top"><div class="cl-t">'+e(h.n+' · '+h.titulo)+'</div>'+
    '<div class="cl-z"><button onclick="'+fs+'(-2)" aria-label="Diminuir letra">A−</button><button onclick="'+fs+'(2)" aria-label="Aumentar letra">A+</button></div></div>'+(h.partes||[]).map((p,pi)=>{
    const coro=p.tipo==='coro'; if(!coro) est++;
    return '<div class="cl-p'+(coro?' coro':'')+'"><span class="cl-r">'+(coro?'Coro':est)+'</span>'+(p.linhas||[]).map((l,li)=>{ const t=limpaLetra(linhaEd(ed,pi,li,l)); return t? '<div>'+e(t)+'</div>' : ''; }).join('')+'</div>';
  }).join('')+'</div>';
}
const linhaEd=(ed,pi,li,orig)=> (ed && Object.prototype.hasOwnProperty.call(ed,pi+'-'+li))? ed[pi+'-'+li] : orig;
window.__modoLetra=false;
window.alternarLetraHino=function(v){ window.__modoLetra= (v===undefined)? !window.__modoLetra : !!v; aplicaLetra(true); };
/* barra de botões do hino organizada em grupos */
function organiza(tools){
  if(tools.dataset.org) return; tools.dataset.org='1';
  const itens=[...tools.children];
  const acha=f=>itens.filter(f);
  const g=(cls,lbl,els)=>{ els=els.filter(Boolean); if(!els.length) return null; const d=document.createElement('div'); d.className='cc-grp '+cls; if(lbl) d.insertAdjacentHTML('afterbegin','<span class="cc-gl">'+lbl+'</span>'); els.forEach(x=>d.appendChild(x)); return d; };
  const txt=x=>(x.textContent||'');
  const adm=acha(x=>/SETLIST|Ao vivo|AO VIVO|Editar cifra|Salvar cifras|Cancelar|Link do YouTube/i.test(txt(x)) || x.id==='ted' || x.classList.contains('cc-live') || x.classList.contains('hx-bt'));
  const midia=acha(x=>/PARTITURA|YouTube|Ouvir|▶ YouTube/i.test(txt(x)) && !adm.includes(x));
  const ver=acha(x=>!adm.includes(x) && !midia.includes(x));
  const seg=document.createElement('div'); seg.className='cc-seg';
  seg.innerHTML='<button class="cc-seg-c" onclick="alternarLetraHino(false)">🎸 Cifra</button><button class="cc-seg-l" onclick="alternarLetraHino(true)">📖 Letra</button>';
  tools.innerHTML=''; tools.appendChild(seg);
  [g('cc-gv','',ver),g('cc-gm','',midia),g('cc-ga','ADM',adm)].forEach(d=>{ if(d) tools.appendChild(d); });
}
function zoomLetra(box,song){ try{ const v=song.style.getPropertyValue('--cc-fs')||getComputedStyle(song).getPropertyValue('--cc-fs'); if(v) box.style.setProperty('--cc-fs',v.trim()); }catch(_){} }
function aplicaLetra(forca){
  const tools=document.querySelector('#content .cc-tools'); if(!tools) return;
  tools.querySelectorAll(':scope > .cc-letra-bt').forEach(b=>b.remove());
  organiza(tools);
  const L=window.__modoLetra;
  tools.classList.toggle('modo-letra',L);
  const c=tools.querySelector('.cc-seg-c'), l=tools.querySelector('.cc-seg-l'); if(c) c.classList.toggle('on',!L); if(l) l.classList.toggle('on',L);
  const song=document.querySelector('#content .cc-song'); if(!song) return;
  let box=document.querySelector('#content .cc-letra');
  if(L){
    const {h,harpa}=hinoAtual(); if(!h) return;
    const sig=String(h.n)+'|'+JSON.stringify(edicoesDe(h.n,harpa)||{});
    if(!box || box.dataset.sig!==sig || forca){ if(box) box.remove(); song.insertAdjacentHTML('afterend',letraHTML(h,harpa)); box=document.querySelector('#content .cc-letra'); box.dataset.n=String(h.n); box.dataset.sig=sig; }
    zoomLetra(box,song); song.style.display='none'; box.style.display='';
  } else { song.style.display=''; if(box) box.remove(); }
}
aoMudar(()=>aplicaLetra(false));

/* ======================= 13) EDIÇÕES DA HARPA NA NUVEM ======================= */
/* Igual ao Cantor: o ADM corrige um hino da Harpa e todos veem.
   Precisa do SQL "harpa_edits". Sem a tabela, continua como antes (só no aparelho). */
const HK='ibnm_hr_ed';
const podeHinos=()=>{ try{ if(window.ehPrincipal&&ehPrincipal()) return true; return !!(window.secaoLiberada&&secaoLiberada('hinos')); }catch(_){ return false; } };
const _setItem=Storage.prototype.setItem;
let _hrSync=false, _hrTabela=null;
async function hrSobe(antes,depois){
  if(!podeHinos() || _hrTabela===false || typeof sb==='undefined') return;
  const ns=new Set([...Object.keys(antes||{}),...Object.keys(depois||{})]);
  for(const n of ns){
    const a=JSON.stringify(antes[n]||null), d=JSON.stringify(depois[n]||null); if(a===d) continue;
    try{ const r= depois[n] && Object.keys(depois[n]).length
        ? await sb.from('harpa_edits').upsert({num:+n,linhas:depois[n],updated_at:new Date().toISOString()})
        : await sb.from('harpa_edits').delete().eq('num',+n);
      if(r && r.error){ _hrTabela=false; toast('Correção da Harpa salva só neste aparelho. Rode o SQL "harpa_edits" para todos verem.'); return; } }catch(_){}
  }
}
Storage.prototype.setItem=function(k,v){
  if(this===localStorage && k===HK && !_hrSync){ let antes={}; try{ antes=JSON.parse(localStorage.getItem(HK)||'{}')||{}; }catch(_){}
    _setItem.call(this,k,v); let depois={}; try{ depois=JSON.parse(v||'{}')||{}; }catch(_){} hrSobe(antes,depois); return; }
  return _setItem.call(this,k,v);
};
async function hrBaixa(){
  try{
    if(typeof sb==='undefined'||!sb) return;
    const {data,error}=await sb.from('harpa_edits').select('num,linhas'); if(error){ _hrTabela=false; return; }
    _hrTabela=true;
    const nuvem={}; (data||[]).forEach(r=>{ if(r.linhas && typeof r.linhas==='object' && Object.keys(r.linhas).length) nuvem[r.num]=r.linhas; });
    let local={}; try{ local=JSON.parse(localStorage.getItem(HK)||'{}')||{}; }catch(_){}
    if(podeHinos()){ for(const n of Object.keys(local)) if(!nuvem[n]){ nuvem[n]=local[n]; try{ await sb.from('harpa_edits').upsert({num:+n,linhas:local[n],updated_at:new Date().toISOString()}); }catch(_){} } }
    if(JSON.stringify(nuvem)!==JSON.stringify(local)){ _hrSync=true; try{ localStorage.setItem(HK,JSON.stringify(nuvem)); }finally{ _hrSync=false; } }
  }catch(_){}
}
setTimeout(hrBaixa,6000); setInterval(()=>{ if(document.visibilityState==='visible') hrBaixa(); },15*60*1000);

/* ======================= 14) FERRAMENTAS + DICIONÁRIO DE ACORDES ======================= */
/* Menu: logo abaixo da Academia de Música → 🎛️ Ferramentas: Metrônomo, Afinador, Dicionário de acordes */
(function menuFerramentas(){
  if(typeof MENU==='undefined' || !Array.isArray(MENU)) return;
  for(let i=MENU.length-1;i>=0;i--) if(MENU[i].id==='ferramentas' && !MENU[i].sub) MENU.splice(i,1);
  if(MENU.some(m=>m.id==='ferramentas' && m.sub)) return;
  const k=MENU.findIndex(m=>m.id==='academia');
  MENU.splice(k>=0?k+1:MENU.length,0,{id:'ferramentas',ic:'🎛️',nm:'Ferramentas musicais',sub:[
    {id:'ferramentas',arg:'metro',ic:'🥁',nm:'Metrônomo'},
    {id:'ferramentas',arg:'afin',ic:'🎚️',nm:'Afinador'},
    {id:'acordes',arg:'violao',ic:'🎼',nm:'Dicionário de acordes'}]});
  if(typeof ROTAS!=='undefined'){ ROTAS.ferramentas=function(aba){ setTimeout(()=>{ if(window.abrirFerramentas) abrirFerramentas(aba||'metro'); },30); return ROTAS.inicio(); }; }
  try{ if(typeof _booted!=='undefined' && _booted) montaMenu(); }catch(_){}
})();

const NOTAS_S=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'], NOTAS_B=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const PC={C:0,'B#':0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,'E#':5,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11};
/* tipos de acorde: nome mostrado → intervalos (semitons) e quais podem faltar no violão */
const TIPOS=[
 ['', 'Maior',[0,4,7]],['m','Menor',[0,3,7]],['7','Sétima',[0,4,7,10]],['7M','Sétima maior',[0,4,7,11]],
 ['m7','Menor com sétima',[0,3,7,10]],['m7(b5)','Meio-diminuto',[0,3,6,10]],['º','Diminuto',[0,3,6]],['º7','Diminuto com sétima',[0,3,6,9]],
 ['+','Aumentado',[0,4,8]],['sus2','Suspenso 2',[0,2,7]],['sus4','Suspenso 4',[0,5,7]],['7sus4','Sétima suspenso 4',[0,5,7,10]],
 ['6','Sexta',[0,4,7,9]],['m6','Menor com sexta',[0,3,7,9]],['add9','Com nona',[0,4,7,14]],['m(add9)','Menor com nona',[0,3,7,14]],
 ['9','Nona',[0,4,7,10,14]],['m9','Menor com nona',[0,3,7,10,14]],['7M(9)','Sétima maior com nona',[0,4,7,11,14]],['6/9','Sexta e nona',[0,4,7,9,14]],
 ['7(b9)','Sétima e nona menor',[0,4,7,10,13]],['7(#9)','Sétima e nona aumentada',[0,4,7,10,15]],['7(#5)','Sétima e quinta aumentada',[0,4,8,10]],
 ['7(b5)','Sétima e quinta diminuta',[0,4,6,10]],['m(7M)','Menor com sétima maior',[0,3,7,11]],['11','Décima primeira',[0,7,10,14,17]],
 ['m11','Menor com décima primeira',[0,3,7,10,14,17]],['13','Décima terceira',[0,4,7,10,14,21]],['5','Quinta (power chord)',[0,7]]];
const ALIAS={'':'','maj':'','m':'m','min':'m','-':'m','7':'7','7m':'7M','maj7':'7M','m7m':'m(7M)','m7M':'m(7M)','m(7M)':'m(7M)','m(7m)':'m(7M)','mmaj7':'m(7M)','m7+':'m(7M)','7+':'7M','Δ':'7M',
 'm7':'m7','min7':'m7','-7':'m7','m7b5':'m7(b5)','ø':'m7(b5)','m7(b5)':'m7(b5)','dim':'º','°':'º','º':'º','o':'º','dim7':'º7','°7':'º7','º7':'º7','o7':'º7',
 'aug':'+','+':'+','+5':'+','#5':'+','sus2':'sus2','2':'sus2','sus4':'sus4','sus':'sus4','4':'sus4','7sus4':'7sus4','7sus':'7sus4','74':'7sus4','7(4)':'7sus4',
 '6':'6','m6':'m6','add9':'add9','(9)':'add9','add2':'add9','madd9':'m(add9)','m(9)':'m(add9)','madd2':'m(add9)','9':'9','7(9)':'9','m9':'m9','m7(9)':'m9',
 'maj9':'7M(9)','7/9':'9','7(9)':'9','m7/9':'m9','7/4':'7sus4','7(4)':'7sus4','7/4/9':'9','4/7':'7sus4','7m/9':'7M(9)','7M/9':'7M(9)','7/13':'13','7(13)':'13','7/11':'11','m7/11':'m11','7/b9':'7(b9)','7/#9':'7(#9)','7/5+':'7(#5)','7/5-':'7(b5)','m7/5-':'m7(b5)','m5-/7':'m7(b5)','m/7M':'m(7M)','5+':'+','º/7':'º7','dim/7':'º7','7m(9)':'7M(9)','7m9':'7M(9)','69':'6/9','6/9':'6/9','6(9)':'6/9','7b9':'7(b9)','7(b9)':'7(b9)','7#9':'7(#9)','7(#9)':'7(#9)',
 '7#5':'7(#5)','7(#5)':'7(#5)','7+5':'7(#5)','7b5':'7(b5)','7(b5)':'7(b5)','7-5':'7(b5)','11':'11','m11':'m11','13':'13','5':'5'};
function lerAcorde(txt,baixo){
  let t=String(txt||'').trim().replace(/\s+/g,''); if(!t) return null;
  let b=String(baixo||'').trim();
  const sl=t.match(/^(.*?)\/([A-Ga-g][#b]?)$/); if(sl){ t=sl[1]; if(!b) b=sl[2]; }
  const m=t.match(/^([A-Ga-g])([#b]?)(.*)$/); if(!m) return null;
  const raiz=m[1].toUpperCase()+m[2]; const suf=m[3];
  let tipo=ALIAS[suf]; if(tipo===undefined) tipo=ALIAS[suf.replace(/[()]/g,'')]; if(tipo===undefined) tipo=ALIAS[suf.toLowerCase()];
  if(tipo===undefined) return {erro:'Não reconheci o tipo "'+suf+'". Escolha um tipo na lista.'};
  if(b){ b=b[0].toUpperCase()+b.slice(1); if(PC[b]===undefined) return {erro:'Baixo inválido: '+b}; }
  const T=TIPOS.find(x=>x[0]===tipo); const r=PC[raiz]; if(r===undefined) return {erro:'Nota inválida: '+raiz};
  const bemol= /b/.test(m[2]) || ['F'].includes(raiz) && /m/.test(tipo)===false;
  const nomes=bemol? NOTAS_B : NOTAS_S;
  const pcs=[...new Set(T[2].map(i=>(r+i)%12))];
  return {raiz,tipo,nome:raiz+tipo+(b?'/'+b:''),desc:T[1],ints:T[2],r,pcs,baixo:b?PC[b]:null,baixoNome:b||'',nomes,
    notas:T[2].map(i=>nomes[(r+i)%12])};
}
/* ----- violão: procura posições tocáveis ----- */
const AFIN=[40,45,50,55,59,64];  /* E A D G B E */
function posicoesViolao(A){
  const obrig=new Set(A.pcs); const ints=A.ints;
  if(ints.length>=4 && ints.includes(7)) obrig.delete((A.r+7)%12);           /* a 5ª pode faltar */
  if(A.tipo==='13'||A.tipo==='11'||A.tipo==='m11'){ obrig.delete((A.r+14)%12); obrig.delete((A.r+17)%12); }
  const grave = A.baixo!=null? A.baixo : A.r;
  const permit=new Set(A.pcs); if(A.baixo!=null) permit.add(A.baixo);
  const achados=new Map();
  for(let s=0;s<=12;s++){
    const op=[-1,0]; for(let f=Math.max(1,s);f<=s+3;f++) op.push(f);
    const atual=[0,0,0,0,0,0];
    (function rec(i){
      if(i===6){
        const soa=atual.map((f,k)=>f<0?null:AFIN[k]+f);
        const idxs=soa.map((v,k)=>v==null?-1:k).filter(k=>k>=0); if(idxs.length<(A.tipo==='5'?3:4)) return;
        /* cordas abafadas só nas pontas (graves e/ou agudas), nunca no meio */
        const pm=atual.findIndex(f=>f>=0), um=5-[...atual].reverse().findIndex(f=>f>=0); if(atual.slice(pm,um+1).some((f,j)=>f<0 && !(pm===0 && pm+j===1))) return;   /* exceção: abafar só a 5ª corda com o baixo na 6ª (ex.: 3x333) */
        const pcsTocados=soa.filter(v=>v!=null).map(v=>v%12);
        if(pcsTocados.some(p=>!permit.has(p))) return;
        for(const o of obrig) if(!pcsTocados.includes(o)) return;
        if(A.baixo!=null && !pcsTocados.includes(A.baixo)) return;
        if(soa[pm]%12!==grave) return;
        const fr=atual.filter(f=>f>0); if(fr.length){ const mn=Math.min(...fr), mx=Math.max(...fr); if(mx-mn>3) return;
          const naMin=atual.filter(f=>f===mn).length; const dedos= (naMin>=2? 1+fr.filter(f=>f>mn).length : fr.length); if(dedos>4) return;
          if(s>0 && mn!==s) return; }
        else if(s>0) return;
        if(atual.some(f=>f===0) && Math.max(...atual)>5) return;   /* corda solta junto com casa alta: desconfortável */
        const key=atual.join(','); if(achados.has(key)) return;
        const fr2=atual.filter(f=>f>0), mn=fr2.length?Math.min(...fr2):0, mx=fr2.length?Math.max(...fr2):0;
        const abertas=atual.filter(f=>f===0).length;
        const mutAgudas=[...atual].reverse().findIndex(f=>f>=0);
        const nota= mn*2 + (mx-mn)*2 + atual.filter(f=>f<0).length*2 + mutAgudas*4 + fr2.length + (abertas && mx>4? 12 : abertas && mx>3? 5 : 0);
        achados.set(key,{f:atual.slice(),nota});
        return;
      }
      for(const f of op){ atual[i]=f; rec(i+1); }
    })(0);
  }
  const mnDe=x=>{ const v=x.f.filter(f=>f>0); return v.length?Math.min(...v):0; };
  const ord=[...achados.values()].sort((a,b)=>a.nota-b.nota), escolhidas=[], porPos={};
  for(const x of ord){ const k=Math.min(4,Math.floor(mnDe(x)/3)); porPos[k]=(porPos[k]||0); if(porPos[k]>=2) continue; porPos[k]++; escolhidas.push(x); if(escolhidas.length>=8) break; }
  return escolhidas.sort((a,b)=>mnDe(a)-mnDe(b)||a.nota-b.nota);
}
function svgViolao(f){
  const fr=f.filter(x=>x>0), mn=fr.length?Math.min(...fr):0, mx=fr.length?Math.max(...fr):0;
  const base= mx<=4? 1 : mn;
  const W=126,H=150,x0=28,y0=26,dx=17,dy=24;
  let g='<svg viewBox="0 0 '+W+' '+H+'" class="ac-svg">';
  if(base===1) g+='<rect x="'+x0+'" y="'+(y0-4)+'" width="'+dx*5+'" height="4" fill="currentColor"/>';
  else g+='<text x="'+(x0-6)+'" y="'+(y0+dy/2+4)+'" font-size="11" text-anchor="end" fill="currentColor">'+base+'ª</text>';
  for(let i=0;i<=5;i++) g+='<line x1="'+(x0)+'" y1="'+(y0+i*dy)+'" x2="'+(x0+dx*5)+'" y2="'+(y0+i*dy)+'" stroke="currentColor" stroke-width="1"/>';
  for(let k=0;k<6;k++) g+='<line x1="'+(x0+k*dx)+'" y1="'+y0+'" x2="'+(x0+k*dx)+'" y2="'+(y0+dy*5)+'" stroke="currentColor" stroke-width="'+(k<3?1.4:1)+'"/>';
  /* pestana */
  /* pestana: só quando 2+ cordas na mesma casa (a menor) e todas as cordas entre elas estão presas */
  const naBase=f.map((v,k)=>v===mn&&mn>0?k:-1).filter(k=>k>=0);
  if(naBase.length>=2){ const a=naBase[0], b=naBase[naBase.length-1];
    if(f.slice(a,b+1).every(v=>v>=mn)){ const y=y0+(mn-base+0.5)*dy; g+='<rect x="'+(x0+a*dx-7)+'" y="'+(y-7)+'" width="'+((b-a)*dx+14)+'" height="14" rx="7" fill="var(--cor-acorde,#a8350a)"/>'; } }
  f.forEach((v,k)=>{ const x=x0+k*dx;
    if(v<0) g+='<text x="'+x+'" y="'+(y0-9)+'" font-size="12" text-anchor="middle" fill="#b33">×</text>';
    else if(v===0) g+='<circle cx="'+x+'" cy="'+(y0-12)+'" r="4.5" fill="none" stroke="currentColor" stroke-width="1.4"/>';
    else { const y=y0+(v-base+0.5)*dy; g+='<circle cx="'+x+'" cy="'+y+'" r="7" fill="var(--cor-acorde,#a8350a)"/>'; } });
  return g+'</svg>';
}
/* ----- piano: posição fundamental, inversões e baixo ----- */
function variacoesPiano(A){
  const base=A.ints.map(i=>i%12===i? i : i); /* intervalos */
  const notas=A.ints.map(i=>A.r+i);
  const vs=[{nome:'Posição fundamental',n:notas}];
  const n0=[...new Set(A.ints.map(i=>i%12))].sort((a,b)=>a-b).map(i=>A.r+i);
  for(let k=1;k<Math.min(n0.length,4);k++){ const v=n0.slice(k).concat(n0.slice(0,k).map(x=>x+12)); vs.push({nome:k+'ª inversão',n:v}); }
  if(A.baixo!=null){ const bx=A.baixo<A.r? A.baixo : A.baixo-12; vs.unshift({nome:'Com o baixo '+A.baixoNome+' na mão esquerda',n:notas,b:bx}); }
  return vs;
}
function svgPiano(nts,bx,nomes){
  const W=300,H=96, brancas=[0,2,4,5,7,9,11]; const ini=-12; const fim=24; const marca=new Set(nts.map(n=>n)); const wk=[]; const bk=[];
  let x=0; for(let n=ini;n<fim;n++){ const pc=((n%12)+12)%12; if(brancas.includes(pc)){ wk.push({n,x}); x+=1; } }
  const ww=W/wk.length; let g='<svg viewBox="0 0 '+W+' '+H+'" class="ac-svg pn">';
  wk.forEach(k=>{ const on=marca.has(k.n), isB=bx!=null&&k.n===bx; g+='<rect x="'+(k.x*ww)+'" y="0" width="'+(ww-1)+'" height="'+(H-2)+'" rx="2" fill="'+(on? 'var(--cor-acorde,#a8350a)' : isB? '#2e86c1' : '#fff')+'" stroke="#567"/>';
    if(on||isB) g+='<text x="'+(k.x*ww+ww/2)+'" y="'+(H-8)+'" font-size="9" text-anchor="middle" fill="#fff" font-weight="700">'+nomes[((k.n%12)+12)%12]+'</text>'; });
  for(let n=ini;n<fim;n++){ const pc=((n%12)+12)%12; if(!brancas.includes(pc)){ const ant=wk.findIndex(k=>k.n===n-1); const xx=(ant+1)*ww-ww*0.3; const on=marca.has(n), isB=bx!=null&&n===bx;
    g+='<rect x="'+xx+'" y="0" width="'+(ww*0.6)+'" height="'+(H*0.6)+'" rx="2" fill="'+(on? 'var(--cor-acorde,#a8350a)' : isB? '#2e86c1' : '#1d2b24')+'"/>';
    if(on||isB) g+='<text x="'+(xx+ww*0.3)+'" y="'+(H*0.6-6)+'" font-size="7.5" text-anchor="middle" fill="#fff" font-weight="700">'+nomes[pc]+'</text>'; } }
  return g+'</svg>';
}
let AC={inst:'violao',acorde:'',baixo:''};
/* ----- som dos acordes (gerado no próprio celular, sem baixar nada) ----- */
let _ac=null;
function audio(){ if(!_ac){ const C=window.AudioContext||window.webkitAudioContext; if(!C) return null; _ac=new C(); } if(_ac.state==='suspended') _ac.resume(); return _ac; }
const hz = m => 440*Math.pow(2,(m-69)/12);
/* violão: corda dedilhada (Karplus-Strong) */
function corda(ctx,freq,quando,vol){
  const sr=ctx.sampleRate, dur=2.4, n=Math.floor(sr*dur), buf=ctx.createBuffer(1,n,sr), d=buf.getChannelData(0);
  const P=Math.max(2,Math.round(sr/freq)); const r=new Float32Array(P); for(let i=0;i<P;i++) r[i]=Math.random()*2-1;
  let k=0; for(let i=0;i<n;i++){ const a=r[k], b=r[(k+1)%P]; const v=0.4985*(a+b); r[k]=v; d[i]=a; k=(k+1)%P; }
  const src=ctx.createBufferSource(); src.buffer=buf;
  const g=ctx.createGain(); g.gain.setValueAtTime(vol,quando); g.gain.exponentialRampToValueAtTime(0.0008,quando+dur);
  const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=3200;
  src.connect(lp); lp.connect(g); g.connect(ctx.destination); src.start(quando); src.stop(quando+dur);
}
/* piano: tom com harmônicos e decaimento */
let _onda=null;
function tecla(ctx,freq,quando,vol){
  if(!_onda){ const re=new Float32Array([0,1,0.55,0.32,0.18,0.1,0.06,0.03]), im=new Float32Array(re.length); _onda=ctx.createPeriodicWave(re,im); }
  const o=ctx.createOscillator(); o.setPeriodicWave(_onda); o.frequency.value=freq;
  const g=ctx.createGain(); g.gain.setValueAtTime(0.0001,quando); g.gain.exponentialRampToValueAtTime(vol,quando+0.008); g.gain.exponentialRampToValueAtTime(vol*0.35,quando+0.35); g.gain.exponentialRampToValueAtTime(0.0006,quando+2.6);
  const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(Math.min(9000,freq*8),quando); lp.frequency.exponentialRampToValueAtTime(Math.max(600,freq*2),quando+1.5);
  o.connect(lp); lp.connect(g); g.connect(ctx.destination); o.start(quando); o.stop(quando+2.7);
}
/* ----- sons GRAVADOS de violão e piano (FluidR3 GM, licença MIT) ----- */
/* Cada nota é um arquivo curto (~15 KB) baixado só na 1ª vez e guardado no celular.
   Sem internet, usa o som sintetizado como reserva. */
const SF='https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/';
const SF_INST={v:'acoustic_guitar_steel',p:'acoustic_grand_piano'};
const BEM_SF=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const nomeSF = m => BEM_SF[((m%12)+12)%12]+(Math.floor(m/12)-1);
const _amostras=new Map();
function amostra(tipo,midi){
  const k=tipo+midi; if(_amostras.has(k)) return _amostras.get(k);
  const ctx=audio(); if(!ctx) return Promise.resolve(null);
  const pr=fetch(SF+SF_INST[tipo]+'-mp3/'+nomeSF(midi)+'.mp3',{cache:'force-cache'})
    .then(r=>{ if(!r.ok) throw new Error('http'); return r.arrayBuffer(); })
    .then(b=>new Promise((ok,no)=>ctx.decodeAudioData(b,ok,no)))
    .catch(()=>{ _amostras.delete(k); return null; });
  _amostras.set(k,pr); return pr;
}
window.preCarregarSons=function(tipo,notas){ (notas||[]).forEach(m=>amostra(tipo,m)); };
function tocaAmostra(ctx,buf,quando,vol,dur){
  const src=ctx.createBufferSource(); src.buffer=buf;
  const g=ctx.createGain(); g.gain.setValueAtTime(vol,quando); g.gain.setValueAtTime(vol,quando+dur-0.4); g.gain.exponentialRampToValueAtTime(0.001,quando+dur);
  src.connect(g); g.connect(ctx.destination); src.start(quando); src.stop(quando+dur+0.05);
}
/* notas: [{m:midi, d:atraso em s, v:volume}] */
async function tocarNotas(tipo,notas){
  const ctx=audio(); if(!ctx) return toast('Este aparelho não consegue tocar som.');
  const bufs=await Promise.race([Promise.all(notas.map(n=>amostra(tipo,n.m))), new Promise(ok=>setTimeout(()=>ok(null),1800))]);
  const t0=ctx.currentTime+0.04;
  notas.forEach((n,i)=>{ const b=bufs&&bufs[i];
    if(b) tocaAmostra(ctx,b,t0+n.d,n.v*(tipo==='v'?1.6:1.5),tipo==='v'?3.2:3.0);
    else (tipo==='v'? corda : tecla)(ctx,hz(n.m),t0+n.d,n.v); });
}
const notasViolao = f => { const out=[]; let k=0; f.forEach((x,c)=>{ if(x<0) return; out.push({m:AFIN[c]+x,d:k*0.05,v:0.5}); k++; }); return out; };
const notasPiano = v => { const out=[]; if(v.b!=null) out.push({m:60+v.b-12,d:0,v:0.5}); v.n.forEach(n=>out.push({m:60+n,d:v.b!=null?0.07:0,v:0.38})); return out; };
window.acTocarViolao=function(i){
  const p=(AC.formas||[])[i]; if(!p) return; tocarNotas('v',notasViolao(p.f)); pulso('acv'+i);
};
window.acTocarPiano=function(i){
  const v=(AC.pvars||[])[i]; if(!v) return; tocarNotas('p',notasPiano(v)); pulso('acp'+i);
};
function pulso(id){ const el=document.getElementById(id); if(!el) return; el.classList.remove('toca'); void el.offsetWidth; el.classList.add('toca'); }
window.acInst=function(i){ AC.inst=i; acDesenha(); };
window.acDigita=function(){ AC.acorde=document.getElementById('acTxt').value; AC.baixo=document.getElementById('acBx').value; acResultado(); };
window.acTipo=function(t){ const r=(lerAcorde(AC.acorde)||{}).raiz || (AC.acorde.match(/^[A-Ga-g][#b]?/)||['C'])[0].toUpperCase(); AC.acorde=r+t; document.getElementById('acTxt').value=AC.acorde; acResultado(); };
window.acRaiz=function(r){ const A=lerAcorde(AC.acorde); AC.acorde=r+(A&&A.tipo!=null&&!A.erro?A.tipo:''); document.getElementById('acTxt').value=AC.acorde; acResultado(); };
function acResultado(){
  const box=document.getElementById('acRes'); if(!box) return;
  if(!AC.acorde.trim()){ box.innerHTML='<p class="ac-vz">Digite um acorde (ex.: <b>D</b>, <b>Am7</b>, <b>G7M</b>, <b>F#m7(b5)</b>) ou escolha abaixo.</p>'; return; }
  const A=lerAcorde(AC.acorde,AC.baixo);
  if(!A||A.erro){ box.innerHTML='<p class="ac-vz">'+e((A&&A.erro)||'Acorde inválido.')+'</p>'; return; }
  let h='<div class="ac-top"><div class="ac-nome">'+e(A.nome)+'</div><div class="ac-desc">'+e(A.desc)+' · notas: <b>'+A.notas.join(' · ')+'</b>'+(A.baixoNome?' · baixo: <b>'+e(A.baixoNome)+'</b>':'')+'</div></div>';
  if(AC.inst==='violao'){
    const ps=posicoesViolao(A); AC.formas=ps; ps.slice(0,3).forEach(p=>preCarregarSons('v',notasViolao(p.f).map(n=>n.m)));
    if(ps.length) h=h.replace('</div></div>','</div><button class="ac-play" onclick="acTocarViolao(0)">▶ Ouvir</button></div>');
    h+= ps.length? '<div class="ac-grid">'+ps.map((p,i)=>'<button class="ac-cel" id="acv'+i+'" onclick="acTocarViolao('+i+')" aria-label="Tocar a '+(i+1)+'ª forma">'+svgViolao(p.f)+'<small>▶ '+(i+1)+'ª forma</small></button>').join('')+'</div>'
      : '<p class="ac-vz">Não achei uma forma confortável no violão para esse acorde. Tente sem o baixo ou outro tipo.</p>';
  } else {
    const vs=variacoesPiano(A); AC.pvars=vs; vs.forEach(v=>preCarregarSons('p',notasPiano(v).map(n=>n.m)));
    h=h.replace('</div></div>','</div><button class="ac-play" onclick="acTocarPiano(0)">▶ Ouvir</button></div>');
    h+='<div class="ac-pn">'+vs.map((v,i)=>'<button class="ac-pcel" id="acp'+i+'" onclick="acTocarPiano('+i+')"><small>▶ '+e(v.nome)+'</small>'+svgPiano(v.n,v.b,A.nomes)+'</button>').join('')+'</div>';
  }
  box.innerHTML=h;
}
function acDesenha(){
  const box=document.getElementById('acBox'); if(!box) return;
  box.innerHTML='<div class="ac-seg"><button class="'+(AC.inst==='violao'?'on':'')+'" onclick="acInst(\'violao\')">🎸 Violão</button><button class="'+(AC.inst==='piano'?'on':'')+'" onclick="acInst(\'piano\')">🎹 Piano / teclado</button></div>'+
    '<div class="ac-campos"><label>Acorde<input id="acTxt" autocomplete="off" autocapitalize="characters" placeholder="Ex.: D, Am7, G7M" value="'+e(AC.acorde)+'" oninput="acDigita()"></label>'+
    '<label>Baixo<select id="acBx" onchange="acDigita()"><option value="">—</option>'+NOTAS_S.map((n,i)=>{ const v=NOTAS_S[i]; const lab= NOTAS_B[i]!==NOTAS_S[i]? NOTAS_S[i]+' / '+NOTAS_B[i] : v; return '<option value="'+v+'"'+(AC.baixo===v?' selected':'')+'>'+lab+'</option>'; }).join('')+'</select></label></div>'+
    '<div class="ac-chips">'+NOTAS_S.map((n,i)=>'<button onclick="acRaiz(\''+(['C#','D#','G#','A#'].includes(n)? n : NOTAS_B[i])+'\')">'+(['C#','D#','G#','A#'].includes(n)? n : NOTAS_B[i])+'</button>').join('')+'</div>'+
    '<div class="ac-chips tipos">'+TIPOS.map(t=>'<button onclick="acTipo(\''+t[0]+'\')" title="'+e(t[1])+'">'+(t[0]||'Maior')+'</button>').join('')+'</div>'+
    '<div id="acRes"></div>';
  acResultado();
}
if(typeof ROTAS!=='undefined'){
  ROTAS.acordes=function(inst){ if(inst==='piano'||inst==='violao') AC.inst=inst; setTimeout(acDesenha,0);
    return '<div class="page"><div class="page-ttl">🎼 Dicionário de acordes</div><div class="card" id="acBox"></div></div>'; };
}

/* ======================= 15) ACORDES DA MÚSICA (violão / piano) ======================= */
/* Em cada música e hino: painel com o desenho de cada acorde usado (violão ou piano, à escolha),
   toque no acorde da cifra para ver/ouvir, e um espaço a mais depois da introdução. */
const instPref=()=> localStorage.getItem('ibnm_ac_inst')||'violao';
window.acPainelInst=function(i){ localStorage.setItem('ibnm_ac_inst',i); document.querySelectorAll('.am-box').forEach(b=>b.dataset.sig=''); acordesDaMusica(true); };
window.acPainelAbre=function(){ const v=localStorage.getItem('ibnm_ac_fechado')==='1'?'0':'1'; localStorage.setItem('ibnm_ac_fechado',v); acordesDaMusica(true); };
function desenhoAcorde(nome,inst,idx,grande){
  const A=lerAcorde(nome); if(!A||A.erro) return '<div class="am-cel sem"><b>'+e(nome)+'</b><small>—</small></div>';
  if(inst==='piano'){ const v=variacoesPiano(A)[0]; (window.__amP=window.__amP||{})[idx]=v;
    return '<button class="am-cel'+(grande?' gr':'')+'" onclick="'+(grande?'amTocar(\'p\','+idx+')':'abrirAcorde(\''+e(A.nome)+'\')')+'"><b>'+e(A.nome)+'</b>'+svgPiano(v.n,v.b,A.nomes)+'</button>'; }
  const ps=posicoesViolao(A); if(!ps.length) return '<div class="am-cel sem"><b>'+e(A.nome)+'</b><small>sem forma</small></div>';
  (window.__amV=window.__amV||{})[idx]=ps[0];
  return '<button class="am-cel'+(grande?' gr':'')+'" onclick="'+(grande?'amTocar(\'v\','+idx+')':'abrirAcorde(\''+e(A.nome)+'\')')+'"><b>'+e(A.nome)+'</b>'+svgViolao(ps[0].f)+'</button>';
}
window.amTocar=function(t,i){
  if(t==='v'){ const p=(window.__amV||{})[i]; if(p) tocarNotas('v',notasViolao(p.f)); }
  else { const v=(window.__amP||{})[i]; if(v) tocarNotas('p',notasPiano(v)); }
};
function acordesNaTela(){
  const z=document.querySelector('#content #zoomTarget');
  if(z) return {alvo:z, lista:[...z.querySelectorAll('.cf-ac')].map(x=>x.textContent.trim())};
  const song=document.querySelector('#content .cc-song, #content .hcc-song');
  if(song && song.style.display!=='none') return {alvo:song, lista:[...song.querySelectorAll('.c, .cf-ac')].map(x=>x.textContent.trim())};
  return null;
}
function acordesDaMusica(forca){
  const info=acordesNaTela(); const velho=document.querySelector('#content .am-box');
  if(!info){ if(velho) velho.remove(); return; }
  const lista=[...new Set(info.lista.filter(x=>x && /^[A-G]/.test(x)))].slice(0,30);
  if(!lista.length){ if(velho) velho.remove(); return; }
  const inst=instPref(), fechado=localStorage.getItem('ibnm_ac_fechado')==='1';
  const sig=lista.join('|')+'#'+inst+'#'+fechado;
  if(velho && velho.dataset.sig===sig && !forca) return;
  window.__amV={}; window.__amP={};
  const html='<div class="am-box card" data-sig="'+e(sig)+'"><div class="am-h"><b>🎼 Acordes desta música</b>'+
    '<div class="am-seg"><button class="'+(inst==='violao'?'on':'')+'" onclick="acPainelInst(\'violao\')">🎸 Violão</button><button class="'+(inst==='piano'?'on':'')+'" onclick="acPainelInst(\'piano\')">🎹 Piano</button></div>'+
    '<button class="am-x" onclick="acPainelAbre()" aria-label="Mostrar ou esconder">'+(fechado?'▾':'▴')+'</button></div>'+
    (fechado? '<div class="am-chips">'+lista.map(c=>'<span>'+e(c)+'</span>').join('')+'</div>'
             : '<div class="am-lista'+(inst==='piano'?' pn':'')+'">'+lista.map((c,i)=>desenhoAcorde(c,inst,i)).join('')+'</div><p class="am-dica">Toque num acorde (aqui ou na cifra) para ouvir e ver outras formas em 🔁 VARIAR.</p>')+'</div>';
  if(velho) velho.outerHTML=html; else info.alvo.insertAdjacentHTML('beforebegin',html);
}
/* tocar num acorde da cifra: mostra o desenho (violão ou piano) */
document.addEventListener('click',ev=>{
  const c=ev.target.closest && ev.target.closest('#zoomTarget .cf-ac, .cc-song .c, .cc-song .cf-ac, .hcc-song .cf-ac'); if(!c) return;
  const nome=c.textContent.trim(); if(!nome || !/^[A-G]/.test(nome)) return;
  if(c.closest('.cc-song.editing') || document.querySelector('.cc-song.editing, #zoomTarget[contenteditable=true]')) return;   /* editando: não atrapalha */
  abrirAcorde(nome);
},true);
/* janela do acorde com VARIAR: mostra as outras formas no mesmo lugar (como no Cifra Club) */
let POP=null;
window.abrirAcorde=function(nome){
  const A=lerAcorde(nome); if(!A||A.erro) return;
  POP={nome:A.nome,A,inst:instPref(),i:0}; montaPop(true);
  abrirModal('<h3>🎼 '+e(A.nome)+'</h3><div id="amPopW"></div>');
  montaPop(true);
};
function listaPop(){ return POP.inst==='piano'? variacoesPiano(POP.A) : posicoesViolao(POP.A); }
function montaPop(tocar){
  const w=document.getElementById('amPopW'); if(!w||!POP) return;
  const L=listaPop(); if(POP.i>=L.length) POP.i=0;
  const it=L[POP.i];
  window.__amV={}; window.__amP={};
  let des='<p class="am-dica">Sem forma para este acorde.</p>';
  if(it){ if(POP.inst==='piano'){ window.__amP[0]=it; des='<button class="am-cel gr" onclick="amTocar(\'p\',0)"><small>'+e(it.nome)+'</small>'+svgPiano(it.n,it.b,POP.A.nomes)+'</button>'; }
          else { window.__amV[0]=it; des='<button class="am-cel gr" onclick="amTocar(\'v\',0)">'+svgViolao(it.f)+'</button>'; } }
  w.innerHTML='<div class="am-seg md"><button class="'+(POP.inst==='violao'?'on':'')+'" onclick="popInst(\'violao\')">🎸 Violão</button><button class="'+(POP.inst==='piano'?'on':'')+'" onclick="popInst(\'piano\')">🎹 Piano</button></div>'+
    '<div class="am-pop">'+des+'</div>'+
    (L.length>1? '<div class="am-var"><button onclick="popVar(-1)" aria-label="Forma anterior">‹</button><span>'+(POP.i+1)+' de '+L.length+'</span><button onclick="popVar(1)" aria-label="Próxima forma">›</button><button class="v" onclick="popVar(1)">🔁 VARIAR</button></div>' : '')+
    '<p class="am-dica">Toque no desenho para ouvir.</p>';
  if(tocar && it) setTimeout(()=>amTocar(POP.inst==='piano'?'p':'v',0),80);
}
window.popVar=function(d){ if(!POP) return; const n=listaPop().length||1; POP.i=((POP.i+d)%n+n)%n; montaPop(true); };
window.popInst=function(i){ if(!POP) return; POP.inst=i; POP.i=0; localStorage.setItem('ibnm_ac_inst',i); montaPop(true); };

/* espaço a mais entre a introdução e a música */
function espacoIntro(){
  const z=document.querySelector('#content #zoomTarget'); if(!z || z.dataset.esp===z.innerHTML.length+'') return;
  const ls=z.innerHTML.split('\n'); const i=ls.findIndex(l=>/Intro/i.test(l.replace(/<[^>]+>/g,'')));
  if(i<0 || i>3){ z.dataset.esp=z.innerHTML.length+''; return; }
  const ehAc=l=>/^<span class="cf-ch">/.test(l);
  let j=i; while(j+2<ls.length && ehAc(ls[j+1]) && ehAc(ls[j+2])) j++;
  if(j+1<ls.length && ls[j+1].replace(/<[^>]+>/g,'').trim()!==''){ ls.splice(j+1,0,''); z.innerHTML=ls.join('\n'); }
  z.dataset.esp=z.innerHTML.length+'';
}
aoMudar(()=>{ espacoIntro(); acordesDaMusica(false); });

/* ======================= 16) TOM DA MÚSICA: detecta sozinho, o ADM pode digitar ======================= */
const NOMES_TOM=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
function acordesDoTexto(txt){
  const out=[]; String(txt||'').split('\n').forEach(l=>{
    const lin=l.replace(/^\s*intro(du[cç][aã]o)?\s*:?/i,'').trim(); if(!lin) return;
    const toks=lin.split(/\s+/);
    const ehLinha= toks.every(t=>/^[\[(]?[A-G][#b]?[^\s]*[\])]?$/.test(t) || /^[-|x0-9()]+$/i.test(t));
    if(ehLinha) toks.forEach(t=>{ const c=t.replace(/[\[\]()]/g,''); if(/^[A-G]/.test(c)) out.push(c); });
    (l.match(/\[([A-G][^\]\s]*)\]/g)||[]).forEach(b=>out.push(b.slice(1,-1)));
  });
  return out;
}
window.detectarTom=function(txt){
  const brutos=acordesDoTexto(txt);
  const cs=brutos.map(c=>{ const A=lerAcorde(c.split('/')[0]); return A&&!A.erro? {r:A.r, menor:/^m(?!aj)/.test(A.tipo)||A.tipo==='m7(b5)'} : null; }).filter(Boolean);
  if(!cs.length) return '';
  /* acorde com baixo pedal no início (ex.: G/D) conta como o baixo (D) */
  const b0=(brutos[0]||'').split('/')[1]; if(b0 && PC[b0]!==undefined) cs[0]={r:PC[b0],menor:false};
  const peso=cs.map((c,i)=>1+(i===0?3:0)+(i===cs.length-1?4:0));
  let melhor=null;
  for(let t=0;t<12;t++){
    const diat={[t]:[false,3],[(t+2)%12]:[true,1.5],[(t+4)%12]:[true,1],[(t+5)%12]:[false,2],[(t+7)%12]:[false,2.5],[(t+9)%12]:[true,1.5],[(t+11)%12]:[true,0.5],[(t+10)%12]:[false,0.6]};   /* bVII (comum no louvor) */
    let sc=0; cs.forEach((c,i)=>{ const d=diat[c.r]; if(!d){ sc-=1*peso[i]; return; } sc+= (d[0]===c.menor? d[1] : 0.4)*peso[i]; });
    if(!melhor||sc>melhor.sc) melhor={t,sc};
  }
  /* maior ou relativa menor: olha 1º e último acordes e a frequência */
  const t=melhor.t, rel=(t+9)%12;
  let fI=0,fvi=0; cs.forEach((c,i)=>{ if(c.r===t&&!c.menor) fI+=peso[i]; if(c.r===rel&&c.menor) fvi+=peso[i]; });
  if(fvi>fI*1.2) return NOMES_TOM[rel]+'m';
  return NOMES_TOM[t];
};
function normTom(v){ const m=String(v||'').trim().match(/^([A-Ga-g])([#b]?)\s*(m|min|menor)?$/); if(!m) return ''; const r=m[1].toUpperCase()+m[2]; if(PC[r]===undefined) return ''; return r+(m[3]?'m':''); }
function transpTom(tom,d){ const n=normTom(tom); if(!n) return ''; const menor=/m$/.test(n); const r=n.replace(/m$/,''); return NOMES_TOM[((PC[r]+d)%12+12)%12]+(menor?'m':''); }
/* tons guardados (musicas.dados.tom) */
let TONS={}; try{ TONS=JSON.parse(localStorage.getItem('ibnm_tons')||'{}')||{}; }catch(_){}
async function carregaTons(){ try{ if(typeof sb==='undefined') return; const {data,error}=await sb.from('musicas').select('id,dados'); if(error) return;
  const n={}; (data||[]).forEach(r=>{ if(r.dados&&r.dados.tom) n[r.id]=r.dados.tom; }); TONS=n; localStorage.setItem('ibnm_tons',JSON.stringify(n)); tomNaTela(); }catch(_){} }
setTimeout(carregaTons,5000); setInterval(()=>{ if(document.visibilityState==='visible') carregaTons(); },30*60*1000);
async function salvarTom(id,tom){
  tom=normTom(tom); if(!id) return;
  try{ const {data}=await sb.from('musicas').select('dados').eq('id',id).single();
    const dados=Object.assign({},(data&&data.dados)||{}); if(tom) dados.tom=tom; else delete dados.tom;
    const r=await sb.from('musicas').update({dados}).eq('id',id); if(r.error) throw r.error;
    if(tom) TONS[id]=tom; else delete TONS[id]; localStorage.setItem('ibnm_tons',JSON.stringify(TONS));
  }catch(err){ toast('Não consegui salvar o tom: '+(err.message||err)); }
}
/* editor: campo de tom que o ADM pode digitar */
let _edId=null, _tomManual=false;
function campoTomEditor(){
  const lbl=document.getElementById('tomAtual'); if(!lbl || document.getElementById('edTomTxt')) return;
  const ed=document.getElementById('edCifra'); if(!ed) return;
  _edId=(typeof musicaAberta!=='undefined'&&musicaAberta)||_edId;
  const salvo=TONS[_edId]; _tomManual=!!salvo;
  const span=lbl.closest('.tom')||lbl.parentElement;
  const fonte=()=>{ const it=document.getElementById('edIntro'); return (it&&it.value? 'Intro: '+it.value+'\n' : '')+ed.innerText; };
  window.__tomFonte=fonte;
  span.innerHTML='Tom <input id="edTomTxt" class="ed-tom" maxlength="4" autocomplete="off" autocapitalize="characters" title="Tom da música — detectado sozinho; o ADM pode digitar" value="'+e(salvo||detectarTom(fonte()))+'"><small id="edTomAuto">'+(salvo?'':'auto')+'</small>';
  const inp=document.getElementById('edTomTxt');
  inp.addEventListener('input',()=>{ _tomManual=!!inp.value.trim(); document.getElementById('edTomAuto').textContent=_tomManual?'':'auto'; if(!_tomManual) inp.value=detectarTom(fonte()); });
  let _t=0; ed.addEventListener('input',()=>{ clearTimeout(_t); _t=setTimeout(()=>{ if(!_tomManual){ inp.value=detectarTom(fonte()); } },500); });
  ed.addEventListener('paste',()=>setTimeout(()=>{ if(!_tomManual){ inp.value=detectarTom(fonte()); toast(inp.value? 'Tom detectado: '+inp.value : 'Não consegui detectar o tom.'); } },400));
}
if(typeof window.transpor==='function'){ const _tp=window.transpor; window.transpor=function(x,d){ const r=_tp.apply(this,arguments); const inp=document.getElementById('edTomTxt');
  if(inp && d){ if(_tomManual) inp.value=transpTom(inp.value,d)||inp.value; else setTimeout(()=>{ if(window.__tomFonte) inp.value=detectarTom(window.__tomFonte()); },60); } return r; }; try{ transpor=window.transpor; }catch(_){} }
/* ao salvar/publicar a cifra, grava o tom junto */
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('button'); const inp=document.getElementById('edTomTxt');
  if(!b||!inp||!/Salvar|Publicar/i.test(b.textContent)) return; const id=_edId, v=inp.value; setTimeout(()=>salvarTom(id,v),900); },true);
/* tela da música: mostra o tom guardado (ajustado se a pessoa mudou o tom) */
function tomNaTela(){
  const b=document.querySelector('#content .mm-tom > span b'); if(!b) return;
  const id=(typeof musicaAberta!=='undefined')&&musicaAberta; const salvo=TONS[id]; if(!salvo) return;
  const sm=b.parentElement.querySelector('small'); const st=sm? parseInt((sm.textContent.match(/[-+]?\d+/)||[0])[0],10)||0 : 0;
  const v=transpTom(salvo,st); if(v && b.textContent!==v) b.textContent=v;
}
aoMudar(()=>{ campoTomEditor(); tomNaTela(); });

/* ======================= 17) HINOS EM TEXTO LIVRE (igual às músicas) ======================= */
/* Os hinos do Cantor e da Harpa aparecem como as músicas: acorde em cima da letra, em linhas
   comuns. O ADM edita o hino inteiro como texto (pode mudar, juntar, acrescentar estrofes).
   O texto editado fica salvo na nuvem (campo "__texto" das edições do hino). */
function edDoHino(n,harpa){ if(harpa==='hcc'){ const r=(HCC_DB||{})[n]; return r&&r.texto? {__texto:r.texto} : null; } try{ return (JSON.parse(localStorage.getItem(harpa?'ibnm_hr_ed':'ibnm_cc_ed')||'{}')||{})[n]||null; }catch(_){ return null; } }
function linhaParaDuas(l){  /* "[A]Deus [E]prometeu" → ["A    E", "Deus prometeu"] */
  let txt='', ac='';
  String(l).replace(/\[([^\]]*)\]|([^\[]+)/g,(m,c,t)=>{ if(c!==undefined){ if(ac.length>txt.length) txt+=' '.repeat(ac.length-txt.length+0); while(ac.length<txt.length) ac+=' '; if(ac.length && !/\s$/.test(ac)) ac+=' '; while(txt.length<ac.length) txt+=' '; ac+=c; } else txt+=t; return ''; });
  return [ac.replace(/\s+$/,''), txt.replace(/\s+$/,'')];
}
function textoOriginal(h,harpa){
  const ed=edDoHino(h.n,harpa)||{}; const out=[]; let est=0;
  (h.partes||[]).forEach((p,pi)=>{ if(out.length) out.push('');
    if(p.tipo==='coro') out.push('[Coro]'); else { est++; out.push('['+est+']'); }
    (p.linhas||[]).forEach((l,li)=>{ const k=pi+'-'+li; const lin=Object.prototype.hasOwnProperty.call(ed,k)? ed[k] : l; const [a,t]=linhaParaDuas(lin); if(a.trim()) out.push(a); if(t.trim()||!a.trim()) out.push(t); }); });
  return out.join('\n');
}
function textoDoHino(h,harpa){ const ed=edDoHino(h.n,harpa); return (ed&&ed.__texto)? ed.__texto : (harpa==='hcc'? '' : textoOriginal(h,harpa)); }
window.__textoDoHino=textoDoHino;
function semitonsDaTela(h){ const b=document.querySelector('#content .cc-tools .chip .lbl b, #content .cc-meta b'); const cur=b? b.textContent.trim().replace(/m$/,'') : ''; const ori=String(h.tom||'').replace(/m$/,'');
  if(PC[cur]===undefined||PC[ori]===undefined) return 0; let d=(PC[cur]-PC[ori]+12)%12; if(d>6) d-=12; return d; }
function htmlTextoCifra(txt){
  return String(txt).split('\n').map(l=>{
    if(/^\s*\[[^\]]+\]\s*$/.test(l)) return '<span class="cf-sec">'+e(l.trim())+'</span>';
    if(window.__ehLinhaDeAcordes && __ehLinhaDeAcordes(l)) return '<span class="cf-ch">'+__htmlLinhaAcordes(l)+'</span>';
    return e(l);
  }).join('\n');
}
function hinoEmTexto(){
  const song=document.querySelector('#content .cc-song'); if(!song || song.classList.contains('editing') || song.style.display==='none') return;
  const {h,harpa}=hinoAtual(); if(!h) return;
  const st=semitonsDaTela(h); const ed=edDoHino(h.n,harpa);
  const sig=h.n+'|'+st+'|'+(harpa?1:0)+'|'+JSON.stringify(ed||{})+'|'+song.className;
  if(song.dataset.tx===sig) return;
  let txt=textoDoHino(h,harpa); if(st && window.__transpTexto) txt=__transpTexto(txt,st);
  if(song.classList.contains('nochords')) txt=txt.split('\n').filter(l=>!(window.__ehLinhaDeAcordes&&__ehLinhaDeAcordes(l))).join('\n');
  song.innerHTML='<div class="cc-tx">'+htmlTextoCifra(txt)+'</div>';
  song.dataset.tx=sig;
}
/* ADM: editar o hino inteiro como texto */
window.editarHinoTexto=function(prefill,aviso){
  const {h,harpa}=hinoAtual(); if(!h) return; if(typeof prefill!=='string') prefill=null;
  abrirModal('<h3>✏️ Editar '+(harpa==='hcc'?'HCC':harpa?'Harpa':'Cantor')+' '+h.n+' — '+e(h.titulo)+'</h3>'+
    (harpa==='hcc'?'<input id="hccTit" class="inp" placeholder="Título" value="'+e(h.titulo)+'" style="margin-bottom:6px">':'')+
    '<p class="am-dica">'+(aviso? '<b>'+e(aviso)+'</b>' : 'Escreva como nas músicas: a linha de acordes em cima da linha da letra. [1], [2], [Coro] marcam as estrofes. Pode acrescentar estrofes.')+'</p>'+
    '<textarea id="hxTxt" class="hx-txt" spellcheck="false" enterkeyhint="enter" oninput="prevAoVivo(\'hxTxt\',\'hxPrev\')">'+e(prefill!=null? prefill : textoDoHino(h,harpa))+'</textarea>'+
    '<div class="am-dica" style="margin-top:6px">👁 Pré-visualização</div><div id="hxPrev" class="cc-tx prev-box"></div>'+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarHinoTexto()">💾 Salvar</button></div>'+
    ((harpa!=='hcc' && (edDoHino(h.n,harpa)||{}).__texto)? '<button class="hx-orig" onclick="salvarHinoTexto(true)">↩️ Voltar ao texto original do hinário</button>' : ''));
  prevAoVivo('hxTxt','hxPrev');
  const mb=document.getElementById('modalBox'); if(mb) mb.classList.add('mx-grande');
};
window.salvarHinoTexto=async function(original){
  const {h,harpa}=hinoAtual(); if(!h) return;
  if(harpa==='hcc') return hccSalvarTexto(h.n);
  const chave=harpa?'ibnm_hr_ed':'ibnm_cc_ed'; let todos={}; try{ todos=JSON.parse(localStorage.getItem(chave)||'{}')||{}; }catch(_){}
  const ed=Object.assign({},todos[h.n]||{});
  if(original) delete ed.__texto; else { const v=(document.getElementById('hxTxt')||{}).value||''; ed.__texto=v.replace(/\r/g,'').replace(/\s+$/,''); }
  if(Object.keys(ed).length) todos[h.n]=ed; else delete todos[h.n];
  if(harpa){ localStorage.setItem(chave,JSON.stringify(todos)); }   /* a Harpa sobe sozinha para a nuvem */
  else {
    try{ _setItem.call(localStorage,chave,JSON.stringify(todos));
      const r= Object.keys(ed).length? await sb.from('cantor_edits').upsert({num:h.n,linhas:ed,updated_at:new Date().toISOString()}) : await sb.from('cantor_edits').delete().eq('num',h.n);
      if(r&&r.error) throw r.error;
    }catch(err){ toast('Salvo neste aparelho. Na nuvem deu erro: '+(err.message||err)); }
  }
  fecharModal(); toast(original? 'Voltou ao texto original.' : 'Hino salvo.');
  setTimeout(()=>{ try{ (harpa?harpaAbrir:cantorAbrir)(h.n); }catch(_){} },150);
};
function botaoEditarTexto(){
  document.querySelectorAll('#content .cc-page .cc-tools #ted, #content .cc-page .cc-tools .cc-edit').forEach(b=>{ if(!b.classList.contains('hx-bt')) b.style.display='none'; });
  document.querySelectorAll('#content .cc-page .cc-tools .hx-bt').forEach(b=>{ if(b.textContent!=='✏️ Editar cifra') b.textContent='✏️ Editar cifra'; });
  const g=document.querySelector('#content .cc-tools .cc-ga'); if(!g || g.querySelector('.hx-bt') || !podeHinos() || document.querySelector('#content .hcc-page')) return;
  g.insertAdjacentHTML('beforeend','<button class="tog hx-bt" onclick="editarHinoTexto()">✏️ Editar cifra</button>');
}
aoMudar(()=>{ hinoEmTexto(); botaoEditarTexto(); });

/* ======================= 18) PARTITURA DO CANTOR → página do hino na Coletânea Cantor Cristão ======================= */
/* O PDF "Tom Original" de cada hino fica no site da Coletânea (André Luís Souza). O app abre a página
   do hino certo, sem copiar os arquivos (o autor pede para não baixarem tudo de uma vez). */
const SLUG = t => String(t).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'');
const CC_LISTA="001|Antífona\n002|Justo És, Senhor\n003|Louvor Ao Senhor\n004|Ao Deus Santo\n005|Presença Divina\n006|Glória ao Senhor\n007|Maravilhas Divinas\n008|Adoração\n009|Santo\n010|Auxílio Divino\n011|Ao Deus Trino\n012|Louvamos\n013|Adoração a Deus\n014|O Deus de Abraão\n015|Exultação\n016|Vinde Adorar\n017|O Amor de Deus\n018|Amor Sem Igual\n019|Boa Nova\n020|Amor Perene\n021|Louvor Ao Pai e Ao Filho\n022|Amor Sublime\n023|Deus, Fonte da Vida\n024|Deus É Amor\n025|Amor\n026|Rei Excelso\n027|Natal\n028|Nasceu O Redentor\n029|Nasce Jesus\n030|Noite de Paz\n031|Lugar para Cristo\n032|Cristo Em Belém\n033|Nasceu Jesus\n034|Plena Graça\n035|Incomparável\n036|O Amor de Jesus\n037|Amor Glorioso\n038|Divino Amor\n039|A Ovelha Perdida\n040|Amor de Cristo\n041|Reconhecimento\n042|Realização\n043|Palavras Preciosas\n044|A Linda História\n045|Por Amor de Nós\n046|Jesus me Transformou\n047|Alegria Perene\n048|Salvação\n049|Tudo Fez Jesus\n050|A Velha História\n051|Vida na Graça\n052|Jesus Glorioso\n053|Os Filhos de Sião\n054|Glória e Honra\n055|Hosana Nas Alturas\n056|Rei da Glória\n057|Bendito O Rei\n058|O Nome de Jesus\n059|Saudai Emanuel\n060|Coroai (CORONATION)\n060|Coroai (DIADEM)\n061|Glória a Jesus\n062|Nome Precioso\n063|Jesus, o Senhor\n064|Jubiloso\n065|Jesus O Bem-Amado\n066|Rei dos Céus\n067|Cristo Exaltado\n068|Bem-aventurados\n069|Aleluia\n070|Nome Adorável\n071|Amigo Eterno\n072|Amigo Sem Igual\n073|Um Grande Amigo\n074|Graças a Jesus\n075|Que Grande Amigo\n076|Amigo Verdadeiro\n077|O Melhor Amigo\n078|Tudo de Graça\n079|Um Bom Amigo\n080|Coração Purificado\n081|Amor Incomparável\n082|O Gólgota\n083|A Cruz de Cristo\n084|A Cruz\n085|Cantai Louvores\n086|Sangue Precioso\n087|Calvário\n088|Que Fazes Por Mim\n089|O Poder do Sangue\n090|Contemplação\n091|Sangue de Jesus\n092|Substituição\n093|Só No Sangue\n094|Jesus Na Cruz\n095|Vitória do Rejeitado\n096|Deslumbrante\n097|Jesus Veio Aqui\n098|Jesus Triunfou\n099|Ressurreição\n100|Jesus Ressuscitado\n101|Ressurgiu\n102|Cristo Volta\n103|Jesus Vindo\n104|O Bom Porvir\n105|Feliz\n106|O Desejado\n107|Esperando\n108|Chamada Final\n109|Por Pouco Tempo\n110|Quando Cristo Vier\n111|Não Tardará\n112|Vencendo Vem Jesus\n113|O Dia Glorioso\n114|A Vinda do Senhor\n115|Breve com Jesus\n116|Desejo da Alma\n117|Espírito Santo\n118|Santo Espírito\n119|Fidelidade\n120|Louvai Ao Senhor\n121|Ecos de Louvor\n122|Motivos de Louvor\n123|Bendito Cordeiro\n124|Cantarei\n125|Redenção\n126|Louvai\n127|Jesus Bondoso\n128|A Redenção\n129|Bendita Luz\n130|Beneficência\n131|Bendize\n132|Ebenezer\n133|Exultação\n134|Reino Universal\n135|Louvor\n136|Estudo Bíblico\n137|O Pão da Vida\n138|A Lei do Senhor\n139|Dia do Senhor\n140|Domingo\n141|Descanso Aos Domingos\n142|Pão da Vida\n143|A Ceia do Senhor\n144|Vera Páscoa\n145|Batismo\n146|Alegria Verdadeira\n147|Obediência No Batismo\n148|Hora Bendita\n149|Persistência Em Oração\n150|Pai Nosso\n151|Comunhão\n152|Pastor Divino\n153|Perdão\n154|Firme Nas Promessas\n155|O Grande Amigo\n156|Orando Sempre\n157|Vivifica-nos, Senhor\n158|Em Oração\n159|Minha Oração\n160|A Fé Contemplada\n161|Poder Espiritual\n162|Vigiar e Orar\n163|Desejos\n164|Revivificação\n165|Oração\n166|As Promessas de Deus\n167|Vem, Inflama\n168|Chuvas de Bênçãos\n169|Mais de Cristo\n170|Oração de Consagração\n171|Avivamento\n172|Cada Dia\n173|Mais Amor\n174|Faça-se a Luz\n175|Minha Aspiração\n176|Tempo de Ser Santo\n177|Alvorada\n178|O Culto Findou\n179|Fim do Culto\n180|Despedida\n181|Bênção\n182|Despedida do Culto\n183|A Luz do Mundo\n184|Há Livre Perdão\n185|Somente Cristo\n186|É Jesus Quem Salva\n187|Teus Pecados\n188|O Evangelho\n189|Graça Inefável\n190|Para Salvar-te\n191|Eis a Nova\n192|Só Por Jesus\n193|Proclamação\n194|A Mensagem Celeste\n195|Vida Por Um Olhar\n196|Conta-me\n197|Inabalável\n198|Aleluia\n199|Cordeiro Divino\n200|A Vinda de Jesus\n201|O Novo Nascimento\n202|Jesus Tem Poder\n203|Olha para Cristo\n204|Reconciliai-vos\n205|Ó minha alma, sem demora\n206|Promessa Gloriosa\n207|Mensagem Real\n208|Justificação\n209|Venham Escutar\n210|Cristo Te Chama\n211|Vem, Pecador\n212|Oh, Vinde Já\n213|Quem Quiser\n214|Cristo Chama Por Ti\n215|Fonte Bendita\n216|Descanso Em Jesus\n217|Segue-me\n218|Vinde a Mim\n219|Vem Já\n220|Perdão e Salvação\n221|Convite\n222|Manso e Suave\n223|Abrigo\n224|Um Passo Só\n225|Voz de Ternura\n226|Dá Teu Coração\n227|Despertado Coração\n228|Ouvi a Chamada\n229|Régio Hóspede\n230|Deus Chamando\n231|Vem, Filho, Vem\n232|Cristo À Porta\n233|Por Que Não Já\n234|Cristo Salva\n235|Chamada\n236|Atribulado Coração\n237|Tão Perto\n238|A Água da Vida\n239|A Luz do Céu\n240|Vem a Cristo\n241|Palavra Abençoada\n242|Vinde Já\n243|Vida Eterna\n244|Graça Admirável\n245|Cristo Vai Passar\n246|Vem Agora\n247|Vem, Filho Perdido\n248|Filho Pródigo\n249|Banquete de Belsazar\n250|Quase Induzido\n251|Quase Achegado\n252|A Porta Franca\n253|Não Havia Lugar\n254|Não Venhas Tarde\n255|Qual É Teu Refúgio\n256|Inda Há Lugar\n257|Quem É Que Vai\n258|Chora Agora\n259|A Última Hora\n260|Agora\n261|Alma Ansiosa\n262|Contrição\n263|Luz Divina\n264|Das Trevas\n265|Resgate\n266|Tal Qual Estou\n267|Salvação Pela Fé\n268|Como Estou\n269|Confissão\n270|Resolução\n271|Substituição\n272|Só Um Passo\n273|Salvador Benigno\n274|Coro Santo\n275|Contentamento\n276|Coro Celeste\n277|Convencido\n278|Cantai\n279|A Doce Luz\n280|Fiquei Curado\n281|Fonte Divina\n282|Maravilha\n283|Mais Perto\n284|Companhia Divina\n285|O Alvo Supremo\n286|Junto a Ti\n287|Com Jesus\n288|Perto do Senhor\n289|Ao Pé da Cruz\n290|Cristo, Meu Mestre\n291|Comunhão Celeste\n292|Perto de Jesus\n293|Desejos Espirituais\n294|Necessitado\n295|Tudo Entregarei\n296|Consagração\n297|Súplica\n298|Estou Pronto\n299|Onde Quer Que Seja\n300|Tudo Por Cristo\n301|Crer e Observar\n302|Como a Neve\n303|Amor a Jesus\n304|Um Vaso de Bênção\n305|Consagrar Tudo\n306|O Caminho da Cruz\n307|Reconhecimento\n308|Para Onde For, Irei\n309|Consagrando-nos\n310|Em Teus Braços\n311|Confiança\n312|Amparo\n313|Proteção Divina\n314|Estou Seguro\n315|Meu Clamor\n316|Deus É Por Mim\n317|Abrigo\n318|Deus me Esconde\n319|Abrigo Perfeito\n320|Abrigo Feliz\n321|Abrigo Seguro\n322|Cristo Valerá\n323|Castelo Forte\n324|Refúgio Verdadeiro\n325|Naufrágio\n326|Refúgio\n326|Refúgio (segunda música)\n327|O Piloto\n328|Sossegai\n329|Conta as Bênçãos\n330|O Segredo do Viver\n331|Glória No Porvir\n332|Meu Senhor de Tudo Sabe\n333|Deus É Sabedor\n334|Alívio\n335|O Gozo da Vida\n336|Fonte de Consolação\n337|Nada de Desânimo\n338|Redentor\n339|Não Consintas\n340|Importará\n341|Socorro Divino\n342|A Minha Cruz\n343|Sempre Firme\n344|Deus Cuidará de Ti\n345|Contar a Jesus\n346|Meu Deus Proverá\n347|O Coração Em Paz\n348|Confiando\n349|Rica Promessa\n350|Quero o Salvador\n351|Direção Divina\n352|Seguindo a Cristo\n353|Sou Pecador\n354|Cada Momento\n355|Luz Benigna\n356|Jesus Como Guia\n357|Guia-me\n358|Não Há Perigo\n359|Jesus Como Guia\n360|Companheiro\n361|Por Mim\n362|Nunca Sozinho\n363|Sê Tu Meu Guia\n364|Filhos de Deus\n365|Fé Persistente\n366|Firmeza\n367|Firme Na Rocha\n368|Confiança\n369|Só Jesus\n370|Crendo Em Cristo\n371|Rocha Eterna (Música 1 - TOPLADY)\n371|Rocha Eterna (Música 2 - EXCELL)\n372|Salvo Estou\n373|Certeza\n374|Salvo\n375|Segurança\n376|Salvação Perfeita\n377|Não Sei Por Que\n378|Já Certo Estou\n379|Laços Benditos\n380|Amor\n381|Amor Fraternal\n382|Vamos À Igreja\n383|Satisfação\n384|A Voz de Jesus\n385|Louvor\n386|Cristo, Meu Deleite\n387|Contentamento\n388|O Homem Feliz\n389|Ventura\n390|Nada Falta\n391|Estou Contente\n392|Extraviado\n393|Cristo pra Mim\n394|Realidade\n395|Cristo Satisfaz\n396|Cegueira e Vista\n397|Achei Descanso\n398|Sou Feliz\n399|Cantarei de Cristo\n400|Júbilo\n401|Eu Sou de Jesus\n402|Escrava Resgatada\n403|Alegre\n404|Substituição\n405|Gozo e Paz\n406|Confiar Em Cristo\n407|Ditoso Dia\n408|Descanso Verdadeiro\n409|Plena Paz\n410|Felicidade No Serviço\n411|Dia Festivo\n412|A Música dos Salvos\n413|Lealdade\n414|Acordai\n415|Alerta\n416|Filhos da Luz\n417|Brilha No Viver\n418|Disposição de Trabalhar\n419|Mãos Ao Trabalho\n420|Servir Alegremente\n421|Conversação Cristã\n422|Trabalho Cristão\n423|Oh! Buscai\n424|Vamos À Colheita\n425|Luz Após Trevas\n426|Gratidão Na Luta\n427|Conquistar o Mundo\n428|Luz Nas Trevas\n429|Ceifando\n430|Em Cada Lugar\n431|Acode Em Tempo\n432|Avante com Deus\n433|A Colheita Além\n434|Onde os Obreiros\n435|Ainda Há Lugar\n436|Dai-nos Luz\n437|As Boas Novas\n438|Ouvindo de Jesus\n439|Oração Pela Pátria\n440|A Pátria Feliz\n441|Graça e Salvação\n442|O Missionário\n443|Eis os Milhões\n444|Brasil\n445|Deves Divulgar\n446|Avançai\n447|Nunca Ouvir de Cristo\n448|Ide\n449|Ousados Proclamai\n450|Igreja, Alerta\n451|Os Que Confiam\n452|Decisão\n453|À Peleja\n454|Vitória Nas Lutas\n455|Heróis\n456|O Estandarte\n457|Confiança Em Deus\n458|Cristo Vos Conduz\n459|Companheiras\n460|Vitória\n461|Fujamos da Tentação\n462|Unidos\n463|Triunfo\n464|Sempre Fiéis\n465|Igual a Daniel\n466|Lutai Por Cristo\n467|Avante com Alegria\n468|Testemunhos\n469|Corajosos\n470|O Combate\n471|Vitorioso\n472|Frente Ousada\n473|Firmes Na Fé\n474|Eia, Ao Combate\n475|Lutar\n476|Brilho Celeste\n477|Como Andar\n478|O Peregrino\n479|Vou À Pátria\n480|Favor\n481|Ao Lar Celestial\n482|Guia, Ó Deus\n483|Pátria Celestial\n484|Saudade\n485|Livro da Vida\n486|Doce Porvir\n487|Precioso É Jesus\n488|Cada Vez Mais\n489|Céu pra Mim\n490|Com Cristo É Céu\n491|Como Há de Ser\n492|Meu Canto Celestial\n493|No Paraíso\n494|Além\n495|Redenção\n496|Rio da Vida\n497|Tantos Remidos\n498|A Bela Cidade\n499|Tudo Feliz\n500|Glória pra Mim\n501|O Nosso Lar\n502|Um Pouco Mais\n503|Face a Face\n504|Lá no Céu\n505|Jerusalém\n506|Junto Ao Trono\n507|Minha Coroa\n508|Terra Feliz\n509|Verei Meu Redentor\n510|Fonte de Amor\n511|Com Jesus\n512|O Doce Lar\n513|Triunfo\n514|Paz Real\n515|Na Glória\n516|Além da Morte\n517|Querido Lar\n518|Glória\n519|Perante o Rei\n520|Canaã Celeste\n521|A Cidade Santa\n522|Um Bom Amigo\n523|Cordeirinhos\n524|Jóias Preciosas\n525|Vinde, Meninos\n526|Os Meninos\n527|A Bênção\n528|Aspiração Infantil\n529|Vai Buscar\n530|Soldado Infantil\n531|Teu Cantinho\n532|Ó Meninos, Vinde\n533|Pequenos Guerreiros\n534|Cantam Glória\n535|Hosana Infantil\n536|A Lição\n537|Desejo Infantil\n538|Oh, Vinde, Meninos\n539|Brilhando\n540|Oração de Criança\n541|Pequenos Raios\n542|Jesus e as Crianças\n543|Cântico Escolar\n544|Avante, Mocidade\n545|Vamos À Escola\n546|Mocidade, Avante\n547|Semeando e Segando\n548|Jovens Lutadores\n549|Alerta, Mocidade\n550|Juventude\n551|Mocidade\n552|Mocidade Crente\n553|Lealdade a Cristo\n554|Agora\n555|Alerta, Jovens\n556|Oração para a Noite\n557|O Anoitecer\n558|Hino Vespertino\n559|Fim do Ano\n560|Ano Novo\n561|Salve, Ano Novo\n562|Templo Novo\n563|Consagração de Templo\n564|Mais Um Templo\n565|Separação\n566|Saudação\n567|União Vital\n568|Casamento\n569|O Ministério Santo\n570|Mais Um Obreiro\n571|Morte do Crente\n572|Dormir Em Cristo\n573|Dormindo No Senhor\n574|Pátria Brasileira\n575|Hino da Proclamação da República do Brasil\n576|Hino à Bandeira Nacional\n577|Hino Nacional Brasileiro\n578|Sonda-me, Ó Deus\n579|Olhando para Cristo\n580|Vem, Visita Tua Igreja\n581|A Única Esperança";
const HCC_LISTA="001|Oh Vinde Adorar\n002|Santo! Santo! Santo!\n004|Santo, Santo, Pai Bondoso!\n006|Onipotente Rei\n008|A Ti, Ó Deus, Fiel E Bom Senhor\n009|Louvamos-Te, Ó Deus\n010|Louvemos Ao Senhor\n013|Deus Sábio, Invisível, Perfeito, Imortal\n014|Ao Deus De Abraão Louvai\n017|Fonte És Tu De Toda Bênção\n021|Tu És Digno De Louvor\n022|Justo És Senhor\n025|Tu És Fiel, Senhor\n027|Cantemos Os Louvores\n029|Deus É Amor\n030|A Terra Semeamos\n032|Ao Deus De Amor E De Imensa Bondade\n033|Deus Cuidará De Ti\n034|Deus Dos Antigos\n035|Deus Guia Seus Filhos Em Paz\n037|Deus Vos Guarde Pelo Seu Poder\n038|Ó Deus, Eterno Ajudador\n042|Guia, Ó Deus, A Minha Vida\n043|Tu És Digno\n045|O Mundo É Teu, Senhor\n046|Pela Graça E O Primor\n047|Altamente Os Céus Proclamam\n050|Louvai Ao Deus Da Criação\n052|Grandioso És Tu!\n053|Tudo Belo, Ó Deus, Criaste\n056|Saudai O Nome De Jesus\n059|Saudai O Nome De Jesus\n060|Aleluia! Aleluia! Gratos Hinos Entoai!\n062|Jesus, Sempre Te Amo\n063|Maravilhoso, Ó Jesus Amado\n064|Glorioso És Tu Senhor\n066|Cantarei Ao Meu Salvador\n068|Tudo És Tu, Jesus\n072|Mil Línguas Eu Quisera Ter\n073|Louvamos, Louvamos, Senhor E Adoramos\n075|Bendize, Tu, Meu Coração\n076|Ao Eterno Salvador Jesus\n077|Luz Da Minha Alma\n082|Meu Deus, Eu Te Amo\n084|Eu Te Amo, Ó Meu Salvador\n085|Oh, Vem, Oh, Vem, Emanuel!\n087|Vem, Jesus Tão Desejado\n089|Em Silêncio Toda Carne\n090|Oh, Vinde, Fiéis!\n091|Noite De Paz! Noite De Amor!\n092|O Canto Angelical\n094|Falai Pelas Montanhas\n095|De Belém A Linda História\n096|Cantam Anjos Harmonias\n097|Anjos Das Mansões De Glória\n098|Pequena Vila De Belém\n099|Num Berço De Palhas\n100|Proclamaram Anjos Mil O Primeiro Natal\n102|Quem é o Menino?\n104|Surgem Anjos Proclamando\n106|Cantai Que O Salvador Chegou!\n107|Numa Estrebaria Rude\n108|Vem, Minha Alma, Alegremente\n110|Jesus Foi Criança Como Eu\n112|Vem, Jesus, Habitar Comigo!\n114|Veio A Este Mundo O Senhor Jesus\n116|Um Dia\n117|Homem De Tristeza E Dor\n118|São De Jesus As Histórias\n123|A Ti, Hosana E Glória\n124|Morri Na Cruz Por Ti\n125|Oh, Quanto, Quanto Nos Amou!\n127|Ao Contemplar A Rude Cruz\n128|Digno É O Cordeiro\n130|Oh, Fronte Ensanguentada\n132|Rude Cruz\n134|Bem Junto À Cruz De Cristo\n135|Cristo Já Ressuscitou\n136|Adoro O Cristo Vivo\n137|Porque Vivo Está\n138|Vinde Vós, Fiéis, Cantar\n140|Da Sepultura Saiu\n144|Findou-Se A Luta De Jesus\n145|Hoje Nos Lembramos Da Ressurreição\n150|Será De Manhã?\n153|Já Refulge A Glória Eterna De Jesus\n155|Afirmou O Senhor Que Virá Outra Vez\n157|Quando Deus Fizer Chamada\n160|Um Bom Amigo E Fiel Achei\n162|Cristo, Amigo Das Crianças\n163|Todo Coração Procura\n165|Em Jesus Amigo Temos\n166|Senhor, É Admirável O Teu Divino Amor\n167|O Teu Amor, Jesus\n169|Buscou-Me Com Ternura\n170|Maravilhoso Amor\n171|Amor, Que Por Amor Desceste!\n173|Cristo Tem Amor Por Mim\n174|Nome Bom, Doce A Fé\n175|Jesus, Teu Nome É Santo\n177|Nome Que Inspira O Meu Louvor\n179|Jesus É O Nome Do Cristo De Deus\n180|Jesus, Teu Nome Satisfaz\n181|Jesus Me Guia\n182|Dia A Dia\n183|Cada Momento\n185|Meu Bom Pastor\n187|O Meu Pastor É O Bom Jesus\n188|Glória Ao Redentor\n190|Por Meus Pecados Padeceu\n191|Cantarei A Linda História\n193|Maravilhosa Graça\n195|Oh, Venham Coroar!\n196|Oh, Momento Glorioso!\n197|Cristo Jesus Com Poder Reinará\n198|Cristo É Meu Rei\n200|Cristo É Tudo Para Mim\n202|Ele É Meu E Teu Senhor\n203|Cristo É Meu Senhor\n205|Ele É O Meu Senhor\n207|Ó Bom Consolador\n208|Eu Não Posso Fugir Do Teu Espírito\n209|Oh, Vem Fazer, Fiel Consolador!\n210|Eu Os Guiarei Ao Lar\n212|Ó Senhor, Vem Me Dirigir!\n213|Oh, Vive Em Mim, Consolador!\n215|Livro Santo\n216|Eu Quero O Pão Do Céu\n217|É A Bíblia Nossa Luz\n219|Deus Nos Deu Mensagem Santa\n220|Teu Livro Santo\n222|Deus Está Presente\n223|Alegres, Adorai\n224|Vós, Criaturas De Deus Pai\n226|Este É O Dia Do Senhor\n227|Louve Meu Ser Ao Grandioso Senhor\n228|A Deus Demos Glória\n229|Louvem, Com Alegre Som\n230|Louvai Com Todo O Ardor\n233|Adorem O Rei\n234|Pai Celeste, Deus Bendito\n235|Vinde, Cristãos, Cantai\n236|Sim, Com Certeza\n238|A Deus, O Pai E Benfeitor\n239|Santo És Tu, Senhor\n240|Cristo, Nós Te Adoramos\n241|Aceita, Agora, Senhor, Meu Deus\n244|Oh, Trazei À Casa Do Tesouro!\n248|Ao Findar O Labor Desta Vida\n251|Salvação Jesus Me Dá\n252|Amigo, Não Saia Sem Cristo\n254|Cristo, Só Cristo!\n256|Jesus Quer Entrar Hoje Em Teu Coração\n257|Venha, Ó Sofredor, Venha Agora\n260|Anda Com Jesus\n262|Deixa O Salvador Te Ajudar\n264|Oh, Olhai, Pois, E Vivei!\n265|Terás Vida Em Olhar Pra Jesus\n266|Uma Bênção Antiga\n268|O Senhor Te Abençoe E Te Guarde\n269|Finda-Se Este Dia\n270|Finda-Se Este Culto\n274|Com A Paz Vem Despedir-Nos\n279|Sonda-Me, Ó Deus\n283|Eu Creio, Senhor, Na Divina Promessa\n285|Em Cristo Há Perfeito Perdão\n286|Alvos Mais Que A Neve\n288|Vem, Senhor, Do Bem A Fonte\n290|Alegra O Triste Coração\n291|Graça De Deus, Infinito Amor\n293|Foi Na Cruz\n295|Para O Céu Por Jesus Irei\n296|Eis A Nova\n297|Feliz O Dia\n299|As Novas Do Evangelho\n300|Tal Qual Estou\n301|Remido\n303|Maravilhoso Cristo\n304|Jesus, Levaste A Minha Cruz\n307|Rocha Eterna\n310|Quem Salva É Só Jesus\n311|Deus Enviou Jesus\n314|Preciosa A Graça De Jesus\n315|És Minha Alegria\n316|Só Em Pensar Em Ti, Jesus\n318|Que Alegria É Crer Em Cristo\n319|Agora Estou Contente\n323|Eu Alegre Vou Na Sua Luz\n324|Pelo Vale Escuro\n327|Se Teu Coração Estiver Em Paz\n329|Sou Feliz Com Jesus\n330|Descansando No Poder De Deus\n331|Como Um Rio Calmo\n333|Haja Paz Na Terra\n334|Meu Divino Protetor\n335|De Teu Cuidado Terno\n336|Meu Coração Descansa Em Deus\n337|Chuvas De Bênçãos\n338|Nossa Fé Jesus Contemplará\n339|Almejo A Fé Que Forte É\n340|Salvador Bendito\n343|Se Queres Forças Na Fraqueza\n344|Firme Nas Promessas\n348|A Minha Fé E O Meu Amor\n349|Meu Deus Proverá\n350|A Jesus Cristo Contarei Tudo\n351|Cristo, Esperança Viva\n355|Aflito? Por Que Aflito?\n357|O Segredo Do Viver\n358|Ó Cristo, Pão Da Vida\n360|Espero Em Ti, Senhor\n361|Meu Senhor, Sou Teu\n362|Desejo A Santidade\n364|Mais De Cristo\n366|Em Mim Vem Habitar\n367|Com Alegria Venho, Ó Deus\n369|Cristo, Bom Mestre, Eis Meu Querer\n370|Vem, Salvador, Agora, Transformar\n371|Mais Puro Quero Ser\n373|Junto A Ti\n374|Ao Orarmos Senhor\n375|Ouve-Nos, Pastor Divino\n377|Com Tua Mão Segura Bem A Minha\n378|Bendita A Hora De Oração\n379|Dirijo A Ti, Jesus, Minha Oração\n380|Com A Minha Voz Clamo Ao Senhor\n381|Bendita É Sempre A Hora Da Prece\n382|Senhor, Se Em Meu Caminho\n383|Ó Deus Eterno, Vem Me Conceder\n384|Nosso Pai Que Estás No Céu\n386|Bem De Manhã\n387|O Meu Clamor, Ó Deus, Atende\n388|Santifica A Tua Igreja\n390|Filhos Da Luz\n392|Aviva-Nos, Senhor\n393|Em Comunhão Com Deus\n394|Contigo, Ó Mestre, Quero Andar\n395|Quero Estar Ao Pé Da Cruz\n399|Mais Perto Quero Estar\n404|Eu Andei A Sós Com Cristo\n406|Castelo Forte É Nosso Deus\n407|Bem-aventurado é aquele\n408|Mestre, O Mar Se Revolta\n409|Sei Que Jesus Vai Por Onde Eu Andar\n411|Minha Esperança, Jesus, Asseguras\n412|Deus É Nosso Pai Amado\n413|Ouvi O Salvador Dizer\n416|Nossa Morada Na Rocha Está\n417|Que Segurança! Sou De Jesus!\n419|Graças Dou Por Minha Vida\n426|Graças Te Rendemos\n427|Pelo Lar Que Tu Nos Deste\n429|A Ti Seja Consagrada Minha Vida\n430|O Que Darei A Cristo\n431|Eu Resolvi Seguir-Te\n433|Usa, Senhor\n434|Teu Santo Amor, Jesus\n435|Não Sou Meu\n437|Eu Canto A Ti Minha Oração\n438|Quero Ser Um Vaso De Bênção\n439|Toma, Senhor, Minha Mente\n442|Perto, Mais Perto\n444|Conta As Bênçãos\n446|Brilho Celeste\n447|Mas Eu Sei Em Quem Tenho Crido\n448|Que Mudança Admirável\n450|Triste E Sombrio Foi Meu Viver\n451|Como É Triste Andar Em Trevas\n454|Eu Sou De Jesus\n456|Precioso É Jesus Para Mim\n458|Por Sua Graça E Compaixão\n459|Quem Meu Coração Encanta\n462|Cristo Me Amou E Me Livrou\n463|O Meu Coração Sofredor\n465|Crer E Observar\n466|Cedo Ou Tarde\n468|Onde Quer Que Seja\n469|Sempre Seguirei A Cristo\n472|Tua Vontade Faze, Ó Senhor\n475|Vem Me Ensinar, Senhor\n476|\"Seguireis?\", Pergunta O Mestre\n480|Seguir A Cristo Não É Sacrifício\n482|Eu Quero Fazer O Que Queres, Senhor\n484|Onde Quer Que For, Irei\n486|O Mestre Nos Chama\n488|Brilha No Meio Do Teu Viver\n491|No Serviço Do Meu Rei\n492|Mãos Ao Trabalho\n496|Barnabé, Homem De Deus\n497|Cristo Amado\n499|Ouvi Contar A História De Jesus\n502|Temos Por Lutas Passado\n504|Da Igreja O Fundamento\n505|Igrejas Bem Fortes\n506|Senhor, A Tua Igreja\n507|Eu Amo Com Fervor A Igreja\n508|Senhor, Que É Nosso Templo?\n510|Às Águas Do Jordão\n511|Sou Em Teu Nome Batizado\n512|Lembrando Teu Sepulcro\n513|Ó Senhor, Nos Alegramos\n514|Venham À Mesa\n515|A Ceia Do Senhor Jesus\n516|Pão Da Vida\n518|Com Prazer Nos Congregamos\n519|Reunidos Junto À Mesa\n524|Fiel, Eterno E Santo Amor\n525|Ah, Se Eu Tivesse Mil Vozes!\n526|Cristo É A Única Esperança\n528|Eis Multidões\n530|Pudesse Contar Toda A Glória\n532|Testemunhas Somos Todos\n533|Nossa Gente Quer Viver Em Segurança\n534|Sim, Conquistar O Mundo Pra Cristo\n538|Fala E Não Te Cales\n540|Desde Um Ao Outro Pólo\n541|As Boas Novas Anunciai\n542|Só Jesus Cristo Salva\n543|Eu Aceito O Desafio\n545|Eu Vos Envio\n546|Dá-Me Tua Visão\n557|Senhor, A Ti Rendemos Louvor\n560|Olhando Para Cristo\n563|Benditos Laços São\n564|Pai, Faz-Nos Um\n566|Jesus, Pastor Amado\n567|Não Há Em Cristo Norte Ou Sul\n569|Qual O Adorno Desta Vida?\n572|Somos Um Pelos Laços Do Amor\n574|Um Só Rebanho\n575|Na Pátria Celeste\n577|Perante O Trono De Esplendor\n579|Jerusalém Excelsa\n580|Céu, Lindo Céu!\n581|Há Um Rio Cristalino\n583|Lá No Céu Moraremos\n585|Já Temina O Ano Velho\n586|Por Tanto Amor Que O Pai Mostrou\n589|Este Templo Dedicamos\n590|Em Cristo Seja O Lar Edificado\n592|Lar Feliz Nós Vamos Ser\n593|Nestes Tempos De Incerteza\n596|Se Houver Amor\n597|Perfeito Amor\n598|Abençoa, Deus De Amor\n601|Por Nossa Pátria Oramos\n603|Minha Pátria Para Cristo\n607|O Menino, Que Vai Ser?\n611|Que Alegria Neste Dia!\n613|Com Alegria Recordamos";
function mapaSite(txt){ const m={}; txt.split('\n').forEach(l=>{ const [n,t]=l.split('|'); (m[+n]=m[+n]||[]).push({t, slug:n+'-'+SLUG(t)}); }); return m; }
const CC_SITE=mapaSite(CC_LISTA), HCC_SITE=mapaSite(HCC_LISTA);
window.abrirSiteHino=function(livro,n){
  const base= livro==='hcc'? 'https://sites.google.com/site/coletaneahcc/' : 'https://sites.google.com/site/coletaneacantorcristao/';
  const L=(livro==='hcc'?HCC_SITE:CC_SITE)[n];
  if(!L) return toast(livro==='hcc'? 'Este hino não tem página na Coletânea HCC.' : 'Hino não encontrado na Coletânea.');
  if(L.length===1) return window.open(base+encodeURI(L[0].slug),'_blank','noopener');
  abrirModal('<h3>📜 Partitura — escolha a música</h3>'+L.map(x=>'<button class="btn btn-primary" style="width:100%;margin:5px 0" onclick="window.open(\''+base+encodeURI(x.slug)+'\',\'_blank\',\'noopener\');fecharModal()">'+e(x.t)+'</button>').join(''));
};
document.addEventListener('click',ev=>{
  const b=ev.target.closest&&ev.target.closest('#content .cc-tools button'); if(!b || !/PARTITURA/.test(b.textContent) || /Subir|Trocar/i.test(b.textContent)) return;
  ev.preventDefault(); ev.stopImmediatePropagation(); abrirPartitura();
},true);

/* ======================= 19) HINÁRIO PARA O CULTO CRISTÃO (HCC) ======================= */
/* Seção nova em Músicas. Lista dos hinos com página na Coletânea HCC (cifragem em PDF lá) e,
   no app, a cifra/letra que o ADM escrever — com tom, acordes, letra e tudo como no Cantor. */
let HCC_DB=null; let _hccSt={}; let _hccQ='';
async function hccCarrega(forca){
  if(HCC_DB && !forca) return HCC_DB;
  try{ const c=JSON.parse(localStorage.getItem('ibnm_hcc')||'null'); if(c && !HCC_DB) HCC_DB=c; }catch(_){}
  try{ if(typeof sb!=='undefined'){ const {data,error}=await sb.from('hcc_hinos').select('*'); if(!error){ HCC_DB={}; (data||[]).forEach(r=>HCC_DB[r.num]=r); localStorage.setItem('ibnm_hcc',JSON.stringify(HCC_DB)); } } }catch(_){}
  if(!HCC_DB) HCC_DB={}; return HCC_DB;
}
function hccHino(n){ const r=(HCC_DB||{})[n]||{}, si=HCC_SITE[n]; const tx=r.texto||'';
  return {n, titulo:r.titulo||(si?si[0].t:'Hino '+n), tom:normTom(r.tom)||(tx?detectarTom(tx):''), partes:[], texto:tx, site:!!si, hcc:true, youtube:r.youtube||''}; }
function hccTodos(){ const ns=new Set([...Object.keys(HCC_SITE),...Object.keys(HCC_DB||{})].map(Number)); return [...ns].sort((a,b)=>a-b).map(hccHino); }
const hccFavs=()=>{ try{ return new Set(JSON.parse(localStorage.getItem('ibnm_hcc_fav')||'[]')); }catch(_){ return new Set(); } };
window.hccFav=function(n,ev){ if(ev) ev.stopPropagation(); const f=hccFavs(); f.has(n)?f.delete(n):f.add(n); localStorage.setItem('ibnm_hcc_fav',JSON.stringify([...f])); const pg=document.querySelector('.hcc-page[data-n]'); if(pg) hccAbrir(n,true); else hccBuscar(_hccQ); };
const hccFsVal=()=> +(localStorage.getItem('ibnm_hcc_fs')||20);
window.hccFs=function(d){ localStorage.setItem('ibnm_hcc_fs',Math.min(34,Math.max(14,hccFsVal()+d))); const pg=document.querySelector('.hcc-page[data-n]'); if(pg) hccAbrir(+pg.dataset.n,true); };
function primeiraLinha(tx){ const l=String(tx||'').split('\n').find(l=>l.trim() && !/^\s*\[[^\]]+\]\s*$/.test(l) && !(window.__ehLinhaDeAcordes&&__ehLinhaDeAcordes(l))); return l? l.trim() : ''; }
function hccItem(h){ const fv=hccFavs().has(h.n);
  return '<li><a href="javascript:void(0)" onclick="hccAbrir('+h.n+')"><span class="num">'+h.n+'</span><span><span class="tt">'+e(h.titulo)+'</span><span class="fl">'+e(h.texto? primeiraLinha(h.texto).slice(0,60) : (h.site?'📄 cifragem em PDF na Coletânea':''))+'</span></span><span class="hcc-star'+(fv?' on':'')+'" onclick="hccFav('+h.n+',event)">'+(fv?'★':'☆')+'</span></a></li>'; }
function hccListaHTML(){ const q=SLUG(_hccQ), qn=_hccQ.trim();
  const L=hccTodos(), porTit=L.filter(h=>!q || (/^\d+$/.test(qn)? String(h.n).startsWith(qn) : SLUG(h.titulo).includes(q))),
        porLet=(q && !/^\d+$/.test(qn))? L.filter(h=>h.texto && !porTit.includes(h) && SLUG(h.texto).includes(q)) : [];
  return (porTit.length?'<ul class="cc-list">'+porTit.map(hccItem).join('')+'</ul>':'')+(porLet.length?'<p class="cc-sec">Encontrado na letra</p><ul class="cc-list">'+porLet.map(hccItem).join('')+'</ul>':'')+(!porTit.length&&!porLet.length?'<div class="empty">Nenhum hino encontrado.</div>':''); }
window.hccBuscar=function(v){ _hccQ=v; const el=document.getElementById('hccRes'); if(el) el.innerHTML=hccListaHTML(); };
window.hccNovo=function(){ const n=parseInt(prompt('Número do hino no HCC:')||'',10); if(!(n>0)) return; if(!HCC_SITE[n] && !(HCC_DB||{})[n]){ const t=prompt('Título do hino '+n+':')||''; (HCC_DB=HCC_DB||{})[n]={num:n,titulo:t,texto:'',tom:null}; } hccAbrir(n); setTimeout(()=>{ try{ editarHinoTexto(); }catch(_){} },300); };
if(typeof ROTAS!=='undefined'){
  ROTAS.hcc=function(){ hccCarrega().then(()=>{ const el=document.getElementById('hccRes'); if(el) el.innerHTML=hccListaHTML(); const c=document.getElementById('hccCont'); if(c) c.textContent=hccTodos().length; });
    const adm=podeHinos();
    return '<div class="page cc-page hcc-lista"><div class="page-ttl">📕 Hinário para o Culto Cristão</div>'+
      '<p style="font-size:13px;color:#789;margin-bottom:12px"><span id="hccCont">'+hccTodos().length+'</span> hinos · use a busca por número, título ou letra'+(adm?' · <b style="color:var(--verde-med)">você é ADM e pode escrever e editar as cifras</b>':'')+'</p>'+
      '<input class="search-box" placeholder="🔎 Número ou título do hino" value="'+e(_hccQ)+'" oninput="hccBuscar(this.value)">'+
      (adm?'<button class="mini-btn" style="margin:8px 0" onclick="hccNovo()">＋ Hino que não está na lista</button>':'')+
      '<div id="hccRes">'+hccListaHTML()+'</div>'+
      '<p class="cc-foot">HCC · cifragens em PDF da Coletânea HCC (André Luís Souza) · cifras no app escritas pelos ADMs</p></div>'; };
  ROTAS.hccver=function(n){ setTimeout(()=>hccCarrega().then(()=>hccAbrir(+n,true)),0); return '<div class="page cc-page hcc-page" data-n="'+(+n)+'"><div class="empty">Carregando…</div></div>'; };
}
let _hccScroll=null;
window.hccScroll=function(){ if(_hccScroll){ clearInterval(_hccScroll); _hccScroll=null; } else _hccScroll=setInterval(()=>window.scrollBy(0,1),60); const b=document.getElementById('tsc'); if(b){ b.textContent=_hccScroll?'⏸ Pausar rolagem':'▶ Rolagem'; b.setAttribute('aria-pressed',_hccScroll?'true':'false'); } };
let _hccCifras=true;
window.hccCifras=function(n){ _hccCifras=!_hccCifras; hccAbrir(n,true); };
window.hccTransp=function(n,d){ _hccSt[n]=((_hccSt[n]||0)+d+12)%12; hccAbrir(n,true); };
window.hccAbrir=function(n,manter){
  const c=document.getElementById('content'); if(!c) return;
  if(!document.querySelector('.hcc-page[data-n="'+n+'"]') && !manter){ go('hccver',n); return; }
  const h=hccHino(n); const st=_hccSt[n]||0; const key=h.tom? transpTom(h.tom,st) : '';
  const L=hccTodos(), i=L.findIndex(x=>x.n===n), prev=L[i-1], next=L[i+1]; const adm=podeHinos(); const fv=hccFavs().has(n);
  const corpo= h.texto? '' : '<div class="empty">Ainda não há cifra deste hino no app.'+(h.site?'<br>Toque em <b>📜 PARTITURA</b> para abrir a cifragem em PDF na Coletânea.':'')+(adm?'<br>Ou toque em <b>✏️ Editar hino (texto)</b> para escrever.':'')+'</div>';
  const html='<div class="cc-hbar"><button class="ib" onclick="go(\'hcc\')">‹ Hinos</button>'+
    '<button class="ib '+(fv?'fav-on':'')+'" onclick="hccFav('+n+')" aria-label="Favoritos">'+(fv?'★':'☆')+'</button><span class="sp"></span>'+
    '<button class="ib" onclick="hccFs(-2)" aria-label="Diminuir letra">A−</button><button class="ib" onclick="hccFs(2)" aria-label="Aumentar letra">A+</button></div>'+
    '<main class="cc-main"><div class="cc-head"><div class="n">'+n+'</div><h2>'+e(h.titulo)+'</h2>'+
      '<div class="cc-meta">'+(key?'<span>Tom <b>'+e(key)+'</b>'+(st?' (original '+e(h.tom)+')':'')+'</span>':'')+'<span>HCC</span></div></div>'+
    '<div class="cc-tools">'+

      (h.texto&&key?'<span class="chip"><button onclick="hccTransp('+n+',-1)" aria-label="Baixar meio tom">−</button><span class="lbl">Tom <b>'+e(key)+'</b></span><button onclick="hccTransp('+n+',1)" aria-label="Subir meio tom">+</button></span>':'')+
      (h.texto?'<button class="tog" id="tsc" aria-pressed="'+(_hccScroll?'true':'false')+'" onclick="hccScroll()">'+(_hccScroll?'⏸ Pausar rolagem':'▶ Rolagem')+'</button>':'')+
      '<button class="tog cc-part">📜 PARTITURA</button>'+
      (h.youtube?'<a class="tog cc-yt-chip" href="'+e(ytLink(h.youtube))+'" target="_blank" rel="noopener">▶ Ouvir no YouTube</a>':'')+
      (adm?'<button class="tog" onclick="hccYt('+n+')">'+(h.youtube?'✎ Link do YouTube':'🔗 Link do YouTube')+'</button>':'')+
      (adm?'<button class="tog hx-bt" onclick="editarHinoTexto()">✏️ Editar cifra</button>':'')+
    '</div>'+
    (h.texto? '<div class="cc-song" style="--cc-fs:'+hccFsVal()+'px"></div>' : corpo)+
    '<nav class="cc-nav">'+(prev?'<a href="javascript:void(0)" onclick="hccAbrir('+prev.n+')"><small>Anterior</small>'+prev.n+' · '+e(prev.titulo)+'</a>':'<span></span>')+(next?'<a class="r" href="javascript:void(0)" onclick="hccAbrir('+next.n+')"><small>Próximo</small>'+next.n+' · '+e(next.titulo)+'</a>':'<span></span>')+'</nav></main>';
  c.innerHTML='<div class="page cc-page hcc-page" data-n="'+n+'">'+html+'</div>';
  if(!manter) window.scrollTo(0,0);
};
function ytLink(v){ v=String(v||'').trim(); const m=v.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/); if(m) return 'https://www.youtube.com/watch?v='+m[1]; if(/^[A-Za-z0-9_-]{11}$/.test(v)) return 'https://www.youtube.com/watch?v='+v; return /^https?:\/\//.test(v)? v : ''; }
window.hccYt=function(n){ const h=hccHino(n);
  abrirModal('<h3>🔗 Link do YouTube — HCC '+n+'</h3><p class="am-dica">Cole o link do vídeo no YouTube. Para tirar, apague e salve.</p><input id="hccYtIn" class="inp" placeholder="https://www.youtube.com/watch?v=…" value="'+e(h.youtube)+'">'+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Cancelar</button><button class="btn btn-primary" onclick="hccYtSalvar('+n+')">💾 Salvar</button></div>'); };
window.hccYtSalvar=async function(n){ const v=((document.getElementById('hccYtIn')||{}).value||'').trim(); const url=v? ytLink(v) : '';
  if(v && !url) return toast('Esse link não parece do YouTube.');
  const r=(HCC_DB||{})[n]||{}; const h=hccHino(n);
  const {error}=await sb.from('hcc_hinos').upsert({num:n,titulo:r.titulo||h.titulo,texto:r.texto||'',tom:r.tom||null,youtube:url||null,updated_at:new Date().toISOString()});
  if(error) return toast('Não salvou: '+error.message+(/youtube|column/i.test(error.message)?' — rode o SQL-YOUTUBE-HCC.sql':''));
  (HCC_DB=HCC_DB||{})[n]=Object.assign({},r,{num:n,titulo:r.titulo||h.titulo,youtube:url||null}); localStorage.setItem('ibnm_hcc',JSON.stringify(HCC_DB));
  fecharModal(); toast(url?'✅ Link do YouTube salvo.':'Link do YouTube removido.'); hccAbrir(n,true); };
window.hccDefinir=function(n,o){ (HCC_DB=HCC_DB||{})[n]=Object.assign({num:n},o); };
window.hccSalvarTexto=async function(n){
  const texto=((document.getElementById('hxTxt')||{}).value||'').replace(/\r/g,'').replace(/\s+$/,'');
  const ti=document.getElementById('hccTit'); const titulo=(ti&&ti.value.trim())||hccHino(n).titulo;
  const velho=(HCC_DB||{})[n]||{};
  const {error}=await sb.from('hcc_hinos').upsert({num:n,titulo,texto,tom:velho.tom||null,updated_at:new Date().toISOString()});
  if(error) return toast('Não salvou: '+error.message+(/relation|does not exist|schema cache/i.test(error.message)?' — rode o SQL do HCC.':''));
  (HCC_DB=HCC_DB||{})[n]={num:n,titulo,texto,tom:velho.tom||null}; localStorage.setItem('ibnm_hcc',JSON.stringify(HCC_DB));
  fecharModal(); toast('Hino salvo.'); hccAbrir(n,true);
};
/* HCC dentro de Músicas, junto do Cantor e da Harpa */
(function menuHcc(){ if(typeof MENU==='undefined'||!Array.isArray(MENU)) return;
  for(let i=MENU.length-1;i>=0;i--) if(MENU[i].id==='hcc' && !MENU[i].sub) MENU.splice(i,1);
  const mus=MENU.find(m=>Array.isArray(m.sub) && m.sub.some(x=>x.id==='harpa'||x.id==='cantor'));
  if(mus){ if(!mus.sub.some(x=>x.id==='hcc')){ const k=mus.sub.findIndex(x=>x.id==='harpa'); mus.sub.splice(k>=0?k+1:mus.sub.length,0,{id:'hcc',ic:'📕',nm:'Hinário HCC'}); } }
  else if(!MENU.some(m=>m.id==='hcc')) MENU.push({id:'hcc',ic:'📕',nm:'Hinário HCC'});
  try{ if(typeof _booted!=='undefined'&&_booted) montaMenu(); }catch(_){}
})();

/* ======================= 20) PRÉ-VISUALIZAÇÃO ENQUANTO DIGITA ======================= */
window.prevAoVivo=function(idTxt,idPrev){ const t=document.getElementById(idTxt), p=document.getElementById(idPrev); if(!t||!p) return; p.innerHTML=htmlTextoCifra(t.value||t.innerText||''); };
function prevEditorMusica(){
  const ed=document.getElementById('edCifra'); if(!ed || document.getElementById('edPrev')) return;
  const host=ed.closest('.ed-wrap')||ed.parentElement;
  host.insertAdjacentHTML('afterend','<div class="card ed-prev"><div class="am-dica">👁 Pré-visualização (como vai aparecer)</div><div id="edPrev" class="cc-tx prev-box"></div></div>');
  const upd=()=>{ const it=document.getElementById('edIntro'); const intro=it&&it.value.trim()? 'Intro: '+it.value.trim().split('\n').join('\n       ')+'\n\n' : '';
    const p=document.getElementById('edPrev'); if(p) p.innerHTML=htmlTextoCifra(intro+(ed.innerText||'')); };
  let t=0; const deb=()=>{ clearTimeout(t); t=setTimeout(upd,200); };
  ed.addEventListener('input',deb); ed.addEventListener('paste',()=>setTimeout(upd,300)); const it=document.getElementById('edIntro'); if(it) it.addEventListener('input',deb);
  upd();
}

/* ======================= 21) SELECIONAR VÁRIOS E EXCLUIR (todas as listas) ======================= */
const ehBotaoExcluir=b=> /🗑/.test(b.textContent) || /excluir|apagar|remover/i.test((b.getAttribute('title')||'')+' '+(b.getAttribute('aria-label')||''));
let _bkSel=new Set();
function bkAtualiza(){
  let fl=document.getElementById('bkFlut'); const n=document.querySelectorAll('#content .bk-cb:checked').length;
  if(!n){ if(fl) fl.remove(); return; }
  if(!fl){ document.body.insertAdjacentHTML('beforeend','<button id="bkFlut" class="bk-flut" onclick="bkExcluir()"></button>'); fl=document.getElementById('bkFlut'); }
  fl.textContent='🗑 Excluir ('+n+')';
}
window.bkTudoTab=function(cb,fora){ const tb= fora? cb.closest('.bk-bar').nextElementSibling : cb.closest('table'); if(!tb) return; tb.querySelectorAll('tbody .bk-cb, tr.bk-row .bk-cb').forEach(x=>x.checked=cb.checked); bkAtualiza(); };
window.bkTudo=function(cb){ const box=cb.closest('.bk-bar').nextElementSibling; if(!box) return; box.querySelectorAll('.bk-cb').forEach(x=>{ x.checked=cb.checked; const id=x.dataset.id; if(id){ if(cb.checked) _bkSel.add(id); else _bkSel.delete(id); } }); bkAtualiza(); };
function cbHTML(id){ return '<input type="checkbox" class="bk-cb"'+(id?' data-id="'+e(id)+'"'+(_bkSel.has(id)?' checked':''):'')+' onclick="event.stopPropagation()" onchange="bkMarca(this)" aria-label="Selecionar">'; }
window.bkMarca=function(cb){ const id=cb.dataset.id; if(id){ if(cb.checked) _bkSel.add(id); else _bkSel.delete(id); } bkAtualiza(); };
function marcaListas(){
  if(!(window.ehAdmin&&ehAdmin())) return;
  /* músicas (lista geral / por letra) */
  const lm=document.getElementById('listaMusicas');
  if(lm && (window.secaoLiberada? (ehPrincipal()||secaoLiberada('musicas')) : true)){
    lm.querySelectorAll('.song-row').forEach(r=>{ if(r.querySelector('.bk-cb')) return; const m=(r.getAttribute('onclick')||'').match(/abrirMusica\('([^']+)'/); if(!m) return; r.insertAdjacentHTML('afterbegin',cbHTML('mus:'+m[1])); r.classList.add('bk-row'); });
    if(!lm.previousElementSibling || !lm.previousElementSibling.classList.contains('bk-bar')) lm.insertAdjacentHTML('beforebegin','<label class="bk-bar"><input type="checkbox" onchange="bkTudo(this)"> TUDO</label>');
  }
  /* outras listas: linhas que têm botão de excluir (🗑) */
  const bts=[...document.querySelectorAll('#content button')].filter(b=>ehBotaoExcluir(b) && !b.closest('.cc-tools,.modal,#modalBox,.mm-acoes,.am-box'));
  const conts=new Map();
  bts.forEach(b=>{ let el=b; while(el && el.parentElement && el.parentElement.id!=='content'){ const p=el.parentElement; const filhos=[...p.children].filter(ch=>[...ch.querySelectorAll('button')].some(ehBotaoExcluir)); if(filhos.length>=2){ conts.set(p,filhos); break; } el=p; } });
  conts.forEach((filhos,p)=>{ if(p.id==='listaMusicas') return;
    if(p.tagName==='TBODY' || p.tagName==='TABLE' || (filhos[0]&&filhos[0].tagName==='TR')){
      /* tabela: a caixa vai numa coluna própria, e o TUDO no cabeçalho */
      filhos.forEach(r=>{ const c0=r.cells&&r.cells[0]; if(!c0 || c0.querySelector('.bk-cb')) return; c0.insertAdjacentHTML('afterbegin','<span class="bk-in">'+cbHTML('')+'</span>'); r.classList.add('bk-row'); });
      const tb=p.closest('table'); const hr=tb&&tb.querySelector('thead tr'); const h0=hr&&hr.cells[0];
      if(h0 && !h0.querySelector('.bk-tudo')) h0.insertAdjacentHTML('afterbegin','<input type="checkbox" class="bk-tudo" title="Marcar todos" onclick="event.stopPropagation()" onchange="bkTudoTab(this)">');
      else if(!hr && tb && (!tb.previousElementSibling || !tb.previousElementSibling.classList.contains('bk-bar'))) tb.insertAdjacentHTML('beforebegin','<label class="bk-bar"><input type="checkbox" onchange="bkTudoTab(this,true)"> TUDO</label>');
      return;
    }
    filhos.forEach(r=>{ if(r.querySelector(':scope > .bk-cb')) return; r.insertAdjacentHTML('afterbegin',cbHTML('')); r.classList.add('bk-row'); });
    if(!p.previousElementSibling || !p.previousElementSibling.classList.contains('bk-bar')) p.insertAdjacentHTML('beforebegin','<label class="bk-bar"><input type="checkbox" onchange="bkTudo(this)"> TUDO</label>');
  });
}
window.bkExcluir=async function(){
  const cbs=[...document.querySelectorAll('#content .bk-cb:checked')]; if(!cbs.length) return;
  if(!confirm('Excluir '+cbs.length+' item(ns) selecionado(s)?\n\nEsta ação não pode ser desfeita.')) return;
  const conf=window.confirm, prm=window.prompt; window.confirm=()=>true; window.prompt=(m,d)=>d||'EXCLUIR';
  let feitos=0, parou='';
  try{
    for(const cb of cbs){
      const id=cb.dataset.id||'';
      if(id.startsWith('mus:')){ try{ await excluirMusicaInteira(id.slice(4)); feitos++; _bkSel.delete(id); }catch(_){} continue; }
      const row=cb.closest('.bk-row'); const b=row&&[...row.querySelectorAll('button')].find(ehBotaoExcluir); if(!b) continue;
      b.click(); await new Promise(ok=>setTimeout(ok,700));
      const bg=document.getElementById('modalBg');
      if(bg && bg.classList.contains('show')){ const ok=[...document.querySelectorAll('#modalBox button')].find(x=>/excluir|apagar|sim|confirmar|remover/i.test(x.textContent));
        if(ok){ ok.click(); await new Promise(r=>setTimeout(r,700)); feitos++; } else { fecharModal(); parou='Esta lista pede confirmação diferente; exclua um por vez.'; break; } }
      else feitos++;
    }
  } finally { window.confirm=conf; window.prompt=prm; }
  const fl=document.getElementById('bkFlut'); if(fl) fl.remove();
  toast(feitos+' excluído(s).'+(parou?' '+parou:''));
};
aoMudar(()=>{ marcaListas(); prevEditorMusica(); bkAtualiza(); });

/* ======================= 32) TEMPO REAL PARA AS PARTES NOVAS ======================= */
/* HCC, partituras enviadas e correções da Harpa chegam na hora para todos (antes: só ao reabrir o app). */
function tempoRealExtras(){
  try{
    if(typeof sb==='undefined' || !sb.channel || window.__rtExtras) return; window.__rtExtras=true;
    const ch=sb.channel('ibnm-extras');
    ch.on('postgres_changes',{event:'*',schema:'public',table:'hcc_hinos'},pl=>{ try{ const r=pl.new&&pl.new.num!=null? pl.new : null; HCC_DB=HCC_DB||{};
        if(pl.eventType==='DELETE'&&pl.old) delete HCC_DB[pl.old.num]; else if(r) HCC_DB[r.num]=r;
        localStorage.setItem('ibnm_hcc',JSON.stringify(HCC_DB)); const pg=document.querySelector('.hcc-page[data-n]'); if(pg && r && +pg.dataset.n===r.num) hccAbrir(r.num,true); }catch(_){} })
      .on('postgres_changes',{event:'*',schema:'public',table:'partituras_hinos'},pl=>{ try{ const r=pl.new; if(pl.eventType==='DELETE'&&pl.old) delete PARTS[pl.old.livro+':'+pl.old.num]; else if(r) PARTS[r.livro+':'+r.num]=r; localStorage.setItem('ibnm_parts',JSON.stringify(PARTS)); padronizaHino(true); }catch(_){} })
      .on('postgres_changes',{event:'*',schema:'public',table:'harpa_edits'},()=>{ try{ hrBaixa(); }catch(_){} })
      .subscribe(st=>{ window.__rtExtrasStatus=st; });
  }catch(_){}
}
setTimeout(tempoRealExtras,5000);

/* ======================= 33) 🩺 DIAGNÓSTICO DO APP (Painel do ADM, só o principal) ======================= */
async function diagnostico(){
  const box=document.getElementById('diagBox'); if(!box) return; box.innerHTML='<div class="am-dica">Verificando…</div>';
  const res=[]; const ok=(t,b,dica)=>res.push([b?'✅':'⚠️',t,b?'':dica||'']);
  const tab=async(t,dica)=>{ try{ const {error}=await sb.from(t).select('*',{count:'exact',head:true}); ok('Tabela '+t,!error,dica); }catch(_){ ok('Tabela '+t,false,dica); } };
  ok('Versão do app', true); res[res.length-1][1]='Versão do app: '+(window.APP_V||'?');
  ok('Internet', navigator.onLine, 'Sem internet agora.');
  await tab('hcc_hinos','Rode o SQL-HCC.sql');
  await tab('partituras_hinos','Rode o SQL-PARTITURAS.sql');
  await tab('harpa_edits','Rode o SQL-HARPA-EDICOES.sql');
  try{ const {error}=await sb.rpc('fin_resumo',{p_mes:new Date().toISOString().slice(0,7)}); ok('Resumo do Financeiro (saldo)',!error,'Rode o SQL-ADMS-POR-SECAO.sql'); }catch(_){ ok('Resumo do Financeiro (saldo)',false,'Rode o SQL-ADMS-POR-SECAO.sql'); }
  try{ const {error}=await sb.from('musicas').select('updated_at').limit(1); ok('Economia de dados (só baixa o que mudou)',!error,'Rode o SQL-ECONOMIA.sql'); }catch(_){}
  ok('Tempo real (hinos novos e partituras)', window.__rtExtrasStatus==='SUBSCRIBED', 'Rode o SQL-TEMPO-REAL.sql');
  ok('Índice das partituras (mmibnm-partituras)', !!INDICE, 'Rode o gerar_indice.py no repositório de partituras');
  ok('Voltar do celular (vigia oficial)', 'CloseWatcher' in window, 'Este navegador usa o modo antigo do voltar (normal no iPhone).');
  box.innerHTML=res.map(r=>'<div class="dg-l"><span>'+r[0]+'</span><div><b>'+e(r[1])+'</b>'+(r[2]?'<small>'+e(r[2])+'</small>':'')+'</div></div>').join('')+'<button class="mini-btn sec" style="margin-top:8px" onclick="diagnosticoApp()">🔄 Verificar de novo</button>';
}
window.diagnosticoApp=diagnostico;
function cartaoDiagnostico(){
  if(!souPrincipal()) return; const t=document.querySelector('#content .ad-topo'); if(!t || document.getElementById('diagBox')) return;
  t.insertAdjacentHTML('afterend','<div class="card"><h3>🩺 Diagnóstico do app</h3><div id="diagBox"><button class="mini-btn" onclick="diagnosticoApp()">Verificar agora</button></div></div>');
}
aoMudar(cartaoDiagnostico);

/* ======================= 31) ✏️ EDITAR ESCALA ======================= */
/* Ao lado de "Reimportar escala": escolher a semana → editar todos os campos de cada culto
   (com sugestão dos nomes cadastrados) → Salvar. Vai na hora para todos (tempo real). */
const COL_FIXAS=/^(data|dia|evento|culto|hor[aá]rio|obs)/i;
let _ESC=null;   /* {chave, idx:[índices], linhas:[cópias]} */
/* acha a data de cada culto pela coluna "Data" (07/06, 07/06/2026, 7-Jun, 7 de junho...) e agrupa por semana (seg→dom) */
const MES3={jan:0,fev:1,feb:1,mar:2,abr:3,apr:3,mai:4,may:4,jun:5,jul:6,ago:7,aug:7,set:8,sep:8,out:9,oct:9,nov:10,dez:11,dec:11};
function lerDataBR(txt){
  const t=String(txt||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); if(!t) return null;
  let m=t.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return new Date(+m[1],+m[2]-1,+m[3]);
  let d,mo,a=null;
  m=t.match(/(\d{1,2})\s*(?:de\s+|[-\/. ])\s*([a-z]{3})[a-z]*\.?(?:\s*(?:de\s+|[-\/. ])\s*(\d{2,4}))?/);
  if(m && m[2] in MES3){ d=+m[1]; mo=MES3[m[2]]; a=m[3]? (+m[3]<100?2000+ +m[3]:+m[3]) : null; }
  else { m=t.match(/(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/); if(!m) return null; d=+m[1]; mo=+m[2]-1; a=m[3]? (+m[3]<100?2000+ +m[3]:+m[3]) : null; }
  if(!(mo>=0&&mo<12&&d>=1&&d<=31)) return null;
  if(a==null){ const h=new Date(); a=h.getFullYear(); const dt=new Date(a,mo,d); if(dt-h>183*864e5) a--; else if(h-dt>183*864e5) a++; }
  return new Date(a,mo,d);
}
const isoD=dt=>dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
function colunaEscala(cols,re){ return cols.find(c=>re.test(String(c).normalize('NFD').replace(/[\u0300-\u036f]/g,'')))||null; }
function semanaDaLinha(l,cols){
  const cData=colunaEscala(cols,/data/i); const dt=cData? lerDataBR((l.celulas||{})[cData]) : null;
  if(dt){ const seg=new Date(dt); seg.setDate(dt.getDate()-((dt.getDay()+6)%7)); const dom=new Date(seg); dom.setDate(seg.getDate()+6); return isoD(seg)+'|'+isoD(dom); }
  const pi=String(l.periodoInicio||''), pf=String(l.periodoFim||'');
  if(/^\d{4}-\d{2}-\d{2}/.test(pi)) return pi.slice(0,10)+'|'+(/^\d{4}-\d{2}-\d{2}/.test(pf)? pf.slice(0,10) : pi.slice(0,10));
  return 'sem|'+Math.random().toString(36).slice(2);
}
function semanasEscala(){
  const E=DB.escala||{linhas:[]}; const cols=E.colunas||[]; const g={};
  (E.linhas||[]).forEach((l,i)=>{ const k=semanaDaLinha(l,cols); (g[k]=g[k]||[]).push(i); });
  return Object.keys(g).sort().map(k=>({k, idx:g[k]}));
}
function resumoCulto(l,cols){ const c=l.celulas||{}; const cd=colunaEscala(cols,/data/i), cdia=colunaEscala(cols,/^dia/i), cev=colunaEscala(cols,/evento|culto|programa/i);
  const partes=[cd&&c[cd], cdia&&c[cdia], cev&&c[cev]].filter(x=>x&&String(x).trim());
  if(partes.length) return partes.join(' · ');
  return cols.map(x=>c[x]).filter(x=>x&&String(x).trim()).slice(0,3).join(' · ') || '(culto sem informações)'; }
const fmtD=iso=>{ const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/); return m? m[3]+'/'+m[2] : '—'; };
function nomesCadastrados(){ return [...new Set((DB.usuarios||[]).map(u=>String(u.nome||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt')); }
window.editarEscala=function(){
  const W=semanasEscala(); const hoje=new Date().toISOString().slice(0,10);
  if(!W.length) return toast('Ainda não há escala. Importe a planilha primeiro.');
  const E=DB.escala;
  abrirModal('<h3>✏️ Editar escala — escolha a semana</h3><div class="eed-sem">'+W.map(w=>{ const [ini,fim]=w.k.split('|'); const sd=ini==='sem'; const atual=!sd&&ini<=hoje&&hoje<=fim;
    const ev=w.idx.map(i=>e(resumoCulto(E.linhas[i],E.colunas||[]))).join('<br>');
    return '<div class="eed-card'+(atual?' atual':'')+'"><div><b>'+(sd?'Sem data':fmtD(ini)+' a '+fmtD(fim))+(atual?' <span>esta semana</span>':'')+'</b><small>'+ev+'</small></div><button class="mini-btn" onclick="escalaEditarSemana(\''+w.k+'\')">✏️ Editar</button></div>'; }).join('')+'</div>'+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Cancelar</button></div>');
  const mb=document.getElementById('modalBox'); if(mb) mb.classList.add('mx-grande');
  setTimeout(()=>{ const a=document.querySelector('.eed-card.atual'); if(a) a.scrollIntoView({block:'center'}); },60);
};
window.escalaEditarSemana=function(k){
  const w=semanasEscala().find(x=>x.k===k); if(!w) return; const E=DB.escala;
  _ESC={chave:k, idx:w.idx.slice(), linhas:w.idx.map(i=>JSON.parse(JSON.stringify(E.linhas[i])))};
  desenhaEdEscala();
};
function desenhaEdEscala(){
  const E=DB.escala, cols=E.colunas||[]; let [ini,fim]=_ESC.chave.split('|'); if(ini==='sem'){ const h=new Date(); const seg=new Date(h); seg.setDate(h.getDate()-((h.getDay()+6)%7)); const dom=new Date(seg); dom.setDate(seg.getDate()+6); ini=isoD(seg); fim=isoD(dom); }
  const cd=colunaEscala(cols,/data/i), cdia=colunaEscala(cols,/^dia/i), cev=colunaEscala(cols,/evento|culto|programa/i);
  const fixas=cols.filter(c=>COL_FIXAS.test(c)), funcoes=cols.filter(c=>!COL_FIXAS.test(c));
  const ico=c=>/vocal|cant|voz/i.test(c)?'🎤':/instrument|piano|teclad|viol|guitar|baix|bateri/i.test(c)?'🎹':/dire/i.test(c)?'🎙️':/devoc/i.test(c)?'📖':/som|audio|mesa/i.test(c)?'🎚️':/projet|data ?show|midia|mídia/i.test(c)?'📽️':'👤';
  const campo=(l,j,c,tipo)=>{ const v=(l.celulas||{})[c]||'';
    if(tipo==='fn') return '<label class="eed-f fn"><span>'+ico(c)+' '+e(c)+'</span><textarea class="eed-in eed-nome eed-ta" rows="1" data-j="'+j+'" data-c="'+e(c)+'" autocomplete="off" spellcheck="false" placeholder="Digite um nome…">'+e(v)+'</textarea><div class="eed-chips"></div></label>';
    return '<label class="eed-f fx'+(/evento|culto|obs|program/i.test(c)?' larga':'')+'"><span>'+e(c)+'</span><input class="eed-in" data-j="'+j+'" data-c="'+e(c)+'" value="'+e(v)+'" autocomplete="off"></label>'; };
  const form=_ESC.linhas.map((l,j)=>{ const c=l.celulas||{};
    const tit=[cd&&c[cd], cdia&&c[cdia]].filter(Boolean).join(' · ')||('Culto '+(j+1));
    return '<div class="eed-culto"><div class="eed-cab"><span class="eed-n">'+(j+1)+'</span><div class="eed-tt"><b>'+e(tit)+'</b><small>'+e((cev&&c[cev])||'')+'</small></div><button class="eed-x" onclick="escalaTiraCulto('+j+')" aria-label="Remover este culto" title="Remover este culto">🗑</button></div>'+
      '<div class="eed-grid eed-fixas">'+fixas.map(x=>campo(l,j,x,'fx')).join('')+'</div>'+
      '<div class="eed-sub">Equipe</div><div class="eed-grid">'+funcoes.map(x=>campo(l,j,x,'fn')).join('')+'</div></div>'; }).join('');
  abrirModal('<div class="eed-topo"><h3>✏️ Escala da semana</h3><div class="eed-per"><label><span>📅 Início</span><input type="date" class="eed-in" id="escIni" value="'+ini+'"></label><label><span>📅 Fim</span><input type="date" class="eed-in" id="escFim" value="'+fim+'"></label></div>'+
    '<p class="eed-dica">💡 Nos campos da equipe, comece a digitar e toque no nome sugerido. Para mais de um nome, separe com vírgula ou barra.</p></div>'+
    '<div id="escForm" class="eed-lista">'+form+'</div><button class="eed-novo" onclick="escalaNovoCulto()">＋ Adicionar culto nesta semana</button>'+
    '<div class="modal-acts eed-acoes"><button class="btn btn-dark" onclick="editarEscala()">Cancelar</button><button class="btn btn-primary" onclick="escalaSalvar()">💾 Salvar</button></div>');
  const mb=document.getElementById('modalBox'); if(mb) mb.classList.add('mx-grande','eed-modal');
  ligaSugestoes();
  /* campos da equipe: crescem com o texto (nada escondido) e mostram cada nome em etiqueta */
  document.querySelectorAll('#escForm .eed-ta').forEach(ta=>{ const upd=()=>{ ta.style.height='auto'; ta.style.height=Math.max(40,ta.scrollHeight+2)+'px';
      const ch=ta.parentElement.querySelector('.eed-chips'); if(!ch) return; const nomes=ta.value.split(/\s*(?:\/|,|\||;|\n)\s*/).map(x=>x.trim()).filter(Boolean);
      ch.innerHTML=nomes.length>1? nomes.map(n=>'<span>'+e(n)+'</span>').join('') : ''; };
    ta.addEventListener('input',upd); ta.addEventListener('keydown',ev=>{ if(ev.key==='Enter'){ ev.preventDefault(); } }); setTimeout(upd,0); });
}
function lerFormEscala(){ document.querySelectorAll('#escForm .eed-in').forEach(inp=>{ const l=_ESC.linhas[+inp.dataset.j]; if(!l) return; l.celulas=l.celulas||{}; l.celulas[inp.dataset.c]=inp.value.trim(); }); }
window.escalaNovoCulto=function(){ lerFormEscala(); const ini=(document.getElementById('escIni')||{}).value||'', fim=(document.getElementById('escFim')||{}).value||''; const cel={}; (DB.escala.colunas||[]).forEach(c=>cel[c]=''); _ESC.linhas.push({periodoInicio:ini+'T00:01:00',periodoFim:fim+'T23:59:00',celulas:cel}); desenhaEdEscala(); };
window.escalaTiraCulto=function(j){ lerFormEscala(); if(!confirm('Remover este culto da escala?')) return; _ESC.linhas.splice(j,1); desenhaEdEscala(); };
/* sugestões de nomes enquanto digita */
function ligaSugestoes(){
  const pessoas=(DB.usuarios||[]).filter(u=>String(u.nome||'').trim()).map(u=>({nome:String(u.nome).trim(), instr:(Array.isArray(u.instr)?u.instr:String(u.instr||'').split(/[,;\/]/)).map(x=>String(x).trim()).filter(Boolean), vocal:(Array.isArray(u.vocal)?u.vocal:[]).filter(Boolean)}))
    .sort((x,y)=>x.nome.localeCompare(y.nome,'pt'));
  const SEP=/[,\/|;]/;
  document.querySelectorAll('#escForm .eed-nome').forEach(inp=>{
    const ehInstr=/instrument|piano|teclad|viol|guitar|baix|bateri|music/i.test(inp.dataset.c||'');
    const atualiza=()=>inp.dispatchEvent(new Event('input',{bubbles:true}));
    const escreve=(txt,ini)=>{ const v=inp.value; const antes=v.slice(0,ini); inp.value=(antes? antes.replace(/\s*$/,'')+' ' : '')+txt; };
    const escolheInstr=(p)=>{ fechaSug();
      if(!ehInstr || !p.instr.length) return;
      if(p.instr.length===1){ inp.value=inp.value.replace(/\s*$/,'')+' ('+p.instr[0]+')'; atualiza(); return; }
      inp.insertAdjacentHTML('afterend','<div class="eed-sug eed-sug2"><div class="eed-sug-t">🎹 Qual instrumento '+e(p.nome.split(' ')[0])+' vai tocar?</div>'+p.instr.map(i=>'<button type="button" data-i="'+e(i)+'">'+e(i)+'</button>').join('')+'<button type="button" data-i="" class="sem">Sem indicar</button></div>');
      inp.nextElementSibling.querySelectorAll('button').forEach(bt=>bt.addEventListener('mousedown',ev=>{ ev.preventDefault(); if(bt.dataset.i) inp.value=inp.value.replace(/\s*$/,'')+' ('+bt.dataset.i+')'; fechaSug(); atualiza(); inp.focus(); }));
    };
    const mostra=()=>{ if(document.querySelector('.eed-sug2')) return; fechaSug(); const v=inp.value; let ini=-1; for(let k=v.length-1;k>=0;k--){ if(SEP.test(v[k])){ ini=k; break; } } ini++;
      const termo=v.slice(ini).trim(); if(termo.length<1 || /\)$/.test(termo)) return;
      const q=SLUG(termo); const L=pessoas.filter(p=>SLUG(p.nome).includes(q)).slice(0,8); if(!L.length) return;
      inp.insertAdjacentHTML('afterend','<div class="eed-sug">'+L.map((p,k)=>'<button type="button" data-k="'+k+'"><b>'+e(p.nome)+'</b>'+((ehInstr?p.instr:p.vocal).length?'<small>'+e((ehInstr?p.instr:p.vocal).join(' · '))+'</small>':'')+'</button>').join('')+'</div>');
      inp.nextElementSibling.querySelectorAll('button').forEach(bt=>bt.addEventListener('mousedown',ev=>{ ev.preventDefault(); const p=L[+bt.dataset.k]; escreve(p.nome,ini); atualiza(); inp.focus(); escolheInstr(p); })); };
    inp.addEventListener('input',mostra); inp.addEventListener('focus',mostra); inp.addEventListener('blur',()=>setTimeout(fechaSug,180));
  });
}
function fechaSug(){ document.querySelectorAll('.eed-sug').forEach(x=>x.remove()); }
window.escalaSalvar=async function(){
  lerFormEscala();
  const ini=(document.getElementById('escIni')||{}).value, fim=(document.getElementById('escFim')||{}).value;
  if(!ini||!fim||fim<ini){ ['escIni','escFim'].forEach(id=>{ const x=document.getElementById(id); if(x) x.style.borderColor='#c0392b'; }); return toast('Confira as datas de início e fim da semana.'); }
  const E=DB.escala, cols=E.colunas||[];
  /* cada culto fica na semana da sua própria Data; sem data legível, usa as datas acima */
  _ESC.linhas.forEach(l=>{ const k=semanaDaLinha({celulas:l.celulas},cols); if(!k.startsWith('sem|')){ const [a,b]=k.split('|'); l.periodoInicio=a+'T00:01:00'; l.periodoFim=b+'T23:59:00'; } else { l.periodoInicio=ini+'T00:01:00'; l.periodoFim=fim+'T23:59:00'; } });
  /* troca só os cultos desta semana, no mesmo lugar da lista (a ordem das outras semanas não muda) */
  const pos=Math.min(..._ESC.idx); const novas=[];
  E.linhas.forEach((l,i)=>{ if(i===pos) novas.push(..._ESC.linhas); if(!_ESC.idx.includes(i)) novas.push(l); });
  if(!_ESC.idx.length) novas.push(..._ESC.linhas);
  const bt=[...document.querySelectorAll('#modalBox button')].find(x=>/Salvar/.test(x.textContent)); if(bt){ bt.disabled=true; bt.textContent='Salvando…'; }
  try{
    const {error}=await sb.from('escala').update({colunas:cols,linhas:novas,updated_at:new Date().toISOString()}).eq('id',1);
    if(error) throw error;
    DB.escala={colunas:cols,linhas:novas}; try{ if(typeof saveDB==='function') saveDB(); }catch(_){}
    _ESC=null; fecharModal(); toast('✅ Escala salva — já aparece para todos.'); go('escala');
  }catch(err){
    if(bt){ bt.disabled=false; bt.textContent='💾 Salvar'; }
    const m=String(err.message||err);
    toast(/row-level|policy|permission|42501/i.test(m)? '❌ O banco não deixou salvar: sua conta precisa da seção Escala liberada (👑 ADMs e permissões).' : '❌ Não salvou: '+m);
  }
};
function botaoEditarEscala(){
  const b=[...document.querySelectorAll('#content button')].find(x=>/Reimportar escala/i.test(x.textContent)); if(!b || document.getElementById('btEdEscala')) return;
  b.insertAdjacentHTML('afterend','<button id="btEdEscala" class="mini-btn" style="margin:0 0 14px 8px" onclick="editarEscala()">✏️ Editar escala</button>');
}
aoMudar(botaoEditarEscala);

/* ======================= 30) PIX DA DOAÇÃO: o copia e cola fica inteiro ======================= */
/* O campo guarda exatamente o que o ADM colar (o código do QR Code do banco). Nome e cidade
   saem do próprio código e são preenchidos sozinhos. Ao salvar, mostra o erro real se o banco recusar. */
function emvTags(cod){ const s=String(cod||'').replace(/[\r\n]+/g,'').trim(); const m={}; let i=0;
  while(i+4<=s.length){ const id=s.substr(i,2), L=parseInt(s.substr(i+2,2),10); if(!/^\d\d$/.test(id)||!(L>=0)||i+4+L>s.length) break; m[id]=s.substr(i+4,L); i+=4+L; } return m; }
const ehCopiaColaX=v=>{ const s=String(v||'').replace(/[\r\n]+/g,'').trim(); return s.length>50 && (/^000201/.test(s)||s.indexOf('br.gov.bcb.pix')>=0); };
function chaveDoCopia(cod){ const t=emvTags(cod); const mai=t['26']||t['25']||''; return emvTags(mai)['01']||''; }
function cfgFinAtual(){ try{ const c=((typeof APP_CFG!=='undefined'&&APP_CFG)||{}).financeiro_cfg; return (typeof c==='string'? JSON.parse(c) : c)||{}; }catch(_){ return {}; } }
function ajustaCfgPix(){
  const inp=document.getElementById('cfgPix'); if(!inp || inp.dataset.x) return; inp.dataset.x='1';
  const c=cfgFinAtual(); if(c.pix_copia) inp.value=c.pix_copia;
  inp.placeholder='Cole aqui o código PIX copia e cola (o do QR Code do banco)';
  const card=inp.closest('.card'); if(card){ const h=card.querySelector('h3'); if(h) h.textContent='⚙️ Configuração da doação';
    const p=card.querySelector('p'); if(p) p.innerHTML='Cole o código <b>PIX copia e cola</b> do banco (o mesmo do QR Code). Ele fica guardado <b>inteiro</b>, e a doação usa esse código com o valor doado. O <b>nome</b> e a <b>cidade</b> são preenchidos sozinhos. O WhatsApp recebe os comprovantes.'; }
  const preenche=()=>{ const v=inp.value.trim(); if(!ehCopiaColaX(v)) return; const t=emvTags(v);
    const n=document.getElementById('cfgNome'), ci=document.getElementById('cfgCidade');
    if(n && t['59']) n.value=t['59']; if(ci && t['60']) ci.value=t['60']; };
  inp.addEventListener('input',preenche); inp.addEventListener('paste',()=>setTimeout(preenche,50));
}
window.finCfgSalvar=async function(){
  const bruto=((document.getElementById('cfgPix')||{}).value||'').trim();
  const obj={pix:bruto, pix_copia:'', wpp:((document.getElementById('cfgWpp')||{}).value||'').trim(), nome:((document.getElementById('cfgNome')||{}).value||'').trim(), cidade:((document.getElementById('cfgCidade')||{}).value||'').trim()};
  if(ehCopiaColaX(bruto)){ obj.pix_copia=bruto.replace(/[\r\n]+/g,'').trim(); obj.pix=chaveDoCopia(bruto)||obj.pix_copia; const t=emvTags(bruto); if(!obj.nome&&t['59']) obj.nome=t['59']; if(!obj.cidade&&t['60']) obj.cidade=t['60']; }
  try{
    const {error}=await sb.from('config').upsert({chave:'financeiro_cfg',valor:obj,updated_at:new Date().toISOString()});
    if(error) throw error;
    try{ APP_CFG.financeiro_cfg=obj; }catch(_){}
    toast(obj.pix_copia? 'Configuração salva ✓ — a doação usa o seu copia e cola' : 'Configuração salva ✓');
  }catch(err){
    const m=String(err.message||err);
    toast(/row-level|policy|permission|42501/i.test(m)? '❌ O banco não deixou salvar: sua conta não tem a seção Financeiro liberada no banco. O ADM principal deve conferir em 👑 ADMs e permissões e rodar o SQL-FINANCEIRO-ADM.' : '❌ Não salvou: '+m);
  }
};
aoMudar(ajustaCfgPix);

/* ======================= 28) BARRA VERDE: "Olá, Nome!" + data, hora e tempo ======================= */
const DIAS=['dom','seg','ter','qua','qui','sex','sáb'];
const TEMPO={0:['☀️','Céu limpo'],1:['🌤️','Poucas nuvens'],2:['⛅','Parcialmente nublado'],3:['☁️','Nublado'],45:['🌫️','Neblina'],48:['🌫️','Neblina'],51:['🌦️','Garoa'],53:['🌦️','Garoa'],55:['🌦️','Garoa forte'],56:['🌧️','Garoa gelada'],57:['🌧️','Garoa gelada'],61:['🌧️','Chuva fraca'],63:['🌧️','Chuva'],65:['🌧️','Chuva forte'],66:['🌧️','Chuva gelada'],67:['🌧️','Chuva gelada'],71:['🌨️','Neve'],73:['🌨️','Neve'],75:['🌨️','Neve'],80:['🌦️','Pancadas de chuva'],81:['🌧️','Pancadas de chuva'],82:['⛈️','Chuva muito forte'],95:['⛈️','Trovoada'],96:['⛈️','Trovoada'],99:['⛈️','Trovoada']};
let _clima=null; try{ _clima=JSON.parse(localStorage.getItem('ibnm_clima')||'null'); }catch(_){}
async function buscaClima(){
  try{ const lat=-3.736, lon=-38.653;   /* Caucaia (CE) */
    const r=await fetch('https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+'&current=temperature_2m,weather_code,is_day&timezone=America%2FFortaleza');
    const j=await r.json(); const c=j&&j.current; if(!c) return;
    _clima={t:Math.round(c.temperature_2m), c:c.weather_code, dia:c.is_day, em:Date.now()}; localStorage.setItem('ibnm_clima',JSON.stringify(_clima)); barraTopo(true);
  }catch(_){} }
function primeiroNome(){ try{ const u=usuarioAtual(); const n=String((u&&u.nome)||'').trim().split(/\s+/)[0]; return n? n.charAt(0).toUpperCase()+n.slice(1) : ''; }catch(_){ return ''; } }
function barraTopo(forca){
  const ttl=document.querySelector('.topbar .ttl'); if(!ttl) return;
  if(!ttl.classList.contains('ola')){ ttl.classList.add('ola'); ttl.innerHTML='<span class="ola-nome"></span><small class="ola-info"></small><small class="ola-info2"></small>'; }
  const nm=primeiroNome(); const t=ttl.querySelector('.ola-nome'); const txt=nm? 'Olá, '+nm+'!' : 'Olá!'; if(t.textContent!==txt) t.textContent=txt;
  const d=new Date(), p2=x=>String(x).padStart(2,'0');
  let info=DIAS[d.getDay()]+', '+p2(d.getDate())+'/'+p2(d.getMonth()+1)+' · '+p2(d.getHours())+':'+p2(d.getMinutes())+':'+p2(d.getSeconds());
  let info2='';
  const curto=innerWidth<560;   /* celular: sem a descrição do tempo, para caber o saldo */
  if(_clima){ let [ic,ds]=TEMPO[_clima.c]||['🌡️','']; if(!_clima.dia && (_clima.c===0||_clima.c===1)) ic='🌙'; info2=ic+' '+_clima.t+'°'+(ds&&!curto?' '+ds:''); }
  if(_saldo!=null) info2+=(info2?' · ':'')+'💰 '+(curto? brl(_saldo).replace(/R\$\s?/,'') : 'Saldo '+brl(_saldo));
  const i1=ttl.querySelector('.ola-info'), i2=ttl.querySelector('.ola-info2');
  if(i1.textContent!==info) i1.textContent=info; if(i2 && i2.textContent!==info2) i2.textContent=info2;
}
let _saldo=null; try{ const v=localStorage.getItem('ibnm_saldo'); if(v!=null) _saldo=+v; }catch(_){}
async function buscaSaldo(){ try{ if(typeof sb==='undefined' || !(typeof usuarioAtual==='function' && usuarioAtual())) return;
  const {data:r,error}=await sb.rpc('fin_resumo',{p_mes:new Date().toISOString().slice(0,7)}); if(error||!r) return;
  _saldo=Number(r.total)||0; localStorage.setItem('ibnm_saldo',String(_saldo)); barraTopo(true); }catch(_){} }
setTimeout(buscaSaldo,4000); setInterval(()=>{ if(document.visibilityState==='visible') buscaSaldo(); },10*60*1000);
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') buscaSaldo(); });
setInterval(barraTopo,1000); setTimeout(barraTopo,300);
setTimeout(buscaClima,2500); setInterval(()=>{ if(document.visibilityState==='visible') buscaClima(); },20*60*1000);

/* ======================= 29) VOLTAR: interceptar o botão do celular ======================= */
/* Chrome novo (Android): o "voltar" é interceptado antes de mexer no histórico e o app faz a volta dele
   (fecha janela → tela anterior → … → Início → "Deseja sair?"). Celulares mais antigos continuam com
   as "voltas de reserva", agora 10 (antes 4), repostas a cada toque. */
const RESERVA_VOLTAS=10;
window.__encherVoltas=function(forcar){ try{ if(!forcar && navigator.userActivation && !navigator.userActivation.isActive) return;
  let n=(history.state&&history.state.ibnm)? (history.state.n||0) : 0; while(n<RESERVA_VOLTAS){ n++; history.pushState({ibnm:1,n:n},''); } }catch(_){} };
function perguntarSair(){
  const mb=document.getElementById('modalBox'), bg=document.getElementById('modalBg');
  if(bg && bg.classList.contains('show') && mb && /Deseja sair/.test(mb.textContent)){ __sairNao(); return; }   /* 2º voltar com a pergunta aberta = ficar */
  abrirModal('<h3>Deseja sair do app?</h3><p style="color:#5d6f66;margin:6px 0 14px">Você está no Início.</p><div class="modal-acts"><button class="btn btn-dark" onclick="__sairNao()">Não, ficar</button><button class="btn btn-primary" onclick="__sairSim()">Sim, sair</button></div>');
}
window.__perguntarSair=perguntarSair;
const _sairNaoAnt=window.__sairNao;
window.__sairNao=function(){ try{ fecharModal(); }catch(_){} window.__ibnmSaindo=false; window.__saindoAgora=false; try{ __encherVoltas(true); }catch(_){} setTimeout(armaVigia,0); };
/* CloseWatcher: o jeito oficial do Chrome para o botão voltar. Um vigia sempre armado:
   cada VOLTAR do celular cai aqui (não mexe no histórico, não fecha o app). */
let _cw=null;
function armaVigia(){ if(!('CloseWatcher' in window) || _cw || window.__saindoAgora) return; try{ _cw=new CloseWatcher(); _cw.onclose=()=>{ _cw=null; aoVoltarCelular(); }; }catch(_){ _cw=null; } }
function aoVoltarCelular(){
  let tratou=false; try{ tratou=!!(window.__voltar && __voltar()); }catch(_){}
  if(!tratou) perguntarSair();
  setTimeout(armaVigia,0);
}
window.__vigiaVoltar=()=>!!_cw;
armaVigia(); ['pointerup','touchend','keydown','click'].forEach(t=>document.addEventListener(t,()=>setTimeout(armaVigia,0),true));
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') armaVigia(); });
if(window.navigation && navigation.addEventListener){
  navigation.addEventListener('navigate',ev=>{
    try{
      if(ev.navigationType!=='traverse' || !ev.cancelable || window.__saindoAgora) return;
      const cur=navigation.currentEntry? navigation.currentEntry.index : -1, dst=ev.destination? ev.destination.index : -1;
      if(dst<0 || cur<0 || dst>=cur) return;   /* só o "voltar" */
      ev.preventDefault();
      let tratou=false; try{ tratou=!!(window.__voltar && __voltar()); }catch(_){}
      if(!tratou) perguntarSair();
    }catch(_){}
  });
}

/* imagens da introdução do Cantor (cc-intro): lidas do repositório de partituras, com reserva no app */
function introsDoRepo(){ document.querySelectorAll('#content img[src^="cc-intro/"]').forEach(im=>{ if(im.dataset.repo) return; im.dataset.repo='1'; const loc=im.getAttribute('src'); const nome=loc.split('/').pop();
  const noRepo=INDICE && INDICE['cc-intro'] && INDICE['cc-intro'].includes(nome);
  if(noRepo){ im.dataset.res=loc; im.onerror=function(){ if(!this.dataset.r){ this.dataset.r=1; this.src=this.dataset.res; } }; im.src=PART_BASE+'cc-intro/'+nome; }
  else { im.onerror=function(){ if(!this.dataset.r){ this.dataset.r=1; this.src=PART_BASE+'cc-intro/'+nome; } }; } }); }
aoMudar(introsDoRepo);

/* ======================= 34) GOOGLE DRIVE PELA MESMA JANELA (sem about:blank) ======================= */
/* A janela separada do Google (popup) não consegue devolver a permissão ao app — fica preta (about:blank).
   Agora o login do Drive acontece NA PRÓPRIA janela do app: vai ao Google, autoriza e o Google
   devolve para o app, que guarda a permissão (vale ~1 hora; depois pede de novo, já sem a tela preta). */
const DRV_K='ibnm_drive_tok';
function drvClientId(){ try{ return (typeof driveClientId==='function' && driveClientId()) || ''; }catch(_){ return ''; } }
function drvGuarda(tok,exp){ try{ _gisTok=tok; _gisExp=exp; }catch(_){} try{ localStorage.setItem(DRV_K,JSON.stringify({tok,exp})); localStorage.setItem('ibnm_drive_ok','1'); }catch(_){} }
function drvToken(){ try{ if(typeof _gisTok!=='undefined' && _gisTok && Date.now()<_gisExp-60000) return _gisTok; }catch(_){}
  try{ const t=JSON.parse(localStorage.getItem(DRV_K)||'null'); if(t && t.exp>Date.now()+60000){ drvGuarda(t.tok,t.exp); return t.tok; } }catch(_){} return null; }
window.conectarDriveRedirect=function(){
  const cid=drvClientId(); if(!cid){ toast('Falta o Client ID do Google no Painel do ADM.'); return; }
  const st=Math.random().toString(36).slice(2)+Date.now().toString(36);
  let rota=''; try{ const pilha=window.__navStack? __navStack() : []; rota=pilha[pilha.length-1]||''; }catch(_){}
  const est=JSON.stringify({st,rota,t:Date.now()}); try{ localStorage.setItem('ibnm_drv_state',est); sessionStorage.setItem('ibnm_drv_state',est); }catch(_){}
  let email=''; try{ email=(usuarioAtual()||{}).email||''; }catch(_){}
  const volta=location.origin+location.pathname.replace(/[^\/]*$/,'')+'drive.html';   /* página própria de retorno (o login do app não é afetado) */
  const q=new URLSearchParams({client_id:cid, redirect_uri:volta, response_type:'token', scope:'https://www.googleapis.com/auth/drive.file', include_granted_scopes:'true', state:st, prompt:localStorage.getItem('ibnm_drive_ok')?'':'consent'});
  if(email) q.set('login_hint',email); if(!q.get('prompt')) q.delete('prompt');
  location.href='https://accounts.google.com/o/oauth2/v2/auth?'+q.toString();
};
/* volta do Google: a página drive.html guarda a permissão (no aparelho) e volta para o app.
   No celular, o Google pode voltar numa janela separada: quando você retorna ao app, ele lê a
   permissão guardada e já fica conectado. */
function voltaDoGoogle(){
  drvToken();   /* sincroniza a permissão guardada com a memória do app */
  let r=null; try{ r=JSON.parse(localStorage.getItem('ibnm_drive_retorno')||'null'); }catch(_){} if(!r) return;
  localStorage.removeItem('ibnm_drive_retorno');
  if(r.ok){ const t=drvToken();
    setTimeout(()=>{ toast(t? '✅ Google Drive conectado.' : 'Google Drive: permissão não recebida.'); try{ if(r.rota && document.visibilityState==='visible'){ const [k,id,arg]=r.rota.split('|'); if(k==='go'&&id) go(id,arg||undefined); } }catch(_){}
      try{ document.querySelectorAll('button').forEach(b=>{ if(/Verificar de novo/.test(b.textContent) && b.closest('.card') && /Conectividade/.test(b.closest('.card').textContent)) b.click(); }); }catch(_){} },1200); }
  else setTimeout(()=>toast('Google Drive não foi conectado ('+(r.erro||'cancelado')+').'),1200);
}
voltaDoGoogle();
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') voltaDoGoogle(); });
window.addEventListener('storage',ev=>{ if(ev.key==='ibnm_drive_tok'||ev.key==='ibnm_drive_retorno') voltaDoGoogle(); });
window.addEventListener('focus',()=>voltaDoGoogle());
/* quem pedir a permissão do Drive passa a usar a janela do próprio app */
const _drvEnsure=async function(){ const t=drvToken(); if(t) return t; conectarDriveRedirect(); return new Promise(()=>{}); };
try{ window.ensureDriveToken=_drvEnsure; ensureDriveToken=_drvEnsure; }catch(_){ window.ensureDriveToken=_drvEnsure; }

/* ======================= 35) BOTÃO DO DRIVE NO PAINEL (Conectividade) ======================= */
/* O "Conectar ao Drive" sai da tela de áudios e fica no Painel do ADM, ao lado de "Verificar de novo".
   Nos áudios só aparece um aviso quando ESTE aparelho estiver desconectado. */
function drvConectadoAqui(){ try{ return !!(window.__drive&&window.__drive.conectado&&window.__drive.conectado()) || !!drvToken(); }catch(_){ return false; } }
function botaoDrivePainel(){
  const bv=[...document.querySelectorAll('#content button')].find(b=>/Verificar de novo/.test(b.textContent) && b.closest('.card') && /Conectividade/.test(b.closest('.card').textContent));
  if(!bv) return;
  const con=drvConectadoAqui(); const txt=con? '🔄 Reconectar Google Drive' : '🔗 Conectar Google Drive';
  let b=document.getElementById('btDrvPainel');
  if(!b){ bv.insertAdjacentHTML('afterend','<button id="btDrvPainel" class="mini-btn" style="margin:8px 0 0 8px" onclick="conectarDriveRedirect()"></button>'); b=document.getElementById('btDrvPainel'); }
  if(b.textContent!==txt) b.textContent=txt; b.classList.toggle('sec',con);
}
function avisoDriveAudios(){
  const box=document.getElementById('auDrive'); if(!box || box.dataset.x==='1'+drvConectadoAqui()) return;
  const con=drvConectadoAqui(); box.dataset.x='1'+con;
  if(con || box.classList.contains('no')){ box.style.display= con? 'none' : ''; return; }
  box.innerHTML='<span>⚠️ Google Drive desconectado neste aparelho. Para gravar ou enviar áudios, conecte no <b>Painel do ADM → Conectividade</b>.</span>'+(window.ehAdmin&&ehAdmin()?'<button onclick="go(\'admin\')">Ir ao Painel</button>':'');
  box.style.display='';
}
aoMudar(botaoDrivePainel); aoMudar(avisoDriveAudios);

/* ======================= 27) GOOGLE DRIVE: SEM JANELA PRETA ======================= */
/* A janela do Google (about:blank preta) vinha da conexão do Google Drive (cópia dos comprovantes),
   que o app tentava abrir sozinho. No app instalado essa janela não consegue voltar e fica preta.
   Agora: nunca abre sozinha; só abre se o ADM tocar num botão do Drive, e só no navegador
   (no app instalado avisa). Os comprovantes continuam salvos no app (Supabase). O login do app não muda. */
const appInstalado=()=>{ try{ return matchMedia('(display-mode: standalone)').matches || navigator.standalone===true; }catch(_){ return false; } };
let _toqueDrive=0;
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('button,a'); if(b && /drive|google/i.test(b.textContent+' '+(b.title||''))) _toqueDrive=Date.now(); },true);
function protegeGIS(){
  const o=window.google&&google.accounts&&google.accounts.oauth2; if(!o || o.__protegido) return !!o;
  const ini=o.initTokenClient.bind(o);
  o.initTokenClient=function(cfg){ const c=ini(cfg); const req=c.requestAccessToken.bind(c);
    c.requestAccessToken=function(opts){
      const pediu=Date.now()-_toqueDrive<15000;
      if(!pediu){ try{ cfg.error_callback&&cfg.error_callback({type:'popup_failed_to_open'}); }catch(_){} return; }   /* automático: não abre */
      const t=drvToken(); if(t){ try{ cfg.callback&&cfg.callback({access_token:t,expires_in:Math.round((_gisExp-Date.now())/1000)}); }catch(_){} return; }
      conectarDriveRedirect(); return; };
    return c; };
  o.__protegido=true; return true;
}
(function vigia(){ if(!protegeGIS()) setTimeout(vigia,700); })();
/* ao fechar qualquer janela, ela volta ao tamanho normal */
new MutationObserver(()=>{ const bg=document.getElementById('modalBg'), mb=document.getElementById('modalBox'); if(bg&&mb&&!bg.classList.contains('show')) mb.classList.remove('mx-grande'); }).observe(document.getElementById('modalBg')||document.body,{attributes:true,attributeFilter:['class']});

/* ======================= 26) VOLTAR (Android e iPhone) ======================= */
/* 1) Toda tela (menos o Início) ganha a seta ‹ no topo — funciona também no iPhone, que não tem botão voltar.
   2) O voltar do Android fecha primeiro o que estiver aberto (leitor de PDF, Modo Culto, janelas), depois volta tela a tela.
   3) No Início: "Deseja sair?" Sim fecha o app, Não continua.
   4) As "voltas de reserva" são repostas a cada toque (antes era só no clique). */
['pointerup','touchend','keydown'].forEach(t=>document.addEventListener(t,()=>{ try{ if(window.__encherVoltas) __encherVoltas(); }catch(_){} },true));
if(typeof window.__voltar==='function'){ const _v=window.__voltar; window.__voltar=function(){
  if(document.getElementById('pdfLeitor')){ fecharPdf(); return true; }
  if(document.body.classList.contains('modo-culto') && window.modoCultoSair){ modoCultoSair(); return true; }
  const bk=document.getElementById('bkFlut'); if(bk && document.querySelectorAll('#content .bk-cb:checked').length){ document.querySelectorAll('#content .bk-cb:checked').forEach(c=>c.checked=false); bkAtualiza(); return true; }
  return _v.apply(this,arguments); }; }
const naInicio=()=>{ try{ const st=window.__navStack? __navStack() : []; return !st.length || (st.length===1 && st[0]==='go|inicio|'); }catch(_){ return true; } };
window.voltarTopo=function(){ try{ if(window.__voltar && __voltar()) return; }catch(_){} try{ go('inicio'); }catch(_){} };
function setaTopo(){
  const tb=document.querySelector('.topbar'); if(!tb) return; let b=document.getElementById('btVoltarTopo');
  if(!b){ const h=tb.querySelector('.hamb'); if(!h) return; h.insertAdjacentHTML('afterend','<button id="btVoltarTopo" class="tb-voltar" onclick="voltarTopo()" aria-label="Voltar">‹</button>'); b=document.getElementById('btVoltarTopo'); }
  const mostra=!naInicio(); if(b.hidden===mostra) b.hidden=!mostra;
}
aoMudar(setaTopo);
setTimeout(setaTopo,1500);
window.__sairSim=function(){
  window.__ibnmSaindo=true; window.__saindoAgora=true;
  try{ if(_cw){ _cw.destroy(); _cw=null; } }catch(_){}
  try{ fecharModal(); }catch(_){}
  try{ window.close(); }catch(_){}
  setTimeout(()=>{ if(document.visibilityState==='hidden') return;
    try{ const n=history.length-1; if(n>0) history.go(-n); }catch(_){ try{ history.back(); }catch(__){} }
    setTimeout(()=>{ if(document.visibilityState==='visible'){ window.__ibnmSaindo=true; toast('Toque em voltar mais uma vez para fechar o app.'); } },700);
  },250);
};

/* ======================= 25) 📄 CIFRA EM PDF (com leitor dentro do app) ======================= */
/* Em toda música e hino: botão "📄 Cifra em PDF". Gera o PDF da cifra como está na tela
   (tom escolhido, acordes em negrito na cor escolhida, intro, estrofes) e abre num leitor
   dentro do app, com zoom, baixar e compartilhar. */
function corAcordeRGB(){ let c=(getComputedStyle(document.documentElement).getPropertyValue('--cor-acorde')||'#a8350a').trim();
  const t=document.createElement('span'); t.style.color=c; document.body.appendChild(t); const r=getComputedStyle(t).color; t.remove();
  const m=r.match(/\d+/g)||[168,53,10]; return [+m[0],+m[1],+m[2]]; }
function cifraDaTela(){
  const z=document.querySelector('#content #zoomTarget');
  if(z){ let m=null; try{ m=(DB.musicas||[]).find(x=>x.id===musicaAberta); }catch(_){}
    const tit=(m&&m.titulo)||((document.querySelector('#content h2')||{}).textContent||''); const art=(m&&m.artista)||'';
    const tom=(document.querySelector('#content .mm-tom > span b')||{}).textContent||'';
    return {titulo:tit.replace('★','').trim(), sub:art.trim(), tom, texto:z.innerText}; }
  const pg=document.querySelector('#content .cc-page'); const song=pg&&pg.querySelector('.cc-song');
  if(song){ const {h,harpa}=hinoAtual(); const tom=(pg.querySelector('.cc-tools .chip .lbl b, .cc-meta b')||{}).textContent||'';
    const livro= harpa==='hcc'?'Hinário para o Culto Cristão':harpa?'Harpa Cristã':'Cantor Cristão';
    return {titulo:(h?h.n+' · '+h.titulo:''), sub:livro, tom, texto:(song.querySelector('.cc-tx')||song).innerText}; }
  return null;
}
async function gerarPdfCifra(info){
  if(!window.PDFLib) await carregaScript('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js');
  const {PDFDocument,StandardFonts,rgb}=PDFLib;
  const doc=await PDFDocument.create();
  const F={cr:await doc.embedFont(StandardFonts.Courier), cb:await doc.embedFont(StandardFonts.CourierBold), hr:await doc.embedFont(StandardFonts.Helvetica), hb:await doc.embedFont(StandardFonts.HelveticaBold), hi:await doc.embedFont(StandardFonts.HelveticaOblique)};
  const limpa=t=>String(t||'').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/\u266F/g,'#').replace(/\u266D/g,'b').replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g,'');
  const W=595.28,H=841.89,M=40, c=corAcordeRGB(), COR=rgb(c[0]/255,c[1]/255,c[2]/255);
  const linhas=limpa(info.texto).replace(/\r/g,'').split('\n').map(l=>l.replace(/\s+$/,''));
  const maior=Math.max(20,...linhas.map(l=>l.length));
  const fs=Math.max(7.5,Math.min(13,(W-2*M)/(maior*0.6))); const lh=fs*1.38;
  let pg=doc.addPage([W,H]), y=H-M;
  const txt=(t,x,f,sz,cor)=>pg.drawText(t,{x,y,size:sz,font:f,color:cor});
  y-=18; txt(limpa(info.titulo||'Cifra'),M,F.hb,16,rgb(.08,.24,.18));
  y-=15; txt(limpa([info.sub, info.tom?'Tom: '+info.tom:''].filter(Boolean).join('   -   ')),M,F.hr,10.5,rgb(.35,.43,.39));
  y-=8; pg.drawLine({start:{x:M,y},end:{x:W-M,y},thickness:.7,color:rgb(.78,.84,.81)}); y-=6;
  const ehAc=l=>!!(window.__ehLinhaDeAcordes&&l.trim()&&__ehLinhaDeAcordes(l));
  const nova=()=>{ pg=doc.addPage([W,H]); y=H-M; y-=10; txt(limpa(info.titulo||''),M,F.hi,9,rgb(.55,.59,.57)); y-=8; };
  for(let i=0;i<linhas.length;i++){
    const l=linhas[i]; const par= ehAc(l) && linhas[i+1]!=null && linhas[i+1].trim() && !ehAc(linhas[i+1]);
    if(y-(par?2:1)*lh < M+14) nova();
    if(!l.trim()){ y-=lh*0.6; continue; }
    y-=lh;
    if(/^\s*\[[^\]]+\]\s*$/.test(l)) txt(l.trim(),M,F.hb,fs*0.9,rgb(.08,.35,.24));
    else if(ehAc(l)) txt(l,M,F.cb,fs,COR);
    else txt(l,M,F.cr,fs,rgb(.1,.14,.12));
  }
  const ps=doc.getPages(); ps.forEach((p,k)=>{ const t='Ministerio de Musica IBNM - '+(k+1)+'/'+ps.length; const w=F.hr.widthOfTextAtSize(t,8); p.drawText(t,{x:(W-w)/2,y:18,size:8,font:F.hr,color:rgb(.6,.63,.61)}); });
  return new Blob([await doc.save()],{type:'application/pdf'});
}
let _pdfBlob=null, _pdfNome='cifra.pdf', _pdfZoom=1, _pdfDoc=null, _pdfBase=0;
window.verCifraPdf=async function(){
  const info=cifraDaTela(); if(!info||!info.texto.trim()) return toast('Não há cifra nesta tela.');
  toast('Gerando o PDF…');
  try{ const b=await gerarPdfCifra(info); await abrirLeitorPdf(b,info.titulo||'Cifra'); }
  catch(err){ toast('Não consegui gerar o PDF'+(/internet|script/i.test(String(err&&err.message))?' (precisa de internet na 1ª vez)':'')+'.'); }
};
/* abre qualquer PDF (arquivo gerado, do app, do GitHub ou do Supabase) no leitor do app */
window.abrirLeitorPdf=async function(fonte,titulo){
  try{
    if(typeof fonte==='string'){ toast('Abrindo o PDF…'); const r=await fetch(fonte); if(!r.ok) throw new Error('arquivo '+r.status); fonte=await r.blob(); }
    _pdfBlob=fonte; const info={titulo:titulo||'PDF'}; _pdfNome=String(info.titulo).replace(/[^\p{L}\p{N} .-]+/gu,'').trim().slice(0,60)+'.pdf';
    if(!window.pdfjsLib){ await carregaScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'); pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; }
    _imgs=null; _pdfDoc=await pdfjsLib.getDocument({data:await _pdfBlob.arrayBuffer()}).promise; _pdfZoom=1;
    let bg=document.getElementById('pdfLeitor'); if(bg) bg.remove();
    document.body.insertAdjacentHTML('beforeend','<div id="pdfLeitor" class="pdf-bg"><div class="pdf-bar"><button onclick="fecharPdf()" aria-label="Fechar">✕</button><b>'+e(info.titulo||'Cifra')+'</b><button onclick="pdfBaixar()" aria-label="Baixar">⬇️</button><button onclick="pdfCompartilhar()" aria-label="Compartilhar">📤</button></div><div id="pdfPags" class="pdf-pags"><div id="pdfIn" class="pdf-in"></div></div><div class="pdf-dica">Use dois dedos para aumentar ou diminuir · arraste para mover · toque duas vezes para ampliar</div></div>');
    document.body.style.overflow='hidden';
    const box=document.getElementById('pdfPags'); _pdfBase=Math.min(box.clientWidth-16,900);
    await pdfDesenha(); pdfGestos(box); setTimeout(()=>{ const d=document.querySelector('.pdf-dica'); if(d) d.classList.add('some'); },3500);
  }catch(err){ toast('Não consegui abrir o PDF'+(/internet|script|fetch/i.test(String(err&&err.message))?' (verifique a internet)':'')+'.'); }
};
async function pdfDesenha(){
  const inn=document.getElementById('pdfIn'); if(!inn) return;
  if(_imgs && !_pdfDoc){ const larg=_pdfBase*_pdfZoom;
    if(!inn.children.length) inn.innerHTML=_imgs.urls.map((u,i)=>'<img src="'+e(u)+'" alt="Partitura" draggable="false"'+(_imgs.reservas[i]?' data-res="'+e(_imgs.reservas[i])+'" onerror="if(this.dataset.res&&!this.dataset.r){this.dataset.r=1;this.src=this.dataset.res}"':'')+'>').join('');
    inn.querySelectorAll('img').forEach(im=>{ im.style.width=larg+'px'; }); return; }   /* (a transformação é retirada em aplica, no mesmo instante) */
  if(!_pdfDoc) return;
  const larg=_pdfBase*_pdfZoom, dpr=Math.min(2.5,window.devicePixelRatio||1);
  const novo=document.createElement('div'); novo.className='pdf-in'; novo.id='pdfIn';
  for(let i=1;i<=_pdfDoc.numPages;i++){ const pg=await _pdfDoc.getPage(i); const v1=pg.getViewport({scale:1}); let sc=larg/v1.width*dpr; if(v1.width*sc>4096) sc=4096/v1.width; const vp=pg.getViewport({scale:sc});
    const c=document.createElement('canvas'); c.width=vp.width; c.height=vp.height; c.style.width=larg+'px'; c.style.height=(larg*v1.height/v1.width)+'px'; novo.appendChild(c);
    await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise; }
  const velho=document.getElementById('pdfIn'); if(velho) velho.replaceWith(novo);
}
/* gestos: pinça com 2 dedos = zoom livre (no ponto entre os dedos); 1 dedo = rolagem livre; toque duplo = 1x ↔ 2,5x */
function pdfGestos(box){
  const pts=new Map(); let ini=null, ultimoToque=0, fimPinca=0, ocupado=false;
  const dist=()=>{ const [a,b]=[...pts.values()]; return Math.hypot(a.x-b.x,a.y-b.y); };
  const meio=()=>{ const [a,b]=[...pts.values()]; const r=box.getBoundingClientRect(); return {x:(a.x+b.x)/2-r.left, y:(a.y+b.y)/2-r.top}; };
  /* o zoom fica exatamente onde o dedo deixou: a imagem ampliada continua na tela até a nova
     (nítida) ficar pronta, e a troca acontece no mesmo instante, sem pulo */
  async function aplica(z,foco){
    const z0=_pdfZoom; z=Math.min(8,Math.max(0.3,z));
    const cx=(box.scrollLeft+foco.x)/z0, cy=(box.scrollTop+foco.y)/z0;
    if(Math.abs(z-z0)<0.005){ const inn=document.getElementById('pdfIn'); if(inn) inn.style.transform=''; return; }
    ocupado=true; _pdfZoom=z; await pdfDesenha();
    const inn=document.getElementById('pdfIn'); if(inn) inn.style.transform='';
    box.scrollLeft=cx*z-foco.x; box.scrollTop=cy*z-foco.y; ocupado=false; }
  box.addEventListener('pointerdown',ev=>{ pts.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
    if(pts.size===2){ ini={d:dist(),z:_pdfZoom,m:meio()}; }
    if(pts.size===1 && Date.now()-fimPinca>400){ const t=Date.now(); if(t-ultimoToque<300){ const r=box.getBoundingClientRect(); aplica(_pdfZoom>1.2?1:2.5,{x:ev.clientX-r.left,y:ev.clientY-r.top}); ultimoToque=0; } else ultimoToque=t; } });
  box.addEventListener('pointermove',ev=>{ if(!pts.has(ev.pointerId)) return; pts.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
    if(pts.size===2 && ini && !ocupado){ ev.preventDefault(); const f=Math.min(8/ini.z,Math.max(0.3/ini.z,dist()/ini.d)); const inn=document.getElementById('pdfIn');
      if(inn){ inn.style.transformOrigin=(box.scrollLeft+ini.m.x)+'px '+(box.scrollTop+ini.m.y)+'px'; inn.style.transform='scale('+f+')'; } } },{passive:false});
  const fim=ev=>{ if(!pts.has(ev.pointerId)) return; if(pts.size===2 && ini){ const f=dist()/ini.d; const m=ini.m; const z=ini.z*f; ini=null; pts.delete(ev.pointerId); fimPinca=Date.now(); ultimoToque=0; aplica(z,m); return; } pts.delete(ev.pointerId); };
  box.addEventListener('pointerup',fim); box.addEventListener('pointercancel',fim); box.addEventListener('pointerleave',fim);
  /* no computador: Ctrl + roda do mouse */
  box.addEventListener('wheel',ev=>{ if(!ev.ctrlKey) return; ev.preventDefault(); const r=box.getBoundingClientRect(); aplica(_pdfZoom*(ev.deltaY<0?1.15:0.87),{x:ev.clientX-r.left,y:ev.clientY-r.top}); },{passive:false});
}
/* rolagem automática no leitor: ▶/⏸ e barra de velocidade (fica salva) */
let _rolPdf=null, _rolVel=+(localStorage.getItem('ibnm_pdf_vel')||3), _rolAcc=0;
function rolPdfLoop(t0){ let ant=t0; const passo=t=>{ const box=document.getElementById('pdfPags'); if(!_rolPdf||!box){ _rolPdf=null; return; }
  const dt=Math.min(0.1,(t-ant)/1000); ant=t; _rolAcc+=_rolVel*12*dt; const n=Math.floor(_rolAcc); if(n>=1){ box.scrollTop+=n; _rolAcc-=n; }
  if(box.scrollTop+box.clientHeight>=box.scrollHeight-2){ pdfRolar(false); return; }
  _rolPdf=requestAnimationFrame(passo); }; _rolPdf=requestAnimationFrame(passo); }
window.pdfRolar=function(liga){ const on= liga===undefined? !_rolPdf : liga; if(_rolPdf){ cancelAnimationFrame(_rolPdf); _rolPdf=null; } if(on) rolPdfLoop(performance.now());
  const b=document.getElementById('pdfRolBt'); if(b) b.textContent=_rolPdf?'⏸':'▶'; };
window.pdfVel=function(v){ _rolVel=+v; localStorage.setItem('ibnm_pdf_vel',String(_rolVel)); const l=document.getElementById('pdfVelN'); if(l) l.textContent=_rolVel; };
function barraRolagemPdf(){ const lt=document.getElementById('pdfLeitor'); if(!lt || lt.querySelector('.pdf-rol')) return;
  lt.insertAdjacentHTML('beforeend','<div class="pdf-rol"><button id="pdfRolBt" onclick="pdfRolar()" aria-label="Rolagem automática">▶</button><span>🐢</span><input type="range" min="1" max="10" step="1" value="'+_rolVel+'" oninput="pdfVel(this.value)" aria-label="Velocidade da rolagem"><span>🐇</span><b id="pdfVelN">'+_rolVel+'</b></div>');
  const box=document.getElementById('pdfPags'); if(box) box.addEventListener('pointerdown',()=>{ if(_rolPdf) pdfRolar(false); });
}
new MutationObserver(()=>{ if(document.getElementById('pdfLeitor')) barraRolagemPdf(); else if(_rolPdf){ cancelAnimationFrame(_rolPdf); _rolPdf=null; } }).observe(document.body,{childList:true});
window.pdfZoom=function(d){ const box=document.getElementById('pdfPags'); if(!box) return; _pdfZoom=Math.min(5,Math.max(0.6,_pdfZoom+(d>0?0.25:-0.25))); pdfDesenha(); };
window.fecharPdf=function(){ const b=document.getElementById('pdfLeitor'); if(b) b.remove(); document.body.style.overflow=''; };
window.pdfBaixar=function(){ if(!_pdfBlob) return; const a=document.createElement('a'); a.href=URL.createObjectURL(_pdfBlob); a.download=_pdfNome; document.body.appendChild(a); a.click(); a.remove(); toast('PDF salvo na pasta Downloads.'); };
window.pdfCompartilhar=async function(){ if(!_pdfBlob) return; const f=new File([_pdfBlob],_pdfNome,{type:'application/pdf'});
  try{ if(navigator.canShare&&navigator.canShare({files:[f]})) return await navigator.share({files:[f],title:_pdfNome}); }catch(_){ return; } pdfBaixar(); };
/* músicas: partitura em mmibnm-partituras/musicas/<titulo-da-musica>.pdf (ou .jpg/.png) */
const _musPart={};
async function partituraMusica(m){
  if(!m) return null; const k=m.id; if(_musPart[k]!==undefined) return _musPart[k];
  _musPart[k]=null; const base=PART_BASE+'musicas/'; const nomes=[SLUG(m.titulo), m.id];
  if(INDICE){ const u=noIndice('musicas',nomes.map(x=>String(x))); _musPart[k]=u||null; return _musPart[k]; }
  for(const n of nomes) for(const x of ['.pdf','.jpg','.png']){ try{ const r=await fetch(base+encodeURIComponent(n)+x,{method:'HEAD'}); if(r.ok){ _musPart[k]=base+encodeURIComponent(n)+x; return _musPart[k]; } }catch(_){ return null; } }
  return null; }
async function botaoPartituraMusica(){
  const z=document.querySelector('#content #zoomTarget'); if(!z || document.getElementById('btPartMus')) return;
  let m=null; try{ m=(DB.musicas||[]).find(x=>x.id===musicaAberta); }catch(_){} if(!m) return;
  const url=await partituraMusica(m); const ref=document.getElementById('btPdfCifra'); if(!url || !ref || document.getElementById('btPartMus')) return;
  ref.insertAdjacentHTML('afterend','<button type="button" id="btPartMus" class="mm-rol pdf-bt" onclick="abrirPartitura(\''+url+'\',\''+e(String(m.titulo).replace(/'/g,''))+'\')">📜 Partitura</button>');
}
/* o botão aparece em toda música e todo hino (para todos) */
function botaoPdf(){
  const z=document.querySelector('#content #zoomTarget');
  if(z){ const rol=document.getElementById('musRolBtn'); if(rol && !document.getElementById('btPdfCifra')) rol.insertAdjacentHTML('afterend','<button type="button" id="btPdfCifra" class="mm-rol pdf-bt" onclick="verCifraPdf()">📄 Cifra em PDF</button>'); return; }
  const tools=document.querySelector('#content .cc-page .cc-tools'); const song=document.querySelector('#content .cc-page .cc-song');
  if(tools && song && !tools.querySelector('#btPdfCifra')){ const g=tools.querySelector('.cc-gm')||tools.querySelector('.cc-gv')||tools; g.insertAdjacentHTML('beforeend','<button class="tog" id="btPdfCifra" onclick="verCifraPdf()">📄 Cifra em PDF</button>'); }
}
aoMudar(()=>{ botaoPdf(); botaoPartituraMusica(); });

/* ======================= 24) 👑 ADMs E PERMISSÕES (tela própria, só o ADM principal) ======================= */
const SECS=[['playlist','📅','SETLIST'],['musicas','🎵','Músicas'],['hinos','📖','Cantor, Harpa e HCC'],['importar','📥','Importar músicas'],['escala','📋','Escala'],['avisos','📣','Avisos'],['academia','🎓','Academia'],['ensaios','🎼','Ensaios'],['membros','👥','Membros'],['financeiro','💰','Financeiro'],['inventario','🔧','Inventário']];
const souPrincipal=()=>{ try{ return !!(window.ehPrincipal&&ehPrincipal()) && !(window.modoUsuario&&modoUsuario()); }catch(_){ return false; } };
let _admPerf=null, _admBusca='';
async function admPerfis(){ try{ const {data,error}=await sb.from('perfis').select('id,nome,email,admin,foto'); if(!error) _admPerf=data||[]; }catch(_){} if(!_admPerf) _admPerf=(DB.usuarios||[]).map(u=>({id:u.id,nome:u.nome,email:u.email,admin:u.admin,foto:u.foto})); return _admPerf; }
const permsAtuais=()=>{ try{ const P=((typeof APP_CFG!=='undefined'&&APP_CFG)||{}).adm_permissoes||{}; return typeof P==='string'? JSON.parse(P) : P; }catch(_){ return {}; } };
const principaisL=()=>{ try{ const v=((typeof APP_CFG!=='undefined'&&APP_CFG)||{}).adm_principais||['adaiasceara@yahoo.com.br']; return (Array.isArray(v)?v:JSON.parse(v)).map(x=>String(x).toLowerCase()); }catch(_){ return ['adaiasceara@yahoo.com.br']; } };
function admLista(){
  const L=(_admPerf||[]).slice().sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt'));
  const prin=principaisL(), P=permsAtuais();
  const adms=L.filter(u=>u.admin && !prin.includes(String(u.email||'').toLowerCase()));
  const princ=L.filter(u=>prin.includes(String(u.email||'').toLowerCase()));
  const q=SLUG(_admBusca); const outros=L.filter(u=>!u.admin && (!q || SLUG(u.nome).includes(q) || SLUG(u.email).includes(q)));
  const av=u=> u.foto? '<img class="ad-av" src="'+e(u.foto)+'" alt="">' : '<span class="ad-av">'+e(String(u.nome||'?').trim().charAt(0).toUpperCase()||'?')+'</span>';
  return princ.map(u=>'<div class="ad-card prin">'+av(u)+'<div class="ad-h"><b>'+e(u.nome||'')+'</b><small>ADM principal · acesso total</small></div></div>').join('')+
    '<h4 class="ad-t">ADMs ('+adms.length+')</h4>'+
    (adms.length? adms.map(u=>{ const p=P[u.id]||{}; const n=SECS.filter(([k])=>p[k]).length;
      return '<div class="ad-card">'+av(u)+'<div class="ad-h"><b>'+e(u.nome||'')+'</b><small>'+e(u.email||'')+' · '+(n? n+' seção(ões) liberada(s)' : '⚠️ nenhuma seção liberada')+'</small></div>'+
        '<button class="ad-tirar" onclick="admTirar(\''+e(u.id)+'\')">Tirar ADM</button>'+
        '<div class="ad-secs">'+SECS.map(([k,ic,t])=>'<button class="ad-sec'+(p[k]?' on':'')+'" onclick="admSec(\''+e(u.id)+'\',\''+k+'\','+(!p[k])+')">'+ic+' '+t+(p[k]?' ✓':'')+'</button>').join('')+'</div></div>'; }).join('')
      : '<p class="am-dica">Nenhum ADM ainda. Escolha alguém abaixo em <b>Tornar ADM</b>.</p>')+
    '<h4 class="ad-t">Tornar alguém ADM</h4><input class="search-box" placeholder="🔎 Buscar membro pelo nome" value="'+e(_admBusca)+'" oninput="admBuscar(this.value)">'+
    '<div id="adOutros">'+admOutrosHTML(outros,av)+'</div>';
}
function admOutrosHTML(outros,av){ return outros.slice(0,40).map(u=>'<div class="ad-card mini">'+av(u)+'<div class="ad-h"><b>'+e(u.nome||'(sem nome)')+'</b><small>'+e(u.email||'')+'</small></div><button class="ad-dar" onclick="admDar(\''+e(u.id)+'\')">Tornar ADM</button></div>').join('') || '<p class="am-dica">Ninguém encontrado.</p>'; }
function admRedesenha(){ const b=document.getElementById('adBox'); if(b) b.innerHTML=admLista(); }
window.admBuscar=function(v){ _admBusca=v; const el=document.getElementById('adOutros'); if(!el) return; const q=SLUG(v); const L=(_admPerf||[]).filter(u=>!u.admin && (!q||SLUG(u.nome).includes(q)||SLUG(u.email).includes(q))).sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt'));
  const av=u=> u.foto? '<img class="ad-av" src="'+e(u.foto)+'" alt="">' : '<span class="ad-av">'+e(String(u.nome||'?').trim().charAt(0).toUpperCase()||'?')+'</span>'; el.innerHTML=admOutrosHTML(L,av); };
window.admSec=async function(uid,k,v){ if(!souPrincipal()) return; if(window.paPerm){ await paPerm(uid,k,v); } admRedesenha(); };
async function admMarca(uid,v){
  const u=(_admPerf||[]).find(x=>x.id===uid); if(!u) return;
  if(!confirm((v?'Dar acesso de ADM para ':'Tirar o acesso de ADM de ')+(u.nome||u.email)+'?')) return;
  const {error}=await sb.from('perfis').update({admin:v}).eq('id',uid);
  if(error) return toast('Não consegui: '+error.message);
  u.admin=v; const d=(DB.usuarios||[]).find(x=>x.id===uid); if(d) d.admin=v;
  if(!v && window.paPerm){ const P=permsAtuais(); for(const k of Object.keys(P[uid]||{})) await paPerm(uid,k,false); }
  toast(v? (u.nome||'')+' agora é ADM. Marque as seções que ele pode usar.' : 'Acesso de ADM retirado.'); admRedesenha();
}
window.admDar=uid=>admMarca(uid,true); window.admTirar=uid=>admMarca(uid,false);
if(typeof ROTAS!=='undefined'){
  ROTAS.adms=function(){ if(!souPrincipal()) return '<div class="empty">Só o ADM principal mexe nos ADMs.</div>';
    admPerfis().then(admRedesenha);
    return '<div class="page"><div class="page-ttl">👑 ADMs e permissões</div><div class="card"><p class="am-dica" style="font-size:13px">Toque numa seção para <b>liberar</b> (fica verde ✓) ou <b>bloquear</b>. Salva na hora. Cada ADM só vê o que estiver liberado.</p><div id="adBox">'+(_admPerf?admLista():'<div class="empty">Carregando…</div>')+'</div></div></div>'; };
  /* Painel do ADM: cartão grande no topo, com resumo e o botão */
  if(ROTAS.admin){ const _adm0=ROTAS.admin; ROTAS.admin=function(){ let h=_adm0.apply(this,arguments); if(!souPrincipal()) return h;
    const card='<div class="card ad-topo" onclick="go(\'adms\')"><div class="ad-topo-ic">👑</div><div style="flex:1;min-width:0"><b>ADMs e permissões</b><small id="adResumo">Quem é ADM e o que cada um pode acessar</small></div><span class="ad-topo-go">Abrir ›</span></div>';
    h=h.replace(/<div class="card pa-card">[\s\S]*?<button class="mini-btn sec" onclick="go\('membros'\)">[^<]*<\/button><\/div>/,'');
    setTimeout(()=>admPerfis().then(()=>{ const r=document.getElementById('adResumo'); if(!r) return; const prin=principaisL(), P=permsAtuais();
      const a=(_admPerf||[]).filter(u=>u.admin && !prin.includes(String(u.email||'').toLowerCase()));
      r.innerHTML= a.length? a.map(u=>'<b>'+e(String(u.nome||'').split(' ')[0])+'</b>: '+(SECS.filter(([k])=>(P[u.id]||{})[k]).map(x=>x[2]).join(', ')||'nada liberado')).join(' · ') : 'Nenhum ADM além de você'; }),0);
    return h.replace(/(<div class="page[^"]*">\s*<div class="page-ttl">[\s\S]*?<\/div>)/, '$1'+card); }; }
}
/* menu: "ADMs e permissões" logo abaixo do Painel do ADM (só para o principal) */
if(typeof window.montaMenu==='function'){ const _mm=window.montaMenu; window.montaMenu=function(){ const r=_mm.apply(this,arguments);
  try{ if(souPrincipal()){ const nav=document.querySelector('.sm-nav'); const pa=nav&&[...nav.querySelectorAll('.sm-item')].find(b=>/Painel do ADM/.test(b.textContent));
    if(nav && !nav.querySelector('.sm-adms')) (pa||nav.lastElementChild).insertAdjacentHTML('afterend','<button class="sm-item sm-adms" onclick="go(\'adms\')"><span class="ic">👑</span>ADMs e permissões</button>'); } }catch(_){}
  return r; }; try{ montaMenu=window.montaMenu; }catch(_){} try{ if(typeof _booted!=='undefined'&&_booted) montaMenu(); }catch(_){} }

/* ======================= 23) SETLIST: COMPARTILHAR COMO IMAGEM ======================= */
/* A função que gera a imagem usa ehSlExtra(), que só existia dentro de outro bloco do culto.js
   ("ehSlExtra is not defined"). Deixamos ela disponível para o app inteiro. */
if(typeof window.ehSlExtra!=='function') window.ehSlExtra=function(c){ c=String(c||''); return c.indexOf('slx_')===0||c.indexOf('slq_')===0; };

/* ======================= 22) PADRÃO DOS HINOS (Cantor, Harpa e HCC) ======================= */
/* Regra para todo hino:
   ADM ...... Cifra · Letra · Partitura · Tonalidade · Rolagem · Enviar p/ SETLIST · Ao vivo · Editar cifras · Editar hino (texto)
   Usuário .. Cifra · Letra · Partitura (só se houver) · Rolagem
   O "Cifra" grande sempre mostra os acordes (o "Cifras" pequeno some). Sem partitura → ADM pode subir. */
const livroDe = harpa => harpa==='hcc'? 'hcc' : harpa? 'hr' : 'cc';
let PARTS={}; try{ PARTS=JSON.parse(localStorage.getItem('ibnm_parts')||'{}')||{}; }catch(_){}
async function carregaPartituras(){ try{ if(typeof sb==='undefined') return; const {data,error}=await sb.from('partituras_hinos').select('livro,num,url,tipo'); if(error) return;
  const m={}; (data||[]).forEach(r=>m[r.livro+':'+r.num]=r); PARTS=m; localStorage.setItem('ibnm_parts',JSON.stringify(m)); }catch(_){} }
setTimeout(carregaPartituras,5500);
/* arquivos guardados no próprio app (GitHub): partituras/cc/, partituras/hr/, partituras/hcc/
   nomes aceitos: 001.pdf, 1.pdf, n001.pdf, cc001.pdf (ou .jpg/.png) — o app acha sozinho */
let LOCAIS={}; try{ LOCAIS=JSON.parse(localStorage.getItem('ibnm_part_local')||'{}')||{}; }catch(_){}
const _sondando={};
/* PDFs e imagens das partituras ficam no repositório mmibnm-partituras (fora do app, para o app não ficar pesado).
   O app procura lá primeiro (pelo jsDelivr) e, se não achar, na pasta antiga dentro do app. */
const PART_BASE='https://cdn.jsdelivr.net/gh/adaiascearataiana-gif/mmibnm-partituras@main/';
const PASTA_REPO={cc:'cc',hcc:'hcc',hr:'harpa'};
/* índice do repositório de partituras (indice.json): diz quais arquivos existem, sem precisar "testar" 20 endereços por hino */
let INDICE=null; try{ const c=JSON.parse(localStorage.getItem('ibnm_part_idx')||'null'); if(c && Date.now()-c.t<6*3600e3) INDICE=c.d; }catch(_){}
async function carregaIndice(){ try{ const r=await fetch(PART_BASE+'indice.json',{cache:'no-cache'}); if(!r.ok) return; const d=await r.json(); if(d&&typeof d==='object'){ INDICE=d; localStorage.setItem('ibnm_part_idx',JSON.stringify({t:Date.now(),d})); } }catch(_){} }
if(!INDICE) setTimeout(carregaIndice,3500);
function noIndice(pasta,nomes){ const L=(INDICE&&INDICE[pasta])||null; if(!L) return null; const set=new Set(L); for(const n of nomes) for(const x of ['.pdf','.jpg','.jpeg','.png']){ if(set.has(n+x)) return PART_BASE+pasta+'/'+n+x; } return ''; }
function nomesLocais(L,n){ const p3=String(n).padStart(3,'0'); const out=[];
  if(INDICE){ const nm=L==='hr'? ['h'+p3,p3,'p'+p3] : [p3,String(n),'n'+p3,L+p3]; const u=noIndice(PASTA_REPO[L],nm); if(u) return [u]; return [p3].map(b=>'partituras/'+L+'/'+b+'.pdf'); }
  const nomes=L==='hr'? ['h'+p3,p3,'p'+p3] : [p3,String(n),'n'+p3,L+p3];
  nomes.forEach(b=>['.pdf','.jpg','.png'].forEach(x=>out.push(PART_BASE+PASTA_REPO[L]+'/'+b+x)));
  [p3,String(n),'n'+p3,L+p3].forEach(b=>['.pdf','.jpg','.png'].forEach(x=>out.push('partituras/'+L+'/'+b+x)));
  return out; }
async function sondaLocal(L,n){
  const k=L+':'+n, c=LOCAIS[k]; if(c && (c.url || Date.now()-c.t<6*3600e3)) return c.url||null;
  if(_sondando[k]) return _sondando[k];
  _sondando[k]=(async()=>{ let url=null;
    for(const u of nomesLocais(L,n)){ try{ const r=await fetch(u,{method:'HEAD',cache:u.startsWith('http')?'default':'no-store'}); if(r.ok && !/text\/html/i.test(r.headers.get('content-type')||'')){ url=u; break; } }catch(_){ if(!u.startsWith('http')) break; } }
    LOCAIS[k]={url,t:Date.now()}; try{ localStorage.setItem('ibnm_part_local',JSON.stringify(LOCAIS)); }catch(_){}
    delete _sondando[k]; return url; })();
  return _sondando[k];
}
function temPartitura(h,harpa){ const L=livroDe(harpa); if(PARTS[L+':'+h.n]) return true; const lc=LOCAIS[L+':'+h.n]; if(lc&&lc.url) return true;
  if(L==='hr') return !!(h.partitura); if(L==='cc') return !!CC_SITE[h.n]; return !!HCC_SITE[h.n]; }
const ehPdf=u=>/\.pdf(\?|$)/i.test(String(u||''));
function mostraPartitura(url,h,tipo){ const tit='Partitura · '+h.n+' · '+h.titulo;
  if(tipo==='pdf'||ehPdf(url)) return abrirLeitorPdf(url,tit);
  leitorImagem([url],tit); }
function urlHarpa(h){ const loc=(h&&h.partitura)||('partituras_harpa/h'+String(h.n).padStart(3,'0')+'.jpg'); return {cdn:PART_BASE+'harpa/'+loc.split('/').pop(), local:loc}; }
let _imgs=null;
function leitorImagem(urls,titulo,reservas){
  _pdfDoc=null; _pdfBlob=null; _imgs={urls,reservas:reservas||[]}; _pdfZoom=1;
  let bg=document.getElementById('pdfLeitor'); if(bg) bg.remove();
  document.body.insertAdjacentHTML('beforeend','<div id="pdfLeitor" class="pdf-bg"><div class="pdf-bar"><button onclick="fecharPdf()" aria-label="Fechar">✕</button><b>📜 '+e(titulo||'Partitura')+'</b></div><div id="pdfPags" class="pdf-pags"><div id="pdfIn" class="pdf-in"></div></div><div class="pdf-dica">Use dois dedos para aumentar ou diminuir · arraste para mover · toque duas vezes para ampliar</div></div>');
  document.body.style.overflow='hidden';
  const box=document.getElementById('pdfPags'); _pdfBase=Math.min(box.clientWidth-16,900);
  pdfDesenha(); pdfGestos(box); setTimeout(()=>{ const d=document.querySelector('.pdf-dica'); if(d) d.classList.add('some'); },3500);
}
window.abrirPartitura=async function(url,titulo){
  if(typeof url==='string' && url){ return ehPdf(url)? abrirLeitorPdf(url,titulo) : leitorImagem([url],titulo); }   /* chamado com endereço (ex.: pela Harpa) */
  const {h,harpa}=hinoAtual(); if(!h) return; const L=livroDe(harpa), up=PARTS[L+':'+h.n];
  if(up) return mostraPartitura(up.url,h,up.tipo);
  const loc=await sondaLocal(L,h.n); if(loc) return mostraPartitura(loc,h);
  if(L==='hr'){ const u=urlHarpa(h); return leitorImagem([u.cdn],'Partitura · '+h.n+' · '+h.titulo,[u.local]); }
  abrirSiteHino(L==='hcc'?'hcc':'cc',h.n); };
/* subir partitura (imagem ou PDF) e extrair cifra + letra */
window.subirPartitura=function(){ const i=document.createElement('input'); i.type='file'; i.accept='image/*,application/pdf'; i.onchange=()=>{ if(i.files[0]) enviarPartitura(i.files[0]); }; i.click(); };
function reduzImagem(file){ return new Promise((ok,no)=>{ const img=new Image(); img.onload=()=>{ const k=Math.min(1,1800/Math.max(img.width,img.height)); const c=document.createElement('canvas'); c.width=Math.round(img.width*k); c.height=Math.round(img.height*k); c.getContext('2d').drawImage(img,0,0,c.width,c.height); c.toBlob(b=>b?ok(b):no(new Error('imagem')),'image/jpeg',0.82); }; img.onerror=()=>no(new Error('imagem inválida')); img.src=URL.createObjectURL(file); }); }
async function enviarPartitura(file){
  const {h,harpa}=hinoAtual(); if(!h) return; const L=livroDe(harpa);
  const pdf=/pdf/i.test(file.type)||/\.pdf$/i.test(file.name);
  if(pdf && file.size>8*1024*1024) return toast('PDF muito grande (máx. 8 MB).');
  toast('Enviando partitura…');
  try{
    const blob= pdf? file : await reduzImagem(file);
    const path=L+'/'+h.n+'-'+Date.now()+(pdf?'.pdf':'.jpg');
    const up=await sb.storage.from('partituras').upload(path,blob,{contentType:pdf?'application/pdf':'image/jpeg',upsert:true}); if(up.error) throw up.error;
    const url=sb.storage.from('partituras').getPublicUrl(path).data.publicUrl;
    const r=await sb.from('partituras_hinos').upsert({livro:L,num:h.n,url,tipo:pdf?'pdf':'img',updated_at:new Date().toISOString()}); if(r.error) throw r.error;
    PARTS[L+':'+h.n]={livro:L,num:h.n,url,tipo:pdf?'pdf':'img'}; localStorage.setItem('ibnm_parts',JSON.stringify(PARTS));
    toast('Partitura salva. Lendo a cifra e a letra…');
    const txt= pdf? await textoDoPDF(file) : await textoDaImagem(blob);
    padronizaHino(true);
    if(txt && txt.trim()) editarHinoTexto(txt, 'Cifra e letra lidas da partitura. Confira, corrija o que precisar e toque em Salvar — a letra vai para "Letra" e os acordes para "Cifra".');
    else toast('Partitura salva, mas não consegui ler o texto dela. Use "Editar hino (texto)" para escrever.');
  }catch(err){ toast('Não consegui salvar a partitura: '+(err.message||err)+(/bucket|not found|relation|schema/i.test(String(err.message||err))?' — rode o SQL das partituras.':'')); }
}
function carregaScript(src){ return new Promise((ok,no)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=()=>no(new Error('sem internet')); document.head.appendChild(s); }); }
/* PDF com texto: monta as linhas respeitando a posição (acordes ficam em cima das sílabas) */
async function textoDoPDF(file){
  try{
    if(!window.pdfjsLib){ await carregaScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'); pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; }
    const doc=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise; const out=[];
    for(let p=1;p<=Math.min(doc.numPages,6);p++){
      const pg=await doc.getPage(p); const tc=await pg.getTextContent(); const linhas={};
      tc.items.forEach(it=>{ if(!it.str||!it.str.trim()) return; const y=Math.round(it.transform[5]/3)*3; (linhas[y]=linhas[y]||[]).push({x:it.transform[4],t:it.str,w:it.width||0}); });
      const ys=Object.keys(linhas).map(Number).sort((a,b)=>b-a);
      const larg=tc.items.filter(i=>i.str&&i.str.length>3).reduce((a,i)=>{ a.s+=i.width||0; a.n+=i.str.length; return a; },{s:0,n:0}); const cw=larg.n? larg.s/larg.n : 5;
      ys.forEach(y=>{ let l=''; linhas[y].sort((a,b)=>a.x-b.x).forEach(it=>{ const col=Math.max(0,Math.round(it.x/cw)-8); if(l.length<col) l+=' '.repeat(col-l.length); else if(l && !/\s$/.test(l)) l+=' '; l+=it.t; }); out.push(l.replace(/\s+$/,'')); });
      out.push('');
    }
    return limpaExtraido(out.join('\n'));
  }catch(_){ return ''; }
}
/* imagem (foto/escaneado): leitura de texto em português */
async function textoDaImagem(blob){
  try{
    if(!window.Tesseract) await carregaScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
    toast('Lendo a imagem (pode levar até 1 minuto na 1ª vez)…');
    const r=await Tesseract.recognize(blob,'por',{preserve_interword_spaces:'1'});
    return limpaExtraido((r&&r.data&&r.data.text)||'');
  }catch(_){ return ''; }
}
function limpaExtraido(t){
  const ls=String(t).replace(/\r/g,'').split('\n').map(l=>l.replace(/\s+$/,''))
    .filter(l=>!/licensed to|www\.|\.com|harmoniza|autor[ia]?:|letra:|m[uú]sica:|tradu[çc][ãa]o:|^\s*\d{1,3}\s*$/i.test(l));
  /* tira o recuo comum e junta linhas vazias repetidas */
  const rec=Math.min(...ls.filter(l=>l.trim()).map(l=>l.match(/^\s*/)[0].length).concat([0]).filter(n=>n>=0)) || 0;
  return ls.map(l=>l.slice(Math.min(rec,l.match(/^\s*/)[0].length))).join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
/* aplica o padrão de botões */
function dicaNova(){ document.querySelectorAll('.tr-dica span').forEach(sp=>{ if(/Cifras liga\/desliga/.test(sp.textContent)) sp.textContent='💡 Dica: 🎸 Cifra mostra os acordes e 📖 Letra mostra só a letra. A− e A+ no topo mudam o tamanho.'; }); }
function padronizaHino(forca){
  const pg=document.querySelector('#content .cc-page'); const tools=pg&&pg.querySelector('.cc-tools'); if(!tools) return;
  const song=pg.querySelector('.cc-song'); const editando=song&&song.classList.contains('editing');
  const {h,harpa}=hinoAtual(); if(!h) return;
  const adm=!!(window.ehAdmin&&ehAdmin()) && (harpa==='hcc'? podeHinos() : true);
  /* "Cifra" grande manda: se estiver no modo cifra e os acordes estiverem escondidos, liga */
  const tc=tools.querySelector('#tc');
  if(song && !editando && !window.__modoLetra && song.classList.contains('nochords') && tc && !tc.dataset.auto){ tc.dataset.auto='1'; tc.click(); return; }
  if(tc) tc.style.display='none';
  /* tira o que não faz parte do padrão */
  pg.querySelectorAll('.sl-acts, .cc-letbaix').forEach(x=>x.style.display='none');
  tools.querySelectorAll('button, a').forEach(b=>{ if(/Tom original/i.test(b.textContent)) b.style.display='none';
    if(/Link do YouTube/i.test(b.textContent)){ if(!adm) b.style.display='none'; else { const ga=tools.querySelector('.cc-ga'); if(ga && b.parentElement!==ga) ga.appendChild(b); } } });
  const chip=tools.querySelector('.chip'); if(chip){ if(!adm) chip.style.display='none'; else { chip.removeAttribute('hidden'); chip.style.display=''; } }
  /* partitura: abre a que houver; sem partitura → ADM sobe, usuário não vê nada */
  { const L=livroDe(harpa), k=L+':'+h.n; if(!PARTS[k] && !(LOCAIS[k]&&(LOCAIS[k].url||Date.now()-LOCAIS[k].t<6*3600e3))) sondaLocal(L,h.n).then(u=>{ if(u) padronizaHino(true); }); }
  const tem=temPartitura(h,harpa);
  let bp=[...tools.querySelectorAll('button')].find(b=>/PARTITURA/i.test(b.textContent));
  if(!bp){ (tools.querySelector('.cc-gm')||tools).insertAdjacentHTML('beforeend','<button class="tog cc-part">📜 PARTITURA</button>'); bp=[...tools.querySelectorAll('button')].find(b=>/PARTITURA/i.test(b.textContent)); }
  const rot=(t)=>{ if(bp.textContent!==t) bp.textContent=t; };
  if(tem){ bp.style.display=''; rot('📜 PARTITURA'); bp.onclick=ev=>{ ev.preventDefault(); ev.stopImmediatePropagation(); abrirPartitura(); }; }
  else if(adm){ bp.style.display=''; rot('⬆️ Subir partitura'); bp.onclick=ev=>{ ev.preventDefault(); ev.stopImmediatePropagation(); subirPartitura(); }; }
  else bp.style.display='none';
  /* usuário: só Cifra · Letra · Partitura · Rolagem */
  if(!adm){ tools.querySelectorAll('.cc-ga').forEach(g=>g.style.display='none'); }
  if(forca) tools.dataset.pad='';
}
aoMudar(()=>{ padronizaHino(false); dicaNova(); });

/* ======================= 10) ✕ PARA FECHAR AS JANELAS ======================= */
function poeX(){ const bg=document.getElementById('modalBg'), box=document.getElementById('modalBox');
  if(!bg||!box||!bg.classList.contains('show')) return; if(box.querySelector(':scope > .mx-x')) return;
  box.classList.add('mx-tem'); box.insertAdjacentHTML('afterbegin','<button type="button" class="mx-x" aria-label="Fechar" onclick="fecharModal()">✕</button>'); }
aoMudar(poeX);

/* ======================= estilos ======================= */
const st=document.createElement('style'); st.textContent=`
body.modo-culto .topbar{display:none}
body.modo-culto #content{padding-bottom:90px}
body.modo-culto .cifra-box{font-size:1.08em}
#mcBar{position:fixed;left:0;right:0;bottom:0;z-index:9000;display:flex;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px));background:rgba(11,61,46,.96);box-shadow:0 -4px 14px rgba(0,0,0,.25)}
#mcBar button{flex:1;height:48px;border:0;border-radius:12px;background:#fff;color:var(--verde-escuro);font-weight:900;font-size:15px}
#mcBar .x{flex:0 0 auto;background:var(--dourado);color:#3a2f00;padding:0 14px}
.ens-bar{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin:6px 0 10px;font-size:12px;color:#5d7c6e;font-weight:700}
.ens-bar button{height:30px;min-width:40px;border-radius:8px;border:1px solid #cfdad4;background:#fff;font-weight:800;font-size:12px;color:var(--verde-escuro);padding:0 7px}
.ens-bar button.on{background:var(--verde-med);color:#fff;border-color:var(--verde-med)}
.ens-bar .sp{flex:1}
.ex-pl{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}.ex-pl .mini-btn{margin:0;flex:1;min-width:150px}
.ex-t{font-size:13px;font-weight:800;color:#7a4a00;margin:8px 0 4px}
.ex-ok{font-size:13px;color:#1c6b47;margin:4px 0}
.ex-vz{font-size:12.5px;color:#7a8f86;margin-top:6px}
.ex-l{margin:0 0 4px 18px;font-size:13px;color:#334;line-height:1.6}
.ex-bars{display:flex;flex-direction:column;gap:6px}
.ex-bar{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,2fr) auto;gap:8px;align-items:center;font-size:12.5px}
.ex-bar .n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--verde-escuro);font-weight:700}
.ex-bar .b{height:12px;background:#eef3f0;border-radius:6px;overflow:hidden}.ex-bar .b i{display:block;height:100%;border-radius:6px}
.ex-bar .q{font-weight:800;color:#456;min-width:22px;text-align:right}
.ex-fin{display:flex;gap:8px;align-items:flex-end;height:150px;margin-top:6px}
.ex-fin .c{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%}
.ex-fin .bb{flex:1;width:100%;display:flex;gap:3px;align-items:flex-end;justify-content:center}
.ex-fin i{display:block;width:42%;border-radius:4px 4px 0 0;min-height:2px}
.ex-fin i.en,.ex-leg i.en{background:#1f9d63}.ex-fin i.sa,.ex-leg i.sa{background:#d35454}
.ex-fin small{font-size:11px;color:#6b8378}
.ex-leg{display:flex;gap:14px;font-size:12px;color:#456;margin-top:6px}.ex-leg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px}
.fin-cmp .mini-btn{min-height:36px;height:auto;padding:6px 12px;font-size:13.5px;line-height:1.2;margin:0;border-radius:18px;white-space:nowrap}
.fin-cmp .fin-abas{display:flex!important;flex-wrap:wrap;gap:5px!important}
.fin-cmp .fin-abas .mini-btn{flex:1 1 auto;min-width:0;padding:7px 6px;font-size:11.5px;text-align:center}
#modalBox .mx-x{position:absolute;top:8px;right:8px;width:34px;height:34px;border:0;border-radius:50%;background:#eef3f0;color:#456;font-size:18px;font-weight:800;line-height:1;display:flex;align-items:center;justify-content:center;z-index:5;cursor:pointer}
#modalBox.mx-tem{position:relative}
#modalBox.mx-tem>h3:first-child,#modalBox.mx-tem>div:first-child>h3:first-child{padding-right:40px}
.fin-cmp .info-row{gap:8px;align-items:center}
.fin-cmp .info-row .fin-ic{min-width:38px;width:38px;height:38px;min-height:38px;padding:0;font-size:16px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px}
.fin-cmp .info-row .v{font-size:14px}
.rs-in{width:100%;box-sizing:border-box;font-variant-numeric:tabular-nums;font-weight:700}
.cc-letra{background:#fff;border:1px solid #eef0f3;border-radius:14px;padding:14px 16px 20px;box-shadow:0 1px 5px rgba(0,0,0,.05);font-size:calc(var(--cc-fs,20px) * 1.05);line-height:1.6;color:#1d2b24}
.cc-letra .cl-top{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.cc-letra .cl-t{flex:1;font-weight:900;color:var(--verde-escuro);font-size:16px}
.cc-letra .cl-z{display:flex;gap:6px}
.cc-letra .cl-z button{width:40px;height:34px;border-radius:10px;border:1px solid #cfdad4;background:#f4f8f6;font-weight:900;color:var(--verde-escuro);font-size:14px}
.cc-tools{display:flex!important;flex-direction:column;align-items:stretch!important;gap:8px!important}
.cc-seg{display:flex;background:#e6efea;border-radius:12px;padding:3px;gap:3px}
.cc-seg button{flex:1;height:38px;border:0;border-radius:10px;background:transparent;font-weight:900;font-size:14px;color:#3e5a4d}
.cc-seg button.on{background:var(--verde-med);color:#fff;box-shadow:0 1px 3px rgba(0,0,0,.15)}
.cc-grp{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.cc-grp>*{margin:0!important}
.cc-gl{font-size:10.5px;font-weight:900;letter-spacing:.06em;color:#8a9;background:#eef3f0;border-radius:6px;padding:2px 6px}
.cc-tools.modo-letra .cc-gv>*:not(#tsc){display:none!important}
.cc-letra .cl-p{margin:0 0 16px;position:relative;padding-left:30px}
.cc-letra .cl-r{position:absolute;left:0;top:2px;min-width:22px;height:22px;border-radius:11px;background:#e9f5ef;color:var(--verde-escuro);font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;padding:0 5px}
.cc-letra .coro{font-style:italic;color:#14513b}
.cc-letra .coro .cl-r{background:var(--dourado);color:#3a2f00;font-style:normal;font-size:10.5px}
.ac-seg{display:flex;background:#e6efea;border-radius:12px;padding:3px;gap:3px;margin-bottom:10px}
.ac-seg button{flex:1;height:40px;border:0;border-radius:10px;background:transparent;font-weight:900;font-size:14px;color:#3e5a4d}
.ac-seg button.on{background:var(--verde-med);color:#fff}
.ac-campos{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:8px}
.ac-campos label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:800;color:#5d7c6e}
.ac-campos input,.ac-campos select{height:44px;border:1px solid #cfdad4;border-radius:10px;padding:0 10px;font-size:17px;font-weight:800;color:var(--verde-escuro);background:#fff;width:100%;box-sizing:border-box}
.ac-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.ac-chips button{min-width:38px;height:32px;border:1px solid #cfdad4;border-radius:8px;background:#fff;font-weight:800;font-size:13px;color:var(--verde-escuro);padding:0 7px}
.ac-chips.tipos button{background:#f4f8f6}
.ac-top{margin:14px 0 6px;position:relative;padding-right:96px}
.ac-play{position:absolute;right:0;top:4px;height:42px;padding:0 14px;border:0;border-radius:21px;background:var(--verde-med);color:#fff;font-weight:900;font-size:14px}
button.ac-cel,button.ac-pcel{font:inherit;background:#fff;cursor:pointer;text-align:left}
button.ac-pcel{border:1px solid #e3ece7;border-radius:10px;padding:6px;width:100%}
.ac-cel.toca,.ac-pcel.toca{animation:acToca .6s ease}
@keyframes acToca{0%{box-shadow:0 0 0 0 rgba(31,122,85,.6)}100%{box-shadow:0 0 0 12px rgba(31,122,85,0)}}
.ac-nome{font-size:30px;font-weight:900;color:var(--cor-acorde,#a8350a)}
.ac-desc{font-size:13px;color:#456}
.ac-vz{font-size:13px;color:#7a8f86;margin-top:12px}
.ac-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.ac-cel{display:flex;flex-direction:column;align-items:center;border:1px solid #e3ece7;border-radius:10px;padding:4px 2px;color:#223}
.ac-cel small{font-size:11px;color:#6b8378}
.ac-svg{width:100%;max-width:130px;height:auto}
.ac-svg.pn{max-width:none}
.ac-pn{display:flex;flex-direction:column;gap:10px}
.ac-pcel small{display:block;font-size:12px;font-weight:800;color:#5d7c6e;margin-bottom:4px}
.am-box{padding:10px 12px!important;margin-bottom:10px}
.am-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.am-h>b{flex:1;font-size:14px;color:var(--verde-escuro);min-width:150px}
.am-seg{display:flex;background:#e6efea;border-radius:10px;padding:2px;gap:2px}
.am-seg button{height:32px;border:0;border-radius:8px;background:transparent;font-weight:800;font-size:12.5px;color:#3e5a4d;padding:0 10px}
.am-seg button.on{background:var(--verde-med);color:#fff}
.am-seg.md{margin-bottom:8px}
.am-x{width:34px;height:32px;border:1px solid #cfdad4;border-radius:8px;background:#fff;font-size:14px}
.am-lista{display:flex;gap:6px;overflow-x:auto;padding:8px 0 4px;scrollbar-width:thin}
.am-cel{flex:none;width:92px;display:flex;flex-direction:column;align-items:center;gap:2px;border:1px solid #e3ece7;border-radius:10px;background:#fff;padding:4px 2px;font:inherit;color:#223}
.am-lista.pn .am-cel{width:170px}
.am-cel b{font-size:14px;color:var(--cor-acorde,#a8350a)}
.am-cel .ac-svg{max-width:84px}
.am-lista.pn .am-cel .ac-svg{max-width:160px}
.am-cel.sem{justify-content:center;min-height:70px}
.am-cel.gr{width:100%;border:0}
.am-cel.gr .ac-svg{max-width:200px}
.am-cel.gr .ac-svg.pn{max-width:100%;width:100%}
.am-cel.gr small{font-size:12.5px;font-weight:800;color:#5d7c6e}
.am-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
.am-chips span{font-weight:900;color:var(--cor-acorde,#a8350a);background:#fff8f2;border-radius:8px;padding:2px 8px;font-size:13px}
.am-dica{font-size:11.5px;color:#7a8f86;margin:2px 0 0}
.am-pop{display:flex;justify-content:center}
#zoomTarget .cf-ac,.cc-song .c,.cc-song .cf-ac{cursor:pointer}
.cc-tx{font-family:'Courier New',ui-monospace,monospace;white-space:pre;overflow-x:auto;font-size:calc(var(--cc-fs,20px) * .8);line-height:1.5;color:#1d2b24}
.cc-tx .cf-ac{font-weight:800;color:var(--cor-acorde,#a8350a)}
.cc-tx .cf-sec{display:inline-block;font-family:inherit;font-size:.8em;font-weight:900;color:var(--verde-escuro);background:#e9f5ef;border-radius:8px;padding:0 6px;margin-top:4px}
.cc-tx .cf-lb{color:#6b7c74}
.hx-txt{width:100%;min-height:55vh;resize:both;max-width:100%;font-family:'Courier New',ui-monospace,monospace;font-size:14px;line-height:1.5;white-space:pre;overflow:auto;border:1px solid #cfdad4;border-radius:10px;padding:10px;box-sizing:border-box}
.hx-orig{margin-top:8px;width:100%;height:40px;border:1px dashed #cfdad4;border-radius:10px;background:#fff;color:#7a4a00;font-weight:800}
.ed-tom{width:52px;height:30px;border:1px solid var(--dourado-esc,#c9a200);border-radius:8px;text-align:center;font-weight:900;font-size:14px;color:#8a6a00;background:#fffbea;margin-left:4px}
#edTomAuto{font-size:10px;color:#8a9;margin-left:3px}
.am-var{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:6px}
.am-var button{height:38px;min-width:42px;border:1px solid #cfdad4;border-radius:10px;background:#fff;font-weight:900;font-size:18px;color:var(--verde-escuro)}
.am-var button.v{font-size:13.5px;padding:0 14px;background:var(--verde-med);color:#fff;border-color:var(--verde-med)}
.am-var span{font-size:13px;font-weight:800;color:#5d7c6e;min-width:56px;text-align:center}
.am-lista{align-items:flex-start}
white-space:pre-wrap;font-family:inherit;font-size:14px;background:#f6faf8;border-radius:10px;padding:12px;color:#234}

.ex-rec{white-space:pre-wrap;background:#f4f8f6;border-radius:12px;padding:12px 14px;font-family:inherit;font-size:15px;line-height:1.5;margin:8px 0 12px}
/* HCC */
.hcc-star{margin-left:auto;font-size:22px;color:#c9a200;padding:0 6px;flex:none}
.hcc-star.on{color:#e0a800}
.hcc-lista .cc-list a{display:flex;align-items:center}
.hcc-lista .cc-list a>span:nth-child(2){flex:1;min-width:0}
/* pré-visualização */
.prev-box{background:#fbfdfc;border:1px dashed #cfdad4;border-radius:10px;padding:8px 10px;min-height:60px;max-height:45vh;overflow:auto;font-size:14px}
.ed-prev{margin-top:10px}
/* selecionar vários */
.bk-bar{display:flex;align-items:center;gap:8px;font-weight:900;font-size:13px;color:var(--verde-escuro);margin:6px 2px}
.bk-bar input,.bk-cb{width:20px;height:20px;accent-color:var(--verde-med);flex:none;margin:0}
.bk-row{position:relative}
.bk-row>.bk-cb{margin-right:10px;align-self:center}
.bk-in{display:inline-flex;vertical-align:middle;margin-right:8px}
.bk-tudo{vertical-align:middle;margin:0 6px 0 0;width:18px;height:18px;accent-color:var(--dourado)}
.bk-flut{position:fixed;right:16px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:900;height:50px;padding:0 20px;border:0;border-radius:25px;background:#c0392b;color:#fff;font-weight:900;font-size:15px;box-shadow:0 6px 18px rgba(0,0,0,.25)}
/* tabela de membros: nada quebra palavra; a tabela rola para o lado */
.mb-tab td{white-space:nowrap}
.mb-tab td a{word-break:normal}
/* SETLIST: anterior/próximo em até 2 linhas, sem cortar */
.sl-nav button{white-space:normal!important;text-overflow:ellipsis!important;line-height:1.25;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.mb-tab td{position:relative}
.mb-tab tr.bk-row td:first-child{padding-left:34px}
.mb-tab .bk-in{position:absolute;left:8px;top:50%;transform:translateY(-50%);margin:0}
/* computador: telas mais largas */
@media (min-width:1100px){
  .content{max-width:1080px}
  .content .cc-page{max-width:860px;margin-left:auto;margin-right:auto}
  #content .song-row,#content .cc-list li{transition:background .15s}
}

.ad-topo{display:flex;align-items:center;gap:12px;cursor:pointer;background:linear-gradient(135deg,#fff8dc,#fff);border:2px solid var(--dourado)!important}
.ad-topo-ic{font-size:34px}
.ad-topo b{display:block;font-size:17px;color:var(--verde-escuro)}
.ad-topo small{display:block;font-size:12.5px;color:#5d6f66;margin-top:2px;line-height:1.35}
.ad-topo small b{display:inline;font-size:inherit;color:var(--verde-escuro)}
.ad-h,.ad-card{text-align:left}
.ad-topo-go{font-weight:900;color:#fff;background:var(--verde-med);border-radius:18px;padding:8px 14px;flex:none}
.ad-t{margin:16px 0 8px;font-size:14px;color:var(--verde-escuro)}
.ad-card{display:flex;flex-wrap:wrap;align-items:center;gap:10px;border:1px solid #e3ece7;border-radius:14px;padding:10px 12px;margin-bottom:10px;background:#fff}
.ad-card.prin{background:#fffbea;border-color:#f0dc8a}
.ad-card.mini{padding:8px 10px}
.ad-av{width:42px;height:42px;border-radius:50%;object-fit:cover;background:var(--verde-med);color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center;flex:none}
.ad-h{flex:1;min-width:0}
.ad-h b{display:block;font-size:15px;color:#1d2b24}
.ad-h small{display:block;font-size:12px;color:#6b7c74;overflow:hidden;text-overflow:ellipsis}
.ad-tirar{border:1px solid #e3b2ab;background:#fff5f4;color:#a33;font-weight:800;border-radius:10px;height:34px;padding:0 10px}
.ad-dar{border:0;background:var(--verde-med);color:#fff;font-weight:800;border-radius:10px;height:36px;padding:0 12px}
.ad-secs{display:flex;flex-wrap:wrap;gap:6px;width:100%}
.ad-sec{border:1px solid #cfdad4;background:#f4f8f6;color:#456;font-weight:800;font-size:13px;border-radius:18px;height:36px;padding:0 12px}
.ad-sec.on{background:var(--verde-med);border-color:var(--verde-med);color:#fff}

.pdf-bt{margin-left:6px}
.pdf-bg{position:fixed;inset:0;z-index:9500;background:#3b4440;display:flex;flex-direction:column}
.pdf-bar{display:flex;align-items:center;gap:6px;padding:calc(8px + env(safe-area-inset-top,0px)) 8px 8px;background:var(--verde-escuro,#0e4a37);color:#fff}
.pdf-bar b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}
.pdf-bar button{height:38px;min-width:42px;border:0;border-radius:10px;background:rgba(255,255,255,.14);color:#fff;font-weight:900;font-size:15px}
.pdf-pags{flex:1;overflow:auto;padding:8px;touch-action:pan-x pan-y;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.pdf-in{width:max-content;margin:0 auto;display:flex;flex-direction:column;gap:10px;padding-bottom:calc(16px + env(safe-area-inset-bottom,0px));will-change:transform}
.pdf-in img{display:block;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.35);border-radius:3px;max-width:none;user-select:none;-webkit-user-drag:none}
.pdf-in canvas{display:block;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.35);border-radius:3px;max-width:none}
.pdf-dica{position:absolute;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:rgba(0,0,0,.72);color:#fff;font-size:12.5px;padding:8px 12px;border-radius:12px;max-width:88%;text-align:center;transition:opacity .6s;pointer-events:none}
.pdf-dica.some{opacity:0}

.tb-voltar{width:40px;height:40px;border:0;border-radius:12px;background:rgba(255,255,255,.14);color:#fff;font-size:28px;font-weight:700;line-height:1;display:flex;align-items:center;justify-content:center;flex:none;margin-right:6px;padding-bottom:3px}
.tb-voltar[hidden]{display:none}

#modalBox.mx-grande{width:min(97vw,1150px)!important;max-width:97vw!important;max-height:95vh!important;overflow:auto}
#modalBox.mx-grande .hx-txt{min-height:58vh;font-size:15px;resize:both;max-width:none;min-width:100%}
#modalBox.mx-grande .prev-box{max-height:35vh;resize:vertical}
@media (min-width:900px){ #modalBox.mx-grande .hx-txt{min-height:62vh} }

.topbar .ttl.ola{display:flex;flex-direction:column;min-width:0;flex:1;line-height:1.15;letter-spacing:0;text-transform:none}
.topbar .ttl.ola .ola-nome{font-size:18px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.topbar .ttl.ola .ola-info{font-size:11.5px;font-weight:700;color:rgba(255,255,255,.85);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.1px;font-variant-numeric:tabular-nums}
.topbar .ttl.ola .ola-info2{font-size:11.5px;font-weight:700;color:rgba(255,255,255,.85);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.1px;font-variant-numeric:tabular-nums}

.pdf-rol{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;gap:8px;background:rgba(14,74,55,.92);color:#fff;border-radius:24px;padding:6px 12px;box-shadow:0 4px 14px rgba(0,0,0,.35);z-index:3;width:min(92%,420px)}
.pdf-rol button{width:40px;height:40px;border:0;border-radius:50%;background:#fff;color:var(--verde-escuro,#0e4a37);font-size:18px;font-weight:900;flex:none}
.pdf-rol input{flex:1;accent-color:#f2c200;height:28px}
.pdf-rol b{min-width:18px;text-align:center}
.pdf-dica{bottom:calc(76px + env(safe-area-inset-bottom,0px))!important}

.eed-sem{display:flex;flex-direction:column;gap:8px;max-height:65vh;overflow:auto;padding:2px}
.eed-card{display:flex;align-items:center;gap:10px;border:1px solid #e3ece7;border-left:5px solid var(--verde-med);border-radius:12px;padding:10px 12px;text-align:left;background:#fff}
.eed-card>div{flex:1;min-width:0}
.eed-card b{display:block;font-size:15px;color:var(--verde-escuro)}
.eed-card b span{font-size:11px;background:var(--dourado);color:#3a2f00;border-radius:8px;padding:1px 7px;margin-left:4px}
.eed-card small{display:block;font-size:12px;color:#5d6f66;margin-top:3px;line-height:1.45}
.eed-card.atual{border-color:var(--dourado);border-left-color:var(--dourado);background:#fffbea}
#modalBox.eed-modal{background:#f3f7f5}
.eed-topo{position:sticky;top:-18px;z-index:5;background:#f3f7f5;padding:4px 0 8px;margin-bottom:6px;border-bottom:1px solid #dfe9e4}
.eed-topo h3{margin-bottom:8px}
.eed-per{display:flex;gap:10px;flex-wrap:wrap}
.eed-per label{flex:1;min-width:140px;display:flex;flex-direction:column;gap:4px}
.eed-per span,.eed-f span{font-size:11px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:#4d6b5e}
.eed-dica{font-size:12px;color:#5d6f66;margin:8px 0 0}
.eed-lista{display:flex;flex-direction:column;gap:12px}
.eed-culto{background:#fff;border-radius:14px;box-shadow:0 1px 4px rgba(10,60,40,.08),0 4px 14px rgba(10,60,40,.05);overflow:visible;text-align:left;border:1px solid #e1ebe6;position:relative}
.eed-culto:focus-within{z-index:20}
.eed-cab{border-radius:13px 13px 0 0}
.eed-cab{display:flex;align-items:center;gap:10px;padding:10px 12px;background:linear-gradient(135deg,var(--verde-escuro,#0e4a37),var(--verde-med,#1f7a55));color:#fff}
.eed-n{width:30px;height:30px;border-radius:50%;background:var(--dourado);color:#3a2f00;font-weight:900;display:flex;align-items:center;justify-content:center;flex:none}
.eed-tt{flex:1;min-width:0}
.eed-tt b{display:block;font-size:15px;letter-spacing:.02em}
.eed-tt small{display:block;font-size:12px;opacity:.85;text-transform:uppercase;letter-spacing:.04em}
.eed-x{border:0;background:rgba(255,255,255,.16);color:#fff;border-radius:10px;height:34px;width:38px;font-size:15px}
.eed-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;padding:10px 12px}
.eed-fixas{background:#f7faf8;border-bottom:1px solid #eef3f0;grid-template-columns:repeat(auto-fill,minmax(105px,1fr))}
#modalBox.eed-modal .mx-x{z-index:12}
.eed-topo{padding-right:44px!important}
.eed-sub{font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--verde-med);padding:8px 12px 0}
.eed-f{display:flex;flex-direction:column;gap:4px;min-width:0;position:relative}
.eed-in{width:100%;box-sizing:border-box;height:40px;border:1px solid #cfdad4;border-radius:10px;padding:0 11px;font-size:14.5px;font-weight:600;color:#1d2b24;background:#fff;transition:border-color .15s,box-shadow .15s}
.eed-in:focus{outline:none;border-color:var(--verde-med);box-shadow:0 0 0 3px rgba(31,122,85,.18)}
.eed-f.fn .eed-in{background:#f2faf6;border-color:#bfe0cf}
.eed-f.fn .eed-in:focus{background:#fff}
.eed-novo{width:100%;height:44px;margin:12px 0 4px;border:2px dashed #b9d6c7;border-radius:12px;background:#fff;color:var(--verde-med);font-weight:900;font-size:14px}
.eed-acoes{position:sticky;bottom:-18px;background:#f3f7f5;padding:10px 0 4px;margin-top:6px;border-top:1px solid #dfe9e4;z-index:5}
.eed-sug{position:absolute;left:0;right:0;top:100%;z-index:30;margin-top:4px;background:#fff;border:1px solid #cfdad4;border-radius:12px;box-shadow:0 10px 24px rgba(0,0,0,.18);display:flex;flex-direction:column;max-height:230px;overflow:auto}
.eed-sug button{border:0;background:#fff;text-align:left;padding:10px 12px;font-size:14px;font-weight:700;color:#1d2b24;border-bottom:1px solid #eef3f0}
.eed-sug button:hover,.eed-sug button:focus{background:#e9f5ef}
.eed-sug button b{display:block;font-weight:800}
.eed-sug button small{display:block;font-size:11.5px;font-weight:600;color:#5d7c6e;margin-top:1px}
.eed-sug-t{font-size:12px;font-weight:900;color:var(--verde-escuro);padding:8px 12px;background:#fffbea;border-bottom:1px solid #f0dc8a}
.eed-sug .sem{color:#7a8f86;font-weight:600}
.eed-sug{z-index:60!important}

.toast{z-index:10050!important}   /* avisos aparecem por cima das janelas (antes ficavam escondidos atrás) */

.dg-l{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid #eef3f0;text-align:left}
.dg-l>span{font-size:17px;flex:none}
.dg-l b{display:block;font-size:13.5px;color:#1d2b24}
.dg-l small{display:block;font-size:12px;color:#a0522d;margin-top:1px}

.eed-ta{resize:none;height:40px;min-height:40px;padding:9px 11px!important;line-height:1.35;overflow:hidden;white-space:pre-wrap;word-break:break-word;font-family:inherit}
.eed-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.eed-chips:empty{display:none}
.eed-chips span{background:#e3f2ea;color:#14513b;border-radius:10px;padding:2px 8px;font-size:12px;font-weight:800;text-transform:none;letter-spacing:0}
.eed-f.fx.larga{grid-column:span 2}
@media (max-width:420px){ .eed-f.fx.larga{grid-column:1 / -1} }
`; document.head.appendChild(st);
})();
