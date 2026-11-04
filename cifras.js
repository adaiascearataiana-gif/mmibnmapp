/* ============================================================
   MM IBNM — Assistente de cifras (v0.9.3)
   Para cada música sem cifra: link direto para a cifra no Cifra Club
   (e busca no Google), botão "Colar cifra copiada", conferência com a
   letra já cadastrada (cruzamento título + letra) e importação só
   depois que o ADM confere. A cifra entra com a formatação original e
   continua editável.
============================================================ */
(function(){
'use strict';
const e = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const semA = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const slug = s => semA(s).replace(/&/g,' e ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const $id = id => document.getElementById(id);
const ehC = l => (window.__ehLinhaCifra||(()=>false))(l);

/* ---------- links ---------- */
function linksDe(m){
  const t=String(m.titulo||'').replace(/\s*[-–]\s*\d+\s*$/,'').trim(), a=(m.artista||'').trim();
  const q=encodeURIComponent((t+' '+a).trim());
  return {
    direto: a? 'https://www.cifraclub.com.br/'+slug(a)+'/'+slug(t)+'/' : '',
    busca: 'https://www.cifraclub.com.br/?q='+q,
    google: 'https://www.google.com/search?q='+encodeURIComponent('cifra '+t+' '+a)
  };
}
/* ---------- conferência: a cifra colada corresponde à letra cadastrada? ---------- */
function palavras(txt){ return semA(txt).replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2); }
function letraDaCifra(txt){ return String(txt||'').split('\n').filter(l=>!ehC(l) && !/^\s*\[[^\]]*\]\s*$/.test(l) && !/^\s*[A-Ga-g]?\|[-\d|]/.test(l)).join('\n'); }
function confere(m,txt){
  const a=palavras(m.letra||''), b=palavras(letraDaCifra(txt));
  const tri=arr=>{ const s=new Set(); for(let i=0;i+2<arr.length;i++) s.add(arr[i]+' '+arr[i+1]+' '+arr[i+2]); return s; };
  let pctLetra=null;
  if(a.length>=6 && b.length>=6){ const A=tri(a), B=tri(b); let comum=0; A.forEach(x=>{ if(B.has(x)) comum++; }); pctLetra=Math.round(100*comum/Math.max(1,Math.min(A.size,B.size))); }
  const tw=palavras(m.titulo); const tituloOk=tw.length? tw.filter(w=>b.concat(palavras(txt.split('\n').slice(0,4).join(' '))).includes(w)).length/tw.length>=0.6 : false;
  const acordes=txt.split('\n').filter(ehC).length;
  return {pctLetra,tituloOk,acordes};
}
/* ---------- texto colado: mesma regra do editor (mantém o alinhamento) ---------- */
function normaliza(t){
  return String(t||'').replace(/\r\n?/g,'\n').replace(/\u00a0/g,' ')
    .split('\n').map(l=>{ let o='',c=0; for(const ch of l){ if(ch==='\t'){ const n=4-(c%4); o+=' '.repeat(n); c+=n; } else { o+=ch; c++; } } return o.replace(/\s+$/,''); })
    .join('\n').replace(/\n{3,}/g,'\n\n').replace(/^\n+|\n+$/g,'');
}
const paraHtml = t => t.split('\n').map(l=>'<div>'+(l? l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '<br>')+'</div>').join('');

/* ---------- cartão do assistente (na música e na lista) ---------- */
function cartao(m,compacto){
  const L=linksDe(m);
  return '<div class="cf-ass" id="cfAss_'+e(m.id)+'">'+
    (compacto?'':'<div class="cf-ass-t">🎸 Esta música ainda não tem cifra</div><p class="cf-ass-p">Abra o link, confira se é a mesma música, copie a cifra e toque em <b>Colar cifra copiada</b>. O app compara com a letra antes de importar.</p>')+
    '<div class="cf-ass-l">'+
      (L.direto?'<a class="cf-lk" href="'+L.direto+'" target="_blank" rel="noopener">🎸 Ver no Cifra Club ↗</a>':'')+
      '<a class="cf-lk sec" href="'+L.busca+'" target="_blank" rel="noopener">🔎 Buscar no Cifra Club ↗</a>'+
      '<a class="cf-lk sec" href="'+L.google+'" target="_blank" rel="noopener">🔎 Google ↗</a>'+
    '</div>'+
    '<button class="cf-colar" onclick="cfColar(\''+e(m.id)+'\')">📋 Colar cifra copiada</button>'+
    '<div class="cf-prev" id="cfPrev_'+e(m.id)+'"></div></div>';
}
window.cfColar=async function(id){
  const m=(DB.musicas||[]).find(x=>x.id===id); if(!m) return;
  let txt='';
  try{ if(navigator.clipboard && navigator.clipboard.readText) txt=await navigator.clipboard.readText(); }catch(_){}
  if(!txt || !txt.trim()){ return cfColarManual(id); }
  mostraPrevia(m,txt);
};
function cfColarManual(id){
  const m=(DB.musicas||[]).find(x=>x.id===id); if(!m) return;
  abrirModal('<h3>Colar cifra — '+e(m.titulo)+'</h3><p style="font-size:12.5px;color:#556">Toque no campo, segure e escolha <b>Colar</b>.</p>'+
    '<textarea id="cfTxt" rows="12" style="width:100%;font-family:\'Courier New\',monospace;font-size:13px;white-space:pre" placeholder="Cole aqui a cifra copiada"></textarea>'+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Cancelar</button><button class="btn btn-primary" onclick="cfDoCampo(\''+e(id)+'\')">Conferir</button></div>');
}
window.cfDoCampo=function(id){ const t=($id('cfTxt')||{}).value||''; fecharModal(); const m=(DB.musicas||[]).find(x=>x.id===id); if(m && t.trim()) mostraPrevia(m,t); };
const PEND={};
function mostraPrevia(m,bruto){
  const txt=normaliza(bruto); PEND[m.id]=txt;
  const c=confere(m,txt); const L=linksDe(m);
  const box=$id('cfPrev_'+m.id); if(!box) return;
  let sel, cor;
  if(!c.acordes){ sel='⚠️ Não encontrei acordes no texto colado. Confira se copiou a cifra (e não só a letra).'; cor='no'; }
  else if(c.pctLetra==null){ sel=c.tituloOk? '✅ O título confere. Não há letra cadastrada para comparar — confira antes de importar.' : 'ℹ️ Sem letra cadastrada para comparar. Confira pelo link antes de importar.'; cor=c.tituloOk?'ok':'meio'; }
  else if(c.pctLetra>=60){ sel='✅ Cifra correspondente: a letra confere '+c.pctLetra+'% com a letra cadastrada'+(c.tituloOk?' e o título também.':'.'); cor='ok'; }
  else if(c.pctLetra>=30){ sel='⚠️ A letra confere só '+c.pctLetra+'%. Pode ser outra versão — confira.'; cor='meio'; }
  else { sel='❌ A letra confere só '+c.pctLetra+'%. Parece ser outra música.'; cor='no'; }
  box.innerHTML='<div class="cf-res '+cor+'">'+sel+'<small>'+c.acordes+' linha(s) de acordes · '+txt.split('\n').length+' linhas</small></div>'+
    '<pre class="cf-pre">'+e(txt.split('\n').slice(0,18).join('\n'))+(txt.split('\n').length>18?'\n…':'')+'</pre>'+
    '<div class="cf-ass-l">'+(L.direto?'<a class="cf-lk sec" href="'+L.direto+'" target="_blank" rel="noopener">Abrir a cifra original ↗</a>':'<a class="cf-lk sec" href="'+L.busca+'" target="_blank" rel="noopener">Abrir a busca ↗</a>')+'</div>'+
    '<div class="cf-acts"><button class="btn btn-dark" onclick="cfDescartar(\''+e(m.id)+'\')">Descartar</button><button class="btn btn-primary" onclick="cfImportar(\''+e(m.id)+'\')">✅ Conferi — importar cifra</button></div>';
  box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
window.cfDescartar=function(id){ delete PEND[id]; const b=$id('cfPrev_'+id); if(b) b.innerHTML=''; };
window.cfImportar=async function(id){
  const m=(DB.musicas||[]).find(x=>x.id===id); const txt=PEND[id]; if(!m||!txt) return;
  const cifra=paraHtml(txt);
  const {error}=await sb.from('musicas').update({cifra}).eq('id',id);
  if(error){ if(/fetch|network|Failed/i.test(error.message||'')){ filaEnvia('musicaUpdate',[id,{cifra}]); } else return toast('Erro ao salvar: '+error.message); }
  m.cifra=cifra; delete PEND[id];
  toast('Cifra importada! Continua editável em "Editar cifra".');
  const naLista=!!document.querySelector('.cfb-page');
  if(naLista){ const c=document.getElementById('cfb_'+id); if(c) c.remove(); atualizaContagem(); }
  else abrirMusica(id,'cifra');
};

/* ---------- na tela da música (ADM): cartão quando não tem cifra ---------- */
if(typeof renderMusica==='function'){
  const _rm=renderMusica;
  window.renderMusica=renderMusica=function(){
    let h=_rm.apply(this,arguments);
    try{ if(typeof h==='string' && ehAdmin() && abaAtual==='cifra'){ const m=DB.musicas.find(x=>x.id===musicaAberta);
      if(m && !String(m.cifra||'').replace(/<[^>]+>/g,'').trim()){ const k=h.lastIndexOf('</div>'); h=h.slice(0,k)+'<div class="card">'+cartao(m)+'</div>'+h.slice(k); } } }catch(_){}
    return h;
  };
}
/* ao salvar uma letra numa música sem cifra: já mostra o assistente */
if(typeof window.salvarLetra==='function'){
  const _sl=window.salvarLetra;
  window.salvarLetra=async function(id){ await _sl.apply(this,arguments); const m=(DB.musicas||[]).find(x=>x.id===id);
    if(m && m.letra && !String(m.cifra||'').replace(/<[^>]+>/g,'').trim()){ toast('Letra salva. Agora vamos achar a cifra 🎸'); setTimeout(()=>abrirMusica(id,'cifra'),400); } };
}

/* ---------- página: todas as músicas sem cifra ---------- */
let FB={q:'',so:'letra'};
function semCifra(){ return (DB.musicas||[]).filter(m=>!String(m.cifra||'').replace(/<[^>]+>/g,'').trim())
  .filter(m=>FB.so==='todas' || (m.letra||'').trim())
  .filter(m=>!FB.q || semA(m.titulo+' '+m.artista).includes(semA(FB.q)))
  .sort((a,b)=>a.titulo.localeCompare(b.titulo,'pt')); }
function atualizaContagem(){ const c=$id('cfbN'); if(c) c.textContent=semCifra().length+' música(s) sem cifra'; }
function listaHTML(){
  const ms=semCifra();
  if(!ms.length) return '<div class="empty"><div class="big">🎉</div>Todas as músicas '+(FB.so==='letra'?'com letra ':'')+'já têm cifra.</div>';
  return ms.map(m=>'<div class="card cfb-it" id="cfb_'+e(m.id)+'"><div class="cfb-h"><b>'+e(m.titulo)+'</b><small>'+e(m.artista||'artista não informado')+'</small>'+
    (m.letra?'<small class="cfb-l">'+e(m.letra.split('\n').filter(Boolean).slice(0,2).join(' / ')).slice(0,120)+'</small>':'<small class="cfb-l">sem letra cadastrada</small>')+'</div>'+
    cartao(m,true)+'<button class="cfb-ab" onclick="abrirMusica(\''+e(m.id)+'\',\'cifra\')">Abrir a música ›</button></div>').join('');
}
window.cfbBusca=function(v){ FB.q=v; const l=$id('cfbLista'); if(l) l.innerHTML=listaHTML(); atualizaContagem(); };
window.cfbFiltro=function(v){ FB.so=v; go('cifras'); };
if(typeof ROTAS!=='undefined'){
  ROTAS.cifras=function(){
    if(!ehAdmin()) return '<div class="page"><div class="empty">Acesso restrito ao ADM.</div></div>';
    return '<div class="page cfb-page"><div class="page-ttl">🎸 Buscar cifras</div>'+
      '<p class="cf-ass-p">Para cada música sem cifra: abra o link, confira, copie a cifra inteira e toque em <b>Colar cifra copiada</b>. O app confere com a letra e você importa com um toque. A formatação original é mantida e tudo continua editável.</p>'+
      '<div class="cfb-bar"><input type="search" placeholder="🔍 Filtrar por título ou artista" value="'+e(FB.q)+'" oninput="cfbBusca(this.value)">'+
      '<select onchange="cfbFiltro(this.value)"><option value="letra" '+(FB.so==='letra'?'selected':'')+'>Com letra</option><option value="todas" '+(FB.so==='todas'?'selected':'')+'>Todas</option></select></div>'+
      '<p class="cfb-n" id="cfbN">'+semCifra().length+' música(s) sem cifra</p><div id="cfbLista">'+listaHTML()+'</div></div>';
  };
}
/* atalhos: menu do ADM, Painel do ADM, lista de músicas e depois de importar letras */
if(typeof montaMenu==='function'){
  const _mm=montaMenu;
  window.montaMenu=montaMenu=function(){ _mm.apply(this,arguments);
    if(!ehAdmin() || document.querySelector('#sidemenu [data-cifras]')) return;
    const adm=[...document.querySelectorAll('#sidemenu .sm-item')].find(b=>/go\('admin'\)/.test(b.getAttribute('onclick')||''));
    if(adm) adm.insertAdjacentHTML('beforebegin','<button class="sm-item" data-cifras onclick="go(\'cifras\')"><span class="ic">🎸</span>Buscar cifras</button>'); };
}
if(typeof ROTAS!=='undefined' && ROTAS.musicas){
  const _mu=ROTAS.musicas;
  ROTAS.musicas=function(){ const h=_mu.apply(this,arguments); if(!ehAdmin()) return h;
    const n=(DB.musicas||[]).filter(m=>(m.letra||'').trim() && !String(m.cifra||'').replace(/<[^>]+>/g,'').trim()).length; if(!n) return h;
    return h.replace('📥 Importar várias (JSON)</button>','📥 Importar várias (JSON)</button><button class="mini-btn sec" style="margin:0 0 12px 6px" onclick="go(\'cifras\')">🎸 Buscar cifras ('+n+')</button>'); };
}
if(typeof ROTAS!=='undefined' && ROTAS.admin){
  const _ad=ROTAS.admin;
  ROTAS.admin=function(){ const h=_ad.apply(this,arguments); if(!ehAdmin()) return h;
    const n=(DB.musicas||[]).filter(m=>!String(m.cifra||'').replace(/<[^>]+>/g,'').trim()).length;
    const card='<div class="card"><h3>🎸 Cifras</h3><p style="font-size:13px;color:#556;margin-bottom:10px">'+n+' música(s) sem cifra. Abra o assistente para achar e importar cada uma.</p><button class="mini-btn" onclick="go(\'cifras\')">Buscar cifras</button></div>';
    const i=h.indexOf('<div class="card">'); return i>=0? h.slice(0,i)+card+h.slice(i) : h+card; };
}
window.__cfConfere=confere; window.__cfLinks=linksDe;

const st=document.createElement('style'); st.textContent=`
.cf-ass-t{font-weight:900;color:var(--verde-escuro);font-size:15px;margin-bottom:4px}
.cf-ass-p{font-size:12.5px;color:#556;margin:0 0 10px;line-height:1.45}
.cf-ass-l{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
.cf-lk{display:inline-flex;align-items:center;height:36px;padding:0 12px;border-radius:10px;background:#f37021;color:#fff;font-weight:800;font-size:13px;text-decoration:none}
.cf-lk.sec{background:#fff;color:var(--verde-escuro);border:1px solid #cfdad4}
.cf-colar{width:100%;height:44px;border-radius:12px;border:0;background:var(--verde-med);color:#fff;font-weight:900;font-size:14.5px;margin-top:4px}
.cf-res{border-radius:10px;padding:10px 12px;font-size:13.5px;font-weight:700;margin-top:10px}
.cf-res small{display:block;font-weight:600;font-size:11.5px;opacity:.8;margin-top:3px}
.cf-res.ok{background:#e1f4ea;color:#1c6b47}.cf-res.meio{background:#fff3e6;color:#7a4a00}.cf-res.no{background:#fde4df;color:#8a2b1e}
.cf-pre{background:#fffdf5;border:1px solid #efe7c8;border-radius:10px;padding:10px;font-family:'Courier New',monospace;font-size:11.5px;white-space:pre;overflow-x:auto;max-height:280px;margin-top:8px}
.cf-acts{display:flex;gap:8px;margin-top:8px}.cf-acts .btn{flex:1;margin:0}
.cfb-bar{display:flex;gap:6px;position:sticky;top:var(--ibnm-topbar,64px);z-index:20;background:var(--cinza,#eef4f1);margin:0 -14px;padding:8px 14px}
.cfb-bar input{flex:1;min-width:0;height:42px;border:1px solid #cfdad4;border-radius:10px;padding:0 12px;font-size:14px}
.cfb-bar select{height:42px;border:1px solid #cfdad4;border-radius:10px;padding:0 8px;background:#fff}
.cfb-n{font-size:12px;color:#7a8f86;margin:6px 0 10px}
.cfb-h{display:flex;flex-direction:column;gap:2px;margin-bottom:6px}
.cfb-h b{font-size:15.5px;color:var(--verde-escuro)}
.cfb-h small{font-size:12px;color:#5d7268}
.cfb-h .cfb-l{color:#8a9;font-style:italic}
.cfb-ab{border:0;background:none;color:var(--verde-med);font-weight:800;font-size:13px;margin-top:8px;padding:4px 0}
`; document.head.appendChild(st);
})();
