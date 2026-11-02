/* ============================================================
   MM IBNM — Importar letras do Telegram (v0.9.1)
   O ADM exporta o grupo/canal no Telegram Desktop (formato JSON)
   e escolhe o arquivo result.json aqui. Cada tópico (♫ Título) vira
   uma música com a letra das mensagens de dentro dele.
============================================================ */
(function(){
'use strict';
const e = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sem = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const cap = s => (window.capTitulo? capTitulo(s) : s);
const $id = id => document.getElementById(id);

/* ---------- leitura do result.json ---------- */
function textoDe(t){
  if(typeof t==='string') return t;
  if(Array.isArray(t)) return t.map(x=>typeof x==='string'?x:(x&&x.text)||'').join('');
  return '';
}
function limpaTitulo(t){ return String(t||'').replace(/^[\s\u{1F3B5}\u{1F3B6}\u{1F3BC}♩♪♫♬#*\-–—•·]+/u,'').replace(/\s+/g,' ').trim(); }
/* "Título - Artista" ou "Título (Artista)" */
function separaArtista(t){
  t=limpaTitulo(t);
  let m=t.match(/^(.*\S)\s+[-–—]\s+([^-–—]{2,40})$/);
  if(m) return {titulo:m[1].trim(),artista:m[2].trim()};
  m=t.match(/^(.*\S)\s*\(([^()]{2,40})\)\s*$/);
  if(m && !/^\d+x$/i.test(m[2])) return {titulo:m[1].trim(),artista:m[2].trim()};
  return {titulo:t,artista:''};
}
function limpaLetra(txt,titulo){
  let l=String(txt||'').replace(/\r/g,'').replace(/\u00a0/g,' ').split('\n').map(x=>x.replace(/\s+$/,'')).join('\n').replace(/\n{3,}/g,'\n\n').trim();
  const linhas=l.split('\n'); if(linhas.length>2 && sem(limpaTitulo(linhas[0]))===sem(titulo)) l=linhas.slice(1).join('\n').trim();
  if(/^[.\s·•-]*$/.test(l)) return '';
  return l;
}
function analisa(json){
  const msgs=Array.isArray(json&&json.messages)? json.messages : [];
  const byId=new Map(msgs.map(m=>[m.id,m]));
  const topicos=new Map();
  msgs.forEach(m=>{ if(m.type==='service' && /topic_created/i.test(m.action||'')) topicos.set(m.id,{id:m.id,bruto:m.title||textoDe(m.text)||'',partes:[],midias:0,data:m.date}); });
  function raiz(m){
    if(m.topic_id!=null && topicos.has(m.topic_id)) return m.topic_id;
    let cur=m, k=0;
    while(cur && k<60){ const r=cur.reply_to_message_id; if(r==null) return null; if(topicos.has(r)) return r; cur=byId.get(r); k++; }
    return null;
  }
  msgs.forEach(m=>{ if(m.type==='service' && /topic_edit/i.test(m.action||'') && m.new_title){ const t=topicos.get(raiz(m)); if(t) t.bruto=m.new_title; } });
  const itens=[];
  if(topicos.size){
    msgs.forEach(m=>{ if(m.type!=='message') return; const t=topicos.get(raiz(m)); if(!t) return;
      const tx=textoDe(m.text); if(tx.trim()) t.partes.push(tx);
      if(m.media_type||m.file||m.photo) t.midias++; });
    topicos.forEach(t=>{ const sa=separaArtista(t.bruto); itens.push({titulo:cap(sa.titulo),artista:cap(sa.artista),letra:limpaLetra(t.partes.join('\n\n'),sa.titulo),midias:t.midias,data:t.data}); });
  } else {
    /* canal sem tópicos: cada mensagem é uma música (1ª linha = título) */
    msgs.forEach(m=>{ if(m.type!=='message') return; const tx=textoDe(m.text).trim(); if(!tx) return;
      const ls=tx.split('\n'); const sa=separaArtista(ls[0]);
      itens.push({titulo:cap(sa.titulo),artista:cap(sa.artista),letra:limpaLetra(ls.slice(1).join('\n'),sa.titulo),midias:(m.media_type||m.file)?1:0,data:m.date}); });
  }
  return itens.filter(i=>i.titulo && !/^general$/i.test(i.titulo));
}

/* ---------- comparação com o que já existe no app ---------- */
function marca(itens){
  const porTitulo=new Map((DB.musicas||[]).map(m=>[sem(m.titulo),m]));
  const vistos=new Set();
  itens.forEach((it,i)=>{
    it.i=i; const k=sem(it.titulo);
    it.existe=porTitulo.get(k)||null;
    it.repetida=vistos.has(k); vistos.add(k);
    it.temCifra=it.letra.split('\n').some(l=>(window.__ehLinhaCifra||(()=>false))(l));
    it.status= it.repetida? 'rep' : it.existe? (it.existe.letra? 'existe' : 'semletra') : (it.letra? 'nova' : 'vazia');
    it.marcada = it.status==='nova' || it.status==='semletra';
  });
  return itens;
}

/* ---------- tela ---------- */
let ITENS=null, FILTRO='todas';
const ROT={nova:['🆕','Nova','#1c6b47','#e1f4ea'],semletra:['✍️','Já existe sem letra — completa a letra','#7a4a00','#fff3e6'],existe:['✔️','Já existe com letra','#456','#eef1ef'],vazia:['∅','Sem letra no Telegram','#8a2b1e','#fde4df'],rep:['⧉','Repetida no Telegram','#456','#eef1ef']};
function lista(){
  const vis=ITENS.filter(it=>FILTRO==='todas'||it.status===FILTRO);
  if(!vis.length) return '<p class="tg-vz">Nada neste filtro.</p>';
  return vis.map(it=>{ const r=ROT[it.status];
    const prev=it.letra? e(it.letra.split('\n').filter(Boolean).slice(0,2).join(' / ')).slice(0,140) : '<i>sem texto</i>';
    return '<label class="tg-it"><input type="checkbox" '+(it.marcada?'checked':'')+' onchange="tgMarca('+it.i+',this.checked)">'+
      '<span class="tx"><b>'+e(it.titulo)+'</b>'+(it.artista?'<small class="ar">'+e(it.artista)+'</small>':'')+
      '<small class="pv">'+prev+'</small>'+
      '<span class="tg-tags"><span class="tg-st" style="color:'+r[2]+';background:'+r[3]+'">'+r[0]+' '+r[1]+'</span>'+(it.temCifra?'<span class="tg-st" style="color:#a8350a;background:#fff1e8">🎸 tem acordes</span>':'')+(it.midias?'<span class="tg-st">🎧 '+it.midias+' áudio(s) no Telegram</span>':'')+'</span></span></label>'; }).join('');
}
function resumo(){
  const c=k=>ITENS.filter(i=>i.status===k).length; const sel=ITENS.filter(i=>i.marcada).length;
  const b=(k,t,n)=>'<button class="'+(FILTRO===k?'on':'')+'" onclick="tgFiltro(\''+k+'\')">'+t+' <i>'+n+'</i></button>';
  return '<div class="tg-res">'+b('todas','Todas',ITENS.length)+b('nova','🆕 Novas',c('nova'))+b('semletra','✍️ Completar',c('semletra'))+b('existe','✔️ Já tem',c('existe'))+b('vazia','∅ Sem letra',c('vazia'))+(c('rep')?b('rep','⧉ Repetidas',c('rep')):'')+'</div>'+
    '<div class="tg-acoes"><span id="tgSel">'+sel+' selecionada(s)</span><button onclick="tgTodas(true)">Marcar visíveis</button><button onclick="tgTodas(false)">Desmarcar visíveis</button></div>';
}
function desenha(){
  const box=$id('tgBox'); if(!box) return;
  if(!ITENS){ box.innerHTML=''; return; }
  box.innerHTML=resumo()+'<div class="tg-lista">'+lista()+'</div>'+
    '<label class="ct-chk"><input type="checkbox" id="tgPub" checked> Publicar para todos verem (desmarque para entrar como rascunho)</label>'+
    '<button class="btn btn-primary" id="tgOk" onclick="tgImportar()">📥 Importar '+ITENS.filter(i=>i.marcada).length+' música(s)</button><div id="tgProg"></div>';
}
window.tgFiltro=function(k){ FILTRO=k; desenha(); };
window.tgMarca=function(i,v){ ITENS[i].marcada=v; const s=$id('tgSel'); if(s) s.textContent=ITENS.filter(x=>x.marcada).length+' selecionada(s)'; const b=$id('tgOk'); if(b) b.textContent='📥 Importar '+ITENS.filter(x=>x.marcada).length+' música(s)'; };
window.tgTodas=function(v){ ITENS.forEach(it=>{ if(FILTRO==='todas'||it.status===FILTRO) it.marcada=v && it.status!=='vazia'; }); desenha(); };
window.tgArquivo=async function(inp){
  const f=inp.files&&inp.files[0]; inp.value=''; if(!f) return;
  let json; try{ json=JSON.parse(await f.text()); }catch(_){ toast('Esse arquivo não é o result.json do Telegram (formato JSON).'); return; }
  const it=analisa(json);
  if(!it.length){ toast('Não encontrei músicas nesse arquivo.'); return; }
  ITENS=marca(it); FILTRO='todas'; desenha();
  toast(it.length+' música(s) encontradas no Telegram.');
};
window.tgImportar=async function(){
  const sel=ITENS.filter(i=>i.marcada); if(!sel.length) return toast('Marque ao menos uma música.');
  const pub=!!($id('tgPub')||{}).checked; const bt=$id('tgOk'); if(bt){ bt.disabled=true; bt.textContent='Importando…'; }
  const prog=$id('tgProg'); let feitas=0, erros=0;
  const novas=sel.filter(i=>!i.existe), completar=sel.filter(i=>i.existe);
  const uid=(typeof _sessaoId!=='undefined')?_sessaoId:null;
  for(let k=0;k<novas.length;k+=40){
    const lote=novas.slice(k,k+40).map(it=>({id:crypto.randomUUID(),titulo:it.titulo,artista:it.artista,cifra:it.temCifra?it.letra:'',letra:it.letra,youtube:'',audios:[],dados:{publicada:pub,origem:'telegram'},created_by:uid}));
    const {error}=await sb.from('musicas').insert(lote);
    if(error){ erros+=lote.length; if(prog) prog.innerHTML='<div class="err-msg">Erro: '+e(error.message)+'</div>'; }
    else { feitas+=lote.length; lote.forEach(r=>{ if(!DB.musicas.some(m=>m.id===r.id)) DB.musicas.push({id:r.id,titulo:r.titulo,artista:r.artista,cifra:r.cifra,letra:r.letra,youtube:'',audios:[],publicada:pub,criado:new Date().toISOString()}); }); }
    if(prog && !error) prog.textContent='Importando… '+feitas+' de '+sel.length;
  }
  for(const it of completar){
    const upd={letra:it.letra}; if(it.temCifra && !it.existe.cifra) upd.cifra=it.letra;
    const {error}=await sb.from('musicas').update(upd).eq('id',it.existe.id);
    if(error) erros++; else { feitas++; Object.assign(it.existe,upd); }
    if(prog) prog.textContent='Importando… '+feitas+' de '+sel.length;
  }
  try{ DB.musicas.sort((a,b)=>a.titulo.localeCompare(b.titulo,'pt')); }catch(_){}
  toast(feitas+' música(s) importada(s)'+(erros?' · '+erros+' com erro':'')+'.');
  ITENS=marca(ITENS.map(i=>({titulo:i.titulo,artista:i.artista,letra:i.letra,midias:i.midias,data:i.data}))); desenha();
};
if(typeof ROTAS!=='undefined'){
  ROTAS.telegram=function(){
    if(!ehAdmin()) return '<div class="page"><div class="empty">Acesso restrito ao ADM.</div></div>';
    setTimeout(desenha,0);
    return '<div class="page"><div class="page-ttl">📥 Importar letras do Telegram</div>'+
      '<div class="card tg-passo"><h3>1. Exportar no Telegram (computador)</h3><ol>'+
        '<li>Instale o <b>Telegram Desktop</b> (telegram.org) e abra o grupo <b>Acervo MMIBNM</b>.</li>'+
        '<li>Toque nos <b>⋮</b> → <b>Exportar histórico do chat</b>.</li>'+
        '<li>Desmarque fotos, vídeos, mensagens de voz e arquivos.</li>'+
        '<li>Em <b>Formato</b>, escolha <b>JSON (legível por máquina)</b> → <b>Exportar</b>.</li>'+
        '<li>Vai ser criado o arquivo <b>result.json</b>.</li></ol></div>'+
      '<div class="card tg-passo"><h3>2. Escolher o arquivo aqui</h3><label class="btn btn-primary tg-file">📄 Escolher result.json<input type="file" accept=".json,application/json" hidden onchange="tgArquivo(this)"></label>'+
        '<p class="tg-dica">Cada tópico (♫ Título) vira uma música. "Título - Artista" e "Título (Artista)" separam o artista sozinhos. Você revisa a lista antes de importar.</p></div>'+
      '<div id="tgBox"></div></div>';
  };
}
/* atalhos: menu do ADM e Painel do ADM */
if(typeof montaMenu==='function'){
  const _mm=montaMenu;
  window.montaMenu=montaMenu=function(){ _mm.apply(this,arguments);
    if(!ehAdmin() || document.querySelector('#sidemenu [data-telegram]')) return;
    const adm=[...document.querySelectorAll('#sidemenu .sm-item')].find(b=>/go\('admin'\)/.test(b.getAttribute('onclick')||''));
    if(adm) adm.insertAdjacentHTML('beforebegin','<button class="sm-item" data-telegram onclick="go(\'telegram\')"><span class="ic">📥</span>Importar do Telegram</button>'); };
}
if(typeof ROTAS!=='undefined' && ROTAS.admin){
  const _ad=ROTAS.admin;
  ROTAS.admin=function(){ const h=_ad.apply(this,arguments); if(!ehAdmin()) return h;
    const card='<div class="card"><h3>📥 Letras do Telegram</h3><p style="font-size:13px;color:#556;margin-bottom:10px">Importe de uma vez as letras do grupo do Telegram (arquivo exportado).</p><button class="mini-btn" onclick="go(\'telegram\')">Importar letras</button></div>';
    const i=h.indexOf('<div class="card">'); return i>=0? h.slice(0,i)+card+h.slice(i) : h+card; };
}
window.__tgAnalisa=analisa;
const st=document.createElement('style'); st.textContent=`
.tg-passo ol{margin:6px 0 0 18px;font-size:13.5px;color:#334;line-height:1.6}
.tg-file{display:inline-flex;align-items:center;justify-content:center;cursor:pointer;width:auto;padding:0 18px}
.tg-dica{font-size:12px;color:#6b8378;margin-top:8px}
.tg-res{display:flex;gap:6px;overflow-x:auto;margin:6px 0 8px;scrollbar-width:none}
.tg-res button{flex:none;height:36px;border-radius:18px;border:1px solid #cfdad4;background:#fff;font-weight:700;font-size:12.5px;color:var(--verde-escuro);padding:0 12px}
.tg-res button.on{background:var(--verde-med);color:#fff;border-color:var(--verde-med)}
.tg-res button i{font-style:normal;opacity:.75}
.tg-acoes{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px;font-size:12.5px;color:#556}
.tg-acoes span{flex:1}
.tg-acoes button{border:1px solid #cfdad4;background:#fff;border-radius:8px;height:30px;padding:0 10px;font-size:12px;font-weight:700;color:var(--verde-escuro)}
.tg-lista{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
.tg-it{display:flex;gap:10px;background:#fff;border:1px solid #e3ece7;border-radius:12px;padding:10px;cursor:pointer}
.tg-it input{width:20px;height:20px;margin-top:2px;flex:none;accent-color:var(--verde-med)}
.tg-it .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.tg-it b{font-size:14.5px;color:var(--verde-escuro)}
.tg-it .ar{font-size:12px;color:#5d7268;font-weight:700}
.tg-it .pv{font-size:12px;color:#7a8f86;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tg-tags{display:flex;gap:4px;flex-wrap:wrap;margin-top:3px}
.tg-st{font-size:10.5px;font-weight:800;border-radius:8px;padding:2px 7px;background:#eef1ef;color:#456}
.tg-vz{font-size:13px;color:#8a9;padding:10px}
#tgProg{font-size:13px;color:#556;margin-top:8px}
`; document.head.appendChild(st);
})();
