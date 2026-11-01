/* ============================================================
   MM IBNM — Economia de dados (v0.9.0)
   Objetivo: gastar o mínimo possível da cota do Supabase (egress).
   1) Tempo real: aplica só a linha que mudou (antes: cada mudança
      fazia TODOS os celulares baixarem TODAS as tabelas de novo)
   2) Cache no aparelho (IndexedDB): músicas, escala e histórico;
      ao abrir o app baixa só o que mudou desde a última vez
   3) Fotos: reduzidas para ~30 KB ao enviar; a sua foto antiga é
      otimizada sozinha; o celular guarda fotos/áudios em cache
   4) Notificações: só as 60 mais recentes
   (com a seção 15 do SQL — coluna updated_at — a economia é máxima)
============================================================ */
(function(){
'use strict';
if(typeof sb==='undefined' || !sb) return;

/* ---------- IndexedDB (cache no aparelho) ---------- */
const IDB={ db:null,
  abre(){ if(this.db) return Promise.resolve(this.db); return new Promise((ok,er)=>{ try{ const r=indexedDB.open('ibnm-cache',1); r.onupgradeneeded=()=>r.result.createObjectStore('kv'); r.onsuccess=()=>{ this.db=r.result; ok(this.db); }; r.onerror=()=>er(r.error); }catch(e){ er(e); } }); },
  async get(k){ try{ const db=await this.abre(); return await new Promise(ok=>{ const t=db.transaction('kv').objectStore('kv').get(k); t.onsuccess=()=>ok(t.result); t.onerror=()=>ok(undefined); }); }catch(_){ return undefined; } },
  async set(k,v){ try{ const db=await this.abre(); await new Promise(ok=>{ const t=db.transaction('kv','readwrite'); t.objectStore('kv').put(v,k); t.oncomplete=ok; t.onerror=ok; }); }catch(_){} },
  async del(k){ try{ const db=await this.abre(); await new Promise(ok=>{ const t=db.transaction('kv','readwrite'); t.objectStore('kv').delete(k); t.oncomplete=ok; t.onerror=ok; }); }catch(_){} }
};
window.__ibnmCache=IDB;
const cap = s => (window.capTitulo? capTitulo(s||'') : (s||''));
const semCol = err => err && /updated_at|column|does not exist|schema cache/i.test(err.message||'');
let TEM_UPD = true;                    /* a tabela musicas tem a coluna updated_at? (conferido abaixo) */
let UPD_OK = null;
function marcaSemUpd(){ TEM_UPD=false; UPD_OK=false; }
/* confere uma vez (custa 1 linha) se o banco já tem a coluna updated_at */
const _confere=sb.from('musicas').select('updated_at').limit(1).then(r=>{ if(r.error && semCol(r.error)) marcaSemUpd(); else if(!r.error) UPD_OK=true; }).catch(()=>{});
const maxUpd = rows => rows.reduce((m,r)=> (r.updated_at && r.updated_at>m)? r.updated_at : m, '');
const ST={musicas:0,escala:0,cantadas:0,bytes:0};
window.__ibnmSyncInfo=ST;

/* ---------- MÚSICAS: baixa só as alteradas ---------- */
function mapMus(m){ return {id:m.id,titulo:cap(m.titulo),artista:cap(m.artista),cifra:m.cifra||'',letra:m.letra||'',youtube:m.youtube||'',audios:m.audios||[],
  publicada:!!(m.dados&&m.dados.publicada),criado:m.created_at||m.criado||(m.dados&&m.dados.criado)||'',publicadaEm:(m.dados&&m.dados.publicada_em)||''}; }
function aplicaMusicas(rows){ DB.musicas=Object.values(rows).map(mapMus).sort((a,b)=>a.titulo.localeCompare(b.titulo,'pt')); }
let MUS=null;   /* {rows:{id:row}, max} */
async function cloudMusicasEco(){
  if(!MUS) MUS=await IDB.get('musicas');
  await _confere;
  /* por segurança, 1 vez por semana baixa tudo de novo */
  if(MUS && MUS.rows && TEM_UPD && Date.now()-(MUS.full||0)<7*864e5){
    const novos=await sb.from('musicas').select('*').gt('updated_at',MUS.max||'1970-01-01');
    if(!novos.error){
      const ids=await sb.from('musicas').select('id');
      if(!ids.error){
        const vivos=new Set((ids.data||[]).map(r=>String(r.id)));
        Object.keys(MUS.rows).forEach(k=>{ if(!vivos.has(String(k))) delete MUS.rows[k]; });
        (novos.data||[]).forEach(r=>{ MUS.rows[r.id]=r; });
        const faltam=[...vivos].filter(id=>!MUS.rows[id]);
        if(faltam.length){ for(let i=0;i<faltam.length;i+=80){ const r=await sb.from('musicas').select('*').in('id',faltam.slice(i,i+80)); (r.data||[]).forEach(x=>MUS.rows[x.id]=x); } }
        MUS.max=maxUpd(Object.values(MUS.rows))||MUS.max;
        ST.musicas=(novos.data||[]).length+faltam.length;
        aplicaMusicas(MUS.rows); IDB.set('musicas',MUS); return;
      }
    } else if(semCol(novos.error)) marcaSemUpd();
  }
  const {data,error}=await sb.from('musicas').select('*');
  if(error) return;
  MUS={rows:{},max:'',full:Date.now()}; (data||[]).forEach(r=>MUS.rows[r.id]=r); MUS.max=maxUpd(data||[]);
  ST.musicas=(data||[]).length; aplicaMusicas(MUS.rows); IDB.set('musicas',MUS);
}
/* toda gravação de música pelo app marca updated_at (garante o cache certo mesmo sem gatilho no banco) */
(function(){
  const _from=sb.from.bind(sb);
  sb.from=function(t){
    const q=_from(t);
    if(t==='musicas' && q.update && UPD_OK===true){ const up=q.update.bind(q);
      q.update=(o,...r)=>{ if(o && typeof o==='object' && !Array.isArray(o)) o=Object.assign({},o,{updated_at:new Date().toISOString()}); return up(o,...r); }; }
    return q;
  };
})();

/* ---------- ESCALA: só baixa se mudou ---------- */
async function cloudEscalaEco(){
  const cache=await IDB.get('escala');
  await _confere;
  if(cache && TEM_UPD){
    const v=await sb.from('escala').select('updated_at').eq('id',1).maybeSingle();
    if(!v.error && v.data && v.data.updated_at===cache.updated_at){ DB.escala={colunas:cache.colunas||[],linhas:cache.linhas||[]}; ST.escala=0; return; }
    if(v.error && semCol(v.error)) marcaSemUpd();
  }
  const {data}=await sb.from('escala').select('*').eq('id',1).maybeSingle();
  DB.escala={colunas:(data&&data.colunas)||[],linhas:(data&&data.linhas)||[]}; ST.escala=1;
  if(data) IDB.set('escala',{colunas:data.colunas,linhas:data.linhas,updated_at:data.updated_at||''});
}

/* ---------- MÚSICAS QUE JÁ CANTAMOS: só baixa se a quantidade mudou ou 1x por semana ---------- */
function mapCant(r){ return {d:r.data||'',di:r.dia||'',e:r.evento||'',m:cap(r.musica||''),a:/^x+$/i.test(r.artista||'')?(r.artista||''):cap(r.artista||''),t:r.tom||'',w:r.web||''}; }
async function cloudCantadasEco(forcar){
  try{
    const cache=await IDB.get('cantadas');
    if(cache && !forcar && Date.now()-cache.em<7*864e5){
      const c=await sb.from('musicas_cantadas').select('id',{count:'exact',head:true});
      if(!c.error && c.count===cache.n){ if(cache.rows.length) MUSICAS_CANTADAS=cache.rows; ST.cantadas=0; return; }
    }
    const {data,error}=await sb.from('musicas_cantadas').select('*').order('ordem',{ascending:true});
    if(error) return;
    if(data && data.length){ MUSICAS_CANTADAS=data.map(mapCant); }
    ST.cantadas=(data||[]).length;
    IDB.set('cantadas',{n:(data||[]).length,em:Date.now(),rows:(data&&data.length)?MUSICAS_CANTADAS:[]});
  }catch(_){}
}

/* ---------- NOTIFICAÇÕES: só as 60 mais recentes ---------- */
const mapN = n => ({id:n.id,ic:n.ic,titulo:n.titulo,corpo:n.corpo,data:n.data,lida:!!n.lida,link:n.link||'',popup:!!n.popup});
/* guarda as notificações no aparelho e baixa só as que chegaram depois da última */
async function cloudNotifEco(forcar){
  if(typeof _sessaoEmail==='undefined'||!_sessaoEmail) return;
  const k='notif_'+_sessaoEmail; const cache=forcar? null : await IDB.get(k);
  let lista;
  if(cache && cache.lista && cache.lista.length && Date.now()-(cache.em||0)<3*864e5){
    const ult=cache.lista.reduce((m,n)=>n.data>m?n.data:m,'');
    const {data,error}=await sb.from('notificacoes').select('*').eq('destino_email',_sessaoEmail).gt('data',ult).order('data',{ascending:false}).limit(60);
    if(error) return cloudNotifEco(true);
    const vistos=new Set(cache.lista.map(n=>String(n.id)));
    lista=(data||[]).map(mapN).filter(n=>!vistos.has(String(n.id))).concat(cache.lista);
    /* lidas/não lidas: pergunta só os ids que ainda não foram lidos (bem pequeno) */
    const nl=await sb.from('notificacoes').select('id').eq('destino_email',_sessaoEmail).eq('lida',false);
    if(!nl.error){ const abertas=new Set((nl.data||[]).map(r=>String(r.id))); lista.forEach(n=>{ n.lida=!abertas.has(String(n.id)); }); }
    lista=lista.slice(0,60);
    IDB.set(k,{lista,em:cache.em});
  } else {
    const {data}=await sb.from('notificacoes').select('*').eq('destino_email',_sessaoEmail).order('data',{ascending:false}).limit(60);
    lista=(data||[]).map(mapN); IDB.set(k,{lista,em:Date.now()});
  }
  DB.notificacoes[_sessaoEmail]=lista;
}
/* quando a pessoa lê, atualiza o cache também */
setInterval(()=>{ try{ if(typeof _sessaoEmail!=='undefined'&&_sessaoEmail&&DB.notificacoes[_sessaoEmail]) IDB.get('notif_'+_sessaoEmail).then(c=>{ if(c) IDB.set('notif_'+_sessaoEmail,{lista:DB.notificacoes[_sessaoEmail].slice(0,60),em:c.em}); }); }catch(_){} },15000);

/* instala as versões econômicas */
window.cloudMusicas=cloudMusicas=cloudMusicasEco;
window.cloudEscala=cloudEscala=cloudEscalaEco;
window.cloudNotif=cloudNotif=()=>cloudNotifEco(false);
if(typeof cloudCantadas==='function') window.cloudCantadas=cloudCantadas=()=>cloudCantadasEco(false);

/* ============================================================
   TEMPO REAL: um canal só, aplicando a linha que veio na mensagem
============================================================ */
let _tela=0;
function atualizaTela(){
  clearTimeout(_tela);
  _tela=setTimeout(()=>{
    try{ if($('#appShell').classList.contains('hidden')) return; }catch(_){ return; }
    try{ montaMenu(); atualizaBadge(); }catch(_){}
    try{ if(!_editando && typeof _viewAtual==='function' && !document.querySelector('.modal-bg.show,.cc-sheet-bg,.proj')){ const y=scrollY; _viewAtual(); scrollTo(0,y); } }catch(_){}
    try{ atualizaBannerVivo(); aplicarAoVivo(false); }catch(_){}
  },300);
}
function mapPerfil(p){ return {id:p.id,email:(p.email||'').toLowerCase(),nome:cap(p.nome||''),nasc:p.nasc||'',tel:p.tel||'',wpp:!!p.wpp,wpp_num:p.wpp_num||'',vocal:p.vocal||[],instr:p.instr||[],foto:p.foto||'',admin:!!p.admin,origem:p.origem||'local',senhaHash:''}; }
const H={
  musicas(ev,n,o){ if(!MUS) MUS={rows:{},max:''};
    if(ev==='DELETE'){ delete MUS.rows[o.id]; DB.musicas=DB.musicas.filter(m=>m.id!==o.id); }
    else { MUS.rows[n.id]=n; if(n.updated_at && n.updated_at>(MUS.max||'')) MUS.max=n.updated_at; const k=DB.musicas.findIndex(m=>m.id===n.id); const mm=mapMus(n); if(k>=0) DB.musicas[k]=mm; else { DB.musicas.push(mm); DB.musicas.sort((a,b)=>a.titulo.localeCompare(b.titulo,'pt')); } }
    IDB.set('musicas',MUS); },
  perfis(ev,n,o){ if(ev==='DELETE'){ DB.usuarios=DB.usuarios.filter(u=>u.id!==o.id); return; } const k=DB.usuarios.findIndex(u=>u.id===n.id); const p=mapPerfil(n); if(k>=0) DB.usuarios[k]=Object.assign(DB.usuarios[k],p); else DB.usuarios.push(p); },
  escala(ev,n){ if(n && n.id===1){ DB.escala={colunas:n.colunas||[],linhas:n.linhas||[]}; IDB.set('escala',{colunas:n.colunas,linhas:n.linhas,updated_at:n.updated_at||''}); } },
  playlist(ev,n){ if(n && n.publicada) DB.playlist={inicio:n.inicio,fim:n.fim,musicas:n.musicas||[],publicada:true}; },
  notificacoes(ev,n,o){ const me=(typeof _sessaoEmail!=='undefined')&&_sessaoEmail; if(!me) return; const L=DB.notificacoes[me]=DB.notificacoes[me]||[];
    if(ev==='INSERT' && n && (n.destino_email||'').toLowerCase()===me){ if(!L.some(x=>x.id===n.id)) L.unshift({id:n.id,ic:n.ic,titulo:n.titulo,corpo:n.corpo,data:n.data,lida:!!n.lida,link:n.link||'',popup:!!n.popup}); if(L.length>60) L.length=60; }
    else if(ev==='UPDATE' && n){ const x=L.find(y=>y.id===n.id); if(x) x.lida=!!n.lida; }
    else if(ev==='DELETE' && o){ DB.notificacoes[me]=L.filter(y=>y.id!==o.id); } },
  favoritos(){ try{ cloudFav().then(atualizaTela); }catch(_){} return 'async'; },
  config(ev,n){ if(n && n.chave!=null) APP_CFG[n.chave]=n.valor; },
  presencas(ev,n){ if(n && n.semana===semanaISO()){ DB.presencas=DB.presencas||{}; DB.presencas[(n.email||'').toLowerCase()]=n; } },
  ao_vivo(ev,n){ if(n) AO_VIVO=n; },
  musicas_cantadas(){ cloudCantadasEco(true).then(atualizaTela); return 'async'; }
};
let CANAL=null;
function ligarEco(){
  try{
    /* desliga os canais antigos (que recarregavam tudo) */
    (sb.getChannels? sb.getChannels():[]).forEach(c=>{ if(/ibnm-rt|ibnm-rt2|ibnm-cant/.test(c.topic||'')) try{ sb.removeChannel(c); }catch(_){} });
    if(CANAL) return;
    const me=(typeof _sessaoEmail!=='undefined')&&_sessaoEmail, uid=(typeof _sessaoId!=='undefined')&&_sessaoId;
    CANAL=sb.channel('ibnm-eco');
    Object.keys(H).forEach(t=>{
      const f={event:'*',schema:'public',table:t};
      if(t==='notificacoes' && me) f.filter='destino_email=eq.'+me;
      if(t==='favoritos' && uid) f.filter='user_id=eq.'+uid;
      CANAL.on('postgres_changes',f,p=>{ try{ const r=H[t](p.eventType,p.new,p.old); if(r!=='async') atualizaTela(); }catch(_){} });
    });
    CANAL.subscribe();
  }catch(_){}
}
window.ligarRealtime=ligarRealtime=function(){ ligarEco(); };
/* qualquer código antigo que peça "recarregar tudo" só redesenha a tela */
window.agendarReload=agendarReload=function(){ atualizaTela(); };
if(typeof _booted!=='undefined' && _booted) ligarEco();

/* ao voltar para o app depois de um tempo (o celular corta a conexão em segundo plano), sincroniza só o que mudou */
let _oculto=0;
document.addEventListener('visibilitychange',async()=>{
  if(document.visibilityState==='hidden'){ _oculto=Date.now(); return; }
  if(!_oculto || Date.now()-_oculto<90*1000) return; _oculto=0;
  try{ await Promise.all([cloudMusicasEco(),cloudEscalaEco(),cloudNotifEco(false),cloudPerfis(),cloudPlaylist(),cloudConfig(),cloudPresencas(),cloudAoVivo()]); atualizaTela(); }catch(_){}
});

/* ============================================================
   FOTOS: pequenas (320 px, ~30 KB) e guardadas no celular
============================================================ */
function reduzImagem(blob,lado,qual){
  return new Promise((ok,er)=>{ const url=URL.createObjectURL(blob); const im=new Image();
    im.onload=()=>{ const r=Math.min(1,lado/Math.max(im.width,im.height)); const w=Math.round(im.width*r), h=Math.round(im.height*r);
      const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d'); x.drawImage(im,0,0,w,h);
      c.toBlob(b=>{ URL.revokeObjectURL(url); b?ok(b):er(new Error('falha ao reduzir')); },'image/jpeg',qual||0.8); };
    im.onerror=()=>{ URL.revokeObjectURL(url); er(new Error('imagem inválida')); }; im.src=url; });
}
window.carregarFoto=carregarFoto=async function(inp){
  const f=inp.files[0]; if(!f) return; const u=usuarioAtual(); if(!u) return;
  let b=f; try{ b=await reduzImagem(f,320,0.8); }catch(_){}
  const path='perfil/'+u.id+'_'+Date.now()+'_otim.jpg';
  const up=await sb.storage.from('fotos').upload(path,b,{upsert:true,contentType:'image/jpeg',cacheControl:'31536000'});
  if(up.error){ toast('Erro ao enviar foto: '+up.error.message); return; }
  const url=sb.storage.from('fotos').getPublicUrl(path).data.publicUrl;
  const velha=u.foto;
  await sb.from('perfis').update({foto:url}).eq('id',u.id);
  u.foto=url; try{ $('#perfilFoto')&&($('#perfilFoto').src=url); $('#topAvatar').src=url; montaMenu(); }catch(_){}
  apagaFotoVelha(velha);
  toast('Foto atualizada!'); go('perfil');
};
function apagaFotoVelha(url){ try{ const p=String(url||'').split('/storage/v1/object/public/fotos/')[1]; if(p) sb.storage.from('fotos').remove([decodeURIComponent(p.split('?')[0])]); }catch(_){} }
/* a sua foto antiga (grande) é otimizada uma vez, sozinha */
async function otimizaMinhaFoto(){
  try{
    const u=usuarioAtual(); if(!u||!u.foto||/_otim\./.test(u.foto)||!/\/storage\/v1\/object\/public\/fotos\//.test(u.foto)) return;
    const k='ibnm_foto_otim_'+u.id; if(localStorage.getItem(k)===u.foto) return;
    const r=await fetch(u.foto,{cache:'force-cache'}); if(!r.ok) return; const blob=await r.blob();
    localStorage.setItem(k,u.foto);
    if(blob.size<60*1024) return;                                         /* já é pequena */
    const b=await reduzImagem(blob,320,0.8);
    const path='perfil/'+u.id+'_'+Date.now()+'_otim.jpg';
    const up=await sb.storage.from('fotos').upload(path,b,{upsert:true,contentType:'image/jpeg',cacheControl:'31536000'}); if(up.error) return;
    const url=sb.storage.from('fotos').getPublicUrl(path).data.publicUrl;
    const res=await sb.from('perfis').update({foto:url}).eq('id',u.id); if(res.error) return;
    const velha=u.foto; u.foto=url; localStorage.setItem(k,url); apagaFotoVelha(velha); try{ montaMenu(); }catch(_){}
  }catch(_){}
}
if(typeof iniciarApp==='function'){ const _ia=iniciarApp; window.iniciarApp=iniciarApp=function(){ _ia.apply(this,arguments); setTimeout(otimizaMinhaFoto,8000); ligarEco(); }; }
if(typeof _booted!=='undefined' && _booted) setTimeout(otimizaMinhaFoto,8000);
/* fotos em listas carregam só quando aparecem na tela */
new MutationObserver(ms=>{ ms.forEach(m=>m.addedNodes.forEach(n=>{ if(n.nodeType!==1) return; (n.tagName==='IMG'?[n]:n.querySelectorAll('img')).forEach(i=>{ if(!i.loading) i.loading='lazy'; i.decoding='async'; }); })); }).observe(document.documentElement,{childList:true,subtree:true});
})();
