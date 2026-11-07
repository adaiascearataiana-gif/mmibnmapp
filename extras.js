/* ============================================================
   MM IBNM — Extras (v1.7.0)
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
new MutationObserver(()=>{ document.querySelectorAll('#content audio').forEach(barraAudio); }).observe(document.getElementById('content')||document.body,{childList:true,subtree:true});

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
  if(podeFin()){
    const btSai=[...pg.querySelectorAll('button')].find(b=>/Sa[ií]da/.test(b.textContent) && /finForm/.test(b.getAttribute('onclick')||''));
    const temEnt=[...pg.querySelectorAll('button')].some(b=>/Entrada/.test(b.textContent) && /finForm/.test(b.getAttribute('onclick')||''));
    if(btSai && !temEnt){ const oc=(btSai.getAttribute('onclick')||'').replace(/saida/g,'entrada'); btSai.insertAdjacentHTML('beforebegin','<button class="mini-btn" onclick="'+oc.replace(/"/g,'&quot;')+'">＋ Entrada</button>'); }
  }
  pg.querySelectorAll('button').forEach(b=>{
    const t=b.textContent.trim();
    if(/finSetAba/.test(b.getAttribute('onclick')||'')){
      if(/Lançamentos/.test(t)) b.textContent='Lançamentos';
      else if(/Saídas/.test(t)) b.textContent='Saídas';
      else if(/Doações recebidas|Recebidas/.test(t)) b.textContent='Recebidas';
      else if(/Minhas/.test(t)) b.textContent='Minhas';
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
new MutationObserver(()=>procuraValores()).observe(document.body,{childList:true,subtree:true});

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
.fin-cmp .fin-abas{display:flex!important;gap:6px!important}
.fin-cmp .fin-abas .mini-btn{flex:1 1 0;min-width:0;padding:7px 2px;font-size:12px;letter-spacing:-.1px;overflow:hidden;text-overflow:ellipsis;text-align:center}
.fin-cmp .info-row{gap:8px;align-items:center}
.fin-cmp .info-row .fin-ic{min-width:38px;width:38px;height:38px;min-height:38px;padding:0;font-size:16px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px}
.fin-cmp .info-row .v{font-size:14px}
.rs-in{width:100%;box-sizing:border-box;font-variant-numeric:tabular-nums;font-weight:700}
.ex-rec{white-space:pre-wrap;font-family:inherit;font-size:14px;background:#f6faf8;border-radius:10px;padding:12px;color:#234}
`; document.head.appendChild(st);
})();
