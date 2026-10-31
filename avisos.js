/* ============================================================
   MM IBNM — Avisos e notificações (v0.6.0)
   - tocar na notificação abre a página dela (escala, playlist, música...)
   - avisos do ADM em janela (popup) com X para fechar
   - sons de notificação (o usuário escolhe)
   - aniversários: avisa todos no dia
   - escala: aviso prioritário na segunda 00:01 (esta semana)
     e aviso 1 semana antes (próxima semana)
   - confirmação de presença: só para os ADM
============================================================ */
(function(){
'use strict';
const e = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sem = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const $id = id => document.getElementById(id);
const temNuvem = () => typeof sb!=='undefined' && !!sb;
const eu = () => (typeof usuarioAtual==='function' && usuarioAtual()) || null;

/* ================= LINKS ================= */
function linkPadrao(titulo,corpo){
  const t=sem(titulo+' '+corpo);
  if(/ao vivo|transmiss/.test(t)) return 'aovivo';
  if(/aniver/.test(t)) return 'go:inicio';
  if(/escala|presenc/.test(t)) return 'go:escala';
  if(/playlist|ordem do culto/.test(t)) return 'go:playlist';
  if(/cantadas|ja cantamos/.test(t)) return 'go:cantadas';
  if(/cantor cristao|\bhino\b/.test(t)) return 'go:cantor';
  if(/musica/.test(t)){
    const m=(DB.musicas||[]).slice().sort((a,b)=>b.titulo.length-a.titulo.length).find(x=>x.titulo && sem(corpo).includes(sem(x.titulo)));
    return m? 'mus:'+m.id : 'go:musicas';
  }
  return '';
}
const linkDe = n => n.link==='none' ? '' : (n.link || linkPadrao(n.titulo||'',n.corpo||''));
window.abrirLinkNotif=function(link){
  if(!link) return false;
  const [tipo,...r]=String(link).split(':'); const v=r.join(':');
  try{
    if(tipo==='go' && typeof ROTAS!=='undefined'){ const [pg,ar]=v.split(':'); if(ROTAS[pg]){ go(pg,ar); return true; } }
    if(tipo==='mus' && (DB.musicas||[]).find(m=>m.id===v)){ abrirMusica(v,'cifra'); return true; }
    if(tipo==='cc' && window.cantorAbrir){ cantorAbrir(+v); return true; }
    if(tipo==='aovivo'){ if(typeof AO_VIVO!=='undefined' && AO_VIVO && AO_VIVO.ativo && window.abrirItem){ abrirItem(AO_VIVO.musica_id); return true; } go('inicio'); return true; }
  }catch(_){}
  return false;
};
const NOME_LINK={'go:escala':'Ver a escala','go:playlist':'Ver a playlist','go:playlist:prox':'Ver a playlist da próxima semana','go:musicas':'Ver músicas','go:cantor':'Abrir o Cantor','go:cantadas':'Ver músicas cantadas','go:inicio':'Ir ao início','aovivo':'Acompanhar ao vivo'};
const nomeLink = l => NOME_LINK[l] || (String(l).indexOf('mus:')===0?'Abrir a música':String(l).indexOf('cc:')===0?'Abrir o hino':'Abrir');

/* ================= GRAVAR NOTIFICAÇÕES (com link e popup) ================= */
async function inserir(rows){
  if(!temNuvem()||!rows.length) return {error:null};
  let r=await sb.from('notificacoes').insert(rows);
  if(r.error && /link|popup|column|schema/i.test(r.error.message||'')){
    r=await sb.from('notificacoes').insert(rows.map(x=>{ const y=Object.assign({},x); delete y.link; delete y.popup; return y; }));
  }
  return r;
}
function local(email,n){ email=(email||'').toLowerCase(); if(!DB.notificacoes[email]) DB.notificacoes[email]=[]; DB.notificacoes[email].unshift(Object.assign({id:'tmp'+Date.now()+Math.random(),lida:false},n)); }
window.notificar=notificar=function(email,ic,titulo,corpo,opts){
  opts=opts||{}; const now=new Date().toISOString(); const link=opts.link||linkPadrao(titulo,corpo); const popup=!!opts.popup;
  local(email,{ic,titulo,corpo,data:now,link,popup});
  inserir([{destino_email:(email||'').toLowerCase(),ic,titulo,corpo,data:now,lida:false,link,popup}]);
};
window.notificarTodos=notificarTodos=function(ic,titulo,corpo,filtro,opts){
  opts=opts||{}; const now=new Date().toISOString(); const link=opts.link||linkPadrao(titulo,corpo); const popup=!!opts.popup;
  const alvos=(DB.usuarios||[]).filter(u=>!filtro||filtro(u));
  alvos.forEach(u=>local(u.email,{ic,titulo,corpo,data:now,link,popup}));
  return inserir(alvos.map(u=>({destino_email:(u.email||'').toLowerCase(),ic,titulo,corpo,data:now,lida:false,link,popup})));
};
/* carregar com link/popup */
if(typeof cloudNotif==='function'){
  window.cloudNotif=cloudNotif=async function(){
    if(typeof _sessaoEmail==='undefined'||!_sessaoEmail) return;
    const {data}=await sb.from('notificacoes').select('*').eq('destino_email',_sessaoEmail).order('data',{ascending:false}).limit(200);
    DB.notificacoes[_sessaoEmail]=(data||[]).map(n=>({id:n.id,ic:n.ic,titulo:n.titulo,corpo:n.corpo,data:n.data,lida:!!n.lida,link:n.link||'',popup:!!n.popup}));
  };
}
async function marcarLida(id){
  const u=eu(); if(!u) return; const n=(DB.notificacoes[u.email]||[]).find(x=>x.id===id); if(n) n.lida=true;
  try{ atualizaBadge(); }catch(_){}
  if(temNuvem() && id && String(id).indexOf('tmp')!==0) try{ await sb.from('notificacoes').update({lida:true}).eq('id',id); }catch(_){}
}

/* aviso único: o servidor garante que cada aviso sai uma vez só (mesmo com vários celulares abrindo o app) */
let _rpcOk=null;
async function avisoUnico(chave,emails,ic,titulo,corpo,link,popup){
  emails=[...new Set(emails.map(x=>(x||'').toLowerCase()).filter(Boolean))]; if(!emails.length) return false;
  if(temNuvem() && _rpcOk!==false){
    const {data,error}=await sb.rpc('enviar_aviso',{p_chave:chave,p_emails:emails,p_ic:ic,p_titulo:titulo,p_corpo:corpo,p_link:link||'',p_popup:!!popup});
    if(!error){ _rpcOk=true; if(data===true){ const me=(eu()||{}).email; if(emails.includes(me)) local(me,{ic,titulo,corpo,data:new Date().toISOString(),link,popup}); } return data===true; }
    _rpcOk=false;
  }
  /* sem a função no banco (SQL seção 11 não rodada): só o ADM envia, e cada aparelho lembra o que já mandou */
  if(!(window.ehAdminReal? ehAdminReal() : ehAdmin())) return false;
  const k='ibnm_aviso_'+chave; if(localStorage.getItem(k)) return false; localStorage.setItem(k,'1');
  const now=new Date().toISOString();
  emails.forEach(m=>local(m,{ic,titulo,corpo,data:now,link,popup}));
  await inserir(emails.map(m=>({destino_email:m,ic,titulo,corpo,data:now,lida:false,link,popup})));
  return true;
}

/* ================= SONS ================= */
const SONS={
  sino:{nm:'🔔 Sino'}, harpa:{nm:'🎼 Harpa'}, marimba:{nm:'🥁 Marimba'}, acorde:{nm:'🎹 Acorde suave'},
  triangulo:{nm:'🔺 Triângulo'}, orgao:{nm:'⛪ Órgão'}, louvor:{nm:'🎵 Melodia de louvor'}, gota:{nm:'💧 Gota'}, nenhum:{nm:'🔕 Sem som'}
};
const somAtual = () => localStorage.getItem('ibnm_som') || 'sino';
const volume = () => { const v=parseFloat(localStorage.getItem('ibnm_som_vol')); return isNaN(v)?0.7:Math.max(0,Math.min(1,v)); };
let AC=null;
function ac(){ if(!AC){ const C=window.AudioContext||window.webkitAudioContext; if(!C) return null; AC=new C(); } if(AC.state==='suspended') AC.resume(); return AC; }
['pointerdown','touchstart','keydown'].forEach(ev=>document.addEventListener(ev,function un(){ try{ ac(); }catch(_){} document.removeEventListener(ev,un,true); },true));
const F=n=>440*Math.pow(2,(n-69)/12);  /* número MIDI → frequência */
function nota(c,out,midi,t,dur,{tipo='sine',ganho=0.3,ataque=0.005,parciais=null}={}){
  const g=c.createGain(); g.connect(out);
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(ganho,t+ataque); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  (parciais||[[1,1]]).forEach(([mult,amp])=>{ const o=c.createOscillator(); o.type=tipo; o.frequency.value=F(midi)*mult; const gg=c.createGain(); gg.gain.value=amp; o.connect(gg); gg.connect(g); o.start(t); o.stop(t+dur+0.05); });
}
window.tocarSom=function(id){
  id=id||somAtual(); if(id==='nenhum') return; const c=ac(); if(!c) return;
  const out=c.createGain(); out.gain.value=volume(); out.connect(c.destination); const t=c.currentTime+0.02;
  const sino=[[1,1],[2.76,.4],[5.4,.2]];
  switch(id){
    case 'sino': nota(c,out,88,t,1.4,{parciais:sino,ganho:.35}); nota(c,out,83,t+.28,1.6,{parciais:sino,ganho:.3}); break;
    case 'harpa': [72,76,79,84].forEach((m,i)=>nota(c,out,m,t+i*.09,.9,{tipo:'triangle',ganho:.3})); break;
    case 'marimba': nota(c,out,79,t,.35,{ganho:.45,parciais:[[1,1],[4,.25]]}); nota(c,out,84,t+.16,.5,{ganho:.45,parciais:[[1,1],[4,.25]]}); break;
    case 'acorde': [60,64,67,72].forEach(m=>nota(c,out,m,t,1.3,{ganho:.13,ataque:.06})); break;
    case 'triangulo': nota(c,out,100,t,1.6,{ganho:.18,parciais:[[1,1],[1.5,.3]]}); nota(c,out,100,t+.35,1.6,{ganho:.15,parciais:[[1,1],[1.5,.3]]}); break;
    case 'orgao': [[65,0],[72,.22],[77,.44]].forEach(([m,d])=>nota(c,out,m,t+d,.5,{tipo:'square',ganho:.06,ataque:.03,parciais:[[1,1],[2,.5]]})); break;
    case 'louvor': [[67,0,.18],[69,.18,.18],[71,.36,.18],[74,.54,.6]].forEach(([m,d,du])=>nota(c,out,m,t+d,du+.15,{tipo:'triangle',ganho:.28})); break;
    case 'gota': { const o=c.createOscillator(), g=c.createGain(); o.frequency.setValueAtTime(1300,t); o.frequency.exponentialRampToValueAtTime(500,t+.18); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.5,t+.01); g.gain.exponentialRampToValueAtTime(.0001,t+.3); o.connect(g); g.connect(out); o.start(t); o.stop(t+.35); break; }
  }
  try{ if(navigator.vibrate) navigator.vibrate([60,40,60]); }catch(_){}
};
window.escolherSom=function(id){ localStorage.setItem('ibnm_som',id); tocarSom(id); document.querySelectorAll('.som-op').forEach(b=>b.classList.toggle('on',b.dataset.s===id)); };
window.volumeSom=function(v){ localStorage.setItem('ibnm_som_vol',v); };
function cardSom(){
  return '<div class="card av-som"><h3>🔊 Som das notificações</h3><p class="av-p">Toque para ouvir e escolher. Toca quando chega um aviso com o app aberto.</p><div class="som-grid">'+
    Object.keys(SONS).map(k=>'<button type="button" class="som-op '+(somAtual()===k?'on':'')+'" data-s="'+k+'" onclick="escolherSom(\''+k+'\')">'+SONS[k].nm+'</button>').join('')+
    '</div><label class="av-vol">Volume <input type="range" min="0" max="1" step="0.05" value="'+volume()+'" oninput="volumeSom(this.value)" onchange="tocarSom()"></label></div>';
}

/* ================= TELA DE NOTIFICAÇÕES (tocar abre a página) ================= */
window.abrirNotif=function(id){
  const u=eu(); const n=(DB.notificacoes[u.email]||[]).find(x=>String(x.id)===String(id)); if(!n) return;
  marcarLida(n.id); const l=linkDe(n);
  if(!abrirLinkNotif(l)) mostrarPopup(n,true);
};
if(typeof ROTAS!=='undefined'){
  ROTAS.notificacoes=function(){
    const u=eu(); const lista=DB.notificacoes[u.email]||[];
    const html='<div class="page"><div class="page-ttl">🔔 Notificações</div>'+
      ((window.ehAdmin&&ehAdmin())?'<button class="mini-btn" style="margin-bottom:12px" onclick="modalAviso()">📣 Enviar aviso aos membros</button>':'')+
      (lista.length? lista.map(n=>{ const l=linkDe(n); return '<div class="notif-item av-it '+(n.lida?'':'unread')+'" role="button" tabindex="0" onclick="abrirNotif(\''+e(n.id)+'\')"><div class="ni-ic">'+e(n.ic||'🔔')+'</div><div style="flex:1;min-width:0"><div class="ni-t">'+e(n.titulo)+'</div><div class="ni-b">'+e(n.corpo)+'</div><div class="ni-dt">'+fmtDataHora(n.data)+(l?' · <span class="av-lk">'+e(nomeLink(l))+' ›</span>':'')+'</div></div></div>'; }).join('')
        : '<div class="empty"><div class="big">🔔</div>Nenhuma notificação.</div>')+
      cardSom()+'</div>';
    (DB.notificacoes[u.email]||[]).forEach(n=>n.lida=true); try{ cloudMarkRead(); }catch(_){} setTimeout(()=>{ try{ atualizaBadge(); }catch(_){} },0);
    return html;
  };
  if(ROTAS.perfil){ const _pf=ROTAS.perfil; ROTAS.perfil=function(){ const h=_pf.apply(this,arguments); const i=h.lastIndexOf('</div>'); return i>=0? h.slice(0,i)+cardSom()+h.slice(i) : h; }; }
}

/* ================= POPUP (janela com X) ================= */
const fila=[]; let mostrando=false; const vistos=new Set();
function mostrarPopup(n,forcar){
  if(!forcar && (vistos.has(String(n.id)))) return; vistos.add(String(n.id));
  fila.push(n); proximo();
}
function proximo(){
  if(mostrando||!fila.length||$id('cadGate')||$id('avEscala')) return;
  const n=fila.shift(); mostrando=true; const l=linkDe(n);
  const bg=document.createElement('div'); bg.className='av-bg'; bg.id='avPop';
  bg.innerHTML='<div class="av-card" role="dialog" aria-modal="true"><button class="av-x" aria-label="Fechar">✕</button><div class="av-ic">'+e(n.ic||'📣')+'</div><div class="av-tt">'+e(n.titulo)+'</div><div class="av-tx">'+e(n.corpo).replace(/\n/g,'<br>')+'</div><div class="av-dt">'+(n.data?fmtDataHora(n.data):'')+'</div>'+
    (l?'<button class="btn btn-primary av-go">'+e(nomeLink(l))+'</button>':'<button class="btn btn-primary av-ok">Entendi</button>')+'</div>';
  document.body.appendChild(bg);
  const fechar=()=>{ bg.remove(); mostrando=false; marcarLida(n.id); setTimeout(proximo,250); };
  bg.querySelector('.av-x').onclick=fechar;
  bg.addEventListener('click',ev=>{ if(ev.target===bg) fechar(); });
  const ok=bg.querySelector('.av-ok'); if(ok) ok.onclick=fechar;
  const gob=bg.querySelector('.av-go'); if(gob) gob.onclick=()=>{ fechar(); abrirLinkNotif(l); };
  const obs=new MutationObserver(()=>{ if(!bg.isConnected){ obs.disconnect(); if(mostrando){ mostrando=false; marcarLida(n.id); setTimeout(proximo,250); } } }); obs.observe(document.body,{childList:true});
}
function popupsPendentes(){ const u=eu(); if(!u) return; (DB.notificacoes[u.email]||[]).filter(n=>n.popup&&!n.lida).slice().reverse().forEach(n=>mostrarPopup(n)); }

/* ================= NOVAS NOTIFICAÇÕES: som + popup + aviso do sistema ================= */
let conhecidas=null;
window.notifSistema=notifSistema=function(){};      /* tratado abaixo (com link) */
function verNovas(){
  const u=eu(); if(!u) return; const lista=DB.notificacoes[u.email]||[];
  if(conhecidas===null){ conhecidas=new Set(lista.map(n=>String(n.id))); popupsPendentes(); return; }
  const novas=lista.filter(n=>!n.lida && !conhecidas.has(String(n.id)) && String(n.id).indexOf('tmp')!==0);
  lista.forEach(n=>conhecidas.add(String(n.id)));
  if(!novas.length) return;
  tocarSom();
  const n=novas[0];
  try{ if(document.visibilityState!=='visible' && ('Notification' in window) && Notification.permission==='granted'){
    const no=new Notification(n.titulo||'MM IBNM',{body:n.corpo||'',icon:'icon-192.png',badge:'icon-192.png',tag:'ibnm-'+n.id});
    no.onclick=()=>{ try{ window.focus(); }catch(_){} no.close(); marcarLida(n.id); if(!abrirLinkNotif(linkDe(n))) go('notificacoes'); }; } }catch(_){}
  novas.filter(x=>x.popup).reverse().forEach(x=>mostrarPopup(x));
}
if(typeof atualizaBadge==='function'){ const _ab=atualizaBadge; window.atualizaBadge=atualizaBadge=function(){ _ab.apply(this,arguments); try{ verNovas(); }catch(_){} }; }

/* ================= AVISO DO ADM ================= */
window.modalAviso=function(){
  if(!ehAdmin()) return;
  const fn=[...(typeof VOCAL!=='undefined'?VOCAL:[]),...(typeof INSTR!=='undefined'?INSTR:[])];
  abrirModal('<h3>📣 Enviar aviso</h3><div id="avErr"></div>'+
    '<div class="field"><label>Título</label><input id="avTit" maxlength="80" placeholder="Ex.: Ensaio extra no sábado"></div>'+
    '<div class="field"><label>Mensagem</label><textarea id="avMsg" rows="4" maxlength="600" placeholder="Escreva o aviso…"></textarea></div>'+
    '<div class="field"><label>Para quem</label><select id="avPara"><option value="todos">Todos os membros</option><option value="semana">Escalados desta semana</option><option value="prox">Escalados da próxima semana</option><option value="vocal">Todo o vocal</option><option value="instr">Todos os instrumentistas</option><option value="adm">Só os ADM</option>'+
      fn.map(f=>'<option value="f:'+e(f)+'">'+e(f)+'</option>').join('')+'</select></div>'+
    '<div class="field"><label>Ao tocar, abrir</label><select id="avLink"><option value="">Nada (só o aviso)</option><option value="go:escala">Escala</option><option value="go:playlist">Playlist / ordem do culto</option><option value="go:musicas">Músicas</option><option value="go:cantor">Cantor Cristão</option><option value="go:cantadas">Músicas que já cantamos</option><option value="go:inicio">Início</option></select></div>'+
    '<label class="check-inline" style="color:var(--verde-escuro)"><input type="checkbox" id="avPopChk" checked> Mostrar em janela (popup) assim que a pessoa abrir o app</label>'+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Cancelar</button><button class="btn btn-primary" onclick="enviarAvisoAdm()">Enviar</button></div>');
};
function escaladosDa(off){
  const i=window.__escIdxSemana? __escIdxSemana(off) : -1; if(i<0) return [];
  const l=escalaAtiva().linhas[i]; return (DB.usuarios||[]).filter(u=>colsDoUsuarioNaLinha(l,u).length);
}
window.enviarAvisoAdm=async function(){
  const tit=$id('avTit').value.trim(), msg=$id('avMsg').value.trim(), para=$id('avPara').value, link=$id('avLink').value, pop=$id("avPopChk").checked;
  if(!tit||!msg){ $id('avErr').innerHTML='<div class="err-msg">Escreva o título e a mensagem.</div>'; return; }
  let alvos;
  if(para==='semana') alvos=escaladosDa(0); else if(para==='prox') alvos=escaladosDa(1);
  else if(para==='vocal') alvos=(DB.usuarios||[]).filter(u=>(u.vocal||[]).length);
  else if(para==='instr') alvos=(DB.usuarios||[]).filter(u=>(u.instr||[]).length);
  else if(para==='adm') alvos=(DB.usuarios||[]).filter(u=>u.admin);
  else if(para.indexOf('f:')===0){ const f=para.slice(2); alvos=(DB.usuarios||[]).filter(u=>(u.vocal||[]).includes(f)||(u.instr||[]).includes(f)); }
  else alvos=(DB.usuarios||[]).slice();
  if(!alvos.length){ $id('avErr').innerHTML='<div class="err-msg">Ninguém nesse grupo.</div>'; return; }
  const ids=new Set(alvos.map(u=>u.id));
  const r=await notificarTodos('📣',tit,msg,u=>ids.has(u.id),{link:link||'none',popup:pop});
  if(r&&r.error){ $id('avErr').innerHTML='<div class="err-msg">Erro: '+e(r.error.message)+'</div>'; return; }
  fecharModal(); toast('Aviso enviado para '+alvos.length+' pessoa(s).');
};
/* "none" = sem link de propósito */
const _abrirLink=window.abrirLinkNotif; window.abrirLinkNotif=function(l){ if(l==='none') return false; return _abrirLink(l); };
if(typeof ROTAS!=='undefined' && ROTAS.admin){
  const _ad=ROTAS.admin;
  ROTAS.admin=function(){ const h=_ad.apply(this,arguments); if(!ehAdmin()) return h;
    const card='<div class="card"><h3>📣 Avisos</h3><p style="font-size:13px;color:#556;margin-bottom:10px">Mande um recado para todos, para os escalados ou para uma função. Pode aparecer em janela quando a pessoa abrir o app.</p><button class="mini-btn" onclick="modalAviso()">Enviar aviso</button></div>';
    const i=h.indexOf('<div class="card">'); return i>=0? h.slice(0,i)+card+h.slice(i) : h+card; };
}

/* ================= PRESENÇA: só os ADM recebem ================= */
if(typeof confirmarPresenca==='function'){
  window.confirmarPresenca=confirmarPresenca=async function(status){
    const u=eu(); if(!u) return;
    const obs=(($id('presObs')&&$id('presObs').value)||'').trim(); const semana=semanaISO();
    const row={user_id:_sessaoId,semana,email:u.email,nome:u.nome,status,obs,updated_at:new Date().toISOString()};
    const {error}=await sb.from('presencas').upsert(row,{onConflict:'user_id,semana'});
    if(error) return toast('Erro: '+error.message);
    if(!DB.presencas) DB.presencas={}; DB.presencas[u.email]=row;
    const txt=u.nome+(status==='confirmado'?' confirmou presença na escala desta semana.':' avisou que NÃO poderá participar nesta semana.')+(obs?' Obs.: '+obs:'');
    notificarTodos(status==='confirmado'?'✅':'❌','Presença na escala',txt,x=>x.admin && x.email!==u.email,{link:'go:escala'});
    toast(status==='confirmado'?'Presença confirmada! 🙌':'Avisamos que você não poderá. Obrigado por avisar!');
    const p=$id('avEscala'); if(p){ p.remove(); setTimeout(proximo,200); }
    go('escala');
  };
}

/* ================= ESCALA: aviso prioritário + 1 semana antes ================= */
function textoEscala(i,u){
  const info=window.__escLinhaInfo? __escLinhaInfo(i) : null; const l=escalaAtiva().linhas[i];
  const cols=colsDoUsuarioNaLinha(l,u).map(c=>String(c).toLowerCase().replace(/(^|\s)(\S)/g,(m,a,b)=>a+b.toUpperCase()));
  return {quando: info? (info.dia?info.dia+', ':'')+info.data+' · '+info.evento : '', funcoes: cols.join(', ')};
}
async function enviarAvisosEscala(){
  if(!window.__escIdxSemana) return 0; const seg=semanaISO(); let n=0;
  const i0=__escIdxSemana(0), i1=__escIdxSemana(1);
  for(const u of (DB.usuarios||[])){
    if(i0>=0 && colsDoUsuarioNaLinha(escalaAtiva().linhas[i0],u).length){ const t=textoEscala(i0,u);
      if(await avisoUnico('escala:'+seg+':'+u.id,[u.email],'📍','Você está na escala desta semana',(t.quando?t.quando+' — ':'')+'Função: '+t.funcoes+'. Confirme sua presença no app.','go:escala',false)) n++; }
    if(i1>=0 && colsDoUsuarioNaLinha(escalaAtiva().linhas[i1],u).length){ const t=textoEscala(i1,u);
      if(await avisoUnico('escala-prox:'+seg+':'+u.id,[u.email],'📅','Você está na escala da próxima semana',(t.quando?t.quando+' — ':'')+'Função: '+t.funcoes+'. Já vá se preparando!','go:escala',false)) n++; }
  }
  return n;
}
window.enviarAvisosEscala=enviarAvisosEscala;
/* janela prioritária ao abrir o app (a partir de segunda 00:01) até a pessoa responder */
function popupEscala(){
  const u=eu(); if(!u||$id('avEscala')||$id('cadGate')) return;
  const i=window.__escIdxSemana? __escIdxSemana(0) : -1; if(i<0) return;
  const l=escalaAtiva().linhas[i]; if(!colsDoUsuarioNaLinha(l,u).length) return;
  if(typeof minhaPresenca==='function' && minhaPresenca()) return;
  const k='ibnm_esc_pop_'+u.email+'_'+semanaISO()+'_'+new Date().toDateString(); if(localStorage.getItem(k)) return;
  const t=textoEscala(i,u);
  const bg=document.createElement('div'); bg.className='av-bg'; bg.id='avEscala';
  bg.innerHTML='<div class="av-card esc" role="dialog" aria-modal="true"><button class="av-x" aria-label="Fechar">✕</button><div class="av-ic">📍</div><div class="av-tt">Você está na escala desta semana</div>'+
    '<div class="av-tx"><b>'+e(t.quando)+'</b><br>Função: <b>'+e(t.funcoes)+'</b></div>'+
    '<div class="av-bt"><button class="btn btn-primary" onclick="confirmarPresenca(\'confirmado\')">✅ Vou participar</button><button class="btn btn-dark" onclick="confirmarPresenca(\'ausente\')">❌ Não poderei</button></div>'+
    '<button class="av-lnk" onclick="document.getElementById(\'avEscala\').remove();go(\'escala\')">Ver a escala completa ›</button></div>';
  document.body.appendChild(bg);
  const fechar=()=>{ localStorage.setItem(k,'1'); bg.remove(); setTimeout(proximo,250); };
  bg.querySelector('.av-x').onclick=fechar;
  const obs=new MutationObserver(()=>{ if(!bg.isConnected){ obs.disconnect(); localStorage.setItem(k,'1'); setTimeout(proximo,250); } }); obs.observe(document.body,{childList:true});
}
window.popupEscala=popupEscala;
/* o sistema antigo (por aparelho) foi substituído por este */
window.verificaEscalaSemanal=verificaEscalaSemanal=function(){};
window.notificaEscalados=notificaEscalados=function(){ enviarAvisosEscala().then(n=>{ if(n) toast(n+' aviso(s) de escala enviados.'); }); return 0; };
window.notificarImportacaoEscala=notificarImportacaoEscala=function(){
  notificarTodos('📋','Escala atualizada','A escala do Ministério foi atualizada. Toque para conferir.',null,{link:'go:escala'});
  notificaEscalados();
};

/* ================= ANIVERSÁRIOS ================= */
const hojeMD = () => { const d=new Date(); return String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
function mdDe(nasc){ const s=String(nasc||'').slice(5,10); if(s==='02-29'){ const a=new Date().getFullYear(); if(!((a%4===0&&a%100!==0)||a%400===0)) return '02-28'; } return s; }
const idadeEm = (nasc,ano) => ano-(+String(nasc).slice(0,4));
function aniversariantes(dias){
  const h=new Date(); h.setHours(0,0,0,0); const out=[];
  (DB.usuarios||[]).forEach(u=>{ if(!u.nasc) return; const md=mdDe(u.nasc); if(!/^\d\d-\d\d$/.test(md)) return;
    for(let k=0;k<=dias;k++){ const d=new Date(h); d.setDate(h.getDate()+k); const m=String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      if(m===md){ out.push({u,dias:k,data:d}); break; } } });
  return out.sort((a,b)=>a.dias-b.dias);
}
async function avisarAniversarios(){
  const ano=new Date().getFullYear(); const todos=(DB.usuarios||[]).map(u=>u.email);
  for(const {u} of aniversariantes(0)){
    const nome=(u.nome||'').trim(); const pn=nome.split(' ')[0]; const id=idadeEm(u.nasc,ano);
    await avisoUnico('aniver:'+u.id+':'+ano,todos.filter(m=>m!==u.email),'🎂','Hoje tem aniversariante! 🎉','Hoje é aniversário de '+nome+'. Mande seus parabéns e uma oração por '+pn+'!','go:inicio',false);
    await avisoUnico('aniver-eu:'+u.id+':'+ano,[u.email],'🎉','Feliz aniversário, '+pn+'!','O Ministério de Música da IBNM celebra a sua vida! Que Deus te abençoe neste novo ano'+(id>0&&id<120?' ('+id+' anos)':'')+'. 🎂','go:inicio',true);
  }
}
if(typeof ROTAS!=='undefined' && ROTAS.inicio){
  const _ini=ROTAS.inicio;
  ROTAS.inicio=function(){
    let h=_ini.apply(this,arguments); const lista=aniversariantes(7); if(!lista.length) return h;
    const card='<div class="card av-aniv"><h3>🎂 Aniversariantes</h3>'+lista.map(({u,dias,data})=>'<div class="av-an '+(dias===0?'hj':'')+'">'+
      (u.foto?'<img src="'+e(u.foto)+'" alt="">':'<span class="ini">'+e((u.nome||'?').charAt(0).toUpperCase())+'</span>')+
      '<div style="flex:1;min-width:0"><b>'+e(u.nome)+'</b><small>'+(dias===0?'🎉 Hoje!':dias===1?'Amanhã':String(data.getDate()).padStart(2,'0')+'/'+String(data.getMonth()+1).padStart(2,'0'))+'</small></div>'+
      (dias===0&&u.wpp&&String(u.tel||'').replace(/\D/g,'').length>=10?'<a class="av-wa" target="_blank" rel="noopener" href="https://wa.me/55'+String(u.tel).replace(/\D/g,'')+'?text='+encodeURIComponent('Feliz aniversário, '+(u.nome||'').split(' ')[0]+'! 🎉 Que Deus te abençoe!')+'">Dar parabéns</a>':'')+'</div>').join('')+'</div>';
    const k=h.indexOf('<div class="card">'); return k>=0? h.slice(0,k)+card+h.slice(k) : h.replace(/<\/div>\s*$/,card+'</div>');
  };
}

/* ================= ROTINA: ao abrir o app e a cada minuto (pega a virada de segunda 00:01) ================= */
let ultSemana='', ultDia='';
async function rotina(forcar){
  const u=eu(); if(!u || typeof _booted!=='undefined' && !_booted) return;
  /* se a lista veio da carga antiga (sem link/popup), recarrega uma vez */
  if(forcar){ const l=DB.notificacoes[u.email]||[]; if(l.some(n=>!('popup' in n))){ try{ await cloudNotif(); conhecidas=null; atualizaBadge(); }catch(_){} } }
  const s=semanaISO(), d=new Date().toDateString();
  if(forcar || s!==ultSemana){ ultSemana=s; try{ await enviarAvisosEscala(); }catch(_){} }
  if(forcar || d!==ultDia){ ultDia=d; try{ await avisarAniversarios(); }catch(_){} }
  popupEscala(); popupsPendentes();
}
if(typeof iniciarApp==='function'){
  const _ia=iniciarApp;
  window.iniciarApp=iniciarApp=function(){ _ia.apply(this,arguments); setTimeout(()=>rotina(true),900); };
}
setInterval(()=>rotina(false),60000);
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') rotina(false); });
/* se o app terminou de carregar antes deste arquivo, recarrega as notificações com link/popup */
if(typeof _booted!=='undefined' && _booted){ Promise.resolve(cloudNotif()).then(()=>{ conhecidas=null; try{ atualizaBadge(); }catch(_){} }).catch(()=>{}); setTimeout(()=>rotina(true),900); }

/* ================= estilos ================= */
const css=`
.av-it{cursor:pointer}
.av-it:active{transform:scale(.99)}
.av-lk{color:var(--verde-med);font-weight:800}
.av-p{font-size:12.5px;color:#556;margin-bottom:8px}
.som-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.som-op{border:1px solid #cfdad4;background:#fff;border-radius:10px;min-height:40px;font-weight:700;font-size:13px;color:var(--verde-escuro);text-align:left;padding:6px 10px}
.som-op.on{background:var(--verde-med);color:#fff;border-color:var(--verde-med)}
.av-vol{display:flex;align-items:center;gap:10px;margin-top:10px;font-size:13px;font-weight:700;color:var(--verde-escuro)}
.av-vol input{flex:1;accent-color:var(--verde-med)}
.av-bg{position:fixed;inset:0;z-index:10500;background:rgba(5,25,18,.55);display:flex;align-items:center;justify-content:center;padding:20px;animation:avIn .18s ease}
@keyframes avIn{from{opacity:0}to{opacity:1}}
.av-card{position:relative;width:100%;max-width:420px;background:#fff;border-radius:20px;padding:26px 20px 18px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.35);color:var(--verde-escuro)}
.av-card.esc{border-top:6px solid var(--dourado)}
.av-x{position:absolute;top:10px;right:10px;width:40px;height:40px;border-radius:50%;border:0;background:#eef3f0;font-size:18px;font-weight:800;color:#456}
.av-ic{font-size:44px;line-height:1}
.av-tt{font-size:19px;font-weight:900;margin:8px 0 6px}
.av-tx{font-size:15px;line-height:1.5;color:#334;margin-bottom:6px;white-space:normal;word-break:break-word}
.av-dt{font-size:11.5px;color:#8a9;margin-bottom:14px}
.av-bt{display:flex;gap:8px;margin-top:12px}
.av-bt .btn{flex:1}
.av-lnk{margin-top:10px;border:0;background:none;color:var(--verde-med);font-weight:800;font-size:13.5px}
.av-aniv .av-an{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid #eef2ef}
.av-aniv .av-an:first-of-type{border-top:0}
.av-aniv .av-an.hj b{color:#8a6a00}
.av-aniv img,.av-aniv .ini{width:40px;height:40px;border-radius:50%;object-fit:cover;background:var(--verde-med);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;flex:none}
.av-aniv .av-an.hj img,.av-aniv .av-an.hj .ini{box-shadow:0 0 0 3px var(--dourado)}
.av-aniv small{display:block;font-size:12px;color:#6b8378}
.av-wa{background:#25d366;color:#fff;font-size:12px;font-weight:800;border-radius:16px;padding:6px 10px;text-decoration:none;white-space:nowrap}
`;
const st=document.createElement('style'); st.id='ibnmAvisos'; st.textContent=css; document.head.appendChild(st);
})();
