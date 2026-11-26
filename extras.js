/* ============================================================
   MM IBNM — Extras (v1.52)
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
setTimeout(hrBaixa,6000); setInterval(()=>{ if(document.visibilityState==='visible') hrBaixa(); },60*60*1000);   /* economia: 1x por hora (antes 15 min) */
/* sincronização IMEDIATA: assim que o ADM corrige um hino da Harpa em qualquer
   aparelho, todos os outros atualizam na hora (sem esperar o ciclo de 15 min) */
(function ligarRtHarpa(){
  try{
    if(typeof sb==='undefined'||!sb||!sb.channel) return;
    const ch=sb.channel('harpa-edits-rt');
    ch.on('postgres_changes',{event:'*',schema:'public',table:'harpa_edits'},()=>{
      hrBaixa().then(()=>{ try{ if(typeof aplicaLetra==='function') aplicaLetra(true); }catch(_){} });
    });
    ch.subscribe();
  }catch(_){}
})();

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
const _PV_MEMO=new Map(); let _PV_LS=null;
function posicoesViolao(A){
  const k=A.nome+'|'+(A.baixo==null?'':A.baixo);
  if(_PV_MEMO.has(k)) return _PV_MEMO.get(k).map(x=>({f:x.f.slice(),nota:x.nota}));
  if(_PV_LS===null){ try{ _PV_LS=JSON.parse(localStorage.getItem('ibnm_ac_pos_v2')||'{}'); }catch(_){ _PV_LS={}; } }
  if(_PV_LS[k]){ _PV_MEMO.set(k,_PV_LS[k]); return posicoesViolao(A); }
  const r=posicoesViolaoCalc(A); _PV_MEMO.set(k,r);
  try{ _PV_LS[k]=r; const ks=Object.keys(_PV_LS); if(ks.length>400) delete _PV_LS[ks[0]]; localStorage.setItem('ibnm_ac_pos_v2',JSON.stringify(_PV_LS)); }catch(_){}
  return r.map(x=>({f:x.f.slice(),nota:x.nota}));
}
function posicoesViolaoCalc(A){
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
      for(const f of op){ if(f>=0 && !permit.has((AFIN[i]+f)%12)) continue; atual[i]=f; rec(i+1); }   /* poda: só notas do acorde */
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
setTimeout(carregaTons,5000); setInterval(()=>{ if(document.visibilityState==='visible') carregaTons(); },60*60*1000);
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
window.hccHino=hccHino;
function hccTodos(){ const ns=new Set([...Object.keys(HCC_SITE),...Object.keys(HCC_DB||{})].map(Number)); return [...ns].sort((a,b)=>a-b).map(hccHino); }
window.hccTodos=hccTodos;
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

      (adm?'<button class="tog cc-setlist" onclick="enviarPraPlaylist(\'hcc:'+n+'\')">➕ Enviar para o SETLIST</button>':'')+
      ((typeof window.abrirEstatisticasMusica==='function')?'<button class="tog" onclick="abrirEstatisticasMusica(\''+e(h.titulo).replace(/'/g,"\\'")+'\',\'HCC\')">📊 Estatísticas</button>':'')+
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
  try{ if(window.ccPosHino) window.ccPosHino(n,'hcc'); }catch(_){}
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
/* sincronização IMEDIATA do HCC: o ADM edita um hino e todos os aparelhos
   abertos atualizam na hora (antes só recarregava ao reabrir a lista) */
(function ligarRtHcc(){
  try{
    if(typeof sb==='undefined'||!sb||!sb.channel) return;
    const ch=sb.channel('hcc-hinos-rt');
    ch.on('postgres_changes',{event:'*',schema:'public',table:'hcc_hinos'},()=>{
      hccCarrega(true).then(()=>{
        try{
          const el=document.getElementById('hccRes'); if(el) el.innerHTML=hccListaHTML();
          const pg=document.querySelector('.hcc-page[data-n]'); if(pg) hccAbrir(+pg.dataset.n,true);
        }catch(_){}
      });
    });
    ch.subscribe();
  }catch(_){}
})();
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
  abrirModal('<h3>✏️ Editar escala — escolha a semana</h3>'+
    '<div class="eed-topbtns"><button class="mini-btn" onclick="escalaNovaSemana()">➕ Montar a próxima semana</button><button class="mini-btn" onclick="escalaConferirDatas()">📅 Conferir as datas</button></div>'+
    '<p class="eed-dica" style="margin:0 0 10px">Semana padrão: <b>Quarta-feira</b> · <b>EBD</b> (domingo de manhã) · <b>Culto da noite</b> (domingo) — as mesmas datas do SETLIST.</p>'+
    '<div class="eed-sem">'+W.map(w=>{ const [ini,fim]=w.k.split('|'); const sd=ini==='sem'; const atual=!sd&&ini<=hoje&&hoje<=fim;
    const ev=w.idx.map(i=>e(resumoCulto(E.linhas[i],E.colunas||[]))).join('<br>');
    return '<div class="eed-card'+(atual?' atual':'')+'"><div><b>'+(sd?'Sem data':'Quarta '+fmtD(isoD(diaMais(isoParaData(ini),2)))+' · Domingo '+fmtD(fim))+(atual?' <span>esta semana</span>':'')+'</b><small>'+ev+'</small></div><button class="mini-btn" onclick="escalaEditarSemana(\''+w.k+'\')">✏️ Editar</button></div>'; }).join('')+'</div>'+
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
  const _qua=isoD(diaMais(segDe(isoParaData(ini)),2)), _dom=isoD(diaMais(segDe(isoParaData(ini)),6));
  abrirModal('<div class="eed-topo"><h3>✏️ Escala da semana</h3><div class="eed-per"><label><span>📅 Quarta-feira</span><input type="date" class="eed-in" id="escQua" value="'+_qua+'" onchange="escalaMudaQuarta()"></label><label><span>📅 Domingo (EBD e noite)</span><input type="date" class="eed-in" id="escDom" value="'+_dom+'" disabled></label></div>'+
    '<button class="eed-acertar" onclick="escalaAcertarDatas()">📅 Acertar as datas desta semana (quarta · EBD · culto da noite)</button>'+
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
function semanaDoForm(){ const q=(document.getElementById('escQua')||{}).value; return __semanaIBNM(isoParaData(q)||new Date()); }
window.escalaMudaQuarta=function(){ lerFormEscala(); const W=semanaDoForm(); _ESC.chave=W.seg+'|'+W.dom; const d=document.getElementById('escDom'); if(d) d.value=W.dom; };
window.escalaAcertarDatas=function(){ lerFormEscala(); const W=semanaDoForm(); const cols=DB.escala.colunas||[];
  _ESC.chave=W.seg+'|'+W.dom; _ESC.linhas=acertaSemana(_ESC.linhas,cols,W); desenhaEdEscala(); toast('📅 Datas acertadas — confira e toque em Salvar.'); };
function lerFormEscala(){ document.querySelectorAll('#escForm .eed-in').forEach(inp=>{ const l=_ESC.linhas[+inp.dataset.j]; if(!l) return; l.celulas=l.celulas||{}; l.celulas[inp.dataset.c]=inp.value.trim(); }); }
window.escalaNovoCulto=function(){ lerFormEscala(); const W=semanaDoForm(); const cols=DB.escala.colunas||[]; const cel={}; cols.forEach(c=>cel[c]='');
  const tem=new Set(_ESC.linhas.map(l=>tipoLinha(l,cols)).filter(Boolean)); const p=EV_PADRAO.find(x=>!tem.has(x.k));
  if(p) preencheLinha(cel,cols,p,W);
  _ESC.linhas.push({periodoInicio:W.seg+'T00:01:00',periodoFim:W.dom+'T23:59:00',celulas:cel}); desenhaEdEscala(); };
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
  const _q=(document.getElementById('escQua')||{}).value; if(!_q){ const x=document.getElementById('escQua'); if(x) x.style.borderColor='#c0392b'; return toast('Escolha a data da quarta-feira da semana.'); }
  const _W=__semanaIBNM(isoParaData(_q)); const ini=_W.seg, fim=_W.dom;
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

/* ======================= 37) 📅 SEMANA PADRÃO: QUARTA-FEIRA · EBD · CULTO DA NOITE ======================= */
/* O SETLIST e a Escala usam as MESMAS datas: começa na quarta; EBD e culto da noite no domingo. */
const EV_PADRAO=[{k:'qua',nome:'QUARTA-FEIRA',dia:'QUARTA',off:2},{k:'ebd',nome:'EBD',dia:'DOMINGO',off:6},{k:'noite',nome:'CULTO DA NOITE',dia:'DOMINGO',off:6}];
const MAIUS=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase();
function tipoEvento(nome){ const n=MAIUS(nome);
  if(/QUARTA/.test(n)) return 'qua';
  if(/\bEBD\b|ESCOLA BIBLICA|MANHA/.test(n)) return 'ebd';
  if(/NOITE/.test(n)) return 'noite';
  return ''; }
function segDe(dt){ const x=new Date(dt.getFullYear(),dt.getMonth(),dt.getDate()); x.setDate(x.getDate()-((x.getDay()+6)%7)); return x; }
function diaMais(dt,n){ const x=new Date(dt); x.setDate(x.getDate()+n); return x; }
function isoParaData(iso){ const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/); return m? new Date(+m[1],+m[2]-1,+m[3]) : null; }
window.__semanaIBNM=function(ref){ const s=segDe(ref||new Date()); return {seg:isoD(s), qua:isoD(diaMais(s,2)), dom:isoD(diaMais(s,6))}; };
/* SETLIST (esta semana / próxima): sempre QUARTA-FEIRA, EBD e CULTO DA NOITE com as datas certas.
   As músicas de cada evento continuam; outros eventos (ANIVERSÁRIO…) ficam depois. */
window.__slSemanaPadrao=function(evs,prox,sl){
  evs=Array.isArray(evs)? evs : [];
  const ch=String((sl&&sl.chave)||'');
  let ref=new Date(); if(ch.indexOf('slq_')===0 && isoParaData(sl.inicio)) ref=isoParaData(sl.inicio); else if(prox) ref=diaMais(ref,7);
  const W=__semanaIBNM(ref);
  const uid=()=>'e'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const usados=new Set(), slot={};
  evs.forEach((ev,i)=>{ const t=tipoEvento(ev&&ev.nome); if(t&&!slot[t]){ slot[t]=ev; usados.add(i); } });
  evs.forEach((ev,i)=>{ if(usados.has(i)||!ev) return; const d=isoParaData(ev.data); const n=MAIUS(ev.nome).trim();
    if(!slot.qua && d && d.getDay()===3){ slot.qua=ev; usados.add(i); return; }
    if(!slot.noite && (/^CULTO\b/.test(n)||!n)){ slot.noite=ev; usados.add(i); } });
  const out=EV_PADRAO.map(p=>{ const ev=slot[p.k]||{id:uid(),itens:[],concluido:false,concluido_em:null};
    ev.nome=p.nome; ev.data=p.off===2? W.qua : W.dom; ev.itens=Array.isArray(ev.itens)? ev.itens : []; return ev; });
  evs.forEach((ev,i)=>{ if(usados.has(i)||!ev) return; if(ev.data && (ev.data<W.seg||ev.data>W.dom)) ev.data=''; out.push(ev); });
  return out;
};
/* aviso dentro do SETLIST com as datas da semana */
aoMudar(function(){
  const box=document.getElementById('plEvts'); if(!box||document.getElementById('plSemDica')) return;
  const h=document.querySelector('#modalBox h3'); if(!h||!/desta semana|próxima semana/i.test(h.textContent)) return;
  const ds=[...box.querySelectorAll('.pl-ev-data')].map(x=>x.value).filter(Boolean); if(!ds.length) return;
  const W=__semanaIBNM(isoParaData(ds[0]));
  box.insertAdjacentHTML('beforebegin','<div id="plSemDica" class="pl-dica" style="background:#eef7f2;border-left:4px solid var(--verde-med)">📅 <b>Semana do SETLIST:</b> Quarta-feira '+fmtD(W.qua)+' · EBD (domingo de manhã) '+fmtD(W.dom)+' · Culto da noite '+fmtD(W.dom)+'. A escala usa estas mesmas datas.</div>');
});
/* ----- escala: tipo de cada culto (pela coluna Evento, depois pelo Dia) ----- */
function tipoLinha(l,cols){ const c=l.celulas||{}; const cev=colunaEscala(cols,/evento|culto|programa/i), cdia=colunaEscala(cols,/^dia/i);
  const t=tipoEvento(cev&&c[cev]); if(t) return t;
  const d=MAIUS(cdia&&c[cdia]); if(/QUARTA/.test(d)) return 'qua';
  return ''; }
function formatoData(cols){ const cd=colunaEscala(cols,/data/i); const ls=(DB.escala&&DB.escala.linhas)||[];
  const curto=ls.some(l=>/^\s*\d{1,2}\/\d{1,2}\s*$/.test(String((l.celulas||{})[cd]||''))), longo=ls.some(l=>/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(String((l.celulas||{})[cd]||'')));
  return (curto&&!longo)? 'curto' : 'longo'; }
function escreveData(iso,fmt){ const m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/); return fmt==='curto'? m[3]+'/'+m[2] : m[3]+'/'+m[2]+'/'+m[1]; }
function preencheLinha(cel,cols,p,W){ const cd=colunaEscala(cols,/data/i), cdia=colunaEscala(cols,/^dia/i), cev=colunaEscala(cols,/evento|culto|programa/i);
  const iso=p.off===2? W.qua : W.dom;
  if(cd) cel[cd]=escreveData(iso,formatoData(cols));
  if(cdia) cel[cdia]=p.dia;
  if(cev && !String(cel[cev]||'').trim()) cel[cev]=p.nome; }
/* acerta as datas de uma semana: quarta → quarta-feira; EBD e culto da noite → domingo */
function acertaSemana(linhas,cols,W){
  const livres=EV_PADRAO.map(p=>p.k); const tipos=linhas.map(l=>tipoLinha(l,cols));
  tipos.forEach(t=>{ const i=livres.indexOf(t); if(i>=0) livres.splice(i,1); });
  const cd=colunaEscala(cols,/data/i);
  const cdia=colunaEscala(cols,/^dia/i), cev=colunaEscala(cols,/evento|culto|programa/i);
  const DIAS=['DOMINGO','SEGUNDA','TERÇA','QUARTA','QUINTA','SEXTA','SÁBADO'];
  const ord=linhas.map((l,i)=>{ let t=tipos[i]; l.celulas=l.celulas||{};
    l.periodoInicio=W.seg+'T00:01:00'; l.periodoFim=W.dom+'T23:59:00';
    const d=cd? lerDataBR(l.celulas[cd]) : null; const temNome=cev&&String(l.celulas[cev]||'').trim();
    /* evento extra (VIGÍLIA, ANIVERSÁRIO…): fica no mesmo dia da semana em que foi cadastrado */
    if(!t && d && (temNome || d.getDay()!==3 && d.getDay()!==0)){
      const off=(d.getDay()+6)%7; const iso=isoD(diaMais(isoParaData(W.seg),off));
      l.celulas[cd]=escreveData(iso,formatoData(cols)); if(cdia&&String(l.celulas[cdia]||'').trim()) l.celulas[cdia]=DIAS[d.getDay()];
      return {l,o:off*1000+i}; }
    if(!t){ if(d&&d.getDay()===3&&livres.includes('qua')) t='qua'; else if(livres.length) t=livres[0]; else t=(d&&d.getDay()===3)?'qua':'noite';
      const j=livres.indexOf(t); if(j>=0) livres.splice(j,1); }
    const p=EV_PADRAO.find(x=>x.k===t); preencheLinha(l.celulas,cols,p,W);
    return {l,o:p.off*1000+EV_PADRAO.indexOf(p)*100+i}; });
  return ord.sort((a,b)=>a.o-b.o).map(x=>x.l); }
/* nova semana já com QUARTA-FEIRA, EBD e CULTO DA NOITE */
window.escalaNovaSemana=function(){
  const E=DB.escala||{}; const cols=E.colunas||[]; if(!cols.length) return toast('Importe a planilha da escala primeiro.');
  const W0=semanasEscala().map(w=>w.k.split('|')[0]).filter(x=>/^\d{4}/.test(x)).sort();
  const hoje=__semanaIBNM(new Date()).seg; let seg=W0.length? isoD(diaMais(isoParaData(W0[W0.length-1]),7)) : hoje; if(seg<hoje) seg=hoje;
  const W=__semanaIBNM(isoParaData(seg));
  const linhas=EV_PADRAO.map(p=>{ const cel={}; cols.forEach(c=>cel[c]=''); preencheLinha(cel,cols,p,W); return {periodoInicio:W.seg+'T00:01:00',periodoFim:W.dom+'T23:59:00',celulas:cel}; });
  _ESC={chave:W.seg+'|'+W.dom, idx:[], linhas}; desenhaEdEscala();
};
/* confere TODAS as semanas e mostra o que vai mudar antes de salvar */
window.escalaConferirDatas=function(){
  const E=DB.escala||{}; const cols=E.colunas||[]; const cd=colunaEscala(cols,/data/i), cdia=colunaEscala(cols,/^dia/i);
  if(!cd) return toast('A escala não tem a coluna "Data".');
  const fmt=formatoData(cols); const mud=[];
  const novas=(E.linhas||[]).map((l,i)=>{ const d=lerDataBR((l.celulas||{})[cd]); if(!d) return l;
    const t=tipoLinha(l,cols) || (d.getDay()===0? 'noite' : '');
    const W=__semanaIBNM(d); const n=JSON.parse(JSON.stringify(l)); n.periodoInicio=W.seg+'T00:01:00'; n.periodoFim=W.dom+'T23:59:00';
    if(t){ const p=EV_PADRAO.find(x=>x.k===t); const iso=p.off===2? W.qua : W.dom;
      if(isoD(d)!==iso){ n.celulas[cd]=escreveData(iso,fmt); mud.push(resumoCulto(l,cols)+' → <b>'+fmtD(iso)+'</b> ('+(p.off===2?'quarta':'domingo')+')'); }
      if(cdia && MAIUS(n.celulas[cdia])!==p.dia && String(n.celulas[cdia]||'').trim()!==''){ n.celulas[cdia]=p.dia; } }
    return n; });
  window.__escCorrigidas=novas;
  if(!mud.length) return abrirModal('<h3>📅 Datas da escala</h3><p>✅ Todas as datas já estão certas: quarta-feira para o culto de quarta; domingo para a EBD e o culto da noite.</p><div class="modal-acts"><button class="btn btn-dark" onclick="editarEscala()">Voltar</button></div>');
  abrirModal('<h3>📅 Datas para corrigir ('+mud.length+')</h3><p class="eed-dica">Cada culto vai para o dia certo da própria semana (a mesma do SETLIST):</p><div class="eed-mud">'+mud.map(x=>'<div>'+x+'</div>').join('')+'</div>'+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="editarEscala()">Cancelar</button><button class="btn btn-primary" id="btEscCorr" onclick="escalaGravarCorrecao()">✅ Corrigir as datas</button></div>');
};
window.escalaGravarCorrecao=async function(){
  const novas=window.__escCorrigidas; if(!novas) return; const cols=(DB.escala||{}).colunas||[];
  const bt=document.getElementById('btEscCorr'); if(bt){ bt.disabled=true; bt.textContent='Salvando…'; }
  try{ const {error}=await sb.from('escala').update({colunas:cols,linhas:novas,updated_at:new Date().toISOString()}).eq('id',1); if(error) throw error;
    DB.escala={colunas:cols,linhas:novas}; try{ if(typeof saveDB==='function') saveDB(); }catch(_){}
    window.__escCorrigidas=null; fecharModal(); toast('✅ Datas da escala corrigidas.'); go('escala');
  }catch(err){ if(bt){ bt.disabled=false; bt.textContent='✅ Corrigir as datas'; } toast('❌ Não salvou: '+(err.message||err)); }
};
{ const st37=document.createElement('style'); st37.textContent=`
.eed-topbtns{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 8px}
.eed-topbtns .mini-btn{flex:1;min-width:150px}
.eed-acertar{display:block;width:100%;margin:8px 0 4px;padding:10px 12px;border-radius:12px;border:1.5px dashed var(--verde-med);background:#eef7f2;color:var(--verde-escuro);font-weight:800;font-size:14px}
.eed-mud{max-height:50vh;overflow:auto;border:1px solid #e3ece7;border-radius:12px;padding:6px 10px;margin:8px 0;font-size:13.5px;line-height:1.5}
.eed-mud div{padding:6px 0;border-bottom:1px solid #eef2ef}
.eed-mud div:last-child{border:0}
`; document.head.appendChild(st37); }

/* ======================= 38) ⏳ CADASTRO COM APROVAÇÃO ======================= */
/* Conta nova só vê os dados do Ministério depois que um ADM aprovar (regra no banco:
   SQL-3-APROVACAO.sql). Enquanto espera, aparece esta tela. Sem o SQL, nada muda. */
const escA=t=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
let _aprovIv=null;
async function aprovChecar(){
  try{
    if(typeof sb==='undefined'||!sb||!sb.auth) return;
    const {data:{session}}=await sb.auth.getSession(); if(!session) return;
    const {data,error}=await sb.from('perfis').select('aprovado,admin,nome').eq('id',session.user.id).maybeSingle();
    if(error||!data) return;                              /* sem a coluna (SQL não rodado): segue normal */
    if(data.aprovado===false && !data.admin) aprovTela(data.nome||'', session.user.email||'');
    else if(document.getElementById('aprovGate')){ document.getElementById('aprovGate').remove(); document.body.classList.remove('aprov-espera'); toast('✅ Cadastro aprovado! Carregando…'); setTimeout(()=>location.reload(),900); }
  }catch(_){}
}
window.aprovChecar=aprovChecar;
function aprovTela(nome,email){
  document.body.classList.add('aprov-espera');
  if(document.getElementById('aprovGate')) return;
  const prim=String(nome).trim().split(' ')[0];
  document.body.insertAdjacentHTML('beforeend','<div id="aprovGate" role="dialog" aria-modal="true" aria-labelledby="apTt"><div class="ap-card">'+
    '<div class="ap-ic">⏳</div><h2 id="apTt">Cadastro enviado'+(prim?', '+escA(prim):'')+'!</h2>'+
    '<p>Para proteger os dados dos membros, um <b>ADM do Ministério</b> precisa aprovar a sua conta. Depois disso você vê a escala, as músicas, o SETLIST e os avisos.</p>'+
    '<p class="ap-mail">Conta: <b>'+escA(email)+'</b></p>'+
    '<p class="ap-dica">Você recebe uma notificação quando for aprovado(a). Pode fechar o app e voltar depois.</p>'+
    '<button class="btn btn-primary" id="apVer">🔄 Já fui aprovado? Verificar</button>'+
    '<button class="btn btn-dark" id="apSair">Sair desta conta</button></div></div>');
  document.getElementById('apVer').onclick=function(){ this.textContent='Verificando…'; aprovChecar().then(()=>{ const b=document.getElementById('apVer'); if(b){ b.textContent='🔄 Já fui aprovado? Verificar'; toast('Ainda aguardando a aprovação do ADM.'); } }); };
  document.getElementById('apSair').onclick=function(){ try{ logout(); }catch(_){ location.reload(); } };
  if(!_aprovIv) _aprovIv=setInterval(()=>{ if(document.getElementById('aprovGate')) aprovChecar(); },60000);
}
/* confere logo que a pessoa entra e sempre que o app volta para a tela */
(function(){ let n=0; const iv=setInterval(()=>{ n++; if((typeof _sessaoId!=='undefined'&&_sessaoId)||n>40){ clearInterval(iv); aprovChecar(); } },700); })();
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible' && (document.getElementById('aprovGate')||Math.random()<.2)) aprovChecar(); });

/* ----- Membros (ADM): lista de quem aguarda aprovação ----- */
aoMudar(function(){
  const pg=document.querySelector('.mb-page'); if(!pg||pg.querySelector('#aprovBox')) return;
  const tt=pg.querySelector('.page-ttl'); if(!tt) return;
  tt.insertAdjacentHTML('afterend','<div id="aprovBox" class="ap-box" hidden></div>');
  aprovListar();
});
async function aprovListar(){
  const box=document.getElementById('aprovBox'); if(!box||typeof sb==='undefined'||!sb) return;
  try{
    const {data,error}=await sb.from('perfis').select('*').eq('aprovado',false);
    if(error||!data||!data.length){ box.hidden=true; box.innerHTML=''; return; }
    window.__aprovPend=data;
    const fun=p=>[].concat(p.vocal||[],p.instr||[]).join(', ');
    box.hidden=false;
    box.innerHTML='<div class="ap-tt">📝 Aguardando aprovação <span>'+data.length+'</span></div>'+
      '<p class="ap-sub">Só aprove quem você conhece. Até lá, a pessoa não vê nenhum dado do Ministério.</p>'+
      data.map(p=>'<div class="ap-it"><div class="ap-dd"><b>'+escA(p.nome||'(sem nome)')+'</b><small>'+escA(p.email||'')+(p.tel?' · '+escA(p.tel):'')+(fun(p)?' · '+escA(fun(p)):'')+'</small></div>'+
        '<div class="ap-bts"><button class="ap-ok" onclick="aprovMembro(\''+escA(p.id)+'\',true)">✅ Aprovar</button><button class="ap-no" onclick="aprovMembro(\''+escA(p.id)+'\',false)">✕ Recusar</button></div></div>').join('');
  }catch(_){ box.hidden=true; }
}
window.aprovMembro=async function(id,ok){
  const p=(window.__aprovPend||[]).find(x=>x.id===id)||{}; const nm=p.nome||p.email||'esta pessoa';
  if(!ok && !confirm('Recusar o cadastro de '+nm+'?\n\nA conta será apagada e a pessoa não terá acesso ao app.')) return;
  const {error}=await sb.rpc('aprovar_membro',{p_id:id,p_aprovar:!!ok});
  if(error) return toast('❌ '+(error.message||error));
  toast(ok? '✅ '+nm+' aprovado(a). A pessoa recebeu um aviso.' : 'Cadastro de '+nm+' recusado e apagado.');
  aprovListar(); try{ if(typeof cloudPerfis==='function'){ await cloudPerfis(); if(typeof _viewAtual==='function'&&!document.querySelector('.modal-bg.show')) _viewAtual(); } }catch(_){}
};
{ const st38=document.createElement('style'); st38.textContent=`
#aprovGate{position:fixed;inset:0;z-index:13000;background:linear-gradient(160deg,#0f3d2e,#1b6b4f);display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto}
#aprovGate .ap-card{background:#fff;border-radius:22px;max-width:420px;width:100%;padding:26px 22px;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.3)}
#aprovGate .ap-ic{font-size:54px;line-height:1;margin-bottom:8px}
#aprovGate h2{margin:0 0 10px;color:#0f3d2e;font-size:22px}
#aprovGate p{color:#3a4a44;font-size:15px;line-height:1.5;margin:0 0 10px}
#aprovGate .ap-mail{background:#f1f6f3;border-radius:10px;padding:8px;font-size:14px;word-break:break-all}
#aprovGate .ap-dica{font-size:13.5px;color:#5c6b65}
#aprovGate .btn{display:block;width:100%;margin-top:10px}
body.aprov-espera .av-bg,body.aprov-espera #bvScreen,body.aprov-espera #cadGate,body.aprov-espera #tourBox{display:none!important}
body.aprov-espera .toast{z-index:13050!important}
.ap-box{background:#fff8e6;border:1.5px solid #f0c24b;border-radius:16px;padding:12px 14px;margin:0 0 14px}
.ap-tt{font-weight:800;color:#7a5200;font-size:16px;display:flex;align-items:center;gap:8px}
.ap-tt span{background:#e0a400;color:#fff;border-radius:20px;padding:1px 9px;font-size:13px}
.ap-sub{margin:4px 0 8px;font-size:13px;color:#7a6a40}
.ap-it{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:space-between;background:#fff;border-radius:12px;padding:10px 12px;margin-top:8px;border:1px solid #f3e2b0}
.ap-dd{min-width:0;flex:1 1 200px}
.ap-dd b{display:block;color:#1d2b26}
.ap-dd small{color:#5c6b65;word-break:break-word}
.ap-bts{display:flex;gap:8px}
.ap-bts button{border:0;border-radius:10px;padding:9px 12px;font-weight:800;font-size:14px;cursor:pointer}
.ap-ok{background:#1b6b4f;color:#fff}
.ap-no{background:#fdecea;color:#b3261e}
`; document.head.appendChild(st38); }

/* ======================= 39) 💾 SALVAR CONFIG MOSTRA O ERRO DO BANCO ======================= */
/* Antes, se o banco recusasse (sem permissão), o app dizia que salvou e o SETLIST sumia depois. */
document.addEventListener('click',ev=>{ const b=ev.target&&ev.target.closest&&ev.target.closest('#modalBox button'); if(b&&!b.disabled) b.dataset.txtOrig=b.textContent; },true);
window.salvarConfig=async function(chave,valor){
  const tinha=Object.prototype.hasOwnProperty.call(APP_CFG,chave), antes=APP_CFG[chave];
  APP_CFG[chave]=valor;
  let error=null;
  try{ const r=await sb.from('config').upsert({chave,valor,updated_at:new Date().toISOString()}); error=r&&r.error; }catch(e){ error=e; }
  if(!error) return true;
  if(tinha) APP_CFG[chave]=antes; else delete APP_CFG[chave];
  document.querySelectorAll('#modalBox button[disabled]').forEach(b=>{ if(b.dataset.txtOrig){ b.disabled=false; b.textContent=b.dataset.txtOrig; } });
  const m=String(error.message||error);
  const msg=/row-level security|permission|42501/i.test(m)? 'o banco não deixou salvar (sem permissão). Saia e entre de novo; se continuar, abra Painel → 🩺 Diagnóstico.' : m;
  toast('❌ Não salvou: '+msg);
  throw new Error(msg);
};

/* ======================= 40) 🎨 BOTÕES ORGANIZADOS POR FUNÇÃO (músicas e hinos) ======================= */
/* Músicas, Cantor Cristão, Harpa e HCC com o mesmo padrão:
   1) CULTO (grade colorida) · 2) FERRAMENTAS da cifra (cartão) · 3) ADM (editar).
   As linhas se completam sozinhas (sem espaço vazio) e nada passa da largura da tela.
   Tudo é idempotente: só mexe no que mudou (não fica redesenhando à toa). */
const mxAdd=(el,...cs)=>{ cs.forEach(c=>{ if(!el.classList.contains(c)) el.classList.add(c); }); };
const mxSet=(el,k,v)=>{ v=String(v); if(el.dataset[k]!==v) el.dataset[k]=v; };
function mxPoe(el,caixa,k,ord,rot){
  if(!el||!caixa) return;
  mxAdd(el,'mx-b','mx-'+k); mxSet(el,'ord',ord);
  if(el.hasAttribute('style') && !/display\s*:\s*none/.test(el.getAttribute('style'))) el.removeAttribute('style');
  if(rot && el.textContent!==rot) el.textContent=rot;
  if(el.parentElement!==caixa) caixa.appendChild(el);
}
function mxOrdena(caixa){ const f=[...caixa.children]; const o=f.slice().sort((a,b)=>(+a.dataset.ord||99)-(+b.dataset.ord||99)); if(o.some((x,i)=>x!==f[i])) o.forEach(x=>caixa.appendChild(x)); }
/* quantas colunas: as linhas sempre se completam (4 → 2+2; 5 → 3+2 esticados) */
function mxCols(caixa){
  const n=[...caixa.children].filter(x=>getComputedStyle(x).display!=='none').length;
  const largo=caixa.clientWidth>=640;
  const c=largo? (n<=6? n : Math.ceil(n/2)) : (n<=3? n : n===4? 2 : 3);
  mxSet(caixa,'cols',Math.max(1,c)); caixa.hidden=!n;
}
function mxCaixa(pai,cls,depois){ let b=pai.querySelector(':scope > .'+cls.split(' ')[0]); if(!b){ b=document.createElement('div'); b.className=cls; depois.after(b); } else if(b.previousElementSibling!==depois) depois.after(b); return b; }
const mxAchar=(raiz,sel,fora)=>[...raiz.querySelectorAll(sel)].find(x=>!x.closest(fora)&&!x.classList.contains('mx-oculto'));

/* ---------- MÚSICAS ---------- */
function arrumaMusica(){
  const pg=document.querySelector('#content > .page'); if(!pg) return;
  const head=pg.querySelector(':scope > .song-head'), tabs=pg.querySelector(':scope > .tabs3');
  if(!head||!tabs) return;
  /* "← Voltar" repetido (já tem a seta ‹ no topo) */
  const vt=pg.querySelector(':scope > button.mini-btn.sec[onclick^="go("]'); if(vt) mxAdd(vt,'mx-oculto');
  const nav=pg.querySelector(':scope > .sl-nav'); const ref=nav||head;
  if(tabs.previousElementSibling!==ref) ref.after(tabs);
  const ac=mxCaixa(pg,'mx-acoes',tabs);
  /* aba aberta: Cifra, Letra ou Áudio */
  const aba=((tabs.querySelector('button.active')||{}).textContent||'').toLowerCase();
  const ehCifra=/cifra/.test(aba);
  /* Projetar sai de todas as abas */
  pg.querySelectorAll('button[onclick^="projetar("]').forEach(b=>mxAdd(b,'mx-oculto'));
  [['button[onclick^="enviarPraPlaylist"]','sl',1,'➕ SETLIST'],['button[onclick^="fixarTomAtual"]','tc',4,'📌 Tom do culto'],
   ['button[onclick^="abrirFerramentas"]','mt',5,'🎛 Ferramentas'],['button[onclick^="musWhats"]','wa',6,'📱 WhatsApp'],['a.yt-btn','yt',7,'▶ YouTube']]
    .forEach(([sel,k,o,r])=>mxPoe(mxAchar(pg,sel,'.mx-acoes'),ac,k,o,r));
  /* Cifra em PDF: na grade (no lugar do Projetar) só na aba Cifra; some na Letra */
  const pdfM=document.getElementById('btPdfCifra');
  if(pdfM && pg.contains(pdfM)){ if(ehCifra){ if(pdfM.classList.contains('mx-oculto')) pdfM.classList.remove('mx-oculto'); mxPoe(pdfM,ac,'pdf',2,'📄 Cifra em PDF'); } else mxAdd(pdfM,'mx-oculto'); }
  const ptM=document.getElementById('btPartMus'); if(ptM && pg.contains(ptM)) mxPoe(ptM,ac,'pt',8,'📜 Partitura');   /* chega depois (busca na internet): vai pro fim para não empurrar os outros botões */
  pg.querySelectorAll(':scope > button.mini-btn[onclick^="abrirPartitura"]').forEach(b=>mxAdd(b,'mx-oculto'));
  mxOrdena(ac); mxCols(ac);
  const zb=pg.querySelector(':scope > .zoom-bar'); let ult=ac;
  if(zb){ mxAdd(zb,'mx-tools'); if(ac.nextElementSibling!==zb) ac.after(zb); ult=zb;
    const r=zb.querySelector('button.rst[onclick^="zoomView(0)"]'); if(r && r.textContent!=='↺'){ r.textContent='↺'; r.title='Tamanho normal'; } }
  const ADM=[['button[onclick^="editorCifra"]','ed',1,'✏️ Editar cifra'],['button[onclick^="excluirMusicaCifra"]','xc',2,'🗑️ Excluir cifra'],
    ['button[onclick^="editarLetra"]','ed',1,null],['button[onclick^="excluirLetra"]','xc',2,'🗑️ Excluir letra'],['button[onclick^="excluirMusicaInteira"]','xm',3,'🗑️ Excluir música']];
  if(ADM.some(([sel])=>pg.querySelector(sel))){
    const ad=mxCaixa(pg,'mx-adm mm-acoes',ult);
    ADM.forEach(([sel,k,o,r])=>mxPoe(mxAchar(pg,sel,'.mx-adm')||ad.querySelector(sel),ad,k,o,r));
    mxOrdena(ad); mxCols(ad);
  }
  pg.querySelectorAll(':scope > .yt-corner, :scope > div:not([class]):not([id])').forEach(d=>{ if(!d.querySelector('a,button,input,select,img,iframe,audio')) d.remove(); });
  const sa=pg.querySelector(':scope > .sl-acts'); if(sa && ![...sa.children].some(x=>!x.classList.contains('mx-oculto'))) mxAdd(sa,'mx-vazio');
}

/* ---------- HINOS (Cantor Cristão, Harpa, HCC) ---------- */
function arrumaHino(){
  const pg=document.querySelector('#content .cc-page'); const tools=pg&&pg.querySelector('.cc-tools'); if(!tools) return;
  const gv=tools.querySelector('.cc-gv'), gm=tools.querySelector('.cc-gm'), ga=tools.querySelector('.cc-ga'), seg=tools.querySelector('.cc-seg');
  if(!gm||!gv) return;
  mxAdd(gm,'mx-acoes'); mxAdd(gv,'mx-tools-h'); if(ga) mxAdd(ga,'mx-adm');
  /* ordem: Cifra/Letra · CULTO · FERRAMENTAS · ADM */
  if(seg && gm.previousElementSibling!==seg) seg.after(gm);
  if(gv.previousElementSibling!==gm) gm.after(gv);
  if(ga && ga.previousElementSibling!==gv) gv.after(ga);
  /* CULTO */
  mxPoe(mxAchar(tools,'.cc-setlist','.cc-gm'),gm,'sl',1,'➕ SETLIST');
  const sl=gm.querySelector('.cc-setlist'); if(sl){ mxAdd(sl,'mx-b','mx-sl'); mxSet(sl,'ord',1); }
  const bp=[...tools.querySelectorAll('button')].find(b=>/PARTITURA|Subir partitura/i.test(b.textContent));
  if(bp){ mxPoe(bp,gm,/Subir/i.test(bp.textContent)?'up':'pt',2); }
  mxPoe(tools.querySelector('a.cc-yt-chip'),gm,'yt',3);
  mxPoe(tools.querySelector('.cc-live'),gm,'lv',4);
  mxOrdena(gm); mxCols(gm);
  /* FERRAMENTAS */
  const ch=gv.querySelector('.chip'); if(ch) mxAdd(ch,'mx-tom');
  const rol=tools.querySelector('#tsc'); if(rol){ mxAdd(rol,'mx-rol'); if(rol.parentElement!==gv) gv.appendChild(rol); }
  const pdf=tools.querySelector('#btPdfCifra'); if(pdf){ mxAdd(pdf,'mx-pdf'); if(pdf.parentElement!==gv) gv.appendChild(pdf);
    const letra=!!tools.querySelector('.cc-seg-l.on'); if(letra) mxAdd(pdf,'mx-oculto'); else if(pdf.classList.contains('mx-oculto')) pdf.classList.remove('mx-oculto'); }
  /* ADM */
  if(ga){
    const lbl=ga.querySelector('.cc-gl'); if(lbl) mxAdd(lbl,'mx-oculto');
    mxPoe(ga.querySelector('.hx-bt'),ga,'ed',1);
    const lk=[...tools.querySelectorAll('button')].find(b=>/Link do YouTube/i.test(b.textContent)); if(lk) mxPoe(lk,ga,'lk',2);
    mxOrdena(ga); if(getComputedStyle(ga).display!=='none') mxCols(ga);
  }
}
aoMudar(arrumaMusica); aoMudar(arrumaHino);
addEventListener('resize',()=>{ document.querySelectorAll('#content .mx-acoes,#content .mx-adm').forEach(mxCols); });

{ const st40=document.createElement('style'); st40.textContent=`
#content .page > .song-head{margin-bottom:10px}
#content .page > .sl-nav{margin:0 0 10px}
#content .page > .tabs3{margin:0 0 10px}
.sl-acts.mx-vazio,.mx-oculto{display:none!important}
/* grades: as linhas se completam */
#content .mx-acoes,#content .mx-adm{display:flex!important;flex-wrap:wrap;gap:8px;margin:0 0 10px;width:100%;box-sizing:border-box;padding:0;border:0;background:none}
#content .mx-acoes > *,#content .mx-adm > *{flex:1 1 calc(33.333% - 6px);max-width:100%}
#content [data-cols="1"] > *{flex-basis:100%}
#content [data-cols="2"] > *{flex-basis:calc(50% - 4px)}
#content [data-cols="4"] > *{flex-basis:calc(25% - 6px)}
#content [data-cols="5"] > *{flex-basis:calc(20% - 7px)}
#content [data-cols="6"] > *{flex-basis:calc(16.666% - 7px)}
#content :is(.mx-acoes,.mx-adm) > .mx-b{margin:0!important;min-width:0;min-height:44px;height:auto!important;padding:8px 6px!important;border-radius:12px!important;
  font-size:14px!important;font-weight:800!important;line-height:1.2!important;white-space:normal!important;text-align:center;display:flex!important;align-items:center;justify-content:center;gap:4px;
  background:var(--bt-bg)!important;color:var(--bt-tx)!important;border:1.5px solid var(--bt-bd)!important;text-decoration:none!important;box-shadow:0 1px 3px rgba(0,0,0,.06);box-sizing:border-box;cursor:pointer;word-break:break-word;opacity:1!important;overflow:visible!important}
/* paleta suave (fundo claro + texto/ícone na cor do mesmo tom; contraste conferido ≥ 5:1) */
#content .mx-b.mx-sl{--bt-bg:#e1f1e9;--bt-tx:#1d5c45;--bt-bd:#bcdccc}
#content .mx-b.mx-pdf{--bt-bg:#fbe8df;--bt-tx:#953b1f;--bt-bd:#f0c8b8}
#content .mx-b.mx-pt{--bt-bg:#f2eae5;--bt-tx:#6b4636;--bt-bd:#dccbc0}
#content .mx-b.mx-up{--bt-bg:#f5efeb;--bt-tx:#6b4636;--bt-bd:#e2d5cc}
#content .mx-b.mx-tc{--bt-bg:#fdf2cf;--bt-tx:#6f5100;--bt-bd:#efd88d}
#content .mx-b.mx-mt{--bt-bg:#ece7f6;--bt-tx:#54408a;--bt-bd:#d3c8ea}
#content .mx-b.mx-wa{--bt-bg:#e0f3e7;--bt-tx:#1b6e3f;--bt-bd:#b7dfc6}
#content .mx-b.mx-yt{--bt-bg:#fde6e5;--bt-tx:#a8302c;--bt-bd:#f3c0bd}
#content .mx-b.mx-lv{--bt-bg:#fbe5ee;--bt-tx:#9a2e58;--bt-bd:#efc0d3}
#content .mx-b.mx-pj{--bt-bg:#e6eaf7;--bt-tx:#2f3f86;--bt-bd:#c9d1ee}
#content .mx-adm > .mx-b{min-height:40px;font-size:13px!important;box-shadow:none}
#content .mx-b.mx-ed{--bt-bg:#fdeada;--bt-tx:#8e4a10;--bt-bd:#f1cba4}
#content .mx-b.mx-lk{--bt-bg:#e6edf1;--bt-tx:#36505e;--bt-bd:#c8d6de}
#content .mx-b.mx-xc{--bt-bg:#fff3f2;--bt-tx:#a52019;--bt-bd:#f3c2be}
#content .mx-b.mx-xm{--bt-bg:#fbdedb;--bt-tx:#9a1d16;--bt-bd:#eeaaa5}
/* ferramentas da cifra (música e hino) */
#content .zoom-bar.mx-tools,#content .cc-gv.mx-tools-h{display:flex!important;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 10px;padding:8px;border-radius:14px;background:#fff;border:1px solid #e1ebe6;box-shadow:0 1px 3px rgba(0,0,0,.04);width:100%;box-sizing:border-box;max-width:100%}
#content .zoom-bar.mx-tools .zh{display:none}
#content .zoom-bar.mx-tools > button{margin:0!important;min-width:40px;height:38px;padding:0 10px;border-radius:10px;font-weight:800;font-size:14px;border:1.5px solid #cfdcec;background:#e6eef8;color:#2a4769;flex:0 0 auto}
#content .zoom-bar.mx-tools > button.rst{background:#eef0f3;color:#46505b;border-color:#dde1e6}
#content .zoom-bar.mx-tools .mm-tom,#content .cc-gv .chip.mx-tom{margin:0;height:38px;background:#fdf2cf!important;border:1.5px solid #efd88d!important;border-radius:10px;display:inline-flex;align-items:center;justify-content:space-between;flex:1 1 150px;min-width:0;color:#6f5100}
#content .zoom-bar.mx-tools .mm-tom > button,#content .cc-gv .chip.mx-tom > button{height:34px;min-width:34px;border:0;background:transparent;font-size:18px;font-weight:800;color:#6f5100}
#content .zoom-bar.mx-tools > #musRolBtn,#content .cc-gv > .mx-rol{flex:1 1 auto;height:38px;margin:0!important;border-radius:10px!important;background:#dcefec!important;color:#1a625a!important;border:1.5px solid #b5dbd5!important;font-weight:800}
#content .zoom-bar.mx-tools > #btPdfCifra,#content .cc-gv > .mx-pdf{flex:1 1 auto;height:38px;margin:0!important;border-radius:10px!important;background:#fbe8df!important;color:#953b1f!important;border:1.5px solid #f0c8b8!important;font-weight:800}
/* abas Cifra/Letra/Áudio: a ativa em tom suave, ícone sempre visível */
#content .tabs3 button{color:#1d5c45}
#content .tabs3 button .ic{opacity:1!important;filter:none!important}
#content .tabs3 button.active{background:#d8ece2!important;color:#14513d!important;box-shadow:inset 0 0 0 2px #2f7d62,0 2px 8px rgba(0,0,0,.06)!important}
#content .cc-seg button.on{background:#d8ece2!important;color:#14513d!important;box-shadow:inset 0 0 0 2px #2f7d62!important}
/* outros botões vivos do app */
.yt-btn{background:#fde6e5!important;color:#a8302c!important;border:1.5px solid #f3c0bd!important}
.av-wa,.mb-tab a.wa{background:#e0f3e7!important;color:#1b6e3f!important;border:1px solid #b7dfc6}
[data-theme=dark] #content .zoom-bar.mx-tools,[data-theme=dark] #content .cc-gv.mx-tools-h{background:#1f2a26;border-color:#2e3d37}
[data-theme=dark] #content .zoom-bar.mx-tools > button{background:#2c3b52;color:#e3ecf7}
[data-theme=dark] #content .zoom-bar.mx-tools .mm-tom,[data-theme=dark] #content .cc-gv .chip.mx-tom{background:#3a3214!important}
[data-theme=dark] #content .zoom-bar.mx-tools .mm-tom > button,[data-theme=dark] #content .cc-gv .chip.mx-tom > button{color:#ffd76a}
`; document.head.appendChild(st40); }

/* ======================= 41) 🔍 BUSCA GERAL (músicas + Cantor + Harpa + HCC) ======================= */
/* Lupa no topo (todas as telas) e no menu. Digite título, número ou um TRECHO da letra:
   aparece na hora em qual seção está, com o trecho encontrado em destaque. */
const BG_SEC={mus:{nm:'Músicas',ic:'🎵',cor:'#1b6b4f'},cc:{nm:'Cantor Cristão',ic:'📖',cor:'#3949ab'},hr:{nm:'Harpa Cristã',ic:'🎼',cor:'#7b1fa2'},hcc:{nm:'Hinário HCC',ic:'📕',cor:'#c62828'}};
const bgNorm=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const BG_ACORDE=/^(?:\s*(?:[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add|M|º|°|\+)?\d*(?:\([^)]*\))?(?:\/[A-G](?:#|b)?)?|\||-|x\d+|\(|\)|%)\s*)+$/;
function bgLetra(txt){ /* tira acordes ([G] e linhas só de acordes) e marcações */
  return String(txt||'').replace(/\[[^\]]*\]/g,'').split(/\r?\n/).filter(l=>{ const t=l.trim(); return t && !BG_ACORDE.test(t) && !/^(intro|tom|ritmo|solo|final|ponte)\b\s*:/i.test(t) && !/^\[?\d+\]?$/.test(t); })
    .map(l=>l.replace(/(\S)\s*-\s+(?=\S)/g,'$1').replace(/\s+/g,' ').trim()).join('\n'); }
let _bgIdx=null, _bgQ='', _bgFiltro='tudo', _bgT=null;
function bgEd(livro,n){ try{ return (JSON.parse(localStorage.getItem(livro==='hr'?'ibnm_hr_ed':'ibnm_cc_ed')||'{}')||{})[n]||null; }catch(_){ return null; } }
function bgMonta(){
  const docs=[];
  /* sílabas separadas ("ale-gre") viram palavra inteira; e também guarda a versão com espaço ("enche nos") */
  const push=(sec,id,n,titulo,sub,texto)=>{ const letra=bgLetra(texto); docs.push({sec,id,n,titulo,sub,letra,nt:bgNorm(titulo),nl:bgNorm(letra.replace(/-/g,''))+' | '+bgNorm(letra),ns:bgNorm(sub)}); };
  try{ (DB.musicas||[]).forEach(m=>{ const tx=[m.letra||'', m.cifra&&m.cifra!==m.letra? m.cifra : ''].join('\n'); push('mus',m.id,null,m.titulo||'(sem título)',m.artista||'',tx); }); }catch(_){}
  try{ (window.HINOS||[]).forEach(h=>{ const e=bgEd('cc',h.n); let tx='';
      if(e&&e.__texto) tx=e.__texto; else tx=(h.partes||[]).map((pt,pi)=>(pt.linhas||[]).map((l,li)=>{ const k=pi+'-'+li; return e&&k in e? e[k] : l; }).join('\n')).join('\n');
      push('cc','cc'+h.n,h.n,h.titulo,'',tx); }); }catch(_){}
  try{ (window.HARPA||[]).forEach(h=>{ const e=bgEd('hr',h.n); push('hr','hr'+h.n,h.n,h.titulo,'',(e&&e.__texto)||h.letra||((h.partes||[]).map(pt=>(pt.linhas||[]).join('\n')).join('\n'))); }); }catch(_){}
  try{ const vistos=new Set(); const db=(typeof HCC_DB!=='undefined'&&HCC_DB)||{};
    Object.keys(db).forEach(k=>{ const r=db[k]; const n=+k; vistos.add(n); push('hcc','hcc'+n,n,r.titulo||((HCC_SITE[n]||[{}])[0].t)||('Hino '+n),'',r.texto||''); });
    if(typeof HCC_SITE!=='undefined') Object.keys(HCC_SITE).forEach(k=>{ const n=+k; if(!vistos.has(n)) push('hcc','hcc'+n,n,(HCC_SITE[n][0]||{}).t||('Hino '+n),'',''); }); }catch(_){}
  _bgIdx=docs;
}
function bgTrecho(doc,palavras){ /* linha da letra onde o trecho aparece */
  const ls=doc.letra.split('\n'); let melhor=-1, pts=0;
  ls.forEach((l,i)=>{ const nl=bgNorm(l); const c=palavras.filter(w=>nl.includes(w)).length; if(c>pts){ pts=c; melhor=i; } });
  if(melhor<0) return '';
  let t=ls[melhor]; if(ls[melhor+1] && t.length<40) t+=' / '+ls[melhor+1];
  return t;
}
function bgMarca(txt,palavras){
  let h=escA(txt); const base=bgNorm(txt);
  /* marca cada palavra procurada (ignora acentos) mapeando posições do texto sem acento */
  const mapa=[]; let simp=''; for(let i=0;i<txt.length;i++){ const c=txt[i].normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); for(const ch of c){ simp+=ch; mapa.push(i); } }
  const marcas=[]; palavras.forEach(w=>{ if(w.length<2) return; let p=simp.indexOf(w); while(p>=0){ marcas.push([mapa[p],mapa[p+w.length-1]+1]); p=simp.indexOf(w,p+w.length); } });
  if(!marcas.length) return h; marcas.sort((a,b)=>a[0]-b[0]); const jun=[]; marcas.forEach(m=>{ const u=jun[jun.length-1]; if(u&&m[0]<=u[1]) u[1]=Math.max(u[1],m[1]); else jun.push(m.slice()); });
  let out='', pos=0; jun.forEach(([a,b])=>{ out+=escA(txt.slice(pos,a))+'<mark>'+escA(txt.slice(a,b))+'</mark>'; pos=b; }); return out+escA(txt.slice(pos));
}
function bgBusca(q){
  const nq=bgNorm(String(q).replace(/(\w)-(\w)/g,'$1$2')); if(!nq) return [];
  const pal=nq.split(' ').filter(Boolean); const num=/^\d+$/.test(nq)? +nq : null;
  const res=[];
  _bgIdx.forEach(d=>{
    let sc=0, onde='';
    if(num!==null && d.n===num){ sc=1000; onde='num'; }
    else if(d.nt===nq){ sc=900; onde='tit'; }
    else if(d.nt.startsWith(nq)){ sc=800; onde='tit'; }
    else if(d.nt.includes(nq)){ sc=700; onde='tit'; }
    else if(pal.every(w=>d.nt.includes(w))){ sc=600; onde='tit'; }
    else if(nq.length>=3 && d.nl.includes(nq)){ sc=500; onde='letra'; }
    else if(pal.length>1 && pal.every(w=>d.nl.includes(w))){ sc=300; onde='letra'; }
    else if(d.ns && d.ns.includes(nq)){ sc=200; onde='art'; }
    if(sc) res.push({d,sc,onde});
  });
  res.sort((a,b)=>b.sc-a.sc || (a.d.n||0)-(b.d.n||0) || a.d.titulo.localeCompare(b.d.titulo));
  return res;
}
function bgDesenha(){
  const box=document.getElementById('bgRes'); if(!box) return;
  const q=_bgQ.trim();
  if(!q){ box.innerHTML='<div class="bg-vazio">Digite o <b>título</b>, o <b>número</b> do hino ou um <b>trecho</b> da letra.<br><small>Procura em Músicas, Cantor Cristão, Harpa e HCC ao mesmo tempo.</small></div>'; bgChips({}); return; }
  const r=bgBusca(q); const pal=bgNorm(q).split(' ').filter(Boolean);
  const cont={tudo:r.length}; r.forEach(x=>cont[x.d.sec]=(cont[x.d.sec]||0)+1); bgChips(cont);
  const vis=r.filter(x=>_bgFiltro==='tudo'||x.d.sec===_bgFiltro);
  if(!vis.length){ box.innerHTML='<div class="bg-vazio">Nada encontrado'+(_bgFiltro!=='tudo'?' em '+BG_SEC[_bgFiltro].nm+' — veja as outras abas':'')+'.<br><small>Tente menos palavras ou outro trecho.</small></div>'; return; }
  const grupos={}; vis.forEach(x=>(grupos[x.d.sec]=grupos[x.d.sec]||[]).push(x));
  box.innerHTML=Object.keys(BG_SEC).filter(k=>grupos[k]).sort((a,b)=>grupos[b][0].sc-grupos[a][0].sc).map(k=>{ const S=BG_SEC[k], L=grupos[k];
    const lim=_bgFiltro==='tudo'? 6 : 60;
    return '<div class="bg-gr"><div class="bg-gt" style="color:'+S.cor+'">'+S.ic+' '+S.nm+' <span>'+L.length+'</span></div>'+
      L.slice(0,lim).map(x=>{ const d=x.d; const tr=x.onde==='letra'? bgTrecho(d,pal) : '';
        return '<button class="bg-it" onclick="bgAbrir(\''+d.sec+'\',\''+escA(String(d.id))+'\')"><span class="bg-n" style="background:'+S.cor+'">'+(d.n!=null?d.n:'♪')+'</span>'+
          '<span class="bg-tx"><b>'+bgMarca(d.titulo,x.onde==='tit'||x.onde==='num'?pal:[])+'</b>'+(d.sub?'<small>'+bgMarca(d.sub,x.onde==='art'?pal:[])+'</small>':'')+
          (tr?'<em>“'+bgMarca(tr,pal)+'”</em>':'')+'</span></button>'; }).join('')+
      (L.length>lim?'<button class="bg-mais" onclick="bgFiltra(\''+k+'\')">Ver todos os '+L.length+' em '+S.nm+' ›</button>':'')+'</div>'; }).join('');
}
function bgChips(cont){ const c=document.getElementById('bgChips'); if(!c) return;
  c.innerHTML=[['tudo','Tudo']].concat(Object.keys(BG_SEC).map(k=>[k,BG_SEC[k].ic+' '+BG_SEC[k].nm.split(' ')[0]])).map(([k,nm])=>'<button class="'+(_bgFiltro===k?'on':'')+'" onclick="bgFiltra(\''+k+'\')">'+nm+(cont[k]!=null?' <span>'+cont[k]+'</span>':'')+'</button>').join(''); }
window.bgFiltra=function(k){ _bgFiltro=k; bgDesenha(); const r=document.getElementById('bgRes'); if(r) r.scrollTop=0; };
window.bgAbrir=function(sec,id){
  try{ localStorage.setItem('ibnm_bg_q',_bgQ); }catch(_){}
  fecharModal();
  setTimeout(()=>{ try{
    if(sec==='mus') abrirMusica(id,'cifra');
    else if(sec==='cc') cantorAbrir(+String(id).slice(2));
    else if(sec==='hr') harpaAbrir(+String(id).slice(2));
    else if(sec==='hcc') hccAbrir(+String(id).slice(3));
  }catch(e){ toast('Não consegui abrir: '+(e.message||e)); } },60);
};
window.buscaGeral=async function(){
  try{ toggleMenu(false); }catch(_){}
  try{ _bgQ=localStorage.getItem('ibnm_bg_q')||''; }catch(_){ _bgQ=''; }
  _bgFiltro='tudo';
  abrirModal('<div class="bg-top"><div class="bg-in"><span>🔍</span><input id="bgQ" type="search" enterkeyhint="search" autocomplete="off" placeholder="Título, número ou trecho da letra" value="'+escA(_bgQ)+'"><button id="bgLimpa" aria-label="Limpar">✕</button></div></div><div class="bg-chips" id="bgChips"></div><div class="bg-res" id="bgRes"></div>');
  const mb=document.getElementById('modalBox'); if(mb) mb.classList.add('bg-modal');
  const inp=document.getElementById('bgQ');
  bgMonta(); bgDesenha();
  inp.addEventListener('input',()=>{ _bgQ=inp.value; clearTimeout(_bgT); _bgT=setTimeout(bgDesenha,120); });
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); const f=document.querySelector('#bgRes .bg-it'); if(f) f.click(); } });
  document.getElementById('bgLimpa').onclick=()=>{ inp.value=''; _bgQ=''; bgDesenha(); inp.focus(); };
  setTimeout(()=>{ inp.focus(); try{ inp.select(); }catch(_){} },80);
  /* HCC vem da nuvem: quando chegar, refaz o índice */
  try{ if(typeof hccCarrega==='function'){ await hccCarrega(); if(document.getElementById('bgRes')){ bgMonta(); bgDesenha(); } } }catch(_){}
};
/* tira a classe do modal quando ele fecha/troca */
aoMudar(function(){ const mb=document.getElementById('modalBox'); if(mb && mb.classList.contains('bg-modal') && !mb.querySelector('#bgQ')) mb.classList.remove('bg-modal'); });
/* lupa no topo e campo no menu */
aoMudar(function(){
  const tb=document.querySelector('#appShell .topbar');
  if(tb && !document.getElementById('btBuscaGeral')){ const sino=tb.querySelector('button.ico-btn[onclick*="notificacoes"]');
    const b=document.createElement('button'); b.id='btBuscaGeral'; b.className='ico-btn bg-lupa'; b.type='button'; b.title='Buscar em todas as músicas e hinos'; b.setAttribute('aria-label','Busca geral'); b.textContent='🔍'; b.onclick=()=>buscaGeral();
    if(sino) sino.before(b); else tb.appendChild(b); }
  const nav=document.querySelector('#sidemenu .sm-nav');
  if(nav && !document.getElementById('smBusca')){ const ref=document.getElementById('smModo');
    const h='<button id="smBusca" type="button" class="sm-busca" onclick="buscaGeral()"><span>🔍</span>Buscar música, hino ou trecho…</button>';
    if(ref) ref.insertAdjacentHTML('afterend',h); else nav.insertAdjacentHTML('afterbegin',h); }
});
{ const st41=document.createElement('style'); st41.textContent=`
#appShell .topbar .bg-lupa{font-size:20px}
@media (max-width:520px){
  #appShell .topbar{gap:5px!important;padding-left:10px!important;padding-right:10px!important}
  #appShell .topbar .ico-btn,#appShell .topbar .hamb,#appShell .topbar #btVoltarTopo{width:36px!important;height:36px!important;min-width:36px!important;flex:0 0 36px!important;margin:0!important}
  #appShell .topbar .ico-btn{font-size:18px}
  #appShell .topbar #topAvatar{width:36px!important;height:36px!important;flex:0 0 36px!important;margin:0!important}
  #appShell .topbar .ttl{min-width:0;flex:1 1 auto}
}
.sm-busca{display:flex;align-items:center;gap:10px;width:calc(100% - 28px);margin:6px 14px 10px;padding:12px 14px;border-radius:14px;border:0;background:#fff;color:#5c6b65;font-size:15.5px;text-align:left;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15)}
.sm-busca span{font-size:18px}
#modalBox.bg-modal{width:min(720px,100%)!important;max-width:100%!important;height:min(92vh,900px);max-height:92vh;display:flex!important;flex-direction:column;padding:12px!important;box-sizing:border-box;overflow:hidden!important}
.bg-top{display:flex;gap:8px;align-items:center;padding-right:44px}
.bg-in{flex:1;display:flex;align-items:center;gap:6px;background:#f1f6f3;border:2px solid #1b6b4f;border-radius:14px;padding:0 6px 0 12px;min-width:0}
.bg-in input{flex:1;min-width:0;border:0;background:transparent;font-size:17px;padding:12px 0;outline:none;color:inherit}
.bg-in input::-webkit-search-cancel-button{display:none}
.bg-in button{border:0;background:#dfe9e4;border-radius:50%;width:30px;height:30px;font-size:14px;cursor:pointer;flex:0 0 auto}
.bg-fe{border:0;background:none;color:#1b6b4f;font-weight:800;font-size:15px;padding:8px 4px;cursor:pointer;flex:0 0 auto}
.bg-chips{display:flex;gap:6px;overflow-x:auto;padding:10px 0 8px;flex:0 0 auto;scrollbar-width:none}
.bg-chips::-webkit-scrollbar{display:none}
.bg-chips button{flex:0 0 auto;border:1.5px solid #cfe0d7;background:#fff;border-radius:20px;padding:6px 12px;font-weight:700;font-size:13.5px;color:#2d3b35;cursor:pointer;white-space:nowrap}
.bg-chips button.on{background:#1b6b4f;border-color:#1b6b4f;color:#fff}
.bg-chips button span{opacity:.75;font-weight:800}
.bg-res{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;min-height:0}
.bg-vazio{text-align:center;color:#5c6b65;padding:30px 10px;line-height:1.5}
.bg-gr{margin:4px 0 12px}
.bg-gt{font-weight:800;font-size:14px;letter-spacing:.3px;text-transform:uppercase;margin:6px 2px 6px;display:flex;align-items:center;gap:6px}
.bg-gt span{background:currentColor;color:#fff;border-radius:10px;padding:0 7px;font-size:12px}
.bg-gt span{color:#fff;filter:none}
.bg-it{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;border:0;background:#fff;border-radius:12px;padding:10px;margin:0 0 6px;box-shadow:0 1px 4px rgba(0,0,0,.08);cursor:pointer;color:inherit;font:inherit}
.bg-n{flex:0 0 auto;min-width:38px;height:30px;border-radius:9px;color:#fff;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;padding:0 6px;box-sizing:border-box}
.bg-tx{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}
.bg-tx b{font-size:15.5px;color:#1d2b26;line-height:1.25}
.bg-tx small{color:#5c6b65;font-size:13px}
.bg-tx em{font-style:normal;color:#3d4c46;font-size:13.5px;line-height:1.35;background:#f6f8f7;border-radius:8px;padding:4px 7px;margin-top:2px;word-break:break-word}
.bg-tx mark{background:#ffe08a;color:inherit;border-radius:3px;padding:0 1px}
.bg-mais{width:100%;border:0;background:#eef4f1;color:#1b6b4f;font-weight:800;border-radius:10px;padding:10px;cursor:pointer}
[data-theme=dark] .bg-in{background:#1f2a26}
[data-theme=dark] .bg-it,[data-theme=dark] .bg-chips button{background:#22302b;color:#e6efe9}
[data-theme=dark] .bg-tx b{color:#f0f5f2}
[data-theme=dark] .bg-tx em{background:#1a2420;color:#cfdcd5}
`; document.head.appendChild(st41); }

/* ======================= 42) 🎧 ÁUDIOS DO GOOGLE DRIVE TOCAM DE VERDADE ======================= */
/* v1.40 — toca NA HORA e só UM áudio por vez.
   • Cada aparelho lembra qual caminho do Google funcionou e começa direto por ele (sem tentar os que falham).
   • Com a 🔑 chave do Google o áudio é tocado em "streaming": começa em menos de 1 segundo.
   • Se um caminho travar (o Google às vezes segura o pedido), em 4 s passa para o próximo, sem esperar o erro.
   • ADM conectado ao Drive sem chave: o áudio baixado fica guardado no aparelho; da 2ª vez toca na hora.
   • Ao dar play em qualquer áudio, o que estava tocando PARA na mesma hora. */
const DRV_ID=u=>{ const m=String(u||'').match(/(?:drive\.google\.com\/(?:uc\?(?:[^#]*?&)?id=|file\/d\/|open\?id=)|drive\.usercontent\.google\.com\/(?:download|uc)\?(?:[^#]*?&)?id=|googleapis\.com\/drive\/v3\/files\/)([-\w]{20,})/); return m? m[1] : ''; };
function drvChaveApi(){ try{ const v=APP_CFG.drive_api_key; return String((v&&v.key)||v||'').trim(); }catch(_){ return ''; } }
const AU_MODO_K='ibnm_au_modo', AU_CACHE='mmibnm-audios', AU_BLOB=new Map();
function auModo(){ try{ return localStorage.getItem(AU_MODO_K)||''; }catch(_){ return ''; } }
function auModoOk(m){ try{ if(m && m!=='blob' && localStorage.getItem(AU_MODO_K)!==m) localStorage.setItem(AU_MODO_K,m); }catch(_){} }
function auTok(){ try{ return drvToken(); }catch(_){ return null; } }
/* caminhos para o arquivo, na ordem certa para ESTE aparelho */
function audioFontes(id){
  const k=drvChaveApi(), l=[], b=AU_BLOB.get(id);
  if(b) l.push({m:'blob',u:b});
  if(k) l.push({m:'key',u:'https://www.googleapis.com/drive/v3/files/'+id+'?alt=media&key='+encodeURIComponent(k)});
  const ext=[{m:'uc2',u:'https://drive.usercontent.google.com/download?id='+id+'&export=download'},{m:'uc',u:'https://drive.google.com/uc?export=download&id='+id}];
  const modo=auModo();
  if(modo==='tok' && auTok()) return l;                       /* aqui só a conexão do Drive funciona: nem tenta os outros */
  if(modo==='uc') ext.reverse();
  const tudo=l.concat(ext), i=tudo.findIndex(f=>f.m===modo);   /* o caminho que já funcionou aqui vem primeiro */
  if(i>0 && tudo[0].m!=='blob') tudo.unshift(tudo.splice(i,1)[0]);
  return tudo;
}
function auAviso(a,html){ let d=a.nextElementSibling; if(!d||!d.classList.contains('au-erro')){ a.insertAdjacentHTML('afterend','<div class="au-erro"></div>'); d=a.nextElementSibling; } if(d.innerHTML!==html) d.innerHTML=html; }
function auLimpaAviso(a){ const d=a.nextElementSibling; if(d&&d.classList.contains('au-erro')&&!/Tocando pela/.test(d.textContent)) d.remove(); }
function auQuer(a){ return a.dataset.quer==='1' || a.autoplay; }
function auPoe(a,f){ a.dataset.fm=f.m; auCors(a,f.m); a.src=f.u; auVigia(a); if(auQuer(a)) a.play().catch(()=>{}); }
/* se o Google segurar o pedido, não fica esperando: passa para o próximo caminho */
function auVigia(a){
  clearTimeout(a._auT); if(!auQuer(a)) return; const s=a.getAttribute('src'), m=a.dataset.fm;
  if(m==='blob' || (m && m===auModo())) return;               /* caminho que já funcionou aqui: não interrompe */
  a._auT=setTimeout(()=>{ if(a.isConnected && a.getAttribute('src')===s && a.readyState===0) auProxima(a); },3000);
}
/* arquivo guardado no aparelho (2ª vez toca na hora) */
async function auDoCache(id){ try{ if(!window.caches) return null; const c=await caches.open(AU_CACHE); const r=await c.match('https://au.ibnm/'+id); if(!r) return null; return URL.createObjectURL(await r.blob()); }catch(_){ return null; } }
async function auGuarda(id,blob){ try{ if(!window.caches) return; const c=await caches.open(AU_CACHE); await c.put('https://au.ibnm/'+id,new Response(blob,{headers:{'Content-Type':blob.type||'audio/mpeg'}}));
  const ks=await c.keys(); for(let i=0;i<ks.length-40;i++) await c.delete(ks[i]); }catch(_){} }
async function auBaixa(a,id){
  if(a.dataset.oauth===id) return false; a.dataset.oauth=id; const tocar=auQuer(a);
  let u=AU_BLOB.get(id)||await auDoCache(id);
  if(!u){ const tok=auTok(); if(!tok) return false;
    try{ const r=await fetch('https://www.googleapis.com/drive/v3/files/'+id+'?alt=media',{headers:{Authorization:'Bearer '+tok}});
      if(!r.ok) return false; const b=await r.blob(); u=URL.createObjectURL(b); auGuarda(id,b);
      fetch('https://www.googleapis.com/drive/v3/files/'+id+'/permissions',{method:'POST',headers:{Authorization:'Bearer '+tok,'Content-Type':'application/json'},body:JSON.stringify({role:'reader',type:'anyone'})}).catch(()=>{});
      if(!drvChaveApi()){ auModoOk('tok'); auAviso(a,'ℹ️ Tocando pela sua conexão do Drive. Para tocar <b>na hora</b> e para os <b>membros</b>, cadastre a <b>🔑 chave do Google</b> em Painel → Conectividade.'); }
    }catch(_){ return false; } }
  AU_BLOB.set(id,u);
  if(a.dataset.drv!==id) return true;   /* trocou de arquivo enquanto baixava */
  clearTimeout(a._auT); a.dataset.fm='blob'; a.src=u; if(tocar) a.play().catch(()=>{}); return true;
}
async function auProxima(a){
  const id=a.dataset.drv; if(!id) return; clearTimeout(a._auT);
  const f=audioFontes(id); const i=(+a.dataset.fi||0)+1;
  if(i<f.length){ a.dataset.fi=String(i); auPoe(a,f[i]); return; }
  if(await auBaixa(a,id)) return;
  if(auModo()==='tok' && !a.dataset.retry){ a.dataset.retry='1'; try{ localStorage.removeItem(AU_MODO_K); }catch(_){}   /* a conexão falhou: volta a tentar os caminhos públicos */
    const g=audioFontes(id); if(g.length){ a.dataset.fi='0'; auPoe(a,g[0]); return; } }
  const adm=(typeof ehAdmin==='function')&&ehAdmin();
  auAviso(a, adm
    ? '⚠️ Este áudio está <b>privado</b> no Google Drive (por isso não abre ou demora).<br><button class="mini-btn" onclick="drvLiberarUm(\''+id+'\',this)">🔧 Liberar para todos</button> <a class="mini-btn" href="https://drive.google.com/file/d/'+id+'/view" target="_blank" rel="noopener">Abrir no Drive ↗</a>'+(drvChaveApi()?'':'<br><small>Cadastre também a <b>🔑 chave do Google</b> em Painel → Conectividade.</small>')
    : '⚠️ Este áudio ainda não foi liberado pelo ADM. <a href="https://drive.google.com/file/d/'+id+'/view" target="_blank" rel="noopener">Ouvir no Google Drive ↗</a>');
}
/* acompanha troca de arquivo no mesmo player (Principal / Back 1 / Back 2) */
function auAjusta(a){
  const src=a.getAttribute('src')||''; if(src.startsWith('blob:')) return;
  const id=DRV_ID(src||a.currentSrc); if(!id) return;
  if(id!==a.dataset.drv){ a.dataset.drv=id; a.dataset.fi='0'; delete a.dataset.oauth; auLimpaAviso(a); }
  const f=audioFontes(id);
  if(!f.length){ if(auQuer(a)||a.preload!=='none') auBaixa(a,id).then(ok=>{ if(!ok) auProxima(a); }); return; }
  const fi=Math.min(+a.dataset.fi||0,f.length-1);
  if(src!==f[fi].u) auPoe(a,f[fi]);   /* sem load(): quem está em preload=none só baixa ao tocar */
}
function auPrepara(a){
  if(a.id==='plAudio' && a.preload!=='auto') a.preload='auto';   /* player principal já vai carregando ao abrir a música */
  if(a.dataset.au==='1'){ auAjusta(a); return; }
  a.dataset.au='1';
  a.addEventListener('play',()=>{ a.dataset.quer='1'; const s=a.getAttribute('src')||''; if(a.readyState<2 && !s.startsWith('blob:')) auVigia(a); });
  a.addEventListener('loadstart',()=>auAjusta(a));
  a.addEventListener('error',()=>{ const s=a.getAttribute('src')||''; if(DRV_ID(s)) auProxima(a); });
  a.addEventListener('playing',()=>{ clearTimeout(a._auT); auModoOk(a.dataset.fm); auLimpaAviso(a); });
  a.addEventListener('canplay',()=>clearTimeout(a._auT));
  auAjusta(a);
}
/* player da aba Áudio: já entra com o endereço que toca */
if(typeof tocar==='function'){ const _tocar=tocar; window.tocar=tocar=function(url,btn,nome){
  const a=document.getElementById('plAudio'), id=DRV_ID(url); if(!a||!id) return _tocar(url,btn,nome);
  a.dataset.quer='1'; a.dataset.drv=id; a.dataset.fi='0'; delete a.dataset.oauth; delete a.dataset.retry; auLimpaAviso(a);
  const f=audioFontes(id);
  if(f.length) auPoe(a,f[0]); else { try{ a.pause(); }catch(_){} auBaixa(a,id).then(ok=>{ if(!ok){ a.dataset.fi='-1'; auProxima(a); } }); }
  const n=document.getElementById('plNome'); if(n) n.textContent=nome;
  document.querySelectorAll('.player-list button').forEach(b=>b.classList.remove('playing')); if(btn) btn.classList.add('playing'); }; }
aoMudar(function(){ document.querySelectorAll('audio[src*="drive.google.com"],audio[src*="drive.usercontent.google.com"],audio[src*="googleapis.com/drive"],audio[data-drv]').forEach(auPrepara); });
/* abre a conexão com o Google antes do toque (economiza o tempo de "aperto de mão") */
['https://www.googleapis.com','https://drive.usercontent.google.com'].forEach(h=>{ if(!document.querySelector('link[rel=preconnect][href="'+h+'"]')){ const l=document.createElement('link'); l.rel='preconnect'; l.href=h; l.crossOrigin='anonymous'; document.head.appendChild(l); const l2=document.createElement('link'); l2.rel='preconnect'; l2.href=h; document.head.appendChild(l2); } });
/* 🔇 UM ÁUDIO POR VEZ: deu play em um, todos os outros param na hora */
if(!window.__auUmPorVez){ window.__auUmPorVez=1;
  document.addEventListener('play',function(e){ const t=e.target; if(!t||!(t instanceof HTMLMediaElement)) return;
    document.querySelectorAll('audio,video').forEach(x=>{ if(x!==t && !x.paused){ try{ x.pause(); }catch(_){} } }); },true);
}

/* Painel → Conectividade: chave do Google para tocar os áudios */
window.drvChaveEditar=function(){
  const k=drvChaveApi();
  abrirModal('<h3>🔑 Chave do Google para tocar os áudios</h3>'+
    '<p style="font-size:14px;line-height:1.5;margin:6px 0 10px">Com ela, os áudios do Drive tocam no app para <b>todos os membros</b>. É gratuita e fica no mesmo projeto do Google Cloud do login do Drive.</p>'+
    '<ol style="font-size:13.5px;line-height:1.55;padding-left:18px;margin:0 0 10px"><li>console.cloud.google.com → seu projeto → <b>APIs e serviços → Credenciais</b></li><li><b>Criar credenciais → Chave de API</b></li><li>Em <b>Restrições</b>: “Sites” → <code>https://adaiascearataiana-gif.github.io/*</code>; e “Restringir chave” → <b>Google Drive API</b></li><li>Copie a chave e cole abaixo</li></ol>'+
    '<div class="field"><label>Chave de API (começa com AIza…)</label><input id="drvKeyIn" value="'+escA(k)+'" placeholder="AIza..." autocomplete="off"></div>'+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Cancelar</button><button class="btn btn-primary" id="drvKeyBt" onclick="drvChaveSalvar()">Salvar</button></div>');
};
window.drvChaveSalvar=async function(){
  const v=((document.getElementById('drvKeyIn')||{}).value||'').trim();
  if(v && !/^AIza[\w-]{30,}$/.test(v)) return toast('Essa chave não parece certa: ela começa com "AIza".');
  const bt=document.getElementById('drvKeyBt'); if(bt){ bt.disabled=true; bt.textContent='Salvando…'; }
  try{ await salvarConfig('drive_api_key',{key:v}); fecharModal(); toast(v?'✅ Chave salva. Os áudios do Drive passam a tocar para todos.':'Chave removida.');
    document.querySelectorAll('audio[data-drv]').forEach(a=>{ const id=a.dataset.drv; if(!id) return; a.dataset.fi='0'; delete a.dataset.oauth; AU_BLOB.delete(id); const f=audioFontes(id); if(f[0]){ a.dataset.fm=f[0].m; a.src=f[0].u; a.load(); } const d=a.nextElementSibling; if(d&&d.classList.contains('au-erro')) d.remove(); });
  }catch(_){ if(bt){ bt.disabled=false; bt.textContent='Salvar'; } }
};
aoMudar(function(){
  const b=document.getElementById('btDrvPainel'); if(!b) return;
  let k=document.getElementById('btDrvChave'); const txt=drvChaveApi()? '🔑 Chave dos áudios ✓' : '🔑 Chave para tocar os áudios';
  if(!k){ b.insertAdjacentHTML('afterend','<button id="btDrvChave" class="mini-btn" style="margin:8px 0 0 8px" onclick="drvChaveEditar()"></button>'); k=document.getElementById('btDrvChave'); }
  if(k.textContent!==txt) k.textContent=txt;
});
{ const st42=document.createElement('style'); st42.textContent=`
.au-erro{margin:6px 0 4px;padding:8px 10px;border-radius:10px;background:#fff6e6;border:1px solid #f1d7a8;color:#6b4d0d;font-size:13.5px;line-height:1.45}
.au-erro a{color:#1d5c45;font-weight:800}
.vz-card .au-erro,.au-erro{word-break:break-word}
`; document.head.appendChild(st42); }

/* ======================= 43) 📅 SETLIST PELA DATA: ESTA SEMANA · PRÓXIMA SEMANA · e os seguintes ======================= */
/* Quem decide é a DATA (semana de segunda a domingo), não o tipo do SETLIST:
   - o da semana atual é sempre "Esta semana" (é o que aparece na home de todos);
   - o da semana seguinte é sempre "Próxima semana";
   - os outros vêm embaixo, por data, e vão subindo sozinhos a cada segunda-feira. */
const slSeg=iso=>{ const d=isoParaData(iso); return d? isoD(segDe(d)) : ''; };
function slDatas(s){ const d=(s.eventos||[]).map(x=>String(x.data||'').slice(0,10)).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)).sort();
  return d.length? [d[0],d[d.length-1]] : [String(s.inicio||'').slice(0,10), String(s.fim||s.inicio||'').slice(0,10)]; }
const SL_GEN=/^\s*(set\s*list)?\s*(da|desta|de|para)?\s*(a\s+)?(semana|esta semana|pr[oó]xima semana)?\s*$/i;
function slPrio(k,s){ if(k==='setlist') return 0; if(k==='setlist_prox') return 1; if(k.indexOf('slq_')===0) return 2; if(k.indexOf('slx_')===0) return SL_GEN.test(s.nome||'')? 3 : 5; return 9; }
function slTodos(){ const C=(typeof APP_CFG!=='undefined'&&APP_CFG)||{}; const N=window.__normSl; if(typeof N!=='function') return [];
  return Object.keys(C).filter(k=>k==='setlist'||k==='setlist_prox'||k.indexOf('slq_')===0||k.indexOf('slx_')===0).map(k=>{
    let sl=null; try{ sl=N(C[k],k); }catch(_){} if(!sl) return null; const dd=slDatas(sl); if(!/^\d{4}-\d{2}-\d{2}$/.test(dd[0])) return null;
    return {k,s:sl,d0:dd[0],d1:dd[1]||dd[0],sem:slSeg(dd[0]),pr:slPrio(k,sl)}; }).filter(Boolean); }
function slSemanas(){ const W0=__semanaIBNM(new Date()).seg; return {W0, W1:isoD(diaMais(isoParaData(W0),7))}; }
function slDaSemana(sem,todos){ const l=(todos||slTodos()).filter(x=>x.sem===sem).sort((a,b)=>a.pr-b.pr||a.d0.localeCompare(b.d0)); return l[0]||null; }
/* gancho usado pelo culto.js (setlist() / setlist('prox')) */
window.__slSemana=function(qual,base){
  if(qual && qual!=='prox') return base(qual);
  const todos=slTodos(); if(!todos.length) return base(qual);
  const {W0,W1}=slSemanas(); const x=slDaSemana(qual==='prox'? W1 : W0, todos);
  return x? x.s : null;
};
/* publicar "Esta semana"/"Próxima semana" a partir de um SETLIST avulso: não deixa cópia repetida */
if(typeof window.publicarPlaylist==='function'){ const _pub=window.publicarPlaylist;
  window.publicarPlaylist=async function(){
    const ed=(typeof window.__edAtual==='function')? window.__edAtual() : null; const ch=String((ed&&ed.chave)||''), q=String((ed&&ed.qual)||'');
    let r, falhou=null;
    try{ r=await _pub.apply(this,arguments); }catch(e){ falhou=e; }
    const bt=document.getElementById('plPub'), mb=document.getElementById('modalBg');
    if((falhou || (bt && bt.disabled)) && mb && mb.classList.contains('show')){   /* o banco recusou no meio: libera o botão e explica */
      if(bt){ bt.disabled=false; bt.textContent='📢 Publicar'; } await slExplicaErro(falhou); return r; }
    if(falhou) return r;
    try{ if(ch.indexOf('slx_')===0 && (q===''||q==='prox')){ const t=slTodos(); const eu=t.find(x=>x.k===ch);
        if(eu && t.some(x=>x.k!==ch && x.sem===eu.sem && x.pr<3)){ await salvarConfig(ch,{}); try{ go('playlist'); }catch(_){} } } }catch(_){}
    return r; };
}
/* por que o banco não deixou salvar? pergunta ao próprio banco e mostra dentro da janela */
async function slPermissoes(){ const o={}; try{ const a=await sb.rpc('is_principal'); o.principal=a.error? null : !!a.data; }catch(_){ o.principal=null; }
  try{ const b=await sb.rpc('tem_secao',{sec:'playlist'}); o.setlist=b.error? null : !!b.data; }catch(_){ o.setlist=null; } return o; }
window.slPermissoes=slPermissoes;
async function slExplicaErro(e){
  let msg=String((e&&e.message)||e||'o banco recusou');
  const P=await slPermissoes();
  if(P.principal===false && P.setlist===false) msg='o banco NÃO reconhece sua conta como ADM principal (nem com a seção SETLIST). Rode no Supabase o SQL-6-ADM-PRINCIPAL.sql e saia e entre de novo no app.';
  const box=document.getElementById('modalBox'); const acts=box&&box.querySelector('.modal-acts');
  if(acts){ let d=box.querySelector('.sl-err'); if(!d){ acts.insertAdjacentHTML('beforebegin','<div class="err-msg sl-err"></div>'); d=box.querySelector('.sl-err'); } d.textContent='❌ Não publicou: '+msg; d.scrollIntoView({block:'nearest'}); }
  toast('❌ Não publicou: '+msg);
}
const slFmt=(a,b)=>fmtD(a)+(b&&b!==a? ' - '+fmtD(b) : '');
function slRotulo(sem,W0,W1){ return sem===W0? 'Esta semana' : sem===W1? 'Próxima semana' : 'Semana de '+fmtD(sem); }
function slCard(x,titulo,ctx,cls,adm){
  const s=x.s, evs=(s.eventos||[]).length, k=x.k;
  const st= k.indexOf('slq_')===0? '📋 programado' : k.indexOf('slx_')===0? '📌 rascunho' : (s.publicada===false? 'não publicado' : '✓ publicado');
  const nome=String(s.nome||'').trim(); const mostraNome=nome && !SL_GEN.test(nome) && nome.toLowerCase()!==titulo.toLowerCase();
  const tt=(s.tema||s.textoBase)? '<div class="slc-tt">'+(s.tema?'🔥 '+escA(s.tema):'')+(s.tema&&s.textoBase?' · ':'')+(s.textoBase?'📖 '+escA(s.textoBase):'')+'</div>' : '';
  return '<div class="slc '+cls+'" onclick="go(\'playlist\',\''+ctx+'\')"><div class="slc-l"><div class="slc-t">'+escA(titulo)+'</div>'+(mostraNome?'<div class="slc-n">📌 '+escA(nome)+'</div>':'')+
    '<div class="slc-d">'+slFmt(x.d0,x.d1)+'</div><div class="slc-m">'+[st,(s.itens||[]).length+' música(s)',evs?evs+' evento(s)':''].filter(Boolean).join(' · ')+'</div>'+tt+
    (adm?'<button class="mini-btn slc-ed" onclick="event.stopPropagation();modalPlaylist(\''+(ctx==='atual'?'':ctx)+'\')">✏️ Editar</button>':'')+'</div><span class="slc-s">›</span></div>';
}
function slLista(){
  const adm=(typeof ehAdmin==='function')&&ehAdmin(); const {W0,W1}=slSemanas(); const todos=slTodos();
  const sems=[...new Set(todos.map(x=>x.sem))].filter(w=>w>=W0).sort();
  if(sems.indexOf(W0)<0) sems.unshift(W0); if(sems.indexOf(W1)<0) sems.splice(sems.indexOf(W0)+1,0,W1);
  let h='<div class="page"><div class="page-ttl">📅 SETLIST</div><div class="slc-dica">Toque em um SETLIST para ver os eventos.</div>';
  if(adm) h+='<div class="slc-bts"><button class="mini-btn" onclick="modalPlaylist(\'\')">✏️ Montar esta semana</button><button class="mini-btn" onclick="modalPlaylist(\'prox\')">🗓️ Montar próxima semana</button><button class="mini-btn slc-novo" onclick="criarSetlistExtra()">➕ Novo SETLIST</button></div>';
  sems.forEach(sem=>{
    const rot=slRotulo(sem,W0,W1); const l=todos.filter(x=>x.sem===sem).sort((a,b)=>a.pr-b.pr||a.d0.localeCompare(b.d0));
    const cls= sem===W0? 'slc-at' : sem===W1? 'slc-px' : 'slc-fut';
    if(!l.length){
      const fim=isoD(diaMais(isoParaData(sem),6));
      h+='<div class="slc slc-vazio '+cls+'"><div class="slc-l"><div class="slc-t">'+rot+'</div><div class="slc-d">'+slFmt(sem,fim)+'</div><div class="slc-m">ainda não publicado</div>'+
        (adm?'<button class="mini-btn slc-ed" onclick="modalPlaylist(\''+(sem===W0?'':'prox')+'\')">✏️ Montar agora</button>':'')+'</div></div>'; return; }
    l.forEach((x,i)=>{ const ctx= i===0? (sem===W0? 'atual' : sem===W1? 'prox' : (x.k.indexOf('sl')===0&&/^sl[xq]_/.test(x.k)? x.k : 'prox')) : (/^sl[xq]_/.test(x.k)? x.k : (x.k==='setlist'?'atual':'prox'));
      h+=slCard(x, i===0? rot : (String(x.s.nome||'').trim()||'SETLIST')+' · '+rot, ctx, cls+(i?' slc-sub':''), adm); });
  });
  const velhos=todos.filter(x=>x.sem<W0 && /^sl[xq]_/.test(x.k)).sort((a,b)=>b.d0.localeCompare(a.d0));
  if(adm && velhos.length) h+='<details class="slc-ant"><summary>Anteriores ('+velhos.length+')</summary>'+velhos.map(x=>slCard(x,(String(x.s.nome||'').trim()||'SETLIST'),x.k,'slc-old',adm)).join('')+'</details>';
  return h+'</div>';
}
if(typeof ROTAS!=='undefined' && ROTAS.playlist){ const _plR=ROTAS.playlist;
  ROTAS.playlist=function(arg){ if(arg==='prox'||arg==='atual'||/^sl[xq]_/.test(String(arg||''))) return _plR.apply(this,arguments);
    try{ if(!slTodos().length) return _plR.apply(this,arguments); return slLista(); }catch(e){ return _plR.apply(this,arguments); } };
}
/* HOME: o cartão do alto mostra SEMPRE o SETLIST desta semana (antes lia um registro antigo e ficava parado) */
if(typeof ROTAS!=='undefined' && ROTAS.inicio){ const _iniR=ROTAS.inicio;
  ROTAS.inicio=function(){ let h=_iniR.apply(this,arguments);
    try{ const sl=window.setlistDe? setlistDe() : null; if(!slTodos().length) return h;
      const re=/<div class="semana-badge"><div class="lbl">SETLIST DA SEMANA<\/div><div class="dt">[^<]*<\/div>/;
      const vazio=/<div class="card"><div class="empty" style="padding:20px"><div class="big">🎼<\/div>Nenhum SETLIST publicado ainda\.<\/div><\/div>/;
      if(sl){ const dd=slDatas(sl); const cab='<div class="semana-badge"><div class="lbl">SETLIST · ESTA SEMANA</div><div class="dt">'+slFmt(dd[0],dd[1])+'</div>';
        if(re.test(h)){ h=h.replace(re,cab);
          /* o link do YouTube é o DESTA semana (não o de outra) */
          const yre=/<a class="yt-home" href="[^"]*" target="_blank" rel="noopener">▶ Playlist do YouTube<\/a>/;
          h= sl.youtube? h.replace(yre,'<a class="yt-home" href="'+escA(sl.youtube)+'" target="_blank" rel="noopener">▶ Playlist do YouTube</a>') : h.replace(yre,''); }
        else if(vazio.test(h)) h=h.replace(vazio, cab+(sl.youtube?'<a class="yt-home" href="'+escA(sl.youtube)+'" target="_blank" rel="noopener">▶ Playlist do YouTube</a>':'')+
          ((sl.tema||sl.textoBase)?'<div class="sb-tt">'+(sl.tema?'🔥 '+escA(sl.tema):'')+(sl.tema&&sl.textoBase?' · ':'')+(sl.textoBase?'📖 '+escA(sl.textoBase):'')+'</div>':'')+
          '<span class="pl-home-lk" onclick="go(\'playlist\')">Ver SETLIST completo ›</span></div>');
      } else {
        const {W0}=slSemanas(); const msg='<div class="semana-badge"><div class="lbl">SETLIST · ESTA SEMANA</div><div class="dt" style="font-size:20px">'+slFmt(W0,isoD(diaMais(isoParaData(W0),6)))+'</div><div class="sb-tt">Ainda não publicado.</div>';
        if(re.test(h)) h=h.replace(re,msg);
      }
    }catch(_){}
    return h; };
}
{ const st43=document.createElement('style'); st43.textContent=`
.slc-dica{font-size:15px;color:#5b6b64;margin:-2px 0 12px}
.slc-bts{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}
.slc-bts .mini-btn{margin:0;flex:1 1 auto}
.slc-bts .slc-novo{border-style:dashed}
.slc{display:flex;align-items:center;gap:10px;background:#fff;border:2px solid #d8e8e0;border-left:8px solid #0b3d2e;border-radius:16px;padding:14px 16px;margin-bottom:12px;cursor:pointer;box-shadow:0 2px 8px rgba(11,61,46,.08)}
.slc.slc-px{border-left-color:#2f7d62}
.slc.slc-fut{border-left-color:#9fbfb1}
.slc.slc-sub{margin-left:14px;border-left-width:5px}
.slc.slc-vazio{border-style:dashed;cursor:default;background:#f7faf8}
.slc.slc-old{opacity:.8}
.slc-l{flex:1;min-width:0}
.slc-t{font-weight:800;font-size:19px;color:#0b3d2e;line-height:1.2}
.slc-at .slc-t::before{content:'📅 '}
.slc-px .slc-t::before{content:'🗓️ '}
.slc-fut .slc-t::before{content:'📋 '}
.slc-n{font-size:14px;color:#8a6d1a;font-weight:700;margin-top:2px}
.slc-d{font-size:15px;color:#5b6b64;margin-top:2px}
.slc-m{margin-top:6px;font-size:14px;font-weight:700;color:#1f7a5a}
.slc-vazio .slc-m{color:#a05a00}
.slc-tt{margin-top:6px;font-size:14px;color:#8a6d1a}
.slc-ed{margin:10px 0 0!important}
.slc-s{font-size:30px;color:#1f7a5a;font-weight:800}
.slc-ant{margin-top:6px}
.slc-ant summary{cursor:pointer;font-weight:800;color:#5b6b64;padding:8px 2px}
[data-theme=dark] .slc{background:#1f2a26;border-color:#2e3d37}
[data-theme=dark] .slc-t{color:#e6f2ec}
`; document.head.appendChild(st43); }

/* ======================= 44) 🏷️ ETIQUETAS NA LINHA DE BAIXO (cifra · letra · áudio · youtube) ======================= */
/* Antes a etiqueta ficava na mesma linha do cantor/banda e era cortada com "…".
   Agora: 1ª linha título, 2ª cantor/banda, 3ª etiquetas — sempre visíveis, dentro do card. */
{ const st44=document.createElement('style'); st44.textContent=`
.song-row .s-ar .sl-ok{display:block;width:-moz-fit-content;width:fit-content;max-width:100%;margin:4px 0 0!important;white-space:normal;line-height:1.35;padding:2px 8px}
.song-row .s-ar{line-height:1.35}
[data-theme=dark] .song-row .s-ar .sl-ok{background:#1d3b2e;color:#9fe0bd}
`; document.head.appendChild(st44); }

/* ======================= 45) ⚡ ABRE JÁ NO SETLIST ATUAL (sem "piscar" o antigo) ======================= */
/* As configurações (SETLISTs) ficam guardadas no aparelho. Ao abrir, a Início já monta a semana certa
   com o que está guardado e, quando a nuvem responde, só confirma. */
const CFG_CACHE_K='ibnm_cfg_cache';
function cfgGuarda(){ try{ if(APP_CFG && Object.keys(APP_CFG).length) localStorage.setItem(CFG_CACHE_K, JSON.stringify(APP_CFG)); }catch(_){} }
function cfgRestaura(){ try{ if(APP_CFG && Object.keys(APP_CFG).length) return; const c=JSON.parse(localStorage.getItem(CFG_CACHE_K)||'null'); if(c && typeof c==='object') Object.assign(APP_CFG,c); }catch(_){} }
cfgRestaura();
if(typeof cloudConfig==='function'){ const _cc=cloudConfig;
  window.cloudConfig=cloudConfig=async function(){ const r=await _cc.apply(this,arguments); if(APP_CFG && Object.keys(APP_CFG).length){ window.__cfgOk=1; cfgGuarda(); } else cfgRestaura(); return r; }; }
/* 1ª vez (nada guardado ainda): em vez de mostrar o SETLIST antigo, mostra "carregando" até a nuvem responder */
if(typeof ROTAS!=='undefined' && ROTAS.inicio){ const _ini45=ROTAS.inicio;
  ROTAS.inicio=function(){ let h=_ini45.apply(this,arguments);
    try{ if(window.__cfgOk || slTodos().length) return h;
      const T=document.createElement('template'); T.innerHTML=h; const pg=T.content.querySelector('.page')||T.content;
      const {W0}=slSemanas(); const bd=pg.querySelector('.semana-badge');
      if(bd) bd.innerHTML='<div class="lbl">SETLIST · ESTA SEMANA</div><div class="dt">'+slFmt(W0,isoD(diaMais(isoParaData(W0),6)))+'</div><div class="sb-tt">⏳ Atualizando…</div>';
      [...pg.querySelectorAll('.card')].forEach(c=>{ if(/Ordem dos Eventos/i.test(c.textContent)) c.remove(); });
      return T.innerHTML;
    }catch(_){ return h; } };
}

if(typeof salvarConfig==='function'){ const _sc=salvarConfig;
  window.salvarConfig=salvarConfig=async function(){ const r=await _sc.apply(this,arguments); cfgGuarda(); return r; }; }
/* se a Início já está na tela com a semana errada, refaz assim que der */
setTimeout(()=>{ try{ if(document.querySelector('#content .semana-badge') && (window.__navStack? (__navStack().slice(-1)[0]||'inicio') : 'inicio')==='inicio' && slTodos().length){ const lbl=document.querySelector('#content .semana-badge .lbl'); if(lbl && !/ESTA SEMANA/.test(lbl.textContent)) go('inicio'); } }catch(_){} },50);

/* ======================= 46) 🕐 BARRA VERDE: data, hora, tempo e SALDO bem visíveis ======================= */
{ const st46=document.createElement('style'); st46.textContent=`
.topbar .ttl.ola .ola-info{font-size:13.5px!important;font-weight:800!important;color:#fff!important;opacity:1!important;letter-spacing:.2px!important;text-shadow:0 1px 2px rgba(0,0,0,.35)}
.topbar .ttl.ola .ola-info2{display:none!important}
.topbar .ttl.ola .ola-info3{display:flex!important;align-items:center;gap:6px;margin-top:3px;opacity:1!important;font-size:13.5px;font-weight:800;color:#fff;letter-spacing:.1px;white-space:nowrap}
.topbar .ttl.ola .ola-tp{white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,.35)}
.topbar .ttl.ola .ola-sd{white-space:nowrap;background:#ffd60a;color:#2b2100;border-radius:999px;padding:2px 9px 2px 7px;font-weight:900;font-size:13.5px;line-height:1.35;box-shadow:0 1px 4px rgba(0,0,0,.3),inset 0 0 0 1.5px rgba(255,255,255,.55)}
.topbar .ttl.ola .ola-sd.neg{background:#ff5d5d;color:#fff}
.topbar .ttl.ola .ola-sd:empty,.topbar .ttl.ola .ola-tp:empty{display:none}
@media (max-width:350px){.topbar .ttl.ola .ola-info,.topbar .ttl.ola .ola-info3,.topbar .ttl.ola .ola-sd{font-size:12px!important}.topbar .ttl.ola .ola-sd{padding:1px 7px 1px 5px}.topbar .ttl.ola .ola-info3{gap:4px}}
`; document.head.appendChild(st46); }
function barraTopo2(){
  try{ const ttl=document.querySelector('.topbar .ttl.ola'); if(!ttl) return;
    let i3=ttl.querySelector('.ola-info3');
    if(!i3){ ttl.insertAdjacentHTML('beforeend','<small class="ola-info3"><span class="ola-tp"></span><span class="ola-sd"></span></small>'); i3=ttl.querySelector('.ola-info3'); }
    let tp=''; if(_clima){ let [ic]=TEMPO[_clima.c]||['🌡️']; if(!_clima.dia && (_clima.c===0||_clima.c===1)) ic='🌙'; tp=ic+' '+_clima.t+'°'; }
    const sd=_saldo!=null? '💰 '+brl(_saldo) : '';
    const a=i3.querySelector('.ola-tp'), b=i3.querySelector('.ola-sd');
    if(a.textContent!==tp) a.textContent=tp; if(b.textContent!==sd) b.textContent=sd;
    const neg=_saldo!=null&&_saldo<0; if(b.classList.contains('neg')!==neg) b.classList.toggle('neg',neg);
  }catch(_){}
}
setInterval(barraTopo2,1000); setTimeout(barraTopo2,350);

/* ======================= 47) 🎧 ÁUDIO SOB CONTROLE: só toca no PLAY, um por vez, e começa rápido ======================= */
/* • Ao entrar em "Áudios" (ou numa música) nada toca sozinho: só quando você aperta ▶.
   • Trocou de música ou deu play em outro áudio: o anterior PARA na hora (mesmo o que ficou escondido).
   • O player já entra com o endereço que funciona e vai carregando antes do toque, para o play ser imediato.
   • ADM conectado ao Drive sem a chave: os áudios do SETLIST da semana são baixados em segundo plano
     e ficam guardados no aparelho (tocam na hora, até sem internet). */
const AU_TODOS=new Set();
function auReg(a){ if(!a || a._auReg) return; a._auReg=1; AU_TODOS.add(a); a.addEventListener('play',()=>auPararTodos(a)); }
function auPararTodos(menos){
  AU_TODOS.forEach(x=>{ if(x!==menos && !x.paused){ try{ x.pause(); }catch(_){} } });
  document.querySelectorAll('audio,video').forEach(x=>{ if(x!==menos && !x.paused){ try{ x.pause(); }catch(_){} } });
}
document.addEventListener('play',e=>{ const t=e.target; if(!(t instanceof HTMLMediaElement)) return; auReg(t); auPararTodos(t);
  t._auT0=t._auT0||performance.now(); },true);
/* nada de tocar sozinho: tira o "autoplay" assim que o player aparece */
function auSemAutoplay(n){
  const lista = n.matches && n.matches('audio,video') ? [n] : (n.querySelectorAll? n.querySelectorAll('audio,video') : []);
  lista.forEach(a=>{ if(a.autoplay||a.hasAttribute('autoplay')){ a.autoplay=false; a.removeAttribute('autoplay'); if(a.dataset) a.dataset.quer='0'; } auReg(a); });
}
new MutationObserver(ms=>{ for(const m of ms){ m.addedNodes.forEach(n=>{ if(n.nodeType===1) auSemAutoplay(n); });
    m.removedNodes.forEach(n=>{ if(n.nodeType!==1) return; const l=n.matches&&n.matches('audio,video')? [n] : [...(n.querySelectorAll?n.querySelectorAll('audio,video'):[])];
      l.forEach(a=>{ if(a.id==='plAudio' && !a.paused) return; /* o player principal pode seguir tocando enquanto você lê a cifra da MESMA música */ }); }); } })
  .observe(document.documentElement,{childList:true,subtree:true});
/* trocou de música: para o áudio da anterior */
let _auMus=null;
if(typeof window.abrirMusica==='function'){ const _am47=window.abrirMusica;
  window.abrirMusica=function(id){ if(_auMus!==null && String(id)!==String(_auMus)) auPararTodos(null); _auMus=id; return _am47.apply(this,arguments); }; }
/* o player já nasce com o endereço certo, sem "autoplay" e carregando antes do toque */
if(typeof renderPlayer==='function'){ const _rp=renderPlayer;
  window.renderPlayer=renderPlayer=function(m){ let h=_rp.apply(this,arguments);
    try{ const a0=(m&&m.audios&&m.audios[0])||null, id=a0&&DRV_ID(a0.url); h=h.replace(/<audio id="plAudio" controls autoplay/,'<audio id="plAudio" controls preload="auto"');
      if(id){ const f=audioFontes(id); if(f.length) h=h.replace(/(<audio id="plAudio"[^>]*?src=")[^"]*(")/, (_,x,y)=>x+f[0].u.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+y).replace('<audio id="plAudio"','<audio id="plAudio" data-drv="'+id+'" data-fi="0" data-fm="'+f[0].m+'"'); }
    }catch(_){}
    return h; }; }
/* medição: quanto tempo do ▶ até o som (aparece no Painel → Conectividade) */
document.addEventListener('playing',e=>{ const a=e.target; if(!(a instanceof HTMLMediaElement)||!a._auT0) return;
  const ms=Math.round(performance.now()-a._auT0); a._auT0=0;
  const nomes={key:'chave do Google',uc2:'link público (1)',uc:'link público (2)',blob:'guardado no aparelho',tok:'conexão do Drive'};
  try{ localStorage.setItem('ibnm_au_ult',JSON.stringify({ms, via:nomes[a.dataset.fm]||a.dataset.fm||'arquivo', t:Date.now()})); }catch(_){} },true);
document.addEventListener('pause',e=>{ const a=e.target; if(a instanceof HTMLMediaElement) a._auT0=0; },true);
aoMudar(function(){
  const k=document.getElementById('btDrvChave'); if(!k) return;
  let d=document.getElementById('auDiag'); let u=null; try{ u=JSON.parse(localStorage.getItem('ibnm_au_ult')||'null'); }catch(_){}
  const txt=u? '🎧 Último áudio: começou em '+(u.ms/1000).toFixed(1).replace('.',',')+' s · '+u.via : '🎧 Toque um áudio para medir o tempo de início';
  if(!d){ k.insertAdjacentHTML('afterend','<div id="auDiag" style="font-size:12.5px;margin:6px 0 0 8px;opacity:.85"></div>'); d=document.getElementById('auDiag'); }
  if(d.textContent!==txt) d.textContent=txt;
});
/* ADM sem chave, conectado ao Drive: deixa os áudios da semana guardados no aparelho */
function auPreBaixa(){
  try{ if(drvChaveApi() || auModo()!=='tok' || !auTok() || (navigator.connection&&navigator.connection.saveData)) return;
    const ids=new Set(); const {W0,W1}=slSemanas(); [slDaSemana(W0),slDaSemana(W1)].filter(Boolean).forEach(x=>{ const v=x.s||{}; const its=[].concat(v.itens||[], ...((v.eventos||[]).map(e=>e.itens||[])));
      its.forEach(i=>{ const m=(DB.musicas||[]).find(x=>String(x.id)===String(i)); ((m&&m.audios)||[]).slice(0,1).forEach(a=>{ const id=DRV_ID(a.url); if(id) ids.add(id); }); }); });
    const fila=[...ids].filter(id=>!AU_BLOB.has(id)); let i=0;
    const prox=async()=>{ if(i>=fila.length) return; const id=fila[i++];
      try{ let u=await auDoCache(id); if(!u){ const r=await fetch('https://www.googleapis.com/drive/v3/files/'+id+'?alt=media',{headers:{Authorization:'Bearer '+auTok()}}); if(r.ok){ const b=await r.blob(); u=URL.createObjectURL(b); auGuarda(id,b); } }
        if(u) AU_BLOB.set(id,u); }catch(_){}
      setTimeout(prox,400); };
    prox();
  }catch(_){}
}
setTimeout(auPreBaixa,8000);

/* ======================= 48) 🎼 TOM DO ÁUDIO: o app descobre o tom e o ADM escolhe em que tom tocar ======================= */
/* • Ao abrir um áudio sem tom conhecido, o celular do ADM analisa as notas e descobre o tom (ex.: Sol maior).
   • O ADM escolhe "Tocar em: Lá" e TODOS passam a ouvir esse áudio em Lá, na mesma velocidade.
     O arquivo original não muda (dá para voltar ao original a qualquer momento).
   • A mudança de tom é feita no próprio aparelho, enquanto toca. */
const TOM_BEMOL=new Set([5,10,3,8,1]);
const tomMod=n=>((n%12)+12)%12;
function tomNome(pc,modo){ try{ const p=tomMod(pc); return DSP.formatarTom(p, modo||'maior', TOM_BEMOL.has(p)); }catch(_){ return {pt:'?',letra:'?'}; } }
function tomDaCifra(t){ const m=String(t||'').trim().match(/^([A-G])([#b]?)/); if(!m) return null; return tomMod({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0)); }
function tomPodeEditar(){ try{ return !!(window.ehAdmin&&ehAdmin()) && (typeof podeSetor!=='function' || podeSetor('musicas')); }catch(_){ return false; } }
let _tomMus=null; const _tomTentou=new Set(); let _tomDetectando=false;
function tomAtual(){
  const a=document.getElementById('plAudio'), m=_tomMus; if(!a||!m||!Array.isArray(m.audios)||!document.getElementById('tomBar')) return null;
  const id=a.dataset.drv||DRV_ID(a.getAttribute('src')||''); let i=-1;
  if(id) i=m.audios.findIndex(x=>DRV_ID(x.url)===id);
  if(i<0){ const nm=((document.getElementById('plNome')||{}).textContent||'').trim(); i=m.audios.findIndex(x=>String(x.nome||'').trim()===nm); }
  return i>=0? {m,i,au:m.audios[i],el:a} : null;
}
/* endereço que deixa o aparelho "mexer" no som: chave do Google ou arquivo guardado no aparelho */
function auCors(a,m){ if(m==='key'){ if(a.crossOrigin!=='anonymous') a.crossOrigin='anonymous'; } else if(m!=='blob' && a.hasAttribute('crossorigin')) a.removeAttribute('crossorigin'); }
function tomPodeProcessar(a){ const s=a.currentSrc||a.getAttribute('src')||''; return s.startsWith('blob:') || s.startsWith(location.origin) || (a.crossOrigin==='anonymous' && /googleapis\.com\/drive/.test(s)); }

/* processador que muda o tom em tempo real (phase vocoder) */
const TOM_WK="/* Processador de \u00e1udio: muda o tom em tempo real sem mudar a velocidade (phase vocoder, S. M. Bernsee) */\nclass IbnmTom extends AudioWorkletProcessor{\n  constructor(){\n    super(); this.r=1; this.port.onmessage=e=>{ const v=+e.data.ratio; if(v>0) this.r=v; };\n    const N=2048; this.N=N; this.OS=4; this.ST=N/4; this.LAT=N-N/4; this.ch=[];\n    this.win=new Float32Array(N); for(let k=0;k<N;k++) this.win[k]=-.5*Math.cos(2*Math.PI*k/N)+.5;\n    this.rev=new Uint32Array(2*N); for(let i=2;i<2*N-2;i+=2){ let j=0; for(let b=2;b<2*N;b<<=1){ if(i&b) j++; j<<=1; } this.rev[i]=j; }\n  }\n  estado(){ const N=this.N, H=N/2+1; return {inF:new Float32Array(N),outF:new Float32Array(N),w:new Float32Array(2*N),lp:new Float32Array(H),sp:new Float32Array(H),acc:new Float32Array(2*N),am:new Float32Array(N),af:new Float32Array(N),sm:new Float32Array(N),sf:new Float32Array(N),ro:this.LAT}; }\n  fft(b,sign){ const N=this.N, n2=2*N, rv=this.rev;\n    for(let i=2;i<n2-2;i+=2){ const j=rv[i]; if(i<j){ let t=b[i]; b[i]=b[j]; b[j]=t; t=b[i+1]; b[i+1]=b[j+1]; b[j+1]=t; } }\n    for(let le=4; le<=n2; le<<=1){ const le2=le>>1; let ur=1, ui=0; const arg=Math.PI/(le2>>1), wr=Math.cos(arg), wi=sign*Math.sin(arg);\n      for(let j=0;j<le2;j+=2){ for(let i=j;i<n2;i+=le){ const p2=i+le2; const tr=b[p2]*ur-b[p2+1]*ui, ti=b[p2]*ui+b[p2+1]*ur; b[p2]=b[i]-tr; b[p2+1]=b[i+1]-ti; b[i]+=tr; b[i+1]+=ti; }\n        const t=ur*wr-ui*wi; ui=ur*wi+ui*wr; ur=t; } } }\n  quadro(s,p){ const N=this.N, H=N/2, OS=this.OS, ST=this.ST, PI=Math.PI, fpb=sampleRate/N, ex=2*PI*ST/N, w=s.w, win=this.win;\n    for(let k=0;k<N;k++){ w[2*k]=s.inF[k]*win[k]; w[2*k+1]=0; }\n    this.fft(w,-1);\n    for(let k=0;k<=H;k++){ const re=w[2*k], im=w[2*k+1]; const mg=2*Math.sqrt(re*re+im*im), ph=Math.atan2(im,re);\n      let t=ph-s.lp[k]; s.lp[k]=ph; t-=k*ex; let q=(t/PI)|0; if(q>=0) q+=q&1; else q-=q&1; t-=PI*q; t=OS*t/(2*PI); s.am[k]=mg; s.af[k]=k*fpb+t*fpb; }\n    s.sm.fill(0); s.sf.fill(0);\n    for(let k=0;k<=H;k++){ const ix=(k*p)|0; if(ix<=H){ s.sm[ix]+=s.am[k]; s.sf[ix]=s.af[k]*p; } }\n    for(let k=0;k<=H;k++){ let t=s.sf[k]; t-=k*fpb; t/=fpb; t=2*PI*t/OS; t+=k*ex; s.sp[k]+=t; const ph=s.sp[k], mg=s.sm[k]; w[2*k]=mg*Math.cos(ph); w[2*k+1]=mg*Math.sin(ph); }\n    for(let k=N+2;k<2*N;k++) w[k]=0;\n    this.fft(w,1);\n    const g=1.52/(H*OS); for(let k=0;k<N;k++) s.acc[k]+=g*win[k]*w[2*k];\n    for(let k=0;k<ST;k++) s.outF[k]=s.acc[k];\n    s.acc.copyWithin(0,ST,ST+N); s.acc.fill(0,N);\n    s.inF.copyWithin(0,ST,N); }\n  process(ins,outs){\n    const inp=ins[0], out=outs[0]; if(!out||!out.length) return true;\n    const p=this.r;\n    for(let c=0;c<out.length;c++){\n      const x=inp&&inp.length? inp[Math.min(c,inp.length-1)] : null, y=out[c];\n      if(!x){ y.fill(0); continue; }\n      if(Math.abs(p-1)<1e-4){ y.set(x); this.ch[c]=null; continue; }\n      const s=this.ch[c]||(this.ch[c]=this.estado()); const L=this.LAT, N=this.N;\n      for(let i=0;i<x.length;i++){ s.inF[s.ro]=x[i]; y[i]=s.outF[s.ro-L]; s.ro++; if(s.ro>=N){ s.ro=L; this.quadro(s,p); } }\n    }\n    return true;\n  }\n}\nregisterProcessor('ibnm-tom', IbnmTom);\n";
let _tomCtx=null, _tomCtxP=null;
function tomCtx(){
  if(_tomCtxP) return _tomCtxP;
  _tomCtxP=(async()=>{ const C=window.AudioContext||window.webkitAudioContext; if(!C) throw new Error('sem áudio'); const c=new C();
    if(!c.audioWorklet) throw new Error('sem worklet'); await c.audioWorklet.addModule(URL.createObjectURL(new Blob([TOM_WK],{type:'text/javascript'}))); _tomCtx=c; return c; })();
  _tomCtxP.catch(()=>{ _tomCtxP=null; });
  return _tomCtxP;
}
async function tomAplica(){
  const a=document.getElementById('plAudio'); if(!a) return;
  const t=tomAtual(); const semi=t? tomEfetivo(t) : 0; const ratio=Math.pow(2,semi/12);
  if(a._pv){ a._pv.node.port.postMessage({ratio}); if(_tomCtx && _tomCtx.state!=='running' && !a.paused) _tomCtx.resume().catch(()=>{}); a._tomSem=0; tomBar(); return; }
  if(!semi){ a._tomSem=0; tomBar(); return; }
  if(!tomPodeProcessar(a)){ a._tomSem=1; tomBar(); return; }
  try{ const ctx=await tomCtx(); if(a._pv) return tomAplica();
    const src=ctx.createMediaElementSource(a); const node=new AudioWorkletNode(ctx,'ibnm-tom',{outputChannelCount:[2]});
    src.connect(node).connect(ctx.destination); a._pv={src,node}; node.port.postMessage({ratio}); a._tomSem=0;
    if(ctx.state!=='running') ctx.resume().catch(()=>{});
  }catch(_){ a._tomSem=1; }
  tomBar();
}
document.addEventListener('play',e=>{ const a=e.target; if(a&&a.id==='plAudio'){ if(_tomCtx&&_tomCtx.state!=='running') _tomCtx.resume().catch(()=>{}); tomAplica(); } },true);

/* barra do tom, logo abaixo do player */
let _tomPrev=null;   /* prévia do ADM antes de salvar: {k, semi} */
function tomChave(t){ return t.m.id+'|'+t.i; }
function tomEfetivo(t){ return (_tomPrev && _tomPrev.k===tomChave(t))? _tomPrev.semi : (+t.au.tom_semi||0); }
function tomBar(){
  const bar=document.getElementById('tomBar'); if(!bar) return;
  const t=tomAtual(), adm=tomPodeEditar(); let h='';
  if(t){
    const au=t.au, a=t.el;
    if(au.tom_pc==null){
      if(adm) h= _tomDetectando? '<div class="tb-l">🔎 Descobrindo o tom deste áudio…</div>'
                : '<button class="mini-btn" onclick="tomDetectar()">🎼 Descobrir o tom deste áudio</button>'+(au.tom_erro?'<div class="small">'+escA(au.tom_erro)+'</div>':'');
    } else {
      const salvo=+au.tom_semi||0, semi=tomEfetivo(t), mudou=semi!==salvo, orig=tomNome(au.tom_pc,au.tom_modo), at=tomNome(au.tom_pc+semi,au.tom_modo), ats=tomNome(au.tom_pc+salvo,au.tom_modo);
      h='<div class="tb-l">🎼 Tom: <b>'+escA(at.pt)+' ('+escA(at.letra)+')</b>'+(semi? ' <span class="tb-o">· original '+escA(orig.letra)+'</span>' : '')+'</div>';
      if(semi && a._tomSem) h+='<div class="small">⚠️ Neste aparelho está tocando no tom original'+(drvChaveApi()?'':' (falta a 🔑 chave do Google no Painel → Conectividade)')+'.</div>';
      if(adm){
        let op=''; for(let s=-6;s<=5;s++){ const n=tomNome(au.tom_pc+s,au.tom_modo); op+='<option value="'+s+'"'+(s===semi?' selected':'')+'>'+escA(n.pt)+' ('+escA(n.letra)+')'+(s? ' · '+(s>0?'+':'')+s+' semitom'+(Math.abs(s)>1?'s':'') : ' · original')+(Math.abs(s)>3?' ⚠️':'')+'</option>'; }
        h+='<div class="tb-r"><label>Tocar em</label><select onchange="tomEscolher(this.value)">'+op+'</select><button class="mini-btn sec" onclick="tomDetectar(1)" title="Analisar de novo">🔎</button></div>';
        if(mudou) h+='<div class="tb-salvar tb-sv"><div class="small">🎧 Ouvindo a prévia em <b>'+escA(at.letra)+'</b> — só você está ouvindo. Os membros continuam em <b>'+escA(ats.letra)+'</b> até você salvar.</div>'+
          '<div class="tb-bts"><button class="btn btn-primary" onclick="tomSalvarTom()">💾 SALVAR em '+escA(at.letra)+'</button><button class="btn btn-dark" onclick="tomCancelar()">Cancelar</button></div></div>';
        else if(salvo) h+='<div class="small">✅ Salvo: todos ouvem em <b>'+escA(ats.letra)+'</b>.</div>';
        if(Math.abs(semi)>3) h+='<div class="small">⚠️ Mudanças grandes deixam a voz com som artificial.</div>';
        if(au.tom_conf!=null && au.tom_conf<55 && au.tom_alt) h+='<div class="small">O app não tem certeza: pode ser também <b>'+escA(au.tom_alt)+'</b>. Ouça e confirme.</div>';
        const pc=tomDaCifra(t.m.tom); if(pc!=null && pc!==tomMod(au.tom_pc) && !semi) h+='<div class="small">A cifra está em <b>'+escA(t.m.tom)+'</b>.</div>';
      }
    }
  }
  if(bar.dataset.h!==h){ bar.dataset.h=h; bar.innerHTML=h; }
}

/* descobrir o tom (analisa o arquivo no próprio aparelho) */
function tomPorque(ab,st){
  if(st===404||st===400||st===410) return 'o arquivo não existe mais nesse endereço (foi apagado ou movido)';
  if(st===403||st===401) return 'sem permissão para ler o arquivo (no Drive, compartilhe como "Qualquer pessoa com o link")';
  if(st) return 'o servidor respondeu com erro '+st;
  if(!ab||!ab.byteLength) return 'o arquivo veio vazio';
  let t=''; try{ t=String.fromCharCode.apply(null,new Uint8Array(ab.slice(0,80))).trim(); }catch(_){}
  if(/^</.test(t)) return 'o endereço abre uma página, não o arquivo de áudio';
  if(/^[{[]/.test(t)) return 'o arquivo não existe mais nesse endereço (link quebrado)';
  return 'o arquivo está num formato que o celular não consegue ler';
}
function tomFontes(au){
  const url=String(au.url||''), id=DRV_ID(url), L=[];
  if(/youtu\.?be/i.test(url)) throw new Error('este áudio é um link do YouTube, e o YouTube não libera o som. Suba o arquivo MP3 ou M4A.');
  const baixa=async(u,op)=>{ const r=await fetch(u,op); if(!r.ok){ const e=new Error(tomPorque(null,r.status)); e.st=r.status; throw e; } return await r.arrayBuffer(); };
  if(id){
    L.push(['guardado no aparelho', async()=>{ const b=AU_BLOB.get(id)||await auDoCache(id); return b? await (await fetch(b)).arrayBuffer() : null; }]);
    const k=drvChaveApi(); if(k) L.push(['chave do Google', ()=>baixa('https://www.googleapis.com/drive/v3/files/'+id+'?alt=media&key='+encodeURIComponent(k))]);
    const tok=auTok(); if(tok) L.push(['conexão do Drive', async()=>{ const ab=await baixa('https://www.googleapis.com/drive/v3/files/'+id+'?alt=media',{headers:{Authorization:'Bearer '+tok}}); return ab; }]);
    if(!k && !tok) throw new Error('para ler o arquivo do Drive, cadastre a 🔑 chave do Google (Painel → Conectividade) ou conecte o Drive.');
  } else L.push(['link do áudio', ()=>baixa(url)]);
  return L;
}
async function tomDecodifica(au){
  const motivos=[]; const C=window.AudioContext||window.webkitAudioContext;
  for(const [nome,fn] of tomFontes(au)){
    let ab=null;
    try{ ab=await fn(); if(!ab) continue;
      const c=new C(); try{ const buf=await c.decodeAudioData(ab.slice(0)); return buf; } finally{ try{ c.close(); }catch(_){} }
    }catch(err){ motivos.push(nome+': '+(ab? tomPorque(ab,0) : (err&&err.message||'falhou'))); }
  }
  throw new Error('Não consegui ler este áudio — '+(motivos.join(' · ')||'nenhum caminho disponível')+'. Se o player também não toca, remova este áudio e envie o arquivo de novo.');
}
let _tomW=null; const _tomP={}; let _tomN=0;
function tomWorker(cmd,payload,tr){ return new Promise((ok,ko)=>{ if(!_tomW){ _tomW=new Worker('tom-worker.js'); _tomW.onmessage=ev=>{ const d=ev.data||{}, p=_tomP[d.id]; if(!p) return; delete _tomP[d.id]; d.ok? p.ok(d) : p.ko(new Error(d.erro||'falha')); };
    _tomW.onerror=()=>{ Object.keys(_tomP).forEach(k=>{ _tomP[k].ko(new Error('falha na análise')); delete _tomP[k]; }); }; }
  const id=++_tomN; _tomP[id]={ok,ko}; _tomW.postMessage(Object.assign({id,cmd},payload),tr||[]); }); }
window.tomDetectar=async function(forcar){
  const t=tomAtual(); if(!t || _tomDetectando) return; if(!tomPodeEditar()) return;
  const au=t.au; _tomDetectando=true; delete au.tom_erro; tomBar();
  try{
    const buf=await tomDecodifica(au);
    const n=buf.length, ch=buf.numberOfChannels, mono=new Float32Array(n);
    for(let k=0;k<ch;k++){ const d=buf.getChannelData(k); for(let i=0;i<n;i++) mono[i]+=d[i]/ch; }
    const r=await tomWorker('detectar',{samples:mono.buffer,sr:buf.sampleRate},[mono.buffer]);
    const det=r.resultado; if(!det) throw new Error('Não deu para identificar o tom deste áudio.');
    au.tom_pc=det.tonica; au.tom_modo=det.modo; au.tom_conf=det.confianca; au.tom_alt=(det.alternativa&&det.alternativa.letra)||'';
    if(au.tom_semi==null) au.tom_semi=0;
    await tomSalva(t.m);
    if(forcar) toast('🎼 Tom deste áudio: '+tomNome(det.tonica,det.modo).pt);
  }catch(err){ au.tom_erro='⚠️ '+(err&&err.message||err); }
  _tomDetectando=false; tomBar();
};
async function tomSalva(m){
  const audios=(m.audios||[]).map(x=>{ const y=Object.assign({},x); delete y.tom_erro; return y; });
  if(typeof sb!=='undefined'&&sb){ const {error}=await sb.from('musicas').update({audios}).eq('id',m.id); if(error) throw new Error('não salvou: '+error.message); }
  else if(typeof saveDB==='function') saveDB();
}
window.tomEscolher=function(v){
  const t=tomAtual(); if(!t) return; const s=Math.max(-6,Math.min(6,parseInt(v,10)||0));
  _tomPrev = (s===(+t.au.tom_semi||0))? null : {k:tomChave(t), semi:s};
  tomAplica();                    /* prévia: só no aparelho do ADM, ainda não salva */
};
window.tomCancelar=function(){ _tomPrev=null; tomAplica(); };
window.tomSalvarTom=async function(){
  const t=tomAtual(); if(!t||!_tomPrev||_tomPrev.k!==tomChave(t)) return; const s=_tomPrev.semi, antes=t.au.tom_semi;
  const bt=document.querySelector('.tb-salvar .btn-primary'); if(bt){ bt.disabled=true; bt.textContent='Salvando…'; }
  t.au.tom_semi=s;
  try{ await tomSalva(t.m); _tomPrev=null; const n=tomNome(t.au.tom_pc+s,t.au.tom_modo); toast(s? '✅ Salvo! Todos vão ouvir este áudio em '+n.pt+'.' : '✅ Salvo! Todos vão ouvir no tom original.'); }
  catch(err){ t.au.tom_semi=antes; toast('Não foi possível salvar o tom: '+(err.message||err)); }
  tomAplica();
};

/* liga tudo ao player */
if(typeof renderPlayer==='function'){ const _rp48=renderPlayer;
  window.renderPlayer=renderPlayer=function(m){ _tomMus=m||null; _tomPrev=null; let h=_rp48.apply(this,arguments);
    try{ if(/<audio id="plAudio"/.test(h)){
      if(/data-fm="key"/.test(h)) h=h.replace('<audio id="plAudio"','<audio id="plAudio" crossorigin="anonymous"');
      const i=h.lastIndexOf('</div>'); h=h.slice(0,i)+'<div id="tomBar" class="tom-bar"></div>'+h.slice(i); } }catch(_){}
    return h; }; }
{ const _t48=window.tocar;
  if(typeof _t48==='function') window.tocar=tocar=function(url,btn,nome){
    if(!btn || typeof btn!=='object' || !btn.classList){ if(typeof btn==='string' && nome===undefined) nome=btn; btn=document.createElement('button'); }
    const r=_t48.call(this,url,btn,nome); setTimeout(()=>{ tomBar(); tomAplica(); },0); return r; }; }
aoMudar(function(){
  const bar=document.getElementById('tomBar'); if(!bar) return;
  tomBar();
  const t=tomAtual(); if(!t || t.au.tom_pc!=null || _tomDetectando || !tomPodeEditar()) return;
  const k=t.m.id+'|'+t.i; if(_tomTentou.has(k)) return; _tomTentou.add(k);
  setTimeout(()=>tomDetectar(),600);      /* ADM: descobre sozinho o tom de áudios novos */
});
{ const st48=document.createElement('style'); st48.textContent=`
.tom-bar{margin-top:10px;display:flex;flex-direction:column;gap:6px}
.tom-bar:empty{display:none}
.tom-bar .tb-l{font-size:15px;font-weight:700}
.tom-bar .tb-o{font-weight:500;opacity:.75;font-size:13px}
.tom-bar .tb-r{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.tom-bar .tb-r label{font-size:13px;font-weight:700}
.tom-bar .tb-salvar{background:rgba(255,255,255,.12);border:1.5px solid #ffd60a;border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:8px}
.tom-bar .tb-bts{display:flex;gap:8px;flex-wrap:wrap}
.tom-bar .tb-bts .btn{flex:1;min-width:120px}
.tom-bar .tb-r select{flex:1;min-width:0;max-width:100%;padding:8px 10px;border-radius:10px;font-size:14.5px}
`; document.head.appendChild(st48); }

/* ======================= 49) 👆 TOQUE CERTO: a tela mudou no meio do toque? o toque não vale ======================= */
/* Alguns botões chegam um pouco depois (ex.: Partitura) e a grade se reorganiza. Se isso acontecer
   enquanto o dedo está na tela, o toque cairia em OUTRO botão (ex.: YouTube → WhatsApp).
   Agora: se o botão do começo do toque não é o mesmo do fim, o toque é ignorado. */
{ const ALVO='button,a[href],[onclick],[role="button"],summary,label';
  const sig=el=>{ if(!el) return ''; const oc=el.getAttribute('onclick')||'', hr=el.getAttribute('href')||'', id=el.id||'';
    return el.tagName+'|'+oc+'|'+hr+'|'+id+'|'+((oc||hr||id)? '' : (el.textContent||'').replace(/[\d\s:.,]+/g,' ').trim().slice(0,60)); };
  let ini=null;
  document.addEventListener('pointerdown',ev=>{ if(ev.button>0) return; const el=ev.target&&ev.target.closest&&ev.target.closest(ALVO); ini= el? {el, s:sig(el), t:Date.now()} : null; },true);
  document.addEventListener('click',ev=>{
    const g=ini; ini=null; if(!g || ev.detail===0 || Date.now()-g.t>2000) return;      /* clique do teclado/programa ou toque longo: deixa */
    const el=ev.target&&ev.target.closest&&ev.target.closest(ALVO); if(!el || el===g.el || g.el.contains(el) || el.contains(g.el)) return;
    if(sig(el)===g.s) return;                                                      /* mesmo botão redesenhado */
    ev.preventDefault(); ev.stopImmediatePropagation();
  },true);
}

/* ======================= 50) 🩺 ÁUDIOS: verificar e LIBERAR todos para tocar em qualquer celular ======================= */
/* Por que alguns áudios demoram ou não abrem: o arquivo no Google Drive está PRIVADO.
   Aí só o celular do ADM conectado consegue tocar (baixando o arquivo inteiro = demora) e os membros
   veem "Ouvir no Google Drive". Este bloco:
   • verifica todos os áudios (músicas, vozes e hinos) e LIBERA ("qualquer pessoa com o link pode ouvir")
     os que o app consegue liberar;
   • lista os que precisam ser liberados à mão no Drive (enviados fora do app ou por outra conta);
   • roda sozinho 1x por dia no celular do ADM conectado ao Drive;
   • confere a liberação logo depois de cada envio de áudio. */
function drvTodosAudios(){
  const L=[], visto=new Set();
  const poe=(url,nome,onde)=>{ const id=DRV_ID(url); if(!id||visto.has(id)) return; visto.add(id); L.push({id,nome:nome||'áudio',onde}); };
  (DB.musicas||[]).forEach(m=>(m.audios||[]).forEach(a=>poe(a.url,(a.nome||a.slot||'áudio'),m.titulo||'Música')));
  try{ Object.keys(HAUDIOS||{}).forEach(k=>{ const [lv,n]=k.split(':'); (HAUDIOS[k]||[]).forEach(a=>poe(a.url,a.nome,({cc:'Cantor Cristão',hr:'Harpa',harpa:'Harpa',hcc:'HCC'}[lv]||lv)+' '+n)); }); }catch(_){}
  return L;
}
/* o arquivo abre para qualquer pessoa? (precisa da chave) → 'ok' | 'privado' | 'chave' (problema na chave) | 'erro' */
async function drvPublico(id){
  const k=drvChaveApi(); if(!k) return 'semchave';
  try{ const r=await fetch('https://www.googleapis.com/drive/v3/files/'+id+'?fields=id&supportsAllDrives=true&key='+encodeURIComponent(k));
    if(r.ok) return 'ok'; if(r.status===404) return 'privado'; if(r.status===400||r.status===403) return 'chave'; return 'erro'; }catch(_){ return 'erro'; }
}
/* libera ("qualquer pessoa com o link: leitor") — só funciona para arquivos que o app enviou com a conta conectada */
async function drvLiberar(id){
  const tok=auTok(); if(!tok) return 'semdrive';
  try{ const r=await fetch('https://www.googleapis.com/drive/v3/files/'+id+'/permissions?supportsAllDrives=true',{method:'POST',headers:{Authorization:'Bearer '+tok,'Content-Type':'application/json'},body:JSON.stringify({role:'reader',type:'anyone'})});
    if(r.ok) return 'liberado'; if(r.status===401) return 'semdrive'; if(r.status===404) return 'semacesso'; if(r.status===403) return 'semacesso'; return 'erro'; }catch(_){ return 'erro'; }
}
window.drvLiberarUm=async function(id,bt){
  if(bt){ bt.disabled=true; bt.textContent='Liberando…'; }
  const r=await drvLiberar(id);
  if(r==='liberado'){ toast('✅ Áudio liberado para todos.'); AU_BLOB.delete(id); document.querySelectorAll('audio').forEach(a=>{ if(a.dataset.drv===id){ a.dataset.fi='0'; delete a.dataset.oauth; delete a.dataset.retry; auLimpaAviso(a); const f=audioFontes(id); if(f[0]) auPoe(a,f[0]); } }); }
  else if(r==='semdrive') toast('Conecte o Google Drive (Painel → Conectividade) e tente de novo.');
  else toast('Este arquivo foi enviado por fora do app ou por outra conta: abra no Drive → Compartilhar → "Qualquer pessoa com o link".');
  if(bt){ bt.disabled=false; bt.textContent='🔧 Liberar para todos'; }
};
window.__drvTodos=()=>drvTodosAudios();
let _drvVerif=false;
async function drvVerificarTodos(mostrar){
  if(_drvVerif) return null; _drvVerif=true;
  const L=drvTodosAudios(), res={ok:[],liberados:[],manual:[],total:L.length,erro:''};
  const prog=t=>{ const p=document.getElementById('drvVerProg'); if(p) p.textContent=t; };
  try{
    if(!drvChaveApi()){ res.erro='Cadastre primeiro a 🔑 chave do Google (Painel → Conectividade). Sem ela não dá para conferir.'; return res; }
    let i=0; const fila=L.slice();
    const trab=async()=>{ while(fila.length){ const x=fila.shift(); i++; if(mostrar) prog('Conferindo '+i+' de '+L.length+'…');
      let st=await drvPublico(x.id);
      if(st==='chave'){ res.erro='A chave do Google foi recusada. Confira em Google Cloud → Credenciais se a "Google Drive API" está ativada e se o site do app está liberado na chave.'; fila.length=0; return; }
      if(st==='privado'){ const lib=await drvLiberar(x.id); if(lib==='liberado'){ st=await drvPublico(x.id); if(st==='ok'){ res.liberados.push(x); continue; } } x.motivo=lib==='semdrive'?'conecte o Drive neste celular para o app liberar':'enviado fora do app ou por outra conta'; res.manual.push(x); continue; }
      if(st==='ok') res.ok.push(x); else { x.motivo='não consegui conferir agora'; res.manual.push(x); } } };
    await Promise.all([trab(),trab(),trab(),trab()]);
  } finally { _drvVerif=false; try{ localStorage.setItem('ibnm_drv_verif',JSON.stringify({t:Date.now(),ok:res.ok.length,lib:res.liberados.length,man:res.manual.length})); }catch(_){} }
  return res;
}
window.drvVerificarTela=async function(){
  abrirModal('<h3>🩺 Verificar áudios</h3><p class="small">Confere se cada áudio do app abre para qualquer pessoa e libera os que estiverem privados.</p><div id="drvVerProg" class="small">Começando…</div><div id="drvVerRes"></div>');
  const r=await drvVerificarTodos(true); const box=document.getElementById('drvVerRes'), pr=document.getElementById('drvVerProg'); if(!box||!r) return;
  if(r.erro){ pr.textContent=''; box.innerHTML='<p>⚠️ '+escA(r.erro)+'</p>'; return; }
  pr.textContent='';
  let h='<p><b>'+r.total+'</b> áudios conferidos.</p><p>✅ '+r.ok.length+' já abriam para todos</p>';
  if(r.liberados.length) h+='<p>🔧 <b>'+r.liberados.length+'</b> estavam privados e foram <b>liberados agora</b>.</p>';
  if(r.manual.length){
    h+='<p>⚠️ <b>'+r.manual.length+'</b> precisam ser liberados à mão no Google Drive (toque em cada um → <b>Compartilhar</b> → <b>Qualquer pessoa com o link</b>), ou envie o arquivo de novo pelo app:</p><div class="drv-lista">'+
      r.manual.map(x=>'<div class="drv-it"><div><b>'+escA(x.onde)+'</b> · '+escA(x.nome)+'<br><small>'+escA(x.motivo||'')+'</small></div><a class="mini-btn" href="https://drive.google.com/file/d/'+x.id+'/view" target="_blank" rel="noopener">Abrir no Drive ↗</a></div>').join('')+'</div>';
  } else h+='<p>🎉 Todos os áudios abrem rápido para todos.</p>';
  box.innerHTML=h;
};
/* botão no Painel → Conectividade */
aoMudar(function(){
  const d=document.getElementById('auDiag')||document.getElementById('btDrvChave'); if(!d || document.getElementById('btDrvVerif')) return;
  if(!(window.ehAdmin&&ehAdmin())) return;
  d.insertAdjacentHTML('afterend','<button id="btDrvVerif" class="mini-btn" style="margin:8px 0 0 8px" onclick="drvVerificarTela()">🩺 Verificar todos os áudios</button>');
});
/* ADM conectado: confere e libera sozinho 1x por dia */
setTimeout(async()=>{
  try{ if(!(window.ehAdmin&&ehAdmin()) || !auTok() || !drvChaveApi()) return;
    const u=JSON.parse(localStorage.getItem('ibnm_drv_verif')||'null'); if(u && Date.now()-u.t<20*3600*1000) return;
    const r=await drvVerificarTodos(false); if(!r||r.erro) return;
    if(r.liberados.length) toast('🔧 '+r.liberados.length+' áudio(s) estavam privados e foram liberados para todos.');
    if(r.manual.length) setTimeout(()=>toast('⚠️ '+r.manual.length+' áudio(s) não abrem para os membros. Painel → Conectividade → 🩺 Verificar.'),3500);
  }catch(_){}
},15000);
/* depois de cada envio de áudio ao Drive: confere se ficou liberado */
function drvConfereDepois(fid){ setTimeout(async()=>{ if(!fid||!drvChaveApi()) return; let st=await drvPublico(fid); if(st==='privado'){ await drvLiberar(fid); st=await drvPublico(fid); }
  if(st==='privado') toast('⚠️ O áudio foi enviado, mas ficou PRIVADO no Drive. Abra no Drive → Compartilhar → "Qualquer pessoa com o link".'); },1500); }
if(window.__drive && typeof window.__drive.sobe==='function'){ const _s50=window.__drive.sobe; window.__drive.sobe=async function(){ const fid=await _s50.apply(this,arguments); drvConfereDepois(fid); return fid; }; }
if(typeof window.uploadParaDrive==='function'){ const _u50=window.uploadParaDrive; window.uploadParaDrive=async function(){ const fid=await _u50.apply(this,arguments); drvConfereDepois(fid); return fid; }; }
{ const st50=document.createElement('style'); st50.textContent=`
.drv-lista{display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow:auto}
.drv-it{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px;border:1px solid #e3e8e5;border-radius:10px}
.drv-it small{opacity:.75}
.au-erro .mini-btn{margin-top:6px}
`; document.head.appendChild(st50); }

/* ======================= 51) 🔐 LOGIN COM GOOGLE MAIS FIRME ======================= */
/* • escolhe a conta Google certa (já sugere a última usada neste aparelho)
   • entra sozinho quando a pessoa volta do Google (mesmo se o celular abriu o login em outra janela)
   • mostra na tela o motivo quando o Google/servidor recusa (antes sumia num aviso rápido)
   • avisa quando o app foi aberto por dentro do WhatsApp/Instagram/Facebook (o Google bloqueia ali)
   • acha o perfil da pessoa pelo código da conta, mesmo se o e-mail do perfil estiver diferente */
(function(){
  const LS='ibnm_login_erro', ULT='ibnm_ult_email', MANUAL='ibnm_saiu_manual';
  const ls={ get:k=>{ try{ return localStorage.getItem(k); }catch(_){ return null; } }, set:(k,v)=>{ try{ localStorage.setItem(k,v); }catch(_){} }, del:k=>{ try{ localStorage.removeItem(k); }catch(_){} } };
  const salva=o=>ls.set(LS,JSON.stringify(Object.assign({t:Date.now()},o)));
  const le=()=>{ try{ const o=JSON.parse(ls.get(LS)||'null'); return o&&Date.now()-o.t<6*3600e3? o : null; }catch(_){ return null; } };
  const UA=navigator.userAgent||'';
  const android=/Android/i.test(UA), ios=/iPhone|iPad|iPod/i.test(UA);
  const embutido=/; wv\)|FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|musical_ly|Snapchat|Twitter|Pinterest|LinkedInApp/i.test(UA);
  /* 1) voltou do Google com erro: guarda o motivo antes do app limpar o endereço */
  try{ if(/[#&?]error(_code|_description)?=/.test(location.href)){
    const p=new URLSearchParams((location.hash||'').replace(/^#/,'')+'&'+(location.search||'').replace(/^\?/,''));
    salva({tipo:'google',cod:p.get('error_code')||p.get('error')||'',msg:(p.get('error_description')||'').replace(/\+/g,' ')}); } }catch(_){}
  /* 2) login com Google: escolhe a conta; dentro de outro app, manda abrir no navegador */
  window.loginAbrirNavegador=function(){
    const url=location.origin+location.pathname;
    if(android) location.href='intent://'+url.replace(/^https?:\/\//,'')+'#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url='+encodeURIComponent(url)+';end';
    else { try{ navigator.clipboard.writeText(url); }catch(_){} toast('Link copiado. Abra o Safari, cole na barra de endereço e entre por lá.'); }
  };
  window.loginGoogle=async function(){
    if(embutido){ salva({tipo:'embutido'}); loginAviso(true); return; }
    ls.del(LS); ls.del(MANUAL);
    try{ if(typeof _limpaErroAuth==='function') _limpaErroAuth(); }catch(_){}
    if(typeof sb==='undefined'||!sb||!sb.auth){ toast('Sem conexão com o servidor. Confira a internet e tente de novo.'); return; }
    toast('Abrindo o login com Google...');
    const qp={prompt:'select_account'}; const ult=ls.get(ULT); if(ult) qp.login_hint=ult;
    try{
      const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname,queryParams:qp}});
      if(error){ salva({tipo:'google',cod:error.code||error.status||'',msg:error.message||String(error)}); loginAviso(true); }
    }catch(e){ salva({tipo:'google',cod:'rede',msg:(e&&e.message)||String(e)}); loginAviso(true); }
  };
  /* 3) voltou para o app já logado (o login abriu em outra janela/aba): entra sozinho */
  let _conf=0;
  async function confere(){
    if(typeof _booted==='undefined'||_booted||typeof sb==='undefined'||!sb||!sb.auth) return;
    if(Date.now()-_conf<800) return; _conf=Date.now();
    try{ const {data:{session}}=await sb.auth.getSession(); if(session && !_booted && typeof bootSessao==='function'){ ls.del(LS); bootSessao(); } }catch(_){}
  }
  ['focus','pageshow'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(confere,250)));
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') setTimeout(confere,250); });
  window.addEventListener('storage',ev=>{ if(ev.key && /^sb-.*-auth-token/.test(ev.key) && ev.newValue) setTimeout(confere,150); });
  setInterval(()=>{ if(document.querySelector('.scr-login') && document.visibilityState==='visible') confere(); },4000);
  /* 4) lembra a conta usada e por que a pessoa saiu */
  const _lo=window.logout; if(typeof _lo==='function') window.logout=function(){ ls.set(MANUAL,'1'); return _lo.apply(this,arguments); };
  let _ouv=false;
  const iv=setInterval(()=>{ if(_ouv||typeof sb==='undefined'||!sb||!sb.auth) return; _ouv=true; clearInterval(iv);
    try{ sb.auth.onAuthStateChange((ev,s)=>{
      if(s&&s.user&&s.user.email){ ls.set(ULT,String(s.user.email).toLowerCase()); }
      if(ev==='SIGNED_OUT' && !ls.get(MANUAL)) salva({tipo:'saiu'});
    }); }catch(_){} },300);
  /* 6) aviso na tela de login */
  const mascara=e=>{ const m=String(e||'').match(/^(.{1,2})[^@]*(@.*)$/); return m? m[1]+'•••'+m[2] : ''; };
  function texto(o){
    if(!o) return '';
    if(o.tipo==='embutido') return '<b>Você abriu o app por dentro de outro aplicativo</b> (WhatsApp, Instagram, Facebook…). O Google não deixa entrar por aí.<br><button class="btn btn-primary lg-bt" onclick="loginAbrirNavegador()">🌐 Abrir no '+(ios?'Safari':'Chrome')+'</button>';
    if(o.tipo==='saiu') return '<b>Sua sessão terminou neste aparelho.</b> Entre de novo — use a mesma conta de antes.';
    const raw=(o.cod?o.cod+': ':'')+(o.msg||''); let amigo='O login com Google não foi concluído.';
    if(/access_denied|cancel/i.test(raw)) amigo='O login foi cancelado na tela do Google. Toque em <b>Continuar com Google</b> e escolha a sua conta.';
    else if(/exchange|external code|invalid_client|unauthorized_client|redirect_uri/i.test(raw)) amigo='O Google recusou a entrada por uma <b>configuração do servidor</b>. Avise o ADM e, enquanto isso, entre por <b>e-mail e senha</b> ou pelo <b>link mágico</b>.';
    else if(/database|saving new user|unexpected_failure/i.test(raw)) amigo='O servidor não conseguiu criar/abrir a sua conta. Avise o ADM e mande um print desta tela.';
    else if(/rede|network|fetch|failed to fetch/i.test(raw)) amigo='Sem internet ou o servidor não respondeu. Confira a conexão e tente de novo.';
    else if(/banned|bloque/i.test(raw)) amigo='Esta conta está bloqueada. Fale com um ADM do Ministério.';
    return '<b>'+amigo+'</b>'+(raw.trim()?'<small class="lg-raw">Detalhe: '+escA(raw)+'</small>':'')+'<br><small>Se continuar, use <b>🔑 Entrar por link mágico</b> (com o seu e-mail) — funciona sempre.</small>';
  }
  function loginAviso(forca){
    const card=document.querySelector('.scr-login .auth-card'); if(!card) return;
    let box=document.getElementById('lgAviso'); const o=le()||(embutido?{tipo:'embutido'}:null); const ult=ls.get(ULT);
    const h=texto(o)+(ult&&(!o||o.tipo!=='embutido')?'<div class="lg-ult">Última conta usada neste aparelho: <b>'+escA(mascara(ult))+'</b></div>':'');
    if(!h){ if(box) box.remove(); return; }
    if(!box){ card.insertAdjacentHTML('afterbegin','<div id="lgAviso" class="lg-aviso" role="status"></div>'); box=document.getElementById('lgAviso'); }
    if(forca||box.dataset.h!==h){ box.innerHTML=h; box.dataset.h=h; box.classList.toggle('so-info',!o); }
  }
  aoMudar(()=>loginAviso(false));
  /* 7) conta nova aguardando aprovação: pode ser a conta Google errada */
  aoMudar(()=>{ const g=document.querySelector('#aprovGate .ap-card'); if(!g||g.querySelector('.ap-errada')) return;
    const b=g.querySelector('#apSair'); if(!b) return;
    b.insertAdjacentHTML('beforebegin','<p class="ap-dica ap-errada">Já tinha cadastro no app? Talvez você tenha escolhido <b>outra conta Google</b>. Toque em <b>Sair desta conta</b> e entre com a conta de sempre.</p>'); });
  { const st51=document.createElement('style'); st51.textContent=`
.lg-aviso{background:#fff6e5;border:1px solid #f0c674;color:#5b4300;border-radius:12px;padding:10px 12px;margin:0 0 12px;font-size:13.5px;line-height:1.45;text-align:left}
.lg-aviso.so-info{background:#eef6f2;border-color:#cfe3d9;color:#0b3d2e}
.lg-aviso .lg-raw{display:block;margin-top:6px;opacity:.75;word-break:break-word}
.lg-aviso .lg-bt{margin-top:8px;width:100%}
.lg-aviso .lg-ult{margin-top:6px;font-size:12.5px}
.lg-aviso.so-info .lg-ult{margin-top:0}
`; document.head.appendChild(st51); }
})();

/* ======================= 52) 🧭 NUNCA TRAVAR SEM O PERFIL (voltar, Início e músicas do SETLIST) ======================= */
/* Quando o app perdia o perfil da pessoa (sessão vencida, internet ruim ou conta Google diferente),
   a barra mostrava só "Olá!", o Início quebrava, o VOLTAR e o menu não saíam do hino e as músicas
   do SETLIST não abriam (a tela subia e travava). Agora:
   • o perfil é achado pelo e-mail, pelo código da conta ou pela última cópia guardada neste aparelho;
   • nenhuma tela trava: se algo falhar, a tela muda mesmo assim e o app recarrega os dados;
   • o VOLTAR sempre leva para a tela anterior (ou para o Início);
   • se a sessão venceu, o app volta para a tela de entrar explicando o motivo. */
(function(){
  const EU='ibnm_eu';
  const sid=()=>{ try{ return (typeof _sessaoId!=='undefined'&&_sessaoId)||''; }catch(_){ return ''; } };
  const sem=()=>{ try{ return (typeof _sessaoEmail!=='undefined'&&_sessaoEmail)||''; }catch(_){ return ''; } };
  let _guardado=null; try{ _guardado=JSON.parse(localStorage.getItem(EU)||'null'); }catch(_){}
  let _semPerfil=false;
  /* 1) quem sou eu: e-mail → código da conta → cópia guardada deste aparelho */
  if(typeof window.usuarioAtual==='function'){
    const _ua=window.usuarioAtual;
    window.usuarioAtual=function(){
      let u=null; try{ u=_ua.apply(this,arguments); }catch(_){}
      const id=sid();
      if(!u && id){ try{ u=(DB.usuarios||[]).find(x=>x.id===id)||null; }catch(_){} }
      if(u){ _semPerfil=false;
        if(id && u.id===id && (!_guardado || _guardado.id!==u.id || _guardado.nome!==u.nome || _guardado.admin!==u.admin || _guardado.email!==u.email)){
          _guardado={id:u.id,email:u.email,nome:u.nome,admin:!!u.admin,vocal:u.vocal||[],instr:u.instr||[],foto:u.foto||'',tel:u.tel||'',wpp:!!u.wpp,nasc:u.nasc||'',origem:u.origem||''};
          try{ localStorage.setItem(EU,JSON.stringify(_guardado)); }catch(_){} }
        return u; }
      if(id && _guardado && _guardado.id===id){ _semPerfil=true; return _guardado; }
      if(id && sem()){ _semPerfil=true; return null; }
      return null;
    };
  }
  /* 2) nenhuma tela trava: se a montagem der erro, mostra um aviso no lugar (e a tela muda) */
  function protegeRotas(){
    if(typeof ROTAS==='undefined') return;
    Object.keys(ROTAS).forEach(k=>{ const f=ROTAS[k]; if(typeof f!=='function'||f.__prot) return;
      const g=function(){ try{ return f.apply(this,arguments); }catch(err){ try{ console.error('[tela '+k+']',err); }catch(_){}
        recarregaPerfis();
        return CARREG; } };
      g.__prot=1; ROTAS[k]=g; });
  }
  protegeRotas(); setTimeout(protegeRotas,1500); setTimeout(protegeRotas,6000);
  /* trocar de tela sem o perfil carregado: antes não fazia NADA (o Início e o VOLTAR "não saíam" do hino) */
  const CARREG='<div class="page"><div class="card" style="text-align:center;padding:22px"><div style="font-size:40px">⏳</div><h3 style="margin:8px 0">Carregando seus dados…</h3><p style="font-size:13.5px;color:#567">Se esta mensagem não sumir, toque em <b>Recarregar</b>.</p><button class="btn btn-primary" onclick="location.reload()">🔄 Recarregar</button></div></div>';
  if(typeof window.go==='function'){ const _g=window.go;
    window.go=function(page,arg){
      let semU=false; try{ semU=(typeof _booted!=='undefined'&&_booted) && !usuarioAtual(); }catch(_){}
      if(semU && page!=='ajuda'){ try{ toggleMenu(false); }catch(_){} const c=document.getElementById('content'); if(c) c.innerHTML=CARREG;
        try{ _g.apply(this,arguments); }catch(_){}
        try{ if(typeof window.__setPag==='function') __setPag(page); _viewAtual=function(){ window.go(page,arg); }; }catch(_){}
        window.scrollTo(0,0); recarregaPerfis(); return; }
      return _g.apply(this,arguments); };
    try{ go=window.go; }catch(_){} }
  /* música que não abre: avisa e não deixa a tela "subir e travar" */
  ['abrirMusica'].forEach(nome=>{ const f=window[nome]; if(typeof f!=='function'||f.__prot) return;
    const g=function(id){ try{ return f.apply(this,arguments); }catch(err){ try{ console.error('[abrirMusica]',err); }catch(_){}
      recarregaPerfis(); toast('⏳ Carregando os dados… toque na música de novo em instantes.'); } };
    g.__prot=1; window[nome]=g; });
  /* 3) perfil sumiu: busca de novo e, se a sessão venceu, volta para a tela de entrar */
  let _rp=0;
  async function recarregaPerfis(){
    if(Date.now()-_rp<5000) return; _rp=Date.now();
    try{ if(typeof cloudPerfis==='function') await cloudPerfis(); }catch(_){}
    let achou=false; try{ achou=!!(DB.usuarios||[]).find(x=>x.id===sid()||x.email===sem()); }catch(_){}
    if(achou){ try{ montaMenu(); if(typeof _viewAtual==='function'&&!document.querySelector('.modal-bg.show')) _viewAtual(); }catch(_){} return; }
    confereSessao();
  }
  window.__recarregaPerfis=recarregaPerfis;
  let _cs=0;
  async function confereSessao(){
    if(typeof sb==='undefined'||!sb||!sb.auth||typeof _booted==='undefined'||!_booted) return;
    if(!navigator.onLine || Date.now()-_cs<20000) return; _cs=Date.now();
    try{
      const {data,error}=await sb.auth.getUser();
      if(error){ const m=String(error.message||error.name||''); const st=error.status||0;
        if(st===401||st===403||/jwt|expired|invalid|not found|session/i.test(m)){
          try{ localStorage.setItem('ibnm_login_erro',JSON.stringify({t:Date.now(),tipo:'saiu'})); }catch(_){}
          try{ await sb.auth.signOut({scope:'local'}); }catch(_){} location.reload(); }
        return; }
      const u=data&&data.user; if(!u) return;
      const {data:p,error:e2}=await sb.from('perfis').select('id').eq('id',u.id).maybeSingle();
      if(!e2 && !p) contaSemCadastro(u.email||'');
    }catch(_){}
  }
  function contaSemCadastro(email){
    if(document.getElementById('semCad')) return;
    document.body.insertAdjacentHTML('beforeend','<div id="semCad" class="sc-bg"><div class="sc-card"><div style="font-size:42px">🔎</div><h3>Não achei o seu cadastro</h3>'+
      '<p>Você entrou com a conta <b>'+escA(email)+'</b>, mas ela não tem cadastro no app do Ministério.</p>'+
      '<p class="sc-dica">Talvez você tenha escolhido <b>outra conta Google</b>. Saia e entre com a conta de sempre.</p>'+
      '<button class="btn btn-primary" onclick="try{logout()}catch(_){location.reload()}">Sair e entrar com a conta certa</button>'+
      '<button class="btn btn-dark" style="margin-top:8px" onclick="document.getElementById(\'semCad\').remove()">Fechar</button></div></div>');
  }
  /* confere logo depois de entrar, ao voltar para o app e sempre que o perfil faltar */
  setTimeout(()=>{ if(_semPerfil || !usuarioAtual()) recarregaPerfis(); },7000);
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible' && (typeof _booted!=='undefined'&&_booted)){ if(_semPerfil) recarregaPerfis(); else setTimeout(confereSessao,1500); } });
  /* sessão encerrada pelo servidor enquanto o app estava aberto: volta para a tela de entrar */
  const iv=setInterval(()=>{ if(typeof sb==='undefined'||!sb||!sb.auth) return; clearInterval(iv);
    try{ sb.auth.onAuthStateChange(ev=>{ if(ev==='SIGNED_OUT' && typeof _booted!=='undefined' && _booted && !localStorage.getItem('ibnm_saiu_manual')){ setTimeout(()=>location.reload(),300); } }); }catch(_){} },300);
  /* 4) VOLTAR: se a pilha acabou mas a tela não é o Início, vai para o Início (nunca "Deseja sair?" em cima de um hino) */
  if(typeof window.__voltar==='function'){ const _v=window.__voltar;
    window.__voltar=function(){ const r=_v.apply(this,arguments); if(r) return r;
      try{ const naHome=(typeof _pagAtual!=='undefined' && _pagAtual==='inicio') && !document.querySelector('#content .cc-page,#content .song-head');
        const naAuth=!!document.querySelector('#authScreens .scr-auth');
        if(!naHome && !naAuth){ go('inicio'); return true; } }catch(_){}
      return false; }; }
  { const st52=document.createElement('style'); st52.textContent=`
.sc-bg{position:fixed;inset:0;z-index:13500;background:rgba(8,40,30,.72);display:flex;align-items:center;justify-content:center;padding:18px}
.sc-card{background:#fff;border-radius:20px;max-width:400px;width:100%;padding:22px 20px;text-align:center;box-shadow:0 16px 44px rgba(0,0,0,.3)}
.sc-card h3{margin:6px 0 8px;color:#0f3d2e}.sc-card p{font-size:14px;color:#3e5a4d;margin:0 0 8px}.sc-card .sc-dica{font-size:13px;color:#6b5a1e;background:#fff6e0;border-radius:10px;padding:8px}
.sc-card .btn{width:100%}
`; document.head.appendChild(st52); }
})();

/* ======================= 53) 📶 ECONOMIA DE DADOS (cota do Supabase) ======================= */
/* Áudio guardado no Supabase só é baixado quando a pessoa aperta ▶ (antes baixava ao abrir a aba Áudio).
   Partituras, áudios, anexos e fotos do Supabase ficam guardados no celular (service worker): baixam 1 vez só. */
(function(){
  const ehSb=u=>/supabase\.co\/storage\/v1\/object\//.test(String(u||''));
  aoMudar(()=>{ document.querySelectorAll('audio').forEach(a=>{ const s=a.currentSrc||a.getAttribute('src')||'';
    if(ehSb(s) && a.paused && a.preload!=='none' && !a.dataset.sbPre){ a.dataset.sbPre='1'; a.preload='none'; a.removeAttribute('autoplay'); } }); });
  /* uma vez: pede para o celular guardar os arquivos (não apagar quando faltar espaço) */
  try{ if(navigator.storage && navigator.storage.persist && !localStorage.getItem('ibnm_persist')){ localStorage.setItem('ibnm_persist','1'); navigator.storage.persist().catch(()=>{}); } }catch(_){}
})();

/* ======================= 54) 📦 ARQUIVOS FORA DO SUPABASE (partituras e áudios vão para o Google Drive) ======================= */
/* O que estourou a cota grátis do Supabase foi baixar ARQUIVOS (partituras, áudios). Agora:
   • partitura nova enviada pelo app vai para o Google Drive do ADM (pasta "MM IBNM - Partituras");
   • Painel → Conectividade → "📦 Tirar arquivos do Supabase": move os que já estão lá para o Drive,
     troca o endereço no app e apaga do Supabase (cada arquivo só sai do Supabase depois que o novo endereço foi salvo). */
const SB_ARQ=/\/storage\/v1\/object\/public\/(partituras|audios)\/(.+)$/;
function sbCaminho(url){ const m=String(url||'').split('?')[0].match(SB_ARQ); return m? {bucket:m[1],path:decodeURIComponent(m[2]),url:String(url)} : null; }
/* endereço que abre um arquivo do Drive dentro do app (imagem ou PDF) */
function drvArquivo(url,tipo){ const id=DRV_ID(url); if(!id) return url; const k=drvChaveApi();
  if(k) return 'https://www.googleapis.com/drive/v3/files/'+id+'?alt=media&key='+encodeURIComponent(k);
  return tipo==='pdf'? '' : 'https://drive.google.com/thumbnail?id='+id+'&sz=w2000'; }
window.__drvArquivo=drvArquivo;
async function driveProntoAdm(){
  const D=window.__drive; if(!D||!D.ok()) { toast('Configure o Google Drive no Painel do ADM primeiro.'); return null; }
  if(!D.conectado()){ const ok=await D.conectar(); if(!ok) return null; }
  return D;
}
window.__driveProntoAdm=driveProntoAdm;
/* tudo o que ainda está guardado no Supabase */
async function arqPendentes(){
  const L=[];
  try{ const {data}=await sb.from('partituras_hinos').select('livro,num,url,tipo');
    (data||[]).forEach(r=>{ const c=sbCaminho(r.url); if(c) L.push({tipo:'part',r,c,nome:'Partitura '+({cc:'Cantor',hr:'Harpa',hcc:'HCC'}[r.livro]||r.livro)+' '+r.num+(r.tipo==='pdf'?'.pdf':'.jpg')}); }); }catch(_){}
  (DB.musicas||[]).forEach(m=>(m.audios||[]).forEach((a,i)=>{ const c=sbCaminho(a.url); if(c) L.push({tipo:'mus',m,i,c,nome:(m.titulo||'Música')+' - '+(a.nome||'áudio')}); }));
  try{ Object.keys(HAUDIOS||{}).forEach(k=>(HAUDIOS[k]||[]).forEach((a,i)=>{ const c=sbCaminho(a.url); if(c){ const [lv,n]=k.split(':'); L.push({tipo:'hino',lv,n:+n,i,c,nome:'Hino '+lv+' '+n+' - '+(a.nome||'áudio')}); } })); }catch(_){}
  return L;
}
/* quanto ainda ocupa cada pasta do Supabase (se o banco deixar listar) */
async function tamanhoBucket(b){
  let tot=0,n=0;
  async function anda(pref,prof){ if(prof>3) return; let off=0;
    while(true){ const {data,error}=await sb.storage.from(b).list(pref,{limit:1000,offset:off}); if(error||!data) return;
      for(const x of data){ if(x.id===null||!x.metadata){ await anda((pref?pref+'/':'')+x.name,prof+1); } else { tot+=(x.metadata.size||0); n++; } }
      if(data.length<1000) return; off+=1000; } }
  try{ await anda('',0); }catch(_){}
  return {tot,n};
}
const mb=b=>(b/1048576).toFixed(b>10485760?0:1).replace('.',',')+' MB';
window.arqTela=async function(){
  if(!(window.ehAdmin&&ehAdmin())) return;
  abrirModal('<h3>📦 Arquivos no Supabase</h3><p class="small">Os arquivos baixados do Supabase gastam a cota grátis. Aqui eles vão para o Google Drive (que não tem esse limite).</p><div id="arqRes">Conferindo…</div>');
  const L=await arqPendentes(); const box=document.getElementById('arqRes'); if(!box) return;
  let h='<p><b>'+L.length+'</b> arquivo(s) do app ainda estão no Supabase'+(L.length?':':'.')+'</p>';
  if(L.length) h+='<ul class="arq-lista">'+L.slice(0,40).map(x=>'<li>'+escA(x.nome)+'</li>').join('')+(L.length>40?'<li>… e mais '+(L.length-40)+'</li>':'')+'</ul><button class="btn btn-primary" id="arqBt" onclick="arqMigrar()">📦 Mover '+L.length+' para o Google Drive</button>';
  else h+='<p>✅ Partituras e áudios já estão fora do Supabase.</p>';
  h+='<div id="arqTam" class="small" style="margin-top:10px">Medindo o espaço usado…</div>';
  box.innerHTML=h;
  const out=[]; for(const b of ['partituras','audios','anexos','fotos','comprovantes']){ const t=await tamanhoBucket(b); if(t.n) out.push(b+': '+mb(t.tot)+' ('+t.n+' arquivos)'); }
  const tz=document.getElementById('arqTam'); if(tz) tz.innerHTML=out.length? '<b>Espaço no Supabase Storage:</b><br>'+out.map(escA).join('<br>')+'<br><small>Anexos e comprovantes (financeiro/inventário) ficam no Supabase por serem privados; fotos de perfil são pequenas e ficam guardadas no celular.</small>' : '';
};
window.arqMigrar=async function(){
  const D=await driveProntoAdm(); if(!D) return;
  const L=await arqPendentes(); if(!L.length) return toast('Nada para mover.');
  if(!confirm('Mover '+L.length+' arquivo(s) do Supabase para o Google Drive?\n\nCada arquivo é baixado 1 vez, enviado para o seu Drive e só depois apagado do Supabase. Não feche o app até terminar.')) return;
  const box=document.getElementById('arqRes'); const st=t=>{ if(box) box.innerHTML='<p>'+t+'</p>'; };
  let ok=0, falha=[]; const musMud=new Set(), hinoMud=new Set();
  for(let k=0;k<L.length;k++){ const x=L[k]; st('Movendo '+(k+1)+' de '+L.length+'…<br><small>'+escA(x.nome)+'</small>');
    try{
      const r=await fetch(x.c.url); if(!r.ok) throw new Error('baixar '+r.status); const blob=await r.blob();
      const pasta=x.tipo==='part'?'MM IBNM - Partituras':'MM IBNM - Áudios';
      const fid=await D.sobe(blob,x.nome.replace(/[\\/:*?"<>|]+/g,'-'),pasta); if(!fid) throw new Error('Drive');
      if(x.tipo==='part'){ const nu='https://drive.google.com/file/d/'+fid+'/view';
        const u=await sb.from('partituras_hinos').update({url:nu,updated_at:new Date().toISOString()}).eq('livro',x.r.livro).eq('num',x.r.num); if(u.error) throw u.error;
        PARTS[x.r.livro+':'+x.r.num]=Object.assign({},x.r,{url:nu}); }
      else if(x.tipo==='mus'){ const a=x.m.audios[x.i]; a.url='https://drive.google.com/uc?export=download&id='+fid; a.drive=fid; musMud.add(x.m); }
      else { const lst=HAUDIOS[x.lv+':'+x.n]; lst[x.i]=Object.assign({},lst[x.i],{url:'https://drive.google.com/uc?export=download&id='+fid,drive:fid}); hinoMud.add(x.lv+':'+x.n); }
      x.fid=fid; x.ok=true;
      if(x.tipo==='part'){ await sb.storage.from(x.c.bucket).remove([x.c.path]); ok++; }
    }catch(err){ falha.push(x.nome+' ('+(err.message||err)+')'); }
  }
  /* grava as listas de áudios (1 vez por música/hino) e só então apaga do Supabase */
  for(const m of musMud){ const r=await sb.from('musicas').update({audios:m.audios}).eq('id',m.id);
    const xs=L.filter(x=>x.tipo==='mus'&&x.m===m&&x.ok);
    if(r.error){ xs.forEach(x=>falha.push(x.nome+' (não salvou: '+r.error.message+')')); continue; }
    for(const x of xs){ try{ await sb.storage.from(x.c.bucket).remove([x.c.path]); }catch(_){} ok++; } }
  for(const key of hinoMud){ const [lv,n]=key.split(':'); const r=await sb.from('hinos_audios').upsert({livro:lv,num:+n,audios:HAUDIOS[key],updated_at:new Date().toISOString()});
    const xs=L.filter(x=>x.tipo==='hino'&&(x.lv+':'+x.n)===key&&x.ok);
    if(r.error){ xs.forEach(x=>falha.push(x.nome+' (não salvou: '+r.error.message+')')); continue; }
    for(const x of xs){ try{ await sb.storage.from(x.c.bucket).remove([x.c.path]); }catch(_){} ok++; } }
  try{ localStorage.setItem('ibnm_parts',JSON.stringify(PARTS)); localStorage.setItem('ibnm_haudios',JSON.stringify(HAUDIOS)); }catch(_){}
  st('✅ <b>'+ok+'</b> arquivo(s) movidos para o Google Drive e apagados do Supabase.'+(falha.length?'<br><br>⚠️ Não consegui mover '+falha.length+':<br><small>'+falha.map(escA).join('<br>')+'</small><br>Pode tentar de novo depois.':''));
};
aoMudar(function(){
  const d=document.getElementById('btDrvVerif'); if(!d || document.getElementById('btArq')) return;
  d.insertAdjacentHTML('afterend','<button id="btArq" class="mini-btn" style="margin:8px 0 0 8px" onclick="arqTela()">📦 Tirar arquivos do Supabase</button>');
});
{ const st54=document.createElement('style'); st54.textContent='.arq-lista{max-height:30vh;overflow:auto;font-size:13px;margin:6px 0 10px;padding-left:18px}'; document.head.appendChild(st54); }

/* ======================= 55) 🏷️ CHECK-UP DAS ETIQUETAS (cifra · letra · áudio · youtube) ======================= */
/* Painel → "🏷️ Conferir etiquetas de todas as músicas": mostra o que cada música tem e o que falta,
   e corrige o que dá para corrigir sozinho (letra que só estava dentro da cifra). */
function letraDaCifra(cifra){
  const c=String(cifra||''); if(!c.trim()) return '';
  const box=document.createElement('div'); box.innerHTML=/<[a-z][\s\S]*>/i.test(c)? c : c.split('\n').map(l=>'<div>'+(l?escA(l):'<br>')+'</div>').join('');
  let ls=[]; try{ ls=(window.__linhasDoHtml? window.__linhasDoHtml(box) : box.innerText.split('\n')); }catch(_){ ls=box.innerText.split('\n'); }
  const fora=l=>{ const t=String(l).trim(); if(!t) return false;
    if(window.__ehLinhaDeAcordes && window.__ehLinhaDeAcordes(t)) return true;
    if(/^\[?\s*(intro|introdu[cç][aã]o|solo|final|ponte|interl[uú]dio|riff|tab)\b/i.test(t)) return true;
    if(/^[A-Ga-g]?\|[-\d|hpbr\/\\~x\s]+\|?$/.test(t)) return true;
    if(/^\[[^\]]+\]$/.test(t)) return true;
    return false; };
  const out=[]; ls.forEach(l=>{ if(fora(l)) return; const t=String(l).replace(/\s+$/,'').replace(/^\s+/,''); if(!t){ if(out.length&&out[out.length-1]!=='') out.push(''); return; } out.push(t); });
  while(out.length&&out[out.length-1]==='') out.pop();
  return out.join('\n');
}
function etqConfere(){
  const L=DB.musicas||[], r={tot:L.length,cifra:0,letra:0,audio:0,yt:0,semNada:[],letraNaCifra:[],cifraVazia:[],ytRuim:[],audioRuim:[]};
  L.forEach(m=>{ const t=etiquetasDe(m.id);
    if(t.includes('cifra')) r.cifra++; if(t.includes('letra')) r.letra++; if(t.includes('áudio')) r.audio++; if(t.includes('youtube')) r.yt++;
    if(!t.length) r.semNada.push(m);
    if(!String(m.letra||'').trim() && t.includes('cifra')){ const lt=letraDaCifra(m.cifra); if(lt.replace(/\s/g,'').length>=20) r.letraNaCifra.push({m,lt}); }
    if(String(m.cifra||'').trim() && !t.includes('cifra')) r.cifraVazia.push(m);
    if(String(m.youtube||'').trim() && !t.includes('youtube')) r.ytRuim.push(m);
    if(Array.isArray(m.audios) && m.audios.length && !t.includes('áudio')) r.audioRuim.push(m); });
  return r;
}
window.etqTela=function(){
  if(!(window.ehAdmin&&ehAdmin())) return;
  const r=etqConfere(); const lst=(a,f)=>'<ul class="arq-lista">'+a.slice(0,60).map(x=>'<li>'+f(x)+'</li>').join('')+(a.length>60?'<li>… e mais '+(a.length-60)+'</li>':'')+'</ul>';
  const ab=m=>'<a href="javascript:void(0)" onclick="fecharModal();abrirMusica(\''+escA(m.id)+'\',\'cifra\')">'+escA(m.titulo)+'</a>'+(m.artista?' <small>· '+escA(m.artista)+'</small>':'');
  let h='<h3>🏷️ Etiquetas das músicas</h3><p class="small">Cada música mostra só o que tem: <b>cifra · letra · áudio · youtube</b> (e <b>partitura</b> nos hinos).</p>'+
    '<p><b>'+r.tot+'</b> músicas · cifra <b>'+r.cifra+'</b> · letra <b>'+r.letra+'</b> · áudio <b>'+r.audio+'</b> · youtube <b>'+r.yt+'</b></p>';
  if(r.letraNaCifra.length) h+='<div class="etq-bloco"><b>📝 '+r.letraNaCifra.length+' música(s) com a letra só dentro da cifra</b> (por isso sem a etiqueta "letra"):'+lst(r.letraNaCifra,x=>ab(x.m))+
    '<button class="btn btn-primary" id="etqBt" onclick="etqGerarLetras()">📝 Criar a letra dessas '+r.letraNaCifra.length+' a partir da cifra</button><small style="display:block;margin-top:4px">Tira os acordes e as linhas de intro/solo. Depois você pode ajustar cada letra no editor.</small></div>';
  if(r.cifraVazia.length) h+='<div class="etq-bloco"><b>⚠️ '+r.cifraVazia.length+' com a cifra salva em branco</b> (só formatação, sem texto):'+lst(r.cifraVazia,ab)+'</div>';
  if(r.ytRuim.length) h+='<div class="etq-bloco"><b>⚠️ '+r.ytRuim.length+' com link do YouTube inválido</b> (não é youtube.com / youtu.be):'+lst(r.ytRuim,m=>ab(m)+'<br><small>'+escA(m.youtube)+'</small>')+'</div>';
  if(r.audioRuim.length) h+='<div class="etq-bloco"><b>⚠️ '+r.audioRuim.length+' com áudio sem arquivo</b>:'+lst(r.audioRuim,ab)+'</div>';
  if(r.semNada.length) h+='<div class="etq-bloco"><b>📭 '+r.semNada.length+' sem nada ainda</b> (nenhuma cifra, letra, áudio ou YouTube):'+lst(r.semNada,ab)+'</div>';
  if(!r.letraNaCifra.length&&!r.cifraVazia.length&&!r.ytRuim.length&&!r.audioRuim.length) h+='<p>✅ Todas as etiquetas batem com o conteúdo de cada música.</p>';
  abrirModal(h);
};
window.etqGerarLetras=async function(){
  const r=etqConfere(); if(!r.letraNaCifra.length) return toast('Nada para criar.');
  if(!confirm('Criar a letra de '+r.letraNaCifra.length+' música(s) a partir da cifra (sem os acordes)?')) return;
  const bt=document.getElementById('etqBt'); let ok=0, erro=0;
  for(let i=0;i<r.letraNaCifra.length;i++){ const {m,lt}=r.letraNaCifra[i]; if(bt) bt.textContent='Criando '+(i+1)+' de '+r.letraNaCifra.length+'…';
    try{ const {error}=await sb.from('musicas').update({letra:lt}).eq('id',m.id); if(error) throw error; m.letra=lt; ok++; }catch(_){ erro++; } }
  try{ saveDB(); }catch(_){}
  toast('✅ Letra criada em '+ok+' música(s)'+(erro?' · '+erro+' não salvaram':'')+'.'); atualizaEtiquetas(); etqTela();
};
/* etiquetas também nas LISTAS dos hinos (Cantor Cristão, Harpa e HCC) */
let _harpaN=null;
function etqListaHinos(){
  const links=document.querySelectorAll('#content li > a[onclick^="cantorAbrir("], #content li > a[onclick^="harpaAbrir("], #content li > a[onclick^="hccAbrir("]');
  if(!links.length) return;
  links.forEach(a=>{ const m=(a.getAttribute('onclick')||'').match(/^(cantorAbrir|harpaAbrir|hccAbrir)\((\d+)\)/); if(!m) return;
    const id=({cantorAbrir:'cc:',harpaAbrir:'hr:',hccAbrir:'hcc:'}[m[1]])+m[2];
    const txt=etiquetasDe(id).join(' · ');
    let sp=a.querySelector('.etq-hino');
    if(!txt){ if(sp) sp.remove(); return; }
    if(!sp){ const alvo=a.querySelector('.fl')||a.lastElementChild||a; alvo.insertAdjacentHTML('afterend','<span class="sl-ok etq-hino"></span>'); sp=a.querySelector('.etq-hino'); }
    if(sp && sp.textContent!==txt) sp.textContent=txt; });
}
aoMudar(etqListaHinos);
aoMudar(function(){
  const d=document.getElementById('btArq')||document.getElementById('btDrvVerif'); if(!d || document.getElementById('btEtq')) return;
  d.insertAdjacentHTML('afterend','<button id="btEtq" class="mini-btn" style="margin:8px 0 0 8px" onclick="etqTela()">🏷️ Conferir etiquetas de todas as músicas</button>');
});
{ const st55=document.createElement('style'); st55.textContent='.etq-hino{display:block;margin:4px 0 0!important;font-size:12px;font-weight:700;color:#0b5d3b;background:#e3f4ea;border-radius:999px;padding:2px 9px;width:max-content;max-width:100%}.etq-bloco{border:1px solid #e3e8e5;border-radius:12px;padding:10px;margin:10px 0}.etq-bloco .btn{width:100%;margin-top:6px}'; document.head.appendChild(st55); }

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
setTimeout(buscaSaldo,4000); setInterval(()=>{ if(document.visibilityState==='visible') buscaSaldo(); },30*60*1000);
let _sdUlt=Date.now(); document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible' && Date.now()-_sdUlt>10*60*1000){ _sdUlt=Date.now(); buscaSaldo(); } });
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
  const est=JSON.stringify({st,rota,t:Date.now()}); try{ localStorage.setItem('ibnm_drv_state',est); sessionStorage.setItem('ibnm_drv_state',est);
    /* guarda os últimos pedidos: tocar 2 vezes em Conectar não invalida o primeiro */
    let ls=[]; try{ ls=JSON.parse(localStorage.getItem('ibnm_drv_states')||'[]'); }catch(_){} ls=ls.filter(x=>Date.now()-x.t<15*60000); ls.push({st,rota,t:Date.now()}); localStorage.setItem('ibnm_drv_states',JSON.stringify(ls.slice(-5))); }catch(_){}
  /* sugestão de conta: só a conta Google que já conectou o Drive (o e-mail do perfil pode não ser Google, ex.: yahoo) */
  let email=''; try{ email=localStorage.getItem('ibnm_drive_email')||''; if(!email){ const pe=((usuarioAtual()||{}).email||'').toLowerCase(); if(/@(gmail|googlemail)\.com$/.test(pe)) email=pe; } }catch(_){}
  const falhou=localStorage.getItem('ibnm_drive_falhou')==='1';
  const volta=location.origin+location.pathname.replace(/[^\/]*$/,'')+'drive.html';   /* página própria de retorno (o login do app não é afetado) */
  const pr= !localStorage.getItem('ibnm_drive_ok')? 'consent select_account' : (falhou||!email? 'select_account' : '');
  const q=new URLSearchParams({client_id:cid, redirect_uri:volta, response_type:'token', scope:'https://www.googleapis.com/auth/drive.file', include_granted_scopes:'true', state:st});
  if(pr) q.set('prompt',pr); if(email && !falhou) q.set('login_hint',email);
  location.href='https://accounts.google.com/o/oauth2/v2/auth?'+q.toString();
};
/* volta do Google: a página drive.html guarda a permissão (no aparelho) e volta para o app.
   No celular, o Google pode voltar numa janela separada: quando você retorna ao app, ele lê a
   permissão guardada e já fica conectado. */
function voltaDoGoogle(){
  drvToken();   /* sincroniza a permissão guardada com a memória do app */
  let r=null; try{ r=JSON.parse(localStorage.getItem('ibnm_drive_retorno')||'null'); }catch(_){} if(!r) return;
  localStorage.removeItem('ibnm_drive_retorno');
  try{ if(r.ok && drvToken()) localStorage.removeItem('ibnm_drive_falhou'); else localStorage.setItem('ibnm_drive_falhou','1'); }catch(_){}
  if(r.ok){ const t=drvToken();
    setTimeout(()=>{ toast(t? '✅ Google Drive conectado.' : 'Google Drive: permissão não recebida.'); try{ if(r.rota && document.visibilityState==='visible'){ const [k,id,arg]=r.rota.split('|'); if(k==='go'&&id) go(id,arg||undefined); } }catch(_){}
      try{ document.querySelectorAll('button').forEach(b=>{ if(/Verificar de novo/.test(b.textContent) && b.closest('.card') && /Conectividade/.test(b.closest('.card').textContent)) b.click(); }); }catch(_){} },1200); }
  else setTimeout(()=>toast('❌ Google Drive não conectou: '+(r.erro||'cancelado')+'. Toque em Conectar de novo e escolha a conta Google certa.'),1200);
}
voltaDoGoogle();
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') voltaDoGoogle(); });
window.addEventListener('storage',ev=>{ if(ev.key==='ibnm_drive_tok'||ev.key==='ibnm_drive_retorno') voltaDoGoogle(); });
window.addEventListener('focus',()=>voltaDoGoogle());
/* Painel → Conectividade: mostra até quando vale e com qual conta; avisa quando venceu (o Google libera por 1 hora) */
if(typeof chkDrive==='function'){ const _chk=chkDrive; window.chkDrive=chkDrive=function(){ drvToken(); const r=_chk();
  try{ const t=JSON.parse(localStorage.getItem(DRV_K)||'null'); const em=localStorage.getItem('ibnm_drive_email')||'';
    const hh=x=>new Date(x).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    if(r.estado==='ok' && t) r.det='Conectado'+(em?' com '+em:'')+' · vale até '+hh(t.exp);
    else if(r.estado==='atencao' && t && t.exp<=Date.now()+60000) { r.det='A permissão do Google venceu às '+hh(t.exp)+' (ela vale 1 hora)'; r.sol=['Toque em 🔗 Conectar Google Drive e escolha a conta '+(em||'Google do Ministério'),'Enviar um arquivo também pede a permissão de novo']; }
    else if(r.estado==='atencao' && localStorage.getItem('ibnm_drive_falhou')==='1') r.sol=['Toque em 🔗 Conectar Google Drive e ESCOLHA a conta Google (gmail) do Ministério','Se aparecer uma mensagem de erro do Google, mande um print para o Claude'];
  }catch(_){}
  return r; }; }
/* quem pedir a permissão do Drive passa a usar a janela do próprio app */
const _drvEnsure=async function(){ const t=drvToken(); if(t) return t; conectarDriveRedirect(); return new Promise(()=>{}); };
try{ window.ensureDriveToken=_drvEnsure; ensureDriveToken=_drvEnsure; }catch(_){ window.ensureDriveToken=_drvEnsure; }

/* ======================= 36) ETIQUETAS EM TODAS AS MÚSICAS E HINOS ======================= */
/* cifra · letra · áudio · youtube — calculadas na hora, em toda lista (Músicas, Favoritos, SETLIST, Início).
   áudio = só com áudio gravado/enviado; youtube = quando há link. Vale para músicas, Cantor, Harpa e HCC. */
/* links do YouTube dos hinos lidos direto da nuvem (não dependem de o Cantor/Harpa já ter sido aberto) */
let LINKS_HINOS={cc:{},hr:{}}; try{ const c=JSON.parse(localStorage.getItem('ibnm_links_hinos')||'null'); if(c) LINKS_HINOS=c; }catch(_){}
async function carregaLinksHinos(){
  try{ if(typeof sb==='undefined') return; const novo={cc:{},hr:{}};
    const [a,b]=await Promise.all([sb.from('cantor_links').select('num,url'), sb.from('harpa_links').select('num,url')]);
    (a.data||[]).forEach(r=>{ if(r.url) novo.cc[r.num]=r.url; }); (b.data||[]).forEach(r=>{ if(r.url) novo.hr[r.num]=r.url; });
    if(a.error && b.error) return;
    LINKS_HINOS=novo; localStorage.setItem('ibnm_links_hinos',JSON.stringify(novo)); atualizaEtiquetas(); }catch(_){}
}
setTimeout(carregaLinksHinos,3000); setInterval(()=>{ if(document.visibilityState==='visible') carregaLinksHinos(); },60*60*1000);   /* economia: 1x por hora (antes 5 min) */
let _lkUlt=Date.now(); document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible' && Date.now()-_lkUlt>30*60*1000){ _lkUlt=Date.now(); carregaLinksHinos(); } });
setTimeout(()=>{ try{ if(typeof sb==='undefined'||!sb.channel) return; sb.channel('ibnm-links-hinos')
  .on('postgres_changes',{event:'*',schema:'public',table:'cantor_links'},()=>carregaLinksHinos())
  .on('postgres_changes',{event:'*',schema:'public',table:'harpa_links'},()=>carregaLinksHinos()).subscribe(); }catch(_){} },5500);
/* o ADM salvou/apagou um link agora mesmo: atualiza na hora (sem esperar a nuvem) */
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('.cc-sheet button'); if(b && /Salvar|Remover/i.test(b.textContent)) setTimeout(carregaLinksHinos,900); },true);
const ytCache=k=>{ try{ return JSON.parse(localStorage.getItem(k)||'{}')||{}; }catch(_){ return {}; } };
/* As 4 etiquetas, sempre nesta ordem e só quando há conteúdo: cifra · letra · áudio · youtube */
const ETQ_ORDEM=['cifra','letra','áudio','youtube','partitura'];   /* partitura: só nos hinos */
const temTexto=v=>String(v||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/[\s\u00a0\u200b]+/g,'').length>0;
const ytValido=v=>/(^|\/\/)([a-z0-9-]+\.)*(youtube\.com|youtu\.be)\//i.test(String(v||'').trim());
const temAudio=a=>Array.isArray(a) && a.some(x=>x && String(x.url||x.drive||'').trim());
function etiquetasDe(id){
  id=String(id||''); const t=new Set();
  const hino=(lv,n)=>{ if(temAudio((typeof HAUDIOS!=='undefined'&&HAUDIOS)?HAUDIOS[lv+':'+n]:null)) t.add('áudio');
    try{ const h= lv==='hr'? ((window.HARPA||[]).find(x=>+x.n===n)||{n}) : {n};
      if(temPartitura(h, lv==='hr'? true : lv==='hcc'? 'hcc' : false)) t.add('partitura'); }catch(_){} };
  if(id.startsWith('cc:')){ const n=+id.slice(3); t.add('cifra'); t.add('letra'); hino('cc',n); if(LINKS_HINOS.cc[n]) t.add('youtube'); }
  else if(id.startsWith('hr:')){ const n=+id.slice(3); t.add('cifra'); t.add('letra'); hino('hr',n); if(LINKS_HINOS.hr[n]) t.add('youtube'); }
  else if(id.startsWith('hcc:')){ const n=+id.slice(4); const r=(HCC_DB||{})[n]||{}; if(temTexto(r.texto)){ t.add('cifra'); t.add('letra'); } hino('hcc',n); if(r.youtube) t.add('youtube'); }
  else { const m=(DB.musicas||[]).find(x=>x.id===id); if(!m) return [];
    if(temTexto(m.cifra)) t.add('cifra');
    if(temTexto(m.letra)) t.add('letra');
    if(temAudio(m.audios)) t.add('áudio');
    if(ytValido(m.youtube)) t.add('youtube'); }
  return ETQ_ORDEM.filter(x=>t.has(x));
}
window.__etiquetasDe=etiquetasDe;
function poeEtiqueta(row,id){
  const tags=etiquetasDe(id); const txt=tags.join(' · '); const ar=row.querySelector('.s-ar'); if(!ar) return;
  let sp=ar.querySelector('.sl-ok'); if(!txt){ if(sp) sp.remove(); return; }
  if(!sp){ ar.insertAdjacentHTML('beforeend',' <span class="sl-ok"></span>'); sp=ar.querySelector('.sl-ok'); }
  if(sp.textContent!==txt) sp.textContent=txt;
}
function atualizaEtiquetas(){
  document.querySelectorAll('#content .song-row').forEach(row=>{
    const oc=row.getAttribute('onclick')||''; let m=oc.match(/abrirItem\('([^']+)'/)||oc.match(/abrirMusica\('([^']+)'/); if(m) poeEtiqueta(row,m[1]);
  });
}
aoMudar(atualizaEtiquetas);
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') setTimeout(atualizaEtiquetas,1500); });
setInterval(()=>{ if(document.visibilityState==='visible') atualizaEtiquetas(); },20000);

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
  if(DRV_ID(url)){ const u=drvArquivo(url,tipo); if(!u){ window.open('https://drive.google.com/file/d/'+DRV_ID(url)+'/preview','_blank','noopener'); return; }
    return tipo==='pdf'? abrirLeitorPdf(u,tit) : leitorImagem([u],tit); }
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
    let url='';
    const D=(window.__drive&&__drive.ok())? await driveProntoAdm() : null;
    if(D){ const fid=await D.sobe(blob,'Partitura '+({cc:'Cantor',hr:'Harpa',hcc:'HCC'}[L]||L)+' '+h.n+(pdf?'.pdf':'.jpg'),'MM IBNM - Partituras'); url='https://drive.google.com/file/d/'+fid+'/view'; }
    else { toast('Google Drive não conectado: a partitura vai para o Supabase (gasta a cota grátis).');
      const path=L+'/'+h.n+'-'+Date.now()+(pdf?'.pdf':'.jpg');
      const up=await sb.storage.from('partituras').upload(path,blob,{contentType:pdf?'application/pdf':'image/jpeg',upsert:true}); if(up.error) throw up.error;
      url=sb.storage.from('partituras').getPublicUrl(path).data.publicUrl; }
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
  /* Harpa: o editor do link existe, mas o botão não aparecia — o ADM ganha o botão */
  if(adm && harpa===true && window.harpaYtSheet && ![...tools.querySelectorAll('button')].some(b=>/Link do YouTube/i.test(b.textContent))){
    const ga=tools.querySelector('.cc-ga')||tools; const tem=!!tools.querySelector('.cc-yt-chip');
    ga.insertAdjacentHTML('beforeend','<button class="tog" onclick="harpaYtSheet('+h.n+')">'+(tem?'✎ Link do YouTube':'🔗 Link do YouTube')+'</button>'); }
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
  /* 🎧 Áudio — igual à aba Áudio de Músicas: todo mundo vê se já tem áudio salvo,
     o ADM sempre vê (pra poder cadastrar o primeiro) */
  let ba=[...tools.querySelectorAll('button')].find(b=>/🎧/.test(b.textContent));
  if(!ba){ (tools.querySelector('.cc-gm')||tools).insertAdjacentHTML('beforeend','<button class="tog cc-audio">🎧 Áudio</button>'); ba=[...tools.querySelectorAll('button')].find(b=>/🎧/.test(b.textContent)); }
  if(ba){
    const temAudio=(typeof audiosDoHino==='function')&&audiosDoHino(h,harpa).length>0;
    if(adm||temAudio){ ba.style.display=''; ba.onclick=ev=>{ ev.preventDefault(); ev.stopImmediatePropagation(); abrirFerramentaAudioHino(); }; }
    else ba.style.display='none';
  }
  /* usuário: só Cifra · Letra · Partitura · Áudio · Rolagem */
  if(!adm){ tools.querySelectorAll('.cc-ga').forEach(g=>g.style.display='none'); }
  if(forca) tools.dataset.pad='';
}
aoMudar(()=>{ padronizaHino(false); dicaNova(); });

/* ======================= ÁUDIOS DOS HINOS (Cantor, Harpa e HCC) =======================
   Mesmo esquema das partituras (tabela hinos_audios: livro, num, audios jsonb).
   Usa o MESMO motor de áudio das Músicas (um áudio por vez, nada toca sozinho,
   caminhos do Drive com respaldo) — o <audio id="plAudio"> abre dentro desta
   janela e é reconhecido automaticamente pelo mesmo vigia de #47. */
let HAUDIOS={}; try{ HAUDIOS=JSON.parse(localStorage.getItem('ibnm_haudios')||'{}')||{}; }catch(_){}
async function carregaAudiosHinos(){
  try{ if(typeof sb==='undefined') return; const {data,error}=await sb.from('hinos_audios').select('livro,num,audios'); if(error) return;
    const m={}; (data||[]).forEach(r=>m[r.livro+':'+r.num]=r.audios||[]); HAUDIOS=m; localStorage.setItem('ibnm_haudios',JSON.stringify(m)); }catch(_){}
}
setTimeout(carregaAudiosHinos,5700);
(function ligarRtAudiosHinos(){
  try{
    if(typeof sb==='undefined'||!sb||!sb.channel) return;
    const ch=sb.channel('hinos-audios-rt');
    ch.on('postgres_changes',{event:'*',schema:'public',table:'hinos_audios'},()=>{
      carregaAudiosHinos().then(()=>{ try{ padronizaHino(true);
        const marker=document.getElementById('haAudioMarker'); if(marker) abrirFerramentaAudioHino(marker.dataset.livro,+marker.dataset.num);
      }catch(_){} });
    });
    ch.subscribe();
  }catch(_){}
})();
function audiosDoHino(h,harpa){ return HAUDIOS[livroDe(harpa)+':'+h.n] || []; }
async function salvaAudiosHino(livro,num,lista){
  HAUDIOS[livro+':'+num]=lista; try{ localStorage.setItem('ibnm_haudios',JSON.stringify(HAUDIOS)); }catch(_){}
  if(typeof sb!=='undefined'&&sb){ const r=await sb.from('hinos_audios').upsert({livro,num,audios:lista,updated_at:new Date().toISOString()}); if(r.error) throw new Error(r.error.message); }
}
function nomeLivro(harpa){ return harpa==='hcc'?'Hinário HCC':harpa?'Harpa Cristã':'Cantor Cristão'; }
/* `livroForcado`/`numForcado`: usados quando reabrimos a ferramenta sem estar
   necessariamente na tela daquele hino */
window.abrirFerramentaAudioHino=function(livroForcado,numForcado){
  let h, harpa, L;
  if(livroForcado){
    L=livroForcado;
    const lista = L==='cc'? (window.HINOS||[]) : L==='hr'? (window.HARPA||[]) : (typeof hccTodos==='function'?hccTodos():[]);
    h=lista.find(x=>x.n===numForcado); harpa = L==='hcc'?'hcc':(L==='hr');
  } else {
    const atual=hinoAtual(); h=atual.h; harpa=atual.harpa; L=livroDe(harpa);
  }
  if(!h) return;
  const adm=!!(window.ehAdmin&&ehAdmin());
  const lista=audiosDoHino(h,harpa);
  const primeiro=lista[0];
  const corpo = !lista.length
    ? '<div class="empty"><div class="big">🎧</div>Nenhum áudio disponível ainda.</div>'
    : '<div class="player"><div class="pt" id="plNome">'+e(primeiro.nome)+'</div><div class="pa">'+e(h.titulo)+'</div>'
      +'<audio id="plAudio" controls preload="auto" src="'+e(primeiro.url)+'"></audio>'
      +(lista.length>1? '<div class="player-list">'+lista.map((a,i)=>'<button class="'+(i===0?'playing':'')+'" onclick="tocar(\''+e(a.url).replace(/'/g,"\\'")+'\',this,\''+e(a.nome).replace(/'/g,"\\'")+'\')">▶ '+e(a.nome)+'</button>').join('')+'</div>' : '');
  const itensAdm = adm? lista.map((a,i)=>'<div class="info-row"><span class="v" style="font-weight:600">🎧 '+e(a.nome)+'</span><button class="mini-btn sec" onclick="haRemover(\''+L+'\','+h.n+','+i+')">Remover</button></div>').join('') : '';
  const corpoAdm = adm? (
    '<div class="field"><label>Nome do áudio</label><input id="haNome" placeholder="Ex.: Voz guia"></div>'+
    '<div class="field"><label>Link ou ID do Google Drive</label><input id="haUrl" placeholder="Cole o link de compartilhamento do Drive"></div>'+
    '<button class="mini-btn" style="margin-bottom:10px" onclick="haAdicionar(\''+L+'\','+h.n+')">＋ Adicionar áudio</button>'+
    (lista.length&&typeof window.abrirFerramentaTom==='function'?'<button class="mini-btn sec" style="margin-bottom:10px" onclick="abrirFerramentaTom({tipo:\'hino\',livro:\''+L+'\',num:'+h.n+'})">🎼 Detectar/Alterar tom</button>':'')+
    (itensAdm? '<div class="card"><h3>Áudios cadastrados</h3>'+itensAdm+'</div>' : '')
  ) : '';
  abrirModal(
    '<div id="haAudioMarker" data-livro="'+L+'" data-num="'+h.n+'" style="display:none"></div>'+
    '<h3>🎧 Áudios — '+h.n+' · '+e(h.titulo)+' <span class="small">('+nomeLivro(harpa)+')</span></h3>'+
    corpo+corpoAdm+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Fechar</button></div>'
  );
};
window.haAdicionar=async function(livro,num){
  const nomeEl=document.getElementById('haNome'), urlEl=document.getElementById('haUrl');
  const nome=(nomeEl&&nomeEl.value.trim())||''; let v=(urlEl&&urlEl.value.trim())||'';
  if(!nome||!v) return toast('Informe nome e link/ID.');
  let url=v; const mt=v.match(/[-\w]{25,}/); if(!/^https?:/.test(v)&&mt) url=driveUrl(v); else if(mt&&v.includes('drive.google')) url=driveUrl(mt[0]);
  const atual=(HAUDIOS[livro+':'+num]||[]).slice(); atual.push({nome,url});
  try{ await salvaAudiosHino(livro,num,atual); toast('Áudio "'+nome+'" adicionado! 🎧'); abrirFerramentaAudioHino(livro,num); }catch(err){ toast('Erro: '+(err.message||err)); }
};
window.haRemover=async function(livro,num,i){
  const atual=(HAUDIOS[livro+':'+num]||[]).slice(); if(!atual[i]) return;
  if(!confirm('Excluir o áudio "'+(atual[i].nome||'')+'"?')) return;
  atual.splice(i,1);
  try{ await salvaAudiosHino(livro,num,atual); toast('Áudio excluído.'); abrirFerramentaAudioHino(livro,num); }catch(err){ toast('Erro: '+(err.message||err)); }
};

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

.toast{z-index:10050!important;pointer-events:none!important}   /* avisos aparecem por cima das janelas, mas NUNCA bloqueiam o toque nos botões (o aviso apagado ficava invisível por cima do 📢 Publicar) */

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

.cc-sheet-bg{align-items:center!important;padding:16px!important;box-sizing:border-box}
.cc-sheet{border-radius:18px!important;max-height:86vh!important;padding-bottom:20px!important}
`; document.head.appendChild(st);
})();
