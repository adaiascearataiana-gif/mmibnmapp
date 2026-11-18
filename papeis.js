/* ============================================================
   MM IBNM — Papéis: ADM principal × ADMs secundários (v1.4.0)
   • ADM PRINCIPAL: acesso total + Modo usuário + Painel de ADMs.
   • ADM secundário (quem o principal torna ADM na tabela de Membros):
     vê o app como membro + só as seções que o principal liberar.
   • Menu: sem "Meu Perfil" (fica no avatar) e sem "Notificações"
     (fica no sino). "Importar músicas" e "Buscar cifras" ficam
     dentro de Músicas.
   • Notificações: configurações só para o ADM principal, ao lado
     da Central de avisos. Membros só veem os avisos.
============================================================ */
(function(){
'use strict';
const e = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $id = id => document.getElementById(id);
const cfg = k => ((typeof APP_CFG!=='undefined'&&APP_CFG&&APP_CFG[k])||null);
const eu = () => (typeof usuarioAtual==='function'&&usuarioAtual())||null;
const real = () => { try{ return !!(window.ehAdminReal? ehAdminReal() : false); }catch(_){ return false; } };

/* ---------- quem é o ADM principal ---------- */
const PRINCIPAL_PADRAO=['adaiascearataiana@gmail.com'];
function principais(){
  const c=cfg('adm_principais'); const lista=(Array.isArray(c)&&c.length? c : PRINCIPAL_PADRAO).map(x=>String(x).toLowerCase());
  /* segurança: se nenhum ADM tiver o e-mail da lista, todos os ADM atuais contam como principais (ninguém fica trancado) */
  const adms=(typeof DB!=='undefined'&&DB.usuarios||[]).filter(u=>u.admin).map(u=>u.email);
  if(adms.length && !adms.some(m=>lista.includes(m))) return adms;
  return lista;
}
window.ehPrincipal=function(){ const u=eu(); return !!(u && u.admin && principais().includes(String(u.email||'').toLowerCase())); };

/* ---------- seções que o principal pode liberar ---------- */
const SECOES=[
  ['playlist','📅 SETLIST (montar e enviar músicas)'],
  ['musicas','🎵 Músicas (criar, editar cifra, letra e áudios)'],
  ['hinos','📖 Cantor Cristão e Harpa (editar cifras, ao vivo)'],
  ['importar','📥 Importar músicas e 🎸 Buscar cifras'],
  ['escala','📋 Escala (importar e avisar)'],
  ['avisos','📣 Central de avisos'],
  ['academia','🎓 Academia (materiais)'],
  ['ensaios','🎼 Ensaios'],
  ['membros','👥 Tabela de membros (sem tornar ADM)'],
  ['financeiro','💰 Setor Financeiro'],
  ['inventario','🔧 Inventário']
];
const perms = () => cfg('adm_permissoes')||{};
function liberado(sec, u){ u=u||eu(); if(!u||!u.admin) return false; const p=perms()[u.id]||{}; return !!p[sec]; }
window.secaoLiberada=liberado;

/* em que seção a pessoa está agora (para o ADM secundário ver só o que foi liberado) */
const MAPA={playlist:'playlist',musicas:'musicas',favoritos:'musicas',cifras:'importar',telegram:'importar',escala:'escala',
  central:'avisos',notificacoes:'avisos',academia:'academia',ensaios:'ensaios',membros:'membros',financeiro:'financeiro',inventario:'inventario',
  cantor:'hinos',harpa:'hinos',admin:'__principal'};
window.__secAtual='';
const _modoReal=window.modoUsuario;
window.modoUsuario=function(){ try{ return ehPrincipal() && !!(_modoReal&&_modoReal()); }catch(_){ return false; } };
window.ehAdmin=ehAdmin=function(){
  if(!real()) return false;
  if(ehPrincipal()) return !modoUsuario();
  const s=window.__secAtual; return !!(s && s!=='__principal' && liberado(s));
};
/* o Financeiro/Inventário usam podeSetor() */
const _ps=window.podeSetor;
window.podeSetor=function(p){ if(ehPrincipal() && !modoUsuario()) return true; if(liberado(p)) return true; try{ return !!(_ps&&!real()&&_ps(p)); }catch(_){ return false; } };

/* marca a seção antes de desenhar cada tela */
if(typeof ROTAS!=='undefined'){
  Object.keys(ROTAS).forEach(k=>{ const f=ROTAS[k]; if(typeof f!=='function') return; ROTAS[k]=function(){ window.__secAtual=MAPA[k]||''; return f.apply(this,arguments); }; });
}
function marca(nome,sec){ const f=window[nome]; if(typeof f!=='function') return; window[nome]=function(){ window.__secAtual=sec; return f.apply(this,arguments); }; }
marca('renderMusica','musicas'); marca('editorCifra','musicas'); marca('abrirMusica','musicas');
marca('cantorAbrir','hinos'); marca('harpaAbrir','hinos'); marca('modalPlaylist','playlist'); marca('enviarPraPlaylist','playlist');
try{ renderMusica=window.renderMusica; }catch(_){}

/* ---------- menu ---------- */
/* fora do menu: Meu Perfil (avatar) e Notificações (sino) */
if(typeof MENU!=='undefined' && Array.isArray(MENU)){
  for(let i=MENU.length-1;i>=0;i--) if(MENU[i].id==='perfil'||MENU[i].id==='notificacoes') MENU.splice(i,1);
}
if(typeof montaMenu==='function'){
  const _mm=montaMenu;
  window.montaMenu=montaMenu=function(){
    const sAnt=window.__secAtual; window.__secAtual='';
    try{ _mm.apply(this,arguments); }finally{ window.__secAtual=sAnt; }
    const sm=$id('sidemenu'); if(!sm) return;
    const pr=ehPrincipal(), mu=modoUsuario();
    /* tira os itens de ADM e recoloca só os que a pessoa pode ver */
    sm.querySelectorAll('.sm-item').forEach(b=>{ const oc=b.getAttribute('onclick')||'';
      if(/go\('(admin|membros|central|cifras|telegram|perfil|notificacoes)'\)/.test(oc)) b.remove(); });
    if(!pr){ const m=$id('smModo'); if(m) m.remove(); const pill=$id('modoPill'); if(pill) pill.remove(); }
    const rl=sm.querySelector('.sm-head .rl'); if(rl) rl.textContent = pr? (mu?'ADM principal • modo usuário':'ADM principal • MM IBNM') : 'Membro • MM IBNM';
    const nav=sm.querySelector('.sm-nav'); if(!nav) return;
    const itens=[];
    const pode=s=> (pr&&!mu) || (!pr && liberado(s));
    if(pode('avisos')) itens.push(['central','📣','Central de avisos']);
    if(pode('membros')) itens.push(['membros','👥','Membros (tabela)']);
    if(pr && !mu) itens.push(['admin','⚙️','Painel do ADM']);
    if(itens.length){
      const aj=[...nav.querySelectorAll('.sm-item')].find(b=>/go\('ajuda'\)/.test(b.getAttribute('onclick')||''));
      const html=itens.map(([r,ic,t])=>'<button class="sm-item" onclick="go(\''+r+'\')"><span class="ic">'+ic+'</span>'+t+'</button>').join('');
      if(aj) aj.insertAdjacentHTML('beforebegin',html); else nav.insertAdjacentHTML('beforeend',html);
    }
  };
}
/* topo: o selo "ADM"/"modo usuário" só para o principal */
if(typeof ROTAS!=='undefined' && ROTAS.perfil){
  const _pf=ROTAS.perfil;
  ROTAS.perfil=function(){ let h=_pf.apply(this,arguments); if(!ehPrincipal()) h=h.replace(/<span class="admin-tag"[^>]*>[^<]*<\/span>/,'');
    /* configurações de notificação saem do perfil */
    h=h.replace(/<div class="card ps-card">[\s\S]*?<p class="ps-dica">[\s\S]*?<\/p><\/div>/,'').replace(/<div class="card av-som">[\s\S]*?<\/label><\/div>/,'');
    h=h.replace(/<div class="card"><h3>\s*(?:\\uD83D\\uDD14|🔔)\s*Notificações do app<\/h3>[\s\S]*?<\/div>\s*<\/div>/,'');
    return h; };
}

/* ---------- 🔔 sino: avisos para todos; configurações só para o principal ---------- */
if(typeof ROTAS!=='undefined' && ROTAS.notificacoes){
  const _nf=ROTAS.notificacoes;
  ROTAS.notificacoes=function(){
    let h=_nf.apply(this,arguments);
    const cfgCards=[]; 
    h=h.replace(/<div class="card ps-card">[\s\S]*?<p class="ps-dica">[\s\S]*?<\/p><\/div>/,m=>{ cfgCards.push(m); return ''; });
    h=h.replace(/<div class="card av-som">[\s\S]*?<\/label><\/div>/,m=>{ cfgCards.push(m); return ''; });
    h=h.replace(/<button class="mini-btn"[^>]*onclick="(?:go\('central'\)|modalAviso\(\))"[^>]*>[^<]*<\/button>/g,'');
    const pr=ehPrincipal()&&!modoUsuario();
    if(!pr) return h;
    const barra='<div class="nt-bar"><button class="mini-btn" onclick="go(\'central\')">📣 Central de avisos</button><button class="mini-btn sec" onclick="document.getElementById(\'ntCfg\').classList.toggle(\'show\')">⚙️ Configurações</button></div>'+
      '<div id="ntCfg" class="nt-cfg">'+cfgCards.join('')+'</div>';
    const k=h.indexOf('</div>',h.indexOf('page-ttl')); return k>=0? h.slice(0,k+6)+barra+h.slice(k+6) : barra+h;
  };
}
/* membros recebem os avisos no celular sem precisar configurar: o app pede a permissão no 1º toque */
let _pediu=false;
document.addEventListener('pointerdown',async()=>{
  if(_pediu) return; _pediu=true;
  try{ if(!eu() || !('Notification' in window) || Notification.permission!=='default' || localStorage.getItem('ibnm_push_pedido')) return;
    localStorage.setItem('ibnm_push_pedido','1');
    const r=await Notification.requestPermission(); if(r==='granted' && window.ativarPush) ativarPush(true);
  }catch(_){}
},{capture:true});

/* ---------- Músicas: Importar e Buscar cifras dentro da página ---------- */
if(typeof ROTAS!=='undefined' && ROTAS.musicas){
  const _mu=ROTAS.musicas;
  ROTAS.musicas=function(){
    let h=_mu.apply(this,arguments);
    const pode=(ehPrincipal()&&!modoUsuario()) || liberado('importar');
    h=h.replace(/<button class="mini-btn sec"[^>]*onclick="go\('telegram'\)"[^>]*>[^<]*<\/button>/g,'').replace(/<button class="mini-btn sec"[^>]*onclick="go\('cifras'\)"[^>]*>[^<]*<\/button>/g,'');
    if(!pode) return h;
    const n=(DB.musicas||[]).filter(m=>!String(m.cifra||'').replace(/<[^>]+>/g,'').trim()).length;
    const bt='<div class="mu-adm"><button class="mini-btn" onclick="go(\'telegram\')">📥 Importar músicas</button><button class="mini-btn" onclick="go(\'cifras\')">🎸 Buscar cifras'+(n?' ('+n+')':'')+'</button></div>';
    const k=h.indexOf('</div>',h.indexOf('page-ttl')); return k>=0? h.slice(0,k+6)+bt+h.slice(k+6) : bt+h;
  };
}

/* ---------- Painel do ADM (só principal) ---------- */
function painelAdms(){
  const us=(DB.usuarios||[]).filter(u=>u.admin && !principais().includes(String(u.email||'').toLowerCase())).sort((a,b)=>a.nome.localeCompare(b.nome,'pt'));
  const P=perms();
  return '<div class="card pa-card"><h3>👑 Painel de ADMs</h3><p class="pa-p">Aqui aparecem só os ADMs que você tornou ADM na <b>tabela de Membros</b>. Eles veem o app como membros e acessam apenas as seções que você liberar.</p>'+
    (us.length? us.map(u=>'<div class="pa-adm"><div class="pa-h"><b>'+e(u.nome)+'</b><small>'+e(u.email||'')+'</small></div><div class="pa-sec">'+
      SECOES.map(([k,t])=>'<label class="pa-op"><input type="checkbox" '+((P[u.id]||{})[k]?'checked':'')+' onchange="paPerm(\''+e(u.id)+'\',\''+k+'\',this.checked)"><span>'+t+'</span></label>').join('')+
      '</div></div>').join('') : '<p class="pa-vz">Nenhum ADM secundário ainda. Abra <b>Membros (tabela)</b> e toque em <b>Tornar ADM</b> na pessoa.</p>')+
    '<button class="mini-btn sec" onclick="go(\'membros\')">👥 Abrir tabela de membros</button></div>';
}
window.paPerm=async function(uid,sec,v){
  if(!ehPrincipal()) return;
  const P=JSON.parse(JSON.stringify(perms())); P[uid]=Object.assign({},P[uid]||{}); if(v) P[uid][sec]=true; else delete P[uid][sec];
  try{ await salvarConfig('adm_permissoes',P); APP_CFG.adm_permissoes=P; toast(v?'Seção liberada.':'Seção bloqueada.'); }catch(err){ toast('Erro ao salvar.'); }
};
if(typeof ROTAS!=='undefined' && ROTAS.admin){
  const _ad=ROTAS.admin;
  ROTAS.admin=function(){
    if(!(ehPrincipal()&&!modoUsuario())) return '<div class="page"><div class="empty">Acesso restrito ao ADM principal.</div></div>';
    let h=_ad.apply(this,arguments);
    /* sai: lista antiga de membros, o painel antigo de setores e a "Formatação das cifras" */
    h=h.replace(/<div class="card"><h3>Membros \(\d+\)<\/h3>[\s\S]*?<\/div>\s*<\/div>\s*(?=<div class="card")/,'');
    h=h.replace(/<div class="card"><h3>👑 Painel de ADMs<\/h3>[\s\S]*?(?=<div class="card"><h3>Resumo)/,'');
    h=h.replace(/<div class="card"><h3>🧹 Formatação das cifras<\/h3>[\s\S]*?<\/div>(?=<div class="card")/,'');
    const k=h.indexOf('<div class="card">'); return k>=0? h.slice(0,k)+painelAdms()+h.slice(k) : h+painelAdms();
  };
}
/* tabela de membros: só o principal torna/tira ADM e exclui */
if(typeof ROTAS!=='undefined' && ROTAS.membros){
  const _mb=ROTAS.membros;
  ROTAS.membros=function(){ let h=_mb.apply(this,arguments); if(ehPrincipal()&&!modoUsuario()) return h;
    return h.replace(/<button onclick="membroAdm\([^)]*\)">[^<]*<\/button>/g,'').replace(/<button class="del" onclick="membroExcluir\([^)]*\)">[^<]*<\/button>/g,''); };
}
/* Modo usuário: só o principal alterna */
if(typeof window.alternarModo==='function'){ const _am=window.alternarModo; window.alternarModo=function(m){ if(!ehPrincipal()) return; return _am.apply(this,arguments); }; }

const st=document.createElement('style'); st.textContent=`
.nt-bar,.mu-adm{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}
.nt-bar .mini-btn,.mu-adm .mini-btn{margin:0;flex:1;min-width:140px}
.nt-cfg{display:none}.nt-cfg.show{display:block}
.pa-p{font-size:12.5px;color:#556;margin-bottom:10px;line-height:1.45}
.pa-adm{border:1px solid #e3ece7;border-radius:12px;padding:10px;margin-bottom:10px}
.pa-h b{display:block;font-size:15px;color:var(--verde-escuro)}
.pa-h small{font-size:12px;color:#6b8378;overflow-wrap:anywhere}
.pa-sec{display:flex;flex-direction:column;margin-top:6px}
.pa-op{display:flex;align-items:center;gap:10px;padding:7px 2px;border-top:1px solid #f0f4f2;font-size:13.5px;color:var(--verde-escuro);cursor:pointer}
.pa-op input{width:18px;height:18px;flex:none;accent-color:var(--verde-med)}
.pa-vz{font-size:13px;color:#7a8f86;margin-bottom:10px}
`; document.head.appendChild(st);
if(typeof _booted!=='undefined' && _booted){ try{ montaMenu(); }catch(_){} }
})();
