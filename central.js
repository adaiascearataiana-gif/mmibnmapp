/* ============================================================
   MM IBNM — Central de avisos do ADM + lembrete a cada 7 dias (v0.8.0)
   ADM escolhe o que avisar: músicas novas (lista desde o último aviso),
   materiais de estudo novos, playlist, escala, presença, cadastro,
   aniversariantes ou aviso livre — e para quem.
   Membros: a cada 7 dias, uma janela com o que falta (foto, WhatsApp,
   notificações, confirmação na escala com Sim/Não).
============================================================ */
(function(){
'use strict';
const e = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $id = id => document.getElementById(id);
const cfg = k => ((typeof APP_CFG!=='undefined'&&APP_CFG[k])||{});
const fmt = iso => { if(!iso) return ''; const d=new Date(iso); return isNaN(d)? '' : String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0'); };
const DIA=864e5;

/* aviso automático de "Nova música" ao publicar: o ADM decide (padrão: desligado; ele escolhe na Central) */
const autoMusica = () => !!cfg('notif_cfg').auto_musica;
if(typeof notificarTodos==='function'){
  const _nt=notificarTodos;
  window.notificarTodos=notificarTodos=function(ic,titulo,corpo,filtro,opts){
    if(/^Nova m[uú]sica dispon[ií]vel$/i.test(titulo||'') && !autoMusica()) return Promise.resolve({error:null});
    return _nt.apply(this,arguments);
  };
}

/* ---------- destinatários ---------- */
function escaladosDa(off){
  const i=window.__escIdxSemana? __escIdxSemana(off) : -1; if(i<0) return [];
  const l=escalaAtiva().linhas[i]; return (DB.usuarios||[]).filter(u=>colsDoUsuarioNaLinha(l,u).length);
}
function alvosPor(para){
  const us=(DB.usuarios||[]).slice();
  if(para==='semana') return escaladosDa(0);
  if(para==='prox') return escaladosDa(1);
  if(para==='vocal') return us.filter(u=>(u.vocal||[]).length);
  if(para==='instr') return us.filter(u=>(u.instr||[]).length);
  if(para==='adm') return us.filter(u=>u.admin);
  if(String(para).indexOf('f:')===0){ const f=para.slice(2); return us.filter(u=>(u.vocal||[]).includes(f)||(u.instr||[]).includes(f)); }
  return us;
}
function selPara(id,padrao){
  const fn=[...(typeof VOCAL!=='undefined'?VOCAL:[]),...(typeof INSTR!=='undefined'?INSTR:[])];
  const o=(v,t)=>'<option value="'+v+'" '+(padrao===v?'selected':'')+'>'+t+'</option>';
  return '<select id="'+id+'" class="ct-sel">'+o('todos','Todos os membros')+o('semana','Escalados desta semana')+o('prox','Escalados da próxima semana')+o('vocal','Todo o vocal')+o('instr','Todos os instrumentistas')+o('adm','Só os ADM')+
    fn.map(f=>o('f:'+e(f),e(f))).join('')+'</select>';
}
async function envia(ic,titulo,corpo,alvos,link,popup){
  if(!alvos.length){ toast('Ninguém nesse grupo.'); return false; }
  const ids=new Set(alvos.map(u=>u.id));
  const r=await notificarTodos(ic,titulo,corpo,u=>ids.has(u.id),{link:link||'none',popup:!!popup});
  if(r&&r.error){ toast('Erro: '+r.error.message); return false; }
  toast('Enviado para '+alvos.length+' pessoa(s).'); return true;
}
const popupMarcado = () => !!($id('ctPop')&&$id('ctPop').checked);

/* ---------- histórico do que já foi avisado ---------- */
function hist(){ const h=cfg('notif_hist'); const base=new Date(Date.now()-30*DIA).toISOString(); return {musicas:h.musicas||[],materiais:h.materiais||[],musicas_em:h.musicas_em||'',materiais_em:h.materiais_em||'',base:h.base||base}; }
async function gravaHist(patch){ const h=Object.assign(hist(),patch); await salvarConfig('notif_hist',h); }   /* a data-base é gravada no 1º envio e não muda */

/* músicas ainda não avisadas */
function musicasNovas(todas){
  /* tudo o que ainda não foi avisado, desde o começo do uso da Central (ou últimos 30 dias) */
  const h=hist(); const ja=new Set(h.musicas); const lim=new Date(h.base).getTime();
  return (DB.musicas||[]).filter(m=>m.publicada && !ja.has(m.id) && (todas || (m.criado && new Date(m.criado).getTime()>=lim)))
    .sort((a,b)=>String(b.criado||'').localeCompare(String(a.criado||''))||a.titulo.localeCompare(b.titulo,'pt'));
}
/* materiais de estudo */
let MATS=null;
async function carregaMats(){ try{ const {data}=await sb.from('materiais').select('*'); MATS=data||[]; }catch(_){ MATS=[]; } }
const SECOES={}; try{ (MENU||[]).forEach(m=>{ (m.sub||[]).forEach(s=>{ if(s.id==='academia'&&s.arg) SECOES[s.arg]=s.ic+' '+s.nm; }); }); }catch(_){}
function nomeSecao(k){ return SECOES[k] || String(k||'').replace(/-/g,' '); }
function materiaisNovos(todas){
  const h=hist(); const ja=new Set(h.materiais.map(String)); const lim=new Date(h.base).getTime();
  return (MATS||[]).filter(m=>!ja.has(String(m.id)) && (todas || (m.created_at && new Date(m.created_at).getTime()>=lim)))
    .sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
}

/* ================= TELA: CENTRAL DE AVISOS ================= */
const VER={musTodas:false,matTodas:false};
function lista(itens,cls,txt){
  if(!itens.length) return '<p class="ct-vz">Nada novo desde o último aviso.</p>';
  return '<div class="ct-lista">'+itens.map(x=>'<label class="ct-it"><input type="checkbox" class="'+cls+'" value="'+e(x.id)+'" checked><span>'+txt(x)+'</span></label>').join('')+'</div>'+
    '<div class="ct-mini"><button type="button" onclick="ctMarca(\''+cls+'\',true)">Marcar todas</button><button type="button" onclick="ctMarca(\''+cls+'\',false)">Desmarcar</button></div>';
}
window.ctMarca=function(cls,v){ document.querySelectorAll('.'+cls).forEach(c=>c.checked=v); };
function disp(m){ const t=[]; if(m.cifra) t.push('cifra'); if(m.letra) t.push('letra'); if((m.audios||[]).length) t.push('áudio'); return t.join(' · '); }
function cardMusicas(){
  const ms=musicasNovas(VER.musTodas); const h=hist();
  return '<div class="card ct-card"><h3>🎵 Músicas novas</h3><p class="ct-sub">'+(h.musicas_em?'Último aviso: '+fmt(h.musicas_em)+'. ':'')+ms.length+' música(s) '+(VER.musTodas?'publicadas ainda não avisadas':'novas para avisar')+'.</p>'+
    lista(ms,'ctMus',m=>'<b>'+e(m.titulo)+'</b><small>'+e(m.artista||'')+(m.criado?' · incluída em '+fmt(m.criado):'')+(disp(m)?' · '+disp(m):'')+'</small>')+
    '<label class="ct-chk"><input type="checkbox" '+(VER.musTodas?'checked':'')+' onchange="ctVer(\'musTodas\',this.checked)"> Mostrar também músicas antigas não avisadas</label>'+
    '<div class="ct-env">'+selPara('ctMusPara','todos')+'<button class="btn btn-primary" onclick="ctEnviaMusicas()">Enviar aviso</button></div>'+
    '<label class="ct-chk"><input type="checkbox" '+(autoMusica()?'checked':'')+' onchange="ctAuto(this.checked)"> Avisar automaticamente sempre que eu publicar uma música</label></div>';
}
function cardMateriais(){
  if(MATS===null) return '<div class="card ct-card"><h3>📚 Materiais de estudo</h3><p class="ct-vz">Carregando…</p></div>';
  const ms=materiaisNovos(VER.matTodas); const h=hist();
  return '<div class="card ct-card"><h3>📚 Materiais de estudo (Academia)</h3><p class="ct-sub">'+(h.materiais_em?'Último aviso: '+fmt(h.materiais_em)+'. ':'')+ms.length+' material(is) para avisar.</p>'+
    lista(ms,'ctMat',m=>'<b>'+e(m.titulo)+'</b><small>'+e(nomeSecao(m.secao))+(m.tipo?' · '+e(m.tipo):'')+(m.created_at?' · '+fmt(m.created_at):'')+'</small>')+
    '<label class="ct-chk"><input type="checkbox" '+(VER.matTodas?'checked':'')+' onchange="ctVer(\'matTodas\',this.checked)"> Mostrar também materiais antigos não avisados</label>'+
    '<div class="ct-env">'+selPara('ctMatPara','todos')+'<button class="btn btn-primary" onclick="ctEnviaMateriais()">Enviar aviso</button></div></div>';
}
function cardPlaylist(){
  const at=window.setlistDe? setlistDe() : null, px=window.setlistDe? setlistDe('prox') : null;
  const bt=(q,sl,t)=> sl? '<div class="ct-linha"><span><b>'+t+'</b><small>'+fmt(sl.inicio)+' - '+fmt(sl.fim)+' · '+sl.itens.length+' música(s)/hino(s)</small></span><button class="mini-btn" onclick="ctEnviaPlaylist(\''+q+'\')">Avisar</button></div>' : '<div class="ct-linha"><span><b>'+t+'</b><small>ainda não publicada</small></span></div>';
  return '<div class="card ct-card"><h3>📅 Playlist</h3>'+bt('',at,'Esta semana')+bt('prox',px,'Próxima semana')+'<div class="ct-env">'+selPara('ctPlPara','todos')+'</div></div>';
}
function cardEscala(){
  const i0=window.__escIdxSemana? __escIdxSemana(0) : -1;
  const esc=escaladosDa(0); const pres=DB.presencas||{}; const semResp=esc.filter(u=>!pres[u.email]);
  return '<div class="card ct-card"><h3>📋 Escala e presença</h3>'+
    '<div class="ct-linha"><span><b>Escala atualizada</b><small>Avisa que a escala mudou</small></span><button class="mini-btn" onclick="ctEnviaEscala()">Avisar</button></div>'+
    '<div class="ct-linha"><span><b>Confirmar presença</b><small>'+(i0<0?'Sem culto nesta semana na escala':semResp.length+' de '+esc.length+' escalado(s) ainda não responderam'+(semResp.length?': '+e(semResp.map(u=>u.nome.split(' ')[0]).join(', ')):''))+'</small></span>'+
      (semResp.length?'<button class="mini-btn" onclick="ctEnviaPresenca()">Lembrar</button>':'')+'</div>'+
    '<div class="ct-env">'+selPara('ctEscPara','todos')+'</div></div>';
}
function faltasCadastro(u){
  const f=(window.camposFaltando? camposFaltando(u):[]).slice();
  if(!u.foto) f.push('foto'); if(!u.wpp && !u.wpp_num) f.push('WhatsApp');
  return f;
}
function cardCadastro(){
  const us=(DB.usuarios||[]).filter(u=>faltasCadastro(u).length);
  return '<div class="card ct-card"><h3>📝 Completar cadastro</h3><p class="ct-sub">'+us.length+' pessoa(s) com algo faltando'+(us.length?': '+e(us.slice(0,8).map(u=>(u.nome||u.email).split(' ')[0]+' ('+faltasCadastro(u).join(', ')+')').join('; '))+(us.length>8?'…':''):'')+'</p>'+
    (us.length?'<button class="mini-btn" onclick="ctEnviaCadastro()">Lembrar essas pessoas</button>':'')+'</div>';
}
function cardAniver(){
  const hoje=new Date(); const lista=(DB.usuarios||[]).filter(u=>u.nasc).map(u=>{ const d=new Date(hoje.getFullYear(),+String(u.nasc).slice(5,7)-1,+String(u.nasc).slice(8,10)); let dd=Math.round((d-new Date(hoje.toDateString()))/DIA); if(dd<0) dd+=365; return {u,dd,d}; }).filter(x=>x.dd<=7).sort((a,b)=>a.dd-b.dd);
  return '<div class="card ct-card"><h3>🎂 Aniversariantes</h3>'+(lista.length? lista.map(x=>'<div class="ct-linha"><span><b>'+e(x.u.nome)+'</b><small>'+(x.dd===0?'Hoje':x.dd===1?'Amanhã':fmt(x.d.toISOString()))+'</small></span><button class="mini-btn" onclick="ctEnviaAniver(\''+e(x.u.id)+'\','+x.dd+')">Avisar todos</button></div>').join('') : '<p class="ct-vz">Ninguém faz aniversário nos próximos 7 dias.</p>')+
    '<p class="ct-sub" style="margin-top:6px">No dia do aniversário o app já avisa todos sozinho.</p></div>';
}
if(typeof ROTAS!=='undefined'){
  ROTAS.central=function(){
    if(!ehAdmin()) return '<div class="page"><div class="empty">Acesso restrito ao ADM.</div></div>';
    if(MATS===null) carregaMats().then(()=>{ const b=$id('ctMatBox'); if(b) b.innerHTML=cardMateriais(); });
    if((DB.musicas||[]).length && !('criado' in DB.musicas[0])) Promise.resolve(cloudMusicas()).then(()=>{ if(document.querySelector('.ct-card')) redesenha(); });
    return '<div class="page"><div class="page-ttl">📣 Central de avisos</div>'+
      '<p class="ct-sub" style="margin-bottom:10px">Escolha o que avisar e para quem. Nada é enviado sem você tocar em "Enviar/Avisar".</p>'+
      '<label class="ct-chk ct-top"><input type="checkbox" id="ctPop" checked> Mostrar em janela (popup) quando a pessoa abrir o app</label>'+
      '<button class="mini-btn" style="margin:0 0 12px" onclick="modalAviso()">✍️ Escrever um aviso livre</button>'+
      cardMusicas()+'<div id="ctMatBox">'+cardMateriais()+'</div>'+cardPlaylist()+cardEscala()+cardCadastro()+cardAniver()+'</div>';
  };
}
function redesenha(){ const y=scrollY; go('central'); scrollTo(0,y); }
window.ctVer=function(k,v){ VER[k]=v; redesenha(); };
window.ctAuto=async function(v){ await salvarConfig('notif_cfg',Object.assign({},cfg('notif_cfg'),{auto_musica:!!v})); toast(v?'Vai avisar ao publicar cada música.':'Aviso de música só pela Central.'); };
window.ctEnviaMusicas=async function(){
  const ids=[...document.querySelectorAll('.ctMus:checked')].map(c=>c.value); if(!ids.length) return toast('Marque ao menos uma música.');
  const ms=ids.map(id=>DB.musicas.find(m=>m.id===id)).filter(Boolean);
  const titulo=ms.length===1? '🎵 Nova música no app' : '🎵 '+ms.length+' músicas novas no app';
  const nomes=ms.map(m=>m.titulo); const corpo=ms.length===1? '"'+nomes[0]+'"'+(ms[0].artista?' ('+ms[0].artista+')':'')+' já está no app com '+(disp(ms[0])||'a cifra')+'. Confira!' : (nomes.slice(0,8).join(', ')+(nomes.length>8?' e mais '+(nomes.length-8):''))+'. Confira as cifras e letras!';
  const ok=await envia('🎵',titulo,corpo,alvosPor($id('ctMusPara').value),ms.length===1?'mus:'+ms[0].id:'go:musicas',popupMarcado());
  if(ok){ const h=hist(); await gravaHist({musicas:[...new Set(h.musicas.concat(ids))],musicas_em:new Date().toISOString()}); redesenha(); }
};
window.ctEnviaMateriais=async function(){
  const ids=[...document.querySelectorAll('.ctMat:checked')].map(c=>c.value); if(!ids.length) return toast('Marque ao menos um material.');
  const ms=ids.map(id=>(MATS||[]).find(m=>String(m.id)===id)).filter(Boolean);
  const secs=[...new Set(ms.map(m=>m.secao))];
  const titulo=ms.length===1? '📚 Novo material de estudo' : '📚 '+ms.length+' novos materiais de estudo';
  const corpo=ms.length===1? '"'+ms[0].titulo+'" em '+nomeSecao(ms[0].secao).replace(/^\S+\s/,'')+'. Bons estudos!' : ms.slice(0,6).map(m=>m.titulo).join(', ')+(ms.length>6?' e mais '+(ms.length-6):'')+'. Bons estudos!';
  const ok=await envia('📚',titulo,corpo,alvosPor($id('ctMatPara').value),secs.length===1?'go:academia:'+secs[0]:'go:inicio',popupMarcado());
  if(ok){ const h=hist(); await gravaHist({materiais:[...new Set(h.materiais.map(String).concat(ids))],materiais_em:new Date().toISOString()}); redesenha(); }
};
window.ctEnviaPlaylist=async function(q){
  const sl=setlistDe(q==='prox'?'prox':''); if(!sl) return;
  await envia(q==='prox'?'🗓️':'📅',q==='prox'?'Playlist da próxima semana':'Playlist desta semana','Culto de '+fmt(sl.inicio)+' a '+fmt(sl.fim)+': '+sl.itens.length+' música(s)/hino(s) com letra e cifra já estão no app.',alvosPor($id('ctPlPara').value),q==='prox'?'go:playlist:prox':'go:playlist:atual',popupMarcado());
};
window.ctEnviaEscala=async function(){ await envia('📋','Escala atualizada','A escala do Ministério foi atualizada. Toque para conferir.',alvosPor($id('ctEscPara').value),'go:escala',popupMarcado()); };
window.ctEnviaPresenca=async function(){
  const pres=DB.presencas||{}; const alvos=escaladosDa(0).filter(u=>!pres[u.email]);
  await envia('📍','Confirme sua presença','Você está na escala desta semana e ainda não confirmou. Toque para responder: vai participar?',alvos,'go:escala',true);
};
window.ctEnviaCadastro=async function(){
  const us=(DB.usuarios||[]).filter(u=>faltasCadastro(u).length); let n=0;
  for(const u of us){ const f=faltasCadastro(u); await notificarTodos('📝','Complete seu cadastro','Falta: '+f.join(', ')+'. Toque para abrir seu perfil.',x=>x.id===u.id,{link:'go:perfil',popup:popupMarcado()}); n++; }
  toast('Lembrete enviado para '+n+' pessoa(s).');
};
window.ctEnviaAniver=async function(id,dd){
  const u=(DB.usuarios||[]).find(x=>x.id===id); if(!u) return;
  const quando=dd===0?'Hoje é':dd===1?'Amanhã é':'Dia '+fmt(new Date(new Date().getFullYear(),+String(u.nasc).slice(5,7)-1,+String(u.nasc).slice(8,10)).toISOString())+' é';
  await envia('🎂','Aniversário',quando+' aniversário de '+u.nome+'! 🎉 Não esqueça de dar os parabéns.',(DB.usuarios||[]).filter(x=>x.id!==u.id),'go:inicio',popupMarcado());
};
/* menu e painel */
if(typeof montaMenu==='function'){
  const _mm=montaMenu;
  window.montaMenu=montaMenu=function(){ _mm.apply(this,arguments);
    if(!ehAdmin() || document.querySelector('#sidemenu [data-central]')) return;
    const adm=[...document.querySelectorAll('#sidemenu .sm-item')].find(b=>/go\('admin'\)/.test(b.getAttribute('onclick')||''));
    const html='<button class="sm-item" data-central onclick="go(\'central\')"><span class="ic">📣</span>Central de avisos</button>';
    if(adm) adm.insertAdjacentHTML('beforebegin',html); };
}
if(typeof _booted!=='undefined' && _booted){ try{ montaMenu(); }catch(_){} }
if(typeof ROTAS!=='undefined' && ROTAS.admin){
  const _ad=ROTAS.admin;
  ROTAS.admin=function(){ let h=_ad.apply(this,arguments); if(!ehAdmin()) return h;
    return h.replace('<button class="mini-btn" onclick="modalAviso()">Enviar aviso</button>','<button class="mini-btn" onclick="go(\'central\')">📣 Abrir a Central de avisos</button> <button class="mini-btn sec" onclick="modalAviso()">Aviso livre</button>'); };
}
if(typeof ROTAS!=='undefined' && ROTAS.notificacoes){
  const _nf=ROTAS.notificacoes;
  ROTAS.notificacoes=function(){ const h=_nf.apply(this,arguments); return h.replace('<button class="mini-btn" style="margin-bottom:12px" onclick="modalAviso()">📣 Enviar aviso aos membros</button>','<button class="mini-btn" style="margin-bottom:12px" onclick="go(\'central\')">📣 Central de avisos</button>'); };
}

/* ================= LEMBRETE A CADA 7 DIAS (membros) ================= */
function pendencias(u){
  const p=[];
  try{
    const i=window.__escIdxSemana? __escIdxSemana(0) : -1;
    if(i>=0){ const l=escalaAtiva().linhas[i]; const cols=colsDoUsuarioNaLinha(l,u);
      if(cols.length && !(typeof minhaPresenca==='function'&&minhaPresenca())){ const inf=window.__escLinhaInfo? __escLinhaInfo(i):null;
        p.push({ic:'📍',t:'Confirme sua presença na escala',d:(inf?(inf.dia?inf.dia+', ':'')+inf.data+' · '+inf.evento+' — ':'')+'Função: '+cols.map(c=>String(c).toLowerCase().replace(/^\p{L}/u,x=>x.toUpperCase())).join(', '),
          bts:'<button class="btn btn-primary" onclick="lembreteAcao(\'sim\')">✅ Sim, vou</button><button class="btn btn-dark" onclick="lembreteAcao(\'nao\')">❌ Não poderei</button>'}); } }
  }catch(_){}
  if(!u.foto) p.push({ic:'📷',t:'Coloque sua foto de perfil',d:'Ajuda o ministério a te reconhecer na escala e na lista de membros.',bts:'<button class="btn btn-primary" onclick="lembreteAcao(\'foto\')">Ir ao meu perfil</button>'});
  if(!u.wpp && !u.wpp_num) p.push({ic:'📱',t:'Informe seu WhatsApp',d:'Seu telefone não é WhatsApp e falta o número (ou marque "Não tenho WhatsApp").',bts:'<button class="btn btn-primary" onclick="lembreteAcao(\'wpp\')">Informar agora</button>'});
  if(('Notification' in window) && Notification.permission==='default') p.push({ic:'🔔',t:'Ative as notificações',d:'Para saber da escala, playlist e avisos mesmo com o app fechado.',bts:'<button class="btn btn-primary" onclick="lembreteAcao(\'notif\')">Ativar</button>'});
  return p;
}
const chave = u => 'ibnm_lembrete7_'+u.email;
function lembrete(forcar){
  const u=(typeof usuarioAtual==='function')&&usuarioAtual(); if(!u) return;
  if(!forcar){ const ult=+localStorage.getItem(chave(u))||0; if(Date.now()-ult<7*DIA) return; }
  if(document.querySelector('.av-bg,#cadGate')){ setTimeout(()=>lembrete(forcar),3000); return; }   /* espera outras janelas */
  const p=pendencias(u); if(!p.length){ if(forcar) toast('Está tudo em dia! 🙌'); return; }
  localStorage.setItem(chave(u),String(Date.now()));
  const bg=document.createElement('div'); bg.className='av-bg'; bg.id='avLembrete';
  bg.innerHTML='<div class="av-card lb7" role="dialog" aria-modal="true"><button class="av-x" aria-label="Fechar">✕</button><div class="av-ic">📌</div><div class="av-tt">Falta pouco, '+e((u.nome||'').split(' ')[0])+'!</div>'+
    '<div class="lb7-lista">'+p.map(x=>'<div class="lb7-it"><div class="lb7-ic">'+x.ic+'</div><div class="lb7-tx"><b>'+e(x.t)+'</b><small>'+e(x.d)+'</small><div class="lb7-bt">'+x.bts+'</div></div></div>').join('')+'</div>'+
    '<button class="av-lnk" onclick="document.getElementById(\'avLembrete\').remove()">Lembrar daqui a 7 dias</button></div>';
  document.body.appendChild(bg);
  bg.querySelector('.av-x').onclick=()=>bg.remove();
}
window.lembreteAcao=function(a){
  const b=$id('avLembrete'); if(b) b.remove();
  if(a==='sim') confirmarPresenca('confirmado');
  else if(a==='nao') confirmarPresenca('ausente');
  else if(a==='foto') go('perfil');
  else if(a==='wpp'){ go('perfil'); setTimeout(()=>{ try{ modalEditarPerfil(); }catch(_){} },150); }
  else if(a==='notif'){ try{ pedirPermissaoNotif(); }catch(_){} }
};
window.verLembrete=()=>lembrete(true);
if(typeof iniciarApp==='function'){ const _ia=iniciarApp; window.iniciarApp=iniciarApp=function(){ _ia.apply(this,arguments); setTimeout(()=>lembrete(false),2500); }; }
if(typeof _booted!=='undefined' && _booted) setTimeout(()=>lembrete(false),2500);

const st=document.createElement('style'); st.textContent=`
.ct-sub{font-size:12.5px;color:#5d7268;margin:2px 0 8px}
.ct-vz{font-size:13px;color:#8a9;padding:4px 0}
.ct-card h3{margin-bottom:2px}
.ct-lista{display:flex;flex-direction:column;gap:4px;max-height:300px;overflow:auto;border:1px solid #e3ece7;border-radius:10px;padding:4px}
.ct-it{display:flex;gap:10px;align-items:flex-start;padding:7px 6px;border-radius:8px;cursor:pointer}
.ct-it:nth-child(odd){background:#f6f9f7}
.ct-it input{margin-top:3px;width:18px;height:18px;accent-color:var(--verde-med);flex:none}
.ct-it span{display:flex;flex-direction:column;min-width:0}
.ct-it b{font-size:14px;color:var(--verde-escuro)}
.ct-it small,.ct-linha small{font-size:11.5px;color:#6b8378}
.ct-mini{display:flex;gap:6px;margin:6px 0}
.ct-mini button{border:1px solid #cfdad4;background:#fff;border-radius:8px;height:30px;padding:0 10px;font-size:12px;font-weight:700;color:var(--verde-escuro)}
.ct-chk{display:flex;gap:8px;align-items:center;font-size:12.5px;color:var(--verde-escuro);margin:6px 0}
.ct-chk input{width:17px;height:17px;accent-color:var(--verde-med)}
.ct-top{background:#fff8dc;border:1px solid #f0d97a;border-radius:10px;padding:8px 10px;font-weight:700}
.ct-env{display:flex;gap:6px;margin-top:8px}
.ct-env .btn{width:auto;flex:none;padding:0 16px;height:42px;margin:0}
.ct-sel{flex:1;min-width:0;height:42px;border:1px solid #cfdad4;border-radius:10px;padding:0 8px;font-size:13.5px;background:#fff;color:var(--verde-escuro)}
.ct-linha{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid #eef2ef}
.ct-linha:first-of-type{border-top:0}
.ct-linha span{flex:1;display:flex;flex-direction:column;min-width:0}
.ct-linha b{font-size:14px;color:var(--verde-escuro)}
.lb7-lista{display:flex;flex-direction:column;gap:10px;text-align:left;margin:10px 0 4px}
.lb7-it{display:flex;gap:10px;background:#f6f9f7;border-radius:12px;padding:10px}
.lb7-ic{font-size:26px;line-height:1}
.lb7-tx{flex:1;min-width:0}
.lb7-tx b{display:block;font-size:15px;color:var(--verde-escuro)}
.lb7-tx small{display:block;font-size:12.5px;color:#5d7268;margin:2px 0 8px}
.lb7-bt{display:flex;gap:6px;flex-wrap:wrap}
.lb7-bt .btn{flex:1;min-width:120px;min-height:40px;height:auto;padding:8px 10px;white-space:nowrap;font-size:13.5px;margin:0}
`; document.head.appendChild(st);
})();
