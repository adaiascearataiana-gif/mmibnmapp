/* ============================================================
   MM IBNM — INVENTÁRIO do Ministério de Música (v65)
   • Todos os membros veem os equipamentos e as fotos
   • ADM do setor: cadastra/edita/apaga + log automático
   • Fotos vão p/ o Google Drive (pasta "Inventário",
     criada sozinha) com fallback no app (bucket "anexos")
   • v65: CATEGORIAS com subcategorias (tipo) em menu cascata,
     estados de conservação em menu, OUTROS + criação na hora
     (persistida em config.inventario_listas), quantidade e cor,
     relatório em TABELA com Editar/Excluir coloridos.
   • Campos mantidos: patrimônio, nº série, local, aquisição,
     garantia, valor, foto, observações
============================================================ */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const e=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl=v=>(v==null||v===''||isNaN(Number(v)))?'—':Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dtBR=d=>{ if(!d) return ''; const s=String(d); return s.length>=10?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):s; };
const OUTRO='__OUTROS__';
/* árvore de categorias → subcategorias (tipo) */
const LISTAS0={
  categorias:{
    'Instrumentos Musicais':['Corda','Teclas','Percussão/Bateria','Sopro'],
    'Áudio & Sonorização (P.A. e Monitoramento)':['Microfones','Monitoramento','Processamento e Mistura','Amplificação'],
    'Cabos & Acessórios Elétricos':['Cabos de Sinal','Energia','Suportes'],
    'Estrutura, Palco & Transporte':['Proteção','Iluminação e Efeitos','Cenografia'],
    'Identidade, Merchandising & Conteúdo':['Merch','Mídia']
  },
  estados:['Novo (ou Lacrado)','Excelente (ou Semi-novo)','Bom','Regular (ou Desgastado)','Ruim (ou Danificado)']
};
function cfgListas(){ try{ return (typeof APP_CFG!=='undefined'&&APP_CFG.inventario_listas)||{}; }catch(_){ return {}; } }
function catsArvore(){
  const salvo=cfgListas(), arv={};
  Object.keys(LISTAS0.categorias).forEach(k=>{ arv[k]=(LISTAS0.categorias[k]||[]).slice(); });
  Object.keys(salvo.novas_categorias||{}).forEach(k=>{ if(!arv[k]) arv[k]=[]; });
  Object.keys(salvo.novos_tipos||{}).forEach(cat=>{
    if(!arv[cat]) arv[cat]=[];
    (salvo.novos_tipos[cat]||[]).forEach(t=>{ if(arv[cat].indexOf(t)<0) arv[cat].push(t); });
  });
  return arv;
}
function catsNomes(){ return Object.keys(catsArvore()); }
function tiposDe(cat){ return catsArvore()[cat]||[]; }
function estadosLista(){ const salvo=cfgListas(); return LISTAS0.estados.concat(salvo.novos_estados||[]); }
function listaAdd(cat,tipo,estado){
  try{
    const salvo=cfgListas();
    const novo={ novas_categorias:Object.assign({},salvo.novas_categorias||{}),
                 novos_tipos:Object.assign({},salvo.novos_tipos||{}),
                 novos_estados:(salvo.novos_estados||[]).slice() };
    let mudou=false;
    if(cat && !LISTAS0.categorias[cat] && !novo.novas_categorias[cat]){ novo.novas_categorias[cat]=[]; mudou=true; }
    if(cat && tipo && (LISTAS0.categorias[cat]||[]).indexOf(tipo)<0){
      if(!novo.novos_tipos[cat]) novo.novos_tipos[cat]=[];
      if(novo.novos_tipos[cat].indexOf(tipo)<0){ novo.novos_tipos[cat].push(tipo); mudou=true; }
    }
    if(estado && LISTAS0.estados.indexOf(estado)<0 && novo.novos_estados.indexOf(estado)<0){ novo.novos_estados.push(estado); mudou=true; }
    if(!mudou) return;
    if(typeof salvarConfig==='function') salvarConfig('inventario_listas',novo);
    else if(typeof APP_CFG!=='undefined') APP_CFG.inventario_listas=novo;
  }catch(_){}
}
const corEstado=s=>({'Novo (ou Lacrado)':'#1c7a4e','Excelente (ou Semi-novo)':'#2e8b57','Bom':'#356','Regular (ou Desgastado)':'#b8860b','Ruim (ou Danificado)':'#b33','Novo':'#1c7a4e','Em reparo':'#b8860b','Inativo':'#999'}[s]||'#356');
let INV=[], LOG=[], invBusca='', invCat='', invEstado='', _invCarregou=false, _invRT=false, _invT=null, _invUlt=null;

function podeInv(){ try{ return typeof podeSetor==='function'&&podeSetor('inventario'); }catch(_){ return false; } }

/* ---------- carga + tempo real ---------- */
async function carregaInv(){
  try{ if(typeof sb==='undefined'||!sb) return;
    const r=await sb.from('inventario').select('*').order('nome',{ascending:true});
    const novo=JSON.stringify((r.data||[]).map(x=>[x.id,x.nome,x.foto_url,x.estado,x.updated_at,x.categoria,x.tipo,x.marca,x.modelo,x.quantidade,x.cor]));
    INV=r.data||[]; _invCarregou=true;
    if(novo!==_invUlt){ _invUlt=novo; invPinta(); }
    if(podeInv()){ try{ const l=await sb.from('inventario_log').select('*').order('quando',{ascending:false}).limit(60); LOG=l.data||[]; }catch(_){} }
  }catch(err){}
}
function invPinta(){ try{ if(document.querySelector('.inv-page')&&typeof go==='function') go('inventario'); }catch(_){} }
function invSync(){ clearTimeout(_invT); _invT=setTimeout(carregaInv,250); }
function invRT(){ try{ if(_invRT||typeof sb==='undefined'||!sb||!sb.channel) return; _invRT=true;
  const ch=sb.channel('inv-rt');
  ch.on('postgres_changes',{event:'*',schema:'public',table:'inventario'},()=>invSync());
  ch.subscribe(); }catch(_){} }

/* ---------- foto ---------- */
async function fotoInv(file){
  /* sempre no app (bucket) + Drive do ADM principal se conectado */
  if(typeof window.anexoCompleto==='function'){
    return window.anexoCompleto('inventario',file,'equipamento_'+Date.now()+'.jpg','Inventário');
  }
  let b=file; try{ b=await reduzImagem(file,1600,0.8); }catch(_){}
  const path='inventario/'+Date.now()+'_'+Math.random().toString(36).slice(2,7)+'.jpg';
  const up=await sb.storage.from('anexos').upload(path,b,{contentType:'image/jpeg',cacheControl:'31536000'});
  if(up.error) throw new Error(up.error.message);
  return {url:sb.storage.from('anexos').getPublicUrl(path).data.publicUrl,drive:''};
}
function fotoSrc(u){ if(!u) return ''; const m=String(u).match(/drive\.google\.com\/file\/d\/([-\\w]+)/);
  return m?('https://drive.google.com/thumbnail?id='+m[1]+'&sz=w400'):u; }

/* ============================================================
   TELA — filtros + RELATÓRIO EM TABELA
============================================================ */
ROTAS.inventario=function(){
  invRT();
  if(!_invCarregou) setTimeout(carregaInv,0);
  const pode=podeInv();
  const busca=invBusca.toLowerCase();
  let itens=INV.filter(it=>{
    if(invCat && it.categoria!==invCat) return false;
    if(invEstado && it.estado!==invEstado) return false;
    if(!busca) return true;
    return [it.nome,it.marca,it.modelo,it.tipo,it.cor,it.patrimonio,it.serie,it.local,it.obs]
      .map(x=>String(x||'').toLowerCase()).some(x=>x.indexOf(busca)>=0);
  });
  const catsDados=Array.from(new Set(INV.map(x=>x.categoria).filter(Boolean)));
  const cats=catsNomes().concat(catsDados.filter(c=>catsNomes().indexOf(c)<0));
  const estsDados=Array.from(new Set(INV.map(x=>x.estado).filter(Boolean)));
  const ests=estadosLista().concat(estsDados.filter(c=>estadosLista().indexOf(c)<0));

  let h='<div class="page inv-page"><div class="page-ttl">\uD83D\uDD27 Inventário '+
    '<span style="font-size:13px;font-weight:600;color:#789">'+INV.length+' item(ns)</span></div>';
  /* busca + filtros */
  h+='<div class="card">'+
    '<input id="invQ" placeholder="🔍 Buscar por nome, marca, modelo, tipo, patrimônio, nº série..." value="'+e(invBusca)+'" '+
      'oninput="invFiltro(\'busca\',this.value)" style="width:100%;padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px">'+
    '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">'+
      '<select onchange="invFiltro(\'cat\',this.value)" style="flex:1;min-width:110px;padding:8px;border:1px solid #cfd8d3;border-radius:8px;font-size:13px;background:#fff">'+
        '<option value="">Todas as categorias</option>'+
        cats.map(c=>'<option'+(c===invCat?' selected':'')+'>'+e(c)+'</option>').join('')+'</select>'+
      '<select onchange="invFiltro(\'estado\',this.value)" style="flex:1;min-width:110px;padding:8px;border:1px solid #cfd8d3;border-radius:8px;font-size:13px;background:#fff">'+
        '<option value="">Todos os estados</option>'+
        ests.map(c=>'<option'+(c===invEstado?' selected':'')+'>'+e(c)+'</option>').join('')+'</select>'+
      (invBusca||invCat||invEstado?'<button class="mini-btn sec" onclick="invFiltro(\'limpa\',\'\')">Limpar</button>':'')+
    '</div>';
  if(pode) h+='<div style="display:flex;gap:8px;margin-top:8px">'+
    '<button class="mini-btn" onclick="invForm(null)">＋ Novo equipamento</button>'+
    '<button class="mini-btn sec" onclick="invLogToggle()">📜 Log</button></div>';
  h+='</div>';
  /* relatório: tabela com Editar/Excluir */
  if(!itens.length){
    h+='<div class="card"><div class="empty">'+(INV.length?'Nada encontrado com esses filtros.':'Nenhum equipamento cadastrado ainda.'+(pode?' Toque em "Novo equipamento".':''))+'</div></div>';
  }else{
    const th='style="text-align:left;padding:8px 6px;border-bottom:2px solid #dde;font-size:11.5px;color:#567;font-weight:800;white-space:nowrap"';
    const td='style="padding:6px 6px;border-bottom:1px solid #eef;font-size:12.5px;vertical-align:middle;white-space:nowrap"';
    h+='<div class="card"><div style="overflow-x:auto">'+
      '<table style="width:100%;border-collapse:collapse;font-size:12.5px;min-width:620px">'+
      '<thead><tr>'+
        '<th '+th+'>Equipamento</th><th '+th+'>Categoria · Tipo</th><th '+th+'>Marca</th><th '+th+'>Modelo</th>'+
        '<th '+th+' style="text-align:center">Qtd</th><th '+th+'>Cor</th><th '+th+'>Estado</th><th '+th+' style="text-align:right">Ações</th>'+
      '</tr></thead><tbody>';
    itens.forEach(it=>{
      h+='<tr>'+
        '<td '+td+' onclick="invDet(\''+it.id+'\')" style="cursor:pointer;font-weight:700">'+e(it.nome)+'</td>'+
        '<td '+td+'>'+e(it.categoria||'—')+(it.tipo?'<br><span style="color:#789;font-size:11px">'+e(it.tipo)+'</span>':'')+'</td>'+
        '<td '+td+'>'+e(it.marca||'—')+'</td>'+
        '<td '+td+'>'+e(it.modelo||'—')+'</td>'+
        '<td '+td+' style="text-align:center">'+(it.quantidade==null?'—':e(String(it.quantidade)))+'</td>'+
        '<td '+td+'>'+e(it.cor||'—')+'</td>'+
        '<td '+td+'><span style="display:inline-block;padding:2px 8px;border-radius:10px;background:'+(corEstado(it.estado))+';color:#fff;font-size:11px;font-weight:800;white-space:nowrap">'+e(it.estado||'—')+'</span></td>'+
        '<td '+td+' style="text-align:right;white-space:nowrap">'+
          (pode?'<button class="mini-btn" style="background:#356;color:#fff;margin-right:4px" onclick="invForm(\''+it.id+'\')">✏ Editar</button>'+
                '<button class="mini-btn" style="background:#b33;color:#fff" onclick="invExcluir(\''+it.id+'\')">🗑 Excluir</button>':'')+
        '</td></tr>';
    });
    h+='</tbody></table></div></div>';
  }
  /* log (setor) */
  if(pode && window._invLogAberto) h+=invHTMLLog();
  return h+'</div>';
};

function invHTMLLog(){
  let h='<div class="card"><h3>📜 Log de alterações</h3>';
  if(!LOG.length) h+='<div class="empty">Nenhuma movimentação registrada.</div>';
  LOG.forEach(l=>{
    const when=new Date(l.quando).toLocaleString('pt-BR');
    const ic=l.acao==='criou'?'➕':l.acao==='editou'?'✏️':'🗑';
    h+='<div class="info-row"><span class="v" style="text-align:left;font-size:13px">'+
      '<b>'+ic+' '+e(l.acao)+'</b> — '+e(l.item_nome||'')+'<br>'+
      '<span style="font-weight:400;font-size:11.5px;color:#789">'+when+' • '+e(l.autor||'—')+'</span></span></div>';
  });
  return h+'</div>';
}
window.invLogToggle=function(){ window._invLogAberto=!window._invLogAberto; go('inventario'); };
window.invFiltro=function(campo,valor){
  if(campo==='busca') invBusca=valor;
  else if(campo==='cat') invCat=valor;
  else if(campo==='estado') invEstado=valor;
  else { invBusca=''; invCat=''; invEstado=''; }
  clearTimeout(window._invFiltroT);
  window._invFiltroT=setTimeout(()=>{ try{ if(document.querySelector('.inv-page')){ go('inventario');
      if(campo==='busca'){ const q=document.getElementById('invQ'); if(q){ q.focus(); try{ q.setSelectionRange(q.value.length,q.value.length); }catch(_){} } } } }catch(_){} },campo==='busca'?280:0);
};

/* ---------- detalhe ---------- */
window.invDet=function(id){
  const it=INV.find(x=>x.id===id); if(!it) return;
  const pode=podeInv();
  const linhas=[
    ['Categoria',it.categoria],['Tipo',it.tipo],['Marca',it.marca],['Modelo',it.modelo],
    ['Quantidade',it.quantidade],['Cor',it.cor],
    ['Nº de série',it.serie],['Patrimônio',it.patrimonio],['Estado',it.estado],
    ['Local',it.local],['Valor',brl(it.valor)],['Aquisição',dtBR(it.data_aquisicao)],
    ['Garantia até',dtBR(it.garantia_ate)],[ 'Observações',it.obs],
    ['Cadastrado por',it.criado_por_nome],['Cadastrado em',it.created_at?new Date(it.created_at).toLocaleString('pt-BR'):'']
  ].filter(l=>l[1]!==null&&l[1]!==undefined&&l[1]!=='');
  abrirModal('<div style="text-align:center">'+
    (it.foto_url?'<img src="'+e(fotoSrc(it.foto_url))+'" style="max-width:100%;max-height:38vh;border-radius:10px;background:#eef" onerror="this.style.display=\'none\'">':
      '<div style="font-size:54px">🎧</div>')+
    '<h3 style="margin:8px 0 2px">'+e(it.nome)+'</h3></div>'+
    '<div style="margin-top:6px">'+linhas.map(l=>'<div class="info-row"><span class="k">'+e(l[0])+'</span><span class="v" style="text-align:right">'+e(String(l[1]))+'</span></div>').join('')+'</div>'+
    '<div class="modal-acts" style="flex-wrap:wrap">'+
    (pode?'<button class="btn btn-dark" onclick="fecharModal();invForm(\''+it.id+'\')">✏ Editar</button>'+
          '<button class="btn btn-primary" style="background:#b33" onclick="invExcluir(\''+it.id+'\')">🗑 Apagar</button>':
          '<button class="btn btn-dark" onclick="fecharModal()">Fechar</button>')+
    '</div>');
};

/* ---------- selects com OUTROS + cascata categoria→tipo ---------- */
function optHTML(opcoes,val){
  const lista=opcoes.slice();
  if(val && val!==OUTRO && lista.indexOf(val)<0) lista.unshift(val);
  let sel;
  if(val===OUTRO) sel=OUTRO;
  else if(val && lista.indexOf(val)>=0) sel=val;
  else sel=(lista[0]!==undefined?lista[0]:'');
  let h='<option value="'+OUTRO+'"'+(sel===OUTRO?' selected':'')+'>OUTROS — criar novo…</option>';
  if(sel==='' ) h+='<option value="" selected>(sem tipo)</option>';
  lista.forEach(o=>{ h+='<option'+(o===sel?' selected':'')+'>'+e(o)+'</option>'; });
  return h;
}
function tiposSelHTML(cat,val){
  if(!cat || cat===OUTRO){
    let h='<option value="'+OUTRO+'"'+(val===OUTRO?' selected':'')+'>OUTROS — criar novo…</option>';
    h+='<option value=""'+(val!==OUTRO?' selected':'')+'>— escolha a categoria —</option>';
    return h;
  }
  return optHTML(tiposDe(cat),val);
}
window.invOutrosVigia=function(){
  try{
    const cat=(($('#ivCat')||{}).value||'');
    const t=$('#ivCatNovo'); if(t) t.style.display=(cat===OUTRO)?'block':'none';
    invTipoRecarrega();
    const est=(($('#ivEstado')||{}).value||'');
    const en=$('#ivEstadoNovo'); if(en) en.style.display=(est===OUTRO)?'block':'none';
    const tv=$('#ivTipoNovo'); if(tv) tv.style.display=((($('#ivTipo')||{}).value||'')===OUTRO)?'block':'none';
  }catch(_){}
};
window.invTipoRecarrega=function(){
  try{
    const sel=$('#ivTipo'); if(!sel) return;
    const cat=(($('#ivCat')||{}).value||'');
    const atual=sel.value;
    sel.innerHTML=tiposSelHTML(cat, (atual===OUTRO)?OUTRO:atual);
  }catch(_){}
};

/* ---------- formulário ---------- */
window.invForm=function(id){
  if(!podeInv()) return toast('Sem permissão para editar o inventário.');
  const it=id?INV.find(x=>x.id===id):null;
  const catVal=it?(it.categoria||''):(catsNomes()[0]||'');
  const tipoVal=it?(it.tipo||''):'';
  const estVal=it?(it.estado||''):'Bom';
  abrirModal('<h3>'+(it?'✏ Editar':'＋ Novo')+' equipamento</h3>'+
    '<div style="display:grid;gap:8px;margin-top:8px">'+
    '<input id="ivNome" placeholder="Nome * (ex.: Teclado Yamaha PSR-SX600)" value="'+e(it?it.nome:'')+'" style="padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:15px;font-weight:700;min-width:0;width:100%;box-sizing:border-box">'+
    '<div style="display:grid;gap:6px;min-width:0">'+
      '<label style="font-size:12px;color:#567;font-weight:700">Categoria (abre o menu)</label>'+
      '<select id="ivCat" onchange="invOutrosVigia()" style="padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px;background:#fff;min-width:0;width:100%;box-sizing:border-box">'+optHTML(catsNomes(),catVal)+'</select>'+
      '<input id="ivCatNovo" placeholder="Nova categoria… (escreva e salve)" style="display:none;padding:10px;border:1px solid #1c7a4e;border-radius:8px;font-size:14px;min-width:0;width:100%;box-sizing:border-box">'+
    '</div>'+
    '<div style="display:flex;gap:8px;min-width:0">'+
      '<input id="ivMarca" placeholder="Marca" value="'+e(it?it.marca:'')+'" style="flex:1;min-width:0;padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px;box-sizing:border-box">'+
      '<input id="ivModelo" placeholder="Modelo" value="'+e(it?it.modelo:'')+'" style="flex:1;min-width:0;padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px;box-sizing:border-box"></div>'+
    '<div style="display:grid;gap:6px;min-width:0">'+
      '<label style="font-size:12px;color:#567;font-weight:700">Tipo (subcategoria da escolhida)</label>'+
      '<select id="ivTipo" onchange="invOutrosVigia()" style="padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px;background:#fff;min-width:0;width:100%;box-sizing:border-box">'+tiposSelHTML(catVal,tipoVal)+'</select>'+
      '<input id="ivTipoNovo" placeholder="Novo tipo… (escreva e salve)" style="display:none;padding:10px;border:1px solid #1c7a4e;border-radius:8px;font-size:14px;min-width:0;width:100%;box-sizing:border-box">'+
    '</div>'+
    '<div style="display:flex;gap:8px;min-width:0">'+
      '<input id="ivQtd" type="number" inputmode="numeric" step="1" min="0" placeholder="Quantidade" value="'+(it&&it.quantidade!=null?e(String(it.quantidade)):'')+'" style="flex:1;min-width:0;padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px;text-align:center;box-sizing:border-box">'+
      '<input id="ivCor" placeholder="Cor" value="'+e(it?it.cor:'')+'" style="flex:1.4;min-width:0;padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px;box-sizing:border-box">'+
    '</div>'+
    '<div style="display:grid;gap:6px;min-width:0">'+
      '<label style="font-size:12px;color:#567;font-weight:700">Estado de conservação (abre o menu)</label>'+
      '<select id="ivEstado" onchange="invOutrosVigia()" style="padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px;background:#fff;min-width:0;width:100%;box-sizing:border-box">'+optHTML(estadosLista(),estVal)+'</select>'+
      '<input id="ivEstadoNovo" placeholder="Novo estado… (escreva e salve)" style="display:none;padding:10px;border:1px solid #1c7a4e;border-radius:8px;font-size:14px;min-width:0;width:100%;box-sizing:border-box">'+
    '</div>'+
    '<div style="display:flex;gap:8px;min-width:0">'+
      '<input id="ivSerie" placeholder="Nº de série" value="'+e(it?it.serie:'')+'" style="flex:1 1 0;min-width:0;width:0;box-sizing:border-box;padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px">'+
      '<input id="ivPatr" placeholder="Patrimônio (código interno)" value="'+e(it?it.patrimonio:'')+'" style="flex:1 1 0;min-width:0;width:0;box-sizing:border-box;padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px"></div>'+
    '<input id="ivLocal" placeholder="Local (ex.: Palco, Almoxarifado, Sala do ministério)" value="'+e(it?it.local:'')+'" style="width:100%;box-sizing:border-box;min-width:0;padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px">'+
    '<div style="display:flex;gap:8px;min-width:0">'+
      '<input id="ivValor" type="number" inputmode="decimal" step="0.01" min="0" placeholder="Valor (R$)" value="'+(it&&it.valor!=null?Number(it.valor).toFixed(2):'')+'" style="flex:1 1 0;min-width:0;width:0;box-sizing:border-box;padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px">'+
      '<input id="ivAq" type="date" title="Data de aquisição" value="'+e(it&&it.data_aquisicao?String(it.data_aquisicao):'')+'" style="flex:1 1 0;min-width:0;width:0;box-sizing:border-box;padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px"></div>'+
    '<input id="ivGar" type="date" title="Garantia até" value="'+e(it&&it.garantia_ate?String(it.garantia_ate):'')+'" style="width:100%;box-sizing:border-box;min-width:0;padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px">'+
    '<textarea id="ivObs" placeholder="Observações (acessórios, defeitos, histórico...)" style="width:100%;box-sizing:border-box;min-width:0;padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px;min-height:60px">'+e(it?it.obs:'')+'</textarea>'+
    '<label style="font-size:13px;color:#456">📷 Foto do equipamento (abre a galeria)<input id="ivFoto" type="file" accept="image/*" style="display:block;margin-top:4px;font-size:13px"></label>'+
    '</div><div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn btn-primary" onclick="invSalvar(\''+(it?it.id:'')+'\')">Salvar</button></div>');
  setTimeout(invOutrosVigia,0);
};
window.invSalvar=async function(id){
  const nome=(($('#ivNome')||{}).value||'').trim();
  if(!nome) return toast('Dê um nome ao equipamento.');
  let cat=(($('#ivCat')||{}).value||'');
  if(cat===OUTRO){ cat=(($('#ivCatNovo')||{}).value||'').trim();
    if(!cat) return toast('Escolha uma categoria ou escreva a nova em "OUTROS".'); }
  if(!cat) return toast('Escolha a categoria.');
  let tipo=(($('#ivTipo')||{}).value||'');
  if(tipo===OUTRO){ tipo=(($('#ivTipoNovo')||{}).value||'').trim();
    if(!tipo) return toast('Escolha o tipo ou escreva o novo em "OUTROS".'); }
  let estado=(($('#ivEstado')||{}).value||'');
  if(estado===OUTRO){ estado=(($('#ivEstadoNovo')||{}).value||'').trim();
    if(!estado) return toast('Escolha o estado ou escreva o novo em "OUTROS".'); }
  if(!estado) estado='Bom';
  const qtdRaw=(($('#ivQtd')||{}).value||'').trim();
  const qtd=parseInt(qtdRaw,10);
  const dados={
    nome,
    categoria:cat,
    tipo:tipo||null,
    estado,
    marca:(($('#ivMarca')||{}).value||'').trim(),
    modelo:(($('#ivModelo')||{}).value||'').trim(),
    quantidade:qtdRaw===''?null:(isNaN(qtd)?null:qtd),
    cor:(($('#ivCor')||{}).value||'').trim(),
    serie:(($('#ivSerie')||{}).value||'').trim(),
    patrimonio:(($('#ivPatr')||{}).value||'').trim(),
    local:(($('#ivLocal')||{}).value||'').trim(),
    valor:(()=>{ const v=parseFloat(($('#ivValor')||{}).value); return isNaN(v)?null:v; })(),
    data_aquisicao:($('#ivAq')||{}).value||null,
    garantia_ate:($('#ivGar')||{}).value||null,
    obs:(($('#ivObs')||{}).value||'').trim()
  };
  const foto=(($('#ivFoto')||{}).files||[])[0];
  try{
    if(foto){ const r=await fotoInv(foto); dados.foto_url=r.url; if(r.drive) dados.foto_drive=r.drive; }
    if(id){ const {error}=await sb.from('inventario').update(dados).eq('id',id); if(error) throw new Error(error.message); toast('Equipamento atualizado ✓'); }
    else { dados.criado_por_nome=((typeof usuarioAtual==='function'&&usuarioAtual())||{}).nome||'';
           const {error}=await sb.from('inventario').insert(dados); if(error) throw new Error(error.message); toast('Equipamento cadastrado ✓'); }
    listaAdd(dados.categoria,dados.tipo,dados.estado);
    fecharModal(); invSync(); setTimeout(carregaInv,400);
  }catch(err){ toast('Erro: '+(err.message||err)); }
};
window.invExcluir=function(id){
  if(!podeInv()) return toast('Sem permissão.');
  const it=INV.find(x=>x.id===id); if(!it) return;
  if(!confirm('Apagar "'+it.nome+'" do inventário? (fica registrado no log)')) return;
  sb.from('inventario').delete().eq('id',id).then(({error})=>{
    if(error) return toast('Erro: '+error.message);
    toast('Item apagado ✓'); fecharModal(); invSync(); setTimeout(carregaInv,400);
  });
};

setTimeout(()=>{ try{ carregaInv(); }catch(_){} },2000);
})();
