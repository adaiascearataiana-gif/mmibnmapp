/* ============================================================
   MM IBNM — Notificações na barra do celular (Web Push) + preferências
   - Com o app FECHADO, os avisos chegam na barra de notificações do
     celular, como em qualquer app (precisa da seção 16 do SQL e da
     função "enviar-push" no Supabase — ver PUSH-INSTRUCOES.md).
   - Cada pessoa escolhe quais tipos de aviso quer receber.
============================================================ */
(function(){
'use strict';
const VAPID_PUBLICA='BDcZxvZajii42e-Kg1UmdpPPHSsvsnhQodSvgoG4wOOyz7LK0Hpe0AVfe8BagQO3jJfO-1deLFFAhbL-MSN6muA';
const e = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $id = id => document.getElementById(id);

/* ---------- tipos de aviso ---------- */
const TIPOS=[
  ['escala','📍 Escala (estou escalado, escala atualizada)'],
  ['playlist','📅 Playlist / ordem do culto'],
  ['musicas','🎵 Músicas novas'],
  ['audios','🎤 Fui marcado(a) em um áudio'],
  ['avisos','📣 Avisos do ADM'],
  ['aniversarios','🎂 Aniversários'],
  ['academia','📚 Materiais de estudo'],
  ['aovivo','🔴 Culto ao vivo'],
  ['cadastro','📝 Lembretes do meu cadastro'],
  ['presenca','✅ Confirmações de presença (ADM)']
];
function tipoDe(n){
  const l=String(n.link||''), t=(String(n.titulo||'')+' '+String(n.corpo||'')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(), ic=n.ic||'';
  if(/^musaudio:/.test(l) || /marcad[oa]\(?a?\)? em um audio/.test(t)) return 'audios';
  if(/presenca na escala/.test(t) && /confirmou|nao podera/.test(t)) return 'presenca';
  if(/^go:escala/.test(l) || /escala/.test(t)) return 'escala';
  if(/^go:playlist/.test(l) || /playlist/.test(t)) return 'playlist';
  if(/^mus:|^go:musicas/.test(l) || /musica(s)? nova|nova musica/.test(t)) return 'musicas';
  if(/^go:academia/.test(l) || /material/.test(t)) return 'academia';
  if(ic==='🎂' || ic==='🎉' || /aniver/.test(t)) return 'aniversarios';
  if(/^aovivo/.test(l) || /ao vivo|transmiss/.test(t)) return 'aovivo';
  if(/^go:perfil/.test(l) || /cadastro/.test(t)) return 'cadastro';
  return 'avisos';
}
window.tipoNotif=tipoDe;
const PK='ibnm_notif_prefs';
function prefs(){ try{ return Object.assign({},JSON.parse(localStorage.getItem(PK)||'{}')); }catch(_){ return {}; } }
const quer = n => prefs()[tipoDe(n)]!==false;
window.notifPermitida=quer;

/* som/janela só para os tipos que a pessoa quer */
if(typeof window.tocarSom==='function'){
  const _ts=window.tocarSom;
  window.tocarSom=function(id){ if(id) return _ts(id); const u=(typeof usuarioAtual==='function')&&usuarioAtual(); const L=u?(DB.notificacoes[u.email]||[]):[]; const nova=L.find(x=>!x.lida); if(nova && !quer(nova)) return; return _ts(id); };
}

/* ---------- inscrição no Web Push ---------- */
const b64 = s => { const p='='.repeat((4-s.length%4)%4); const r=atob((s+p).replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from([...r].map(c=>c.charCodeAt(0))); };
const suporta = () => ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window);
async function registro(){ try{ return await navigator.serviceWorker.ready; }catch(_){ return null; } }
async function salvaInscricao(sub){
  const u=(typeof usuarioAtual==='function')&&usuarioAtual(); if(!u||!sub||typeof sb==='undefined') return false;
  const j=sub.toJSON();
  const {error}=await sb.from('push_subs').upsert({endpoint:j.endpoint,user_id:(typeof _sessaoId!=='undefined'?_sessaoId:null),email:u.email,sub:j,prefs:prefs(),updated_at:new Date().toISOString()},{onConflict:'endpoint'});
  if(error){ console.warn('push_subs',error.message); return false; }
  return true;
}
window.ativarPush=async function(silencioso){
  if(!suporta()){ if(!silencioso) toast('Este celular/navegador não aceita notificações. No iPhone: adicione o app à Tela de Início primeiro.'); return false; }
  let p=Notification.permission;
  if(p==='default' && !silencioso) p=await Notification.requestPermission();
  if(p!=='granted'){ if(!silencioso) toast(p==='denied'?'As notificações estão bloqueadas. Libere nas configurações do navegador (cadeado ao lado do endereço → Notificações).':'Permissão não concedida.'); return false; }
  if(VAPID_PUBLICA.indexOf('__')===0) return false;
  const reg=await registro(); if(!reg) return false;
  let sub=await reg.pushManager.getSubscription();
  try{ if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(VAPID_PUBLICA)}); }
  catch(err){ if(!silencioso) toast('Não consegui ativar: '+(err.message||err)); return false; }
  const ok=await salvaInscricao(sub);
  if(!silencioso) toast(ok?'Pronto! Os avisos vão chegar na barra de notificações. 🔔':'Ativado no aparelho, mas falta rodar a seção 16 do SQL no Supabase.');
  try{ if(document.querySelector('.ps-card')) go(location.hash==='#notif'?'notificacoes':(window.__navStack&&window.__navStack().slice(-1)[0]||'').indexOf('perfil')>=0?'perfil':'notificacoes'); }catch(_){}
  return ok;
};
window.pedirPermissaoNotif=pedirPermissaoNotif=function(){ ativarPush(false); };
window.salvarPrefsNotif=async function(){
  const p={}; document.querySelectorAll('.ps-tipo input').forEach(i=>{ p[i.dataset.t]=i.checked; });
  localStorage.setItem(PK,JSON.stringify(p));
  try{ if(typeof _sessaoId!=='undefined' && _sessaoId) await sb.from('push_subs').update({prefs:p}).eq('user_id',_sessaoId); }catch(_){}
  toast('Preferências salvas.');
};
window.testarPush=async function(){
  const u=(typeof usuarioAtual==='function')&&usuarioAtual(); if(!u) return;
  await sb.from('notificacoes').insert({destino_email:u.email,ic:'🔔',titulo:'Teste de notificação',corpo:'Se você viu isto na barra do celular, está tudo certo! 🙌',data:new Date().toISOString(),lida:false,link:'go:notificacoes',popup:false});
  toast('Teste enviado. Feche o app e veja a barra de notificações.');
};
/* ao abrir o app, renova a inscrição (o celular troca o endereço de vez em quando) */
async function renova(){ try{ if(suporta() && Notification.permission==='granted') await ativarPush(true); }catch(_){} }
if(typeof iniciarApp==='function'){ const _ia=iniciarApp; window.iniciarApp=iniciarApp=function(){ _ia.apply(this,arguments); setTimeout(renova,4000); }; }
if(typeof _booted!=='undefined' && _booted) setTimeout(renova,4000);

/* ---------- cartão: notificações no celular + o que eu quero receber ---------- */
function status(){
  if(!suporta()) return '<div class="ps-st no">Este navegador não aceita notificações. <b>iPhone:</b> abra no Safari → Compartilhar → <b>Adicionar à Tela de Início</b> e use o app por lá.</div>';
  const p=Notification.permission;
  if(p==='granted') return '<div class="ps-st ok">✅ Notificações ativadas neste aparelho. Os avisos chegam na barra do celular, mesmo com o app fechado.</div><button class="mini-btn sec" onclick="testarPush()">Enviar um teste</button>';
  if(p==='denied') return '<div class="ps-st no">🔕 Bloqueadas neste aparelho. Para liberar: no Chrome, toque no cadeado ao lado do endereço → <b>Permissões</b> → <b>Notificações</b> → Permitir.</div>';
  return '<div class="ps-st">As notificações ainda não estão ativas neste aparelho.</div><button class="btn btn-primary" onclick="ativarPush(false)">🔔 Ativar notificações no celular</button>';
}
function cartao(){
  const p=prefs();
  return '<div class="card ps-card"><h3>🔔 Notificações no celular</h3>'+status()+
    '<div class="ps-sub">Quero receber:</div><div class="ps-tipos">'+TIPOS.filter(([k])=>k!=='presenca'||(window.ehAdminReal?ehAdminReal():ehAdmin())).map(([k,t])=>'<label class="ps-tipo"><span>'+t+'</span><input type="checkbox" data-t="'+k+'" '+(p[k]===false?'':'checked')+' onchange="salvarPrefsNotif()"><i></i></label>').join('')+'</div>'+
    '<p class="ps-dica">Desligado = não toca som, não abre janela e não vai para a barra do celular. O aviso continua guardado no 🔔 do app.</p></div>';
}
if(typeof ROTAS!=='undefined'){
  ['notificacoes','perfil'].forEach(r=>{ if(!ROTAS[r]) return; const _r=ROTAS[r];
    ROTAS[r]=function(){ let h=_r.apply(this,arguments);
      /* troca o cartão antigo de notificações do perfil pelo novo */
      h=h.replace(/<div class="card"><h3>\s*(?:\\uD83D\\uDD14|🔔)\s*Notificações do app<\/h3>[\s\S]*?<\/div>/,'');
      const k=r==='notificacoes'? h.indexOf('<div class="card av-som">') : h.lastIndexOf('</div>');
      return k>=0? h.slice(0,k)+cartao()+h.slice(k) : h+cartao(); }; });
}
/* abriu pelo toque na notificação do celular: vai direto para a página */
function abrePorParametro(){
  try{ const q=new URLSearchParams(location.search); const l=q.get('n'); if(!l) return;
    history.replaceState(history.state,'',location.pathname);
    setTimeout(()=>{ if(window.abrirLinkNotif && !abrirLinkNotif(l)) go('notificacoes'); },300); }catch(_){}
}
if(typeof iniciarApp==='function'){ const _ia2=iniciarApp; window.iniciarApp=iniciarApp=function(){ _ia2.apply(this,arguments); setTimeout(abrePorParametro,500); }; }
if(navigator.serviceWorker) navigator.serviceWorker.addEventListener('message',ev=>{ if(ev.data && ev.data.tipo==='abrir' && window.abrirLinkNotif) abrirLinkNotif(ev.data.link); });

const st=document.createElement('style'); st.textContent=`
.ps-st{font-size:13px;border-radius:10px;padding:9px 11px;background:#f4f7f5;color:#334;margin-bottom:8px;line-height:1.45}
.ps-st.ok{background:#e1f4ea;color:#1c6b47}.ps-st.no{background:#fff3e6;color:#7a4a00}
.ps-sub{font-size:12.5px;font-weight:800;color:#5d7c6e;margin:12px 0 6px}
.ps-tipos{display:flex;flex-direction:column}
.ps-tipo{display:flex;align-items:center;gap:10px;padding:10px 2px;border-top:1px solid #eef2ef;cursor:pointer}
.ps-tipo span{flex:1;font-size:14px;color:var(--verde-escuro)}
.ps-tipo input{display:none}
.ps-tipo i{width:44px;height:26px;border-radius:13px;background:#cfd8d3;position:relative;flex:none;transition:background .15s}
.ps-tipo i::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:left .15s}
.ps-tipo input:checked+i{background:var(--verde-med)}
.ps-tipo input:checked+i::after{left:21px}
.ps-dica{font-size:11.5px;color:#7a8f86;margin-top:8px}
`; document.head.appendChild(st);
})();
