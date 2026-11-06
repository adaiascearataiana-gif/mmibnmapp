/* ============================================================
   MM IBNM — Ajustes gerais (v1.2.0)
   - Botão VOLTAR do Android em todo o app (fecha janelas primeiro,
     volta tela a tela, no Início pergunta "Deseja sair?")
   - Ao trocar de tela, fecha menu/janelas que ficaram abertos
   - Partitura do Cantor: avisa quando o arquivo ainda não foi enviado
   - Texto legível nos botões do "Enviar para o SETLIST"
============================================================ */
(function(){
'use strict';

/* ---------- 1) VOLTAR: reforço ----------
   O Chrome ignora "voltas" criadas sem toque do usuário. Por isso, a cada
   toque na tela o app garante que existe uma "volta" guardada para ele. */
function armado(){ try{ return !!(history.state && history.state.ibnm && !history.state.root); }catch(_){ return false; } }
function arma(){ try{ if(!armado()) history.pushState({ibnm:1},''); }catch(_){} }
['pointerdown','touchstart','keydown'].forEach(ev=>document.addEventListener(ev,arma,{capture:true,passive:true}));

/* janelas que o VOLTAR deve fechar antes de mudar de tela */
const SOBREPOSTOS=['#tourBox','.tr-bv','.av-bg','.proj','.cc-sheet-bg','.ferr-bg','#corAcPop.show','.cor-ac-pop.show'];
function fechaSobreposto(){
  for(const s of SOBREPOSTOS){
    const el=document.querySelector(s); if(!el) continue;
    if(s==='#tourBox'){ if(window.tourFim) tourFim(true); else el.remove(); return true; }
    if(s==='.tr-bv'){ const b=document.getElementById('bvScreen'); if(b) b.innerHTML=''; else el.remove(); return true; }
    if(s==='.proj'){ if(window.fecharProjetor) fecharProjetor(); else el.remove(); return true; }
    if(/\.show$/.test(s)){ el.classList.remove('show'); return true; }
    el.remove(); return true;
  }
  /* listas de sugestão abertas (cantor, playlist) */
  const sug=[...document.querySelectorAll('.vz-sug,.pl-sug')].find(b=>b.innerHTML.trim()); if(sug){ sug.innerHTML=''; return true; }
  return false;
}
if(typeof window.__voltar==='function'){
  const _v=window.__voltar;
  window.__voltar=function(){ if(fechaSobreposto()) return true; return _v.apply(this,arguments); };
}

/* ---------- 2) trocar de tela fecha o que ficou aberto ---------- */
function limpaAoNavegar(){
  try{ const mb=document.getElementById('modalBg'); if(mb && mb.classList.contains('show') && typeof fecharModal==='function') fecharModal(); }catch(_){}
  try{ if(typeof toggleMenu==='function'){ const s=document.getElementById('sidemenu'); if(s && s.classList.contains('show')) toggleMenu(false); } }catch(_){}
  document.querySelectorAll('.cc-sheet-bg,.vz-sug,.pl-sug').forEach(el=>{ if(el.classList.contains('cc-sheet-bg')) el.remove(); else el.innerHTML=''; });
}
['go','abrirMusica','cantorAbrir','harpaAbrir','editorCifra'].forEach(nome=>{
  const f=window[nome]; if(typeof f!=='function') return;
  window[nome]=function(){ limpaAoNavegar(); return f.apply(this,arguments); };
  try{ if(nome==='go') go=window.go; }catch(_){}
});

/* ---------- 3) partitura do Cantor que ainda não existe ---------- */
if(typeof window.cantorPartitura==='function'){
  const _cp=window.cantorPartitura;
  window.cantorPartitura=function(n){
    const url='partituras/n'+n+'.png';
    const im=new Image();
    im.onload=()=>_cp(n);
    im.onerror=()=>toast('A partitura do hino '+n+' ainda não foi enviada para o app.');
    im.src=url;
  };
}

/* ---------- 5) Google Drive: não pedir login toda hora ----------
   Antes: o acesso ao Drive ficava só na memória e pedia "consentimento"
   a cada abertura do app. Agora fica guardado até vencer (~1 h) e,
   depois da 1ª autorização, renova sem a tela de consentimento. */
if(typeof window.ensureDriveToken==='function' || typeof ensureDriveToken==='function'){
  const K='ibnm_drive_tok';
  try{ const t=JSON.parse(localStorage.getItem(K)||'null'); if(t && t.exp>Date.now()+60000){ _gisTok=t.tok; _gisExp=t.exp; } }catch(_){}
  window.ensureDriveToken=ensureDriveToken=async function(){
    const cid=driveClientId(); if(!cid) throw new Error('Configure o Client ID do Google no Painel do ADM.');
    if(_gisTok && Date.now()<_gisExp-60000) return _gisTok;
    await carregarGIS();
    const u=(typeof usuarioAtual==='function'&&usuarioAtual())||{};
    const ja=localStorage.getItem('ibnm_drive_ok')==='1';
    return new Promise((resolve,reject)=>{
      try{
        const tc=google.accounts.oauth2.initTokenClient({client_id:cid,scope:'https://www.googleapis.com/auth/drive.file',hint:u.email||undefined,
          callback:(r)=>{ if(r&&r.access_token){ _gisTok=r.access_token; _gisExp=Date.now()+((r.expires_in||3600)*1000);
            try{ localStorage.setItem(K,JSON.stringify({tok:_gisTok,exp:_gisExp})); localStorage.setItem('ibnm_drive_ok','1'); }catch(_){} resolve(_gisTok); }
            else reject(new Error('Autorização negada.')); },
          error_callback:(err)=>reject(new Error((err&&err.type)==='popup_closed'?'Janela do Google fechada.':'Não foi possível conectar ao Google.'))});
        tc.requestAccessToken({prompt: ja? '' : 'consent'});
      }catch(e){ reject(e); }
    });
  };
}

/* ---------- 6) versão do app + "Atualizar agora" ---------- */
async function versaoServidor(){ try{ const t=await (await fetch('./sw.js?'+Date.now(),{cache:'no-store'})).text(); const m=/mmibnm-v(\d+)/.exec(t); return m? +m[1] : 0; }catch(_){ return 0; } }
window.atualizarAgora=async function(){
  toast('Atualizando o app…');
  try{ if(navigator.serviceWorker){ const rs=await navigator.serviceWorker.getRegistrations(); for(const r of rs) await r.unregister(); } }catch(_){}
  try{ if(window.caches){ const ks=await caches.keys(); for(const k of ks) if(k!=='ibnm-fotos') await caches.delete(k); } }catch(_){}
  try{ localStorage.setItem('ibnm_sw_novo','1'); }catch(_){}
  setTimeout(()=>location.replace(location.pathname+'?v='+Date.now()),300);
};
function cardVersao(){
  const v=(typeof APP_V!=='undefined'?APP_V:'')+' · '+(typeof VERSION!=='undefined'?VERSION:'');
  return '<div class="card av-ver"><h3>🔄 Versão do app</h3><p class="vr-l">Neste aparelho: <b>'+v+'</b><br><span id="vrSrv">Conferindo o servidor…</span></p>'+
    '<button class="mini-btn" onclick="atualizarAgora()">🔄 Atualizar o app agora</button><p class="vr-d">Use se alguma novidade ainda não apareceu. Não apaga seus dados nem o login.</p></div>';
}
if(typeof ROTAS!=='undefined' && ROTAS.perfil){
  const _pf=ROTAS.perfil;
  ROTAS.perfil=function(){ const h=_pf.apply(this,arguments); setTimeout(async()=>{ const el=document.getElementById('vrSrv'); if(!el) return; const s=await versaoServidor(); const a=parseInt(String(typeof APP_V!=='undefined'?APP_V:'').replace(/\D/g,''),10)||0;
      el.innerHTML= !s? 'Sem conexão para conferir.' : (s>a? '⚠️ Há uma versão nova no servidor (v'+s+'). Toque em Atualizar.' : '✅ Você está com a versão mais nova.'); },50);
    const i=h.lastIndexOf('</div>'); return i>=0? h.slice(0,i)+cardVersao()+h.slice(i) : h+cardVersao(); };
}

/* ---------- 4) estilos ---------- */
const st=document.createElement('style'); st.textContent=`
#modalBox .env-sub{display:block;color:#fff!important;opacity:1!important;font-weight:600;font-size:12.5px;margin-top:2px;letter-spacing:.01em}
#modalBox .mini-btn b{color:#fff}
.av-ver .vr-l{font-size:13.5px;color:#334;margin-bottom:10px;line-height:1.5}
.av-ver .vr-d{font-size:11.5px;color:#7a8f86;margin-top:8px}
.cc-tools .cc-setlist{background:var(--verde-med)!important;color:#fff!important;border-color:var(--verde-med)!important;font-weight:800}
`; document.head.appendChild(st);
})();
