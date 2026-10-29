/* ============================================================
   ACADEMIA DE MÚSICA — módulo integrado ao MM IBNM
   Seções com conteúdos gerenciados pelo ADM: links, vídeos do
   YouTube e PDFs (upload direto ao Google Drive). Os usuários
   visualizam, abrem links e baixam PDFs. "Somente o ADM pode
   editar" — vale também no banco (RLS is_admin()).
============================================================ */
(function(){
'use strict';

/* ---------- seções ---------- */
const SECOES=[
  {id:'tecnicas-vocais', nome:'Técnicas vocais', ic:'🎤'},
  {id:'bateria', nome:'Bateria', ic:'🥁', grupo:'Instrumentos'},
  {id:'piano', nome:'Piano', ic:'🎹', grupo:'Instrumentos'},
  {id:'guitarra', nome:'Guitarra', ic:'🎸', grupo:'Instrumentos'},
  {id:'baixo', nome:'Baixo', ic:'🎸', grupo:'Instrumentos'},
  {id:'violao', nome:'Violão', ic:'🪕', grupo:'Instrumentos'},
  {id:'teoria-musical', nome:'Teoria musical', ic:'🎼'}
];
const bySec=new Map(SECOES.map(s=>[s.id,s]));

/* ---------- utilitários ---------- */
const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function ehAdm(){ try{ return typeof ehAdmin==='function' && !!ehAdmin(); }catch(e){ return false; } }
function toast2(msg){ try{ if(typeof toast==='function') return toast(msg); }catch(e){} try{ alert(msg); }catch(e){} }

/* ---------- dados (nuvem + cache local) ---------- */
const LS_KEY='ibnm_materiais';
let MATS=[];
try{ MATS=JSON.parse(localStorage.getItem(LS_KEY)||'[]')||[]; }catch(e){ MATS=[]; }
function salvarLocal(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(MATS)); }catch(e){} }
function ordena(){ MATS.sort((a,b)=>(a.ordem-b.ordem)||((a.created_at||'')<(b.created_at||'')?-1:1)); }
async function cloudCarregar(){
  try{
    if(typeof sb==='undefined'||!sb) return;
    const {data,error}=await sb.from('materiais').select('*');
    if(error) return;
    if(data){ MATS=data; ordena(); salvarLocal(); }
  }catch(e){}
}
async function cloudInserir(item){
  try{
    if(typeof sb==='undefined'||!sb) return item;
    const {data,error}=await sb.from('materiais').insert(item).select('id').single();
    if(!error && data) item.id=data.id;
  }catch(e){}
  return item;
}
async function cloudAtualizar(id,patch){
  try{ if(typeof sb!=='undefined'&&sb) await sb.from('materiais').update(patch).eq('id',id); }catch(e){}
}
async function cloudRemover(id){
  try{ if(typeof sb!=='undefined'&&sb) await sb.from('materiais').delete().eq('id',id); }catch(e){}
}
/* tempo real: conteúdo novo do ADM aparece para todos */
function estaNaAcademia(){ return !!document.querySelector('.ad-overview, .ad-item, .ad-empty'); }
(function(){
  try{
    if(typeof sb==='undefined'||!sb||!sb.channel) return;
    const ch=sb.channel('academia-rt');
    ch.on('postgres_changes',{event:'*',schema:'public',table:'materiais'},()=>{
      cloudCarregar().then(()=>{
        try{ if(estaNaAcademia() && typeof go==='function') go('academia', lastSec||undefined); }catch(e){}
      });
    });
    ch.subscribe();
  }catch(e){}
})();

function itensDaSecao(sec){ return MATS.filter(m=>m.secao===sec); }

/* ---------- detecção de tipo ---------- */
function detectaTipo(url){
  const u=String(url||'');
  if(/(?:youtu\.be\/|youtube\.com\/|music\.youtube\.com\/)/i.test(u)) return 'youtube';
  if(/\.pdf(\?|$)/i.test(u) || /drive\.google\.com\/file\//i.test(u)) return 'pdf';
  return 'link';
}
function validaUrl(u){
  return /^https?:\/\/[^\s]+\.[^\s]+/i.test(String(u||'').trim());
}
const TIPO_INFO={
  youtube:{ic:'▶', rot:'Vídeo (YouTube)', cor:'#c0392b'},
  pdf:{ic:'📄', rot:'PDF', cor:'#b8860b'},
  link:{ic:'🔗', rot:'Link', cor:'#1f7a5a'}
};

/* ---------- CSS (tema verde/dourado) ---------- */
(function(){
  const css=`
.ad-overview{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px}
.ad-card{background:#fff;border:1px solid #eef0f3;border-left:3px solid var(--verde-med);border-radius:12px;padding:14px 12px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.05);text-align:center}
.ad-card:active{opacity:.85}
.ad-card .ic{font-size:26px;display:block;margin-bottom:6px}
.ad-card .nm{font-weight:800;color:var(--verde-escuro);font-size:13.5px;line-height:1.25}
.ad-card .ct{font-size:11.5px;color:#8a9;margin-top:5px}
.ad-grupo{font-size:10.5px;font-weight:800;color:#8a9;letter-spacing:1.1px;text-transform:uppercase;margin:18px 2px 8px}
.ad-item{display:flex;align-items:flex-start;gap:11px;background:#fff;border:1px solid #eef0f3;border-left:3px solid var(--verde-med);border-radius:11px;padding:12px 13px;box-shadow:0 1px 4px rgba(0,0,0,.05);margin-bottom:9px}
.ad-ic{flex-shrink:0;width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px;color:#fff;font-weight:800}
.ad-main{flex:1;min-width:0}
.ad-t{font-weight:700;color:var(--verde-escuro);font-size:14.5px;line-height:1.3}
.ad-d{font-size:12.5px;color:#667;margin-top:3px;line-height:1.5;white-space:pre-line}
.ad-open{display:inline-block;margin-top:7px;font-size:12.5px;font-weight:700;color:var(--verde-med);text-decoration:none;border:1px solid var(--verde-med);background:#f3faf5;border-radius:20px;padding:5px 12px;cursor:pointer}
.ad-side{display:flex;flex-direction:column;gap:5px;flex-shrink:0}
.ad-mini{border:1px solid #c9ced6;background:#f4f6f7;color:#2b2b2b;font-size:11.5px;font-weight:700;border-radius:8px;padding:5px 8px;cursor:pointer;min-width:38px}
.ad-mini.dan{border-color:#c0392b;color:#c0392b;background:#fdf1ef}
.ad-empty{color:#9aa;font-size:13.5px;text-align:center;padding:24px 10px;line-height:1.6}
.ad-upload-note{font-size:11.5px;color:#9aa;margin:6px 0 0;line-height:1.5}
`;
  const st=document.createElement('style'); st.id='adTemaIBNM'; st.textContent=css; document.head.appendChild(st);
})();

/* ---------- folhas (sheets) — mesmas classes do cantor.js (o VOLTAR fecha) ---------- */
function sheet(html){
  const bg=document.createElement('div'); bg.className='cc-sheet-bg';
  bg.innerHTML='<div class="cc-sheet" role="dialog" aria-modal="true">'+html+'</div>';
  document.body.appendChild(bg);
  const close=()=>bg.remove();
  bg.addEventListener('click',e=>{ if(e.target===bg) close(); });
  return {el:bg.firstChild, close};
}

/* ---------- renderização ---------- */
let lastSec=null;
function renderOverview(){
  lastSec=null;
  const adm=ehAdm();
  let html='<div class="page"><div class="page-ttl">🎓 Academia de Música</div>'+
    '<p style="font-size:13px;color:#789;margin-bottom:6px">Materiais de estudo do ministério: aulas em vídeo, PDFs e links selecionados'+(adm?' · <b style="color:var(--verde-med)">você é ADM e pode adicionar conteúdos</b>':'')+'.</p>';
  let grupoAtual; let aberto=false;
  for(const s of SECOES){
    const g=s.grupo||null;
    if(g!==grupoAtual){
      if(aberto){ html+='</div>'; aberto=false; }
      if(g) html+='<div class="ad-grupo">'+g+'</div>';
      html+='<div class="ad-overview">'; aberto=true;
      grupoAtual=g;
    }
    const n=itensDaSecao(s.id).length;
    html+='<div class="ad-card" onclick="go(\'academia\',\''+s.id+'\')"><span class="ic">'+s.ic+'</span><div class="nm">'+s.nome+'</div><div class="ct">'+(n? n+' material'+(n>1?'is':'') : 'em breve')+'</div></div>';
  }
  if(aberto) html+='</div>';
  html+='</div>';
  return html;
}
function renderSecao(sec){
  lastSec=sec;
  const s=bySec.get(sec);
  if(!s) return renderOverview();
  const adm=ehAdm();
  const itens=itensDaSecao(sec);
  let lista='';
  if(!itens.length){
    lista='<div class="ad-empty">'+s.ic+'<br>Nenhum material publicado ainda.'+(adm?'<br>Use o botão acima para adicionar o primeiro.':'<br>Em breve o ADM publicará conteúdos aqui.')+'</div>';
  } else {
    lista=itens.map((m,i)=>{
      const tp=TIPO_INFO[m.tipo]||TIPO_INFO.link;
      return '<div class="ad-item">'+
        '<div class="ad-ic" style="background:'+tp.cor+'">'+tp.ic+'</div>'+
        '<div class="ad-main">'+
          '<div class="ad-t">'+esc(m.titulo)+'</div>'+
          (m.descricao?'<div class="ad-d">'+esc(m.descricao)+'</div>':'')+
          '<a class="ad-open" href="'+esc(m.url)+'" target="_blank" rel="noopener">'+(m.tipo==='pdf'?'📄 Abrir / baixar PDF':m.tipo==='youtube'?'▶ Assistir no vídeo':'🔗 Abrir link')+'</a>'+
        '</div>'+
        (adm?'<div class="ad-side">'+
          '<button class="ad-mini" onclick="adMover(\''+m.id+'\',-1)" title="Mover para cima">↑</button>'+
          '<button class="ad-mini" onclick="adMover(\''+m.id+'\',1)" title="Mover para baixo">↓</button>'+
          '<button class="ad-mini" onclick="adEditar(\''+m.id+'\')" title="Editar">✎</button>'+
          '<button class="ad-mini dan" onclick="adRemover(\''+m.id+'\')" title="Remover">🗑</button>'+
        '</div>':'')+
      '</div>';
    }).join('');
  }
  return '<div class="page">'+
    '<button class="mini-btn sec" style="margin-bottom:12px" onclick="go(\'academia\')">‹ Academia</button>'+
    '<div class="page-ttl">'+s.ic+' '+s.nome+'</div>'+
    '<p style="font-size:12.5px;color:#789;margin-bottom:12px">'+(itens.length? itens.length+' material'+(itens.length>1?'is':'')+' disponível'+(itens.length>1?'eis':'') : '')+'</p>'+
    (adm?'<button class="mini-btn" style="margin-bottom:14px" onclick="adNovo(\''+sec+'\')">➕ Adicionar material</button>':'')+
    lista+
  '</div>';
}

/* ---------- ADM: folha de cadastro/edição ---------- */
function folhaMaterial(sec,item){
  const s=bySec.get(sec); if(!s) return;
  const edit=!!item;
  const t=item?item.tipo:detectaTipo('');
  const {el,close}=sheet('<h3>'+(edit?'Editar material':'Novo material')+' — '+s.nome+'</h3>'+
    '<p class="small">Preencha os campos. O material fica visível para <b>todos</b> os usuários; somente o ADM pode editar.</p>'+
    '<label class="small" style="font-weight:700">Título *</label>'+
    '<input id="adTit" value="'+esc(item?item.titulo:'')+'" placeholder="Ex.: Aula 1 — Postura vocal">'+
    '<label class="small" style="font-weight:700">Descrição</label>'+
    '<textarea id="adDesc" placeholder="Descrição curta (opcional)">'+esc(item?item.descricao:'')+'</textarea>'+
    '<label class="small" style="font-weight:700">Tipo</label>'+
    '<div class="chips" id="adTipos">'+
      '<button data-t="youtube" aria-pressed="'+(t==='youtube')+'">▶ YouTube</button>'+
      '<button data-t="pdf" aria-pressed="'+(t==='pdf')+'">📄 PDF</button>'+
      '<button data-t="link" aria-pressed="'+(t==='link')+'">🔗 Link</button>'+
    '</div>'+
    '<label class="small" style="font-weight:700">Endereço (URL) *</label>'+
    '<input id="adUrl" value="'+esc(item?item.url:'')+'" placeholder="https://..." inputmode="url" autocomplete="off" spellcheck="false">'+
    '<div class="row"><button id="adUpBtn">📤 Enviar PDF ao Google Drive</button></div>'+
    '<input type="file" id="adUpFile" accept=".pdf,application/pdf" hidden>'+
    '<p class="ad-upload-note" id="adUpNote">'+(typeof driveClientId==='function'&&driveClientId()?'O PDF é salvo no Google Drive do ministério e o link entra automaticamente.':'Para enviar PDF direto do aparelho, configure o Client ID do Google Drive no Painel do ADM. Enquanto isso, use uma URL.')+'</p>'+
    '<div class="row">'+
      (edit?'<button class="dan" id="adDel">Remover</button>':'')+
      '<button id="adCnl">Cancelar</button><button class="pri" id="adOk">'+(edit?'Salvar':'Adicionar')+'</button>'+
    '</div>');
  let tipo=t;
  const chips=el.querySelectorAll('#adTipos button');
  chips.forEach(b=>b.onclick=()=>{ tipo=b.dataset.t; chips.forEach(x=>x.setAttribute('aria-pressed', x===b?'true':'false')); });
  const urlInp=el.querySelector('#adUrl');
  urlInp.addEventListener('change',()=>{
    const auto=detectaTipo(urlInp.value);
    tipo=auto; chips.forEach(x=>x.setAttribute('aria-pressed', x.dataset.t===auto?'true':'false'));
  });
  /* upload de PDF ao Drive */
  const upBtn=el.querySelector('#adUpBtn'), upFile=el.querySelector('#adUpFile'), upNote=el.querySelector('#adUpNote');
  upBtn.onclick=()=>{
    if(typeof driveClientId!=='function'||!driveClientId()){ toast2('Configure o Client ID do Google Drive no Painel do ADM para enviar PDFs.'); return; }
    upFile.click();
  };
  upFile.onchange=async ()=>{
    const f=upFile.files[0]; if(!f) return; upFile.value='';
    if(typeof uploadParaDrive!=='function'){ toast2('Upload indisponível neste aparelho.'); return; }
    upNote.textContent='Enviando '+f.name+' ao Google Drive...';
    try{
      const fid=await uploadParaDrive(f, f.name.replace(/\.pdf$/i,'')+'.pdf');
      const url='https://drive.google.com/file/d/'+fid+'/view';
      urlInp.value=url;
      tipo='pdf'; chips.forEach(x=>x.setAttribute('aria-pressed', x.dataset.t==='pdf'?'true':'false'));
      if(!el.querySelector('#adTit').value.trim()) el.querySelector('#adTit').value=f.name.replace(/\.pdf$/i,'');
      upNote.textContent='✅ PDF enviado! O link já está preenchido — é só salvar.';
    }catch(e){ upNote.textContent='❌ Erro no upload: '+(e.message||e); }
  };
  el.querySelector('#adCnl').onclick=close;
  const del=el.querySelector('#adDel'); if(del) del.onclick=()=>{ close(); adRemover(item.id); };
  el.querySelector('#adOk').onclick=async ()=>{
    const titulo=el.querySelector('#adTit').value.trim();
    const descricao=el.querySelector('#adDesc').value.trim();
    const url=urlInp.value.trim();
    if(!titulo) return toast2('Informe o título.');
    if(!validaUrl(url)) return toast2('Informe uma URL válida (começando com https://).');
    if(tipo==='youtube'){
      const id=(window.Cantor&&Cantor.ytId)?Cantor.ytId(url):true;
      if(!id) return toast2('Endereço do YouTube não reconhecido.\nUse youtube.com/watch?v=… ou youtu.be/…');
    }
    close();
    if(edit){
      Object.assign(item,{titulo,descricao,url,tipo,updated_at:new Date().toISOString()});
      await cloudAtualizar(item.id,{titulo,descricao,url,tipo,updated_at:item.updated_at});
      salvarLocal(); toast2('Material atualizado!'); recarregar();
    } else {
      const novo={secao:sec,tipo,titulo,descricao,url,ordem:itensDaSecao(sec).length,created_by:(typeof _sessaoId!=='undefined'?_sessaoId:null),created_at:new Date().toISOString()};
      MATS.push(novo); ordena(); salvarLocal();
      await cloudInserir(novo);
      toast2('Material adicionado! 🎓'); recarregar();
    }
  };
}
function recarregar(){
  try{
    if(typeof go==='function' && lastSec) go('academia',lastSec);
    else if(typeof go==='function') go('academia');
  }catch(e){}
}

/* ---------- ações ADM ---------- */
window.adNovo=function(sec){ if(!ehAdm()) return; folhaMaterial(sec,null); };
window.adEditar=function(id){
  if(!ehAdm()) return;
  const item=MATS.find(m=>m.id===id); if(!item) return;
  folhaMaterial(item.secao,item);
};
window.adRemover=async function(id){
  if(!ehAdm()) return;
  const item=MATS.find(m=>m.id===id); if(!item) return;
  if(!confirm('Remover "'+item.titulo+'" da academia?')) return;
  MATS=MATS.filter(m=>m.id!==id); salvarLocal();
  await cloudRemover(id);
  toast2('Material removido.'); recarregar();
};
window.adMover=async function(id,dir){
  if(!ehAdm()) return;
  const item=MATS.find(m=>m.id===id); if(!item) return;
  const lista=itensDaSecao(item.secao);
  const i=lista.findIndex(m=>m.id===id), j=i+dir;
  if(i<0||j<0||j>=lista.length) return;
  /* normaliza ordem e troca os dois */
  const novoOrd={};
  lista.forEach((m,k)=>{ novoOrd[m.id]=k; });
  const a=lista[i], b=lista[j];
  const oa=novoOrd[a.id], ob=novoOrd[b.id];
  a.ordem=ob; b.ordem=oa;
  await cloudAtualizar(a.id,{ordem:a.ordem});
  await cloudAtualizar(b.id,{ordem:b.ordem});
  ordena(); salvarLocal(); recarregar();
};

/* ---------- rotas ---------- */
try{
  if(typeof ROTAS!=='undefined'){
    ROTAS.academia=function(arg){
      cloudCarregar();
      return arg? renderSecao(arg) : renderOverview();
    };
  }
}catch(e){}

cloudCarregar();
})();
