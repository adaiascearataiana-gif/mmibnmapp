/* ============================================================
   MM IBNM — INVENTÁRIO do Ministério de Música (v61)
   • Todos os membros veem os equipamentos e as fotos
   • ADM do setor: cadastra/edita/apaga + log automático
   • Fotos vão p/ o Google Drive (pasta "Inventário",
     criada sozinha) com fallback no app (bucket "anexos")
   • Campos seguindo boas práticas de gestão de ativos:
     patrimônio, marca, modelo, nº série, categoria, estado,
     local, aquisição, garantia, valor, foto, observações
============================================================ */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const e=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl=v=>(v==null||v===''||isNaN(Number(v)))?'—':Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dtBR=d=>{ if(!d) return ''; const s=String(d); return s.length>=10?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):s; };
const CATEGORIAS=['Geral','Áudio','Teclado','Percussão','Cordas','Sopro','Cabos e Adaptadores','Palco e Estrutura','Iluminação','Informática','Acessórios'];
const ESTADOS=['Novo','Bom','Regular','Em reparo','Inativo'];
let INV=[], LOG=[], invBusca='', invCat='', invEstado='', _invCarregou=false, _invRT=false, _invT=null, _invUlt=null;

function podeInv(){ try{ return typeof podeSetor==='function'&&podeSetor('inventario'); }catch(_){ return false; } }

/* ---------- carga + tempo real ---------- */
async function carregaInv(){
  try{ if(typeof sb==='undefined'||!sb) return;
    const r=await sb.from('inventario').select('*').order('nome',{ascending:true});
    const novo=JSON.stringify((r.data||[]).map(x=>[x.id,x.nome,x.foto_url,x.estado,x.updated_at]));
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
function fotoSrc(u){ if(!u) return ''; const m=String(u).match(/drive\.google\.com\/file\/d\/([-\w]+)/);
  return m?('https://drive.google.com/thumbnail?id='+m[1]+'&sz=w400'):u; }

/* ============================================================
   TELA
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
    return [it.nome,it.marca,it.modelo,it.patrimonio,it.serie,it.local,it.obs]
      .map(x=>String(x||'').toLowerCase()).some(x=>x.indexOf(busca)>=0);
  });
  const cats=Array.from(new Set(INV.map(x=>x.categoria).filter(Boolean))).sort();
  const ests=Array.from(new Set(INV.map(x=>x.estado).filter(Boolean))).sort();

  let h='<div class="page inv-page"><div class="page-ttl">\uD83D\uDD27 Inventário '+
    '<span style="font-size:13px;font-weight:600;color:#789">'+INV.length+' item(ns)</span></div>';
  /* busca + filtros */
  h+='<div class="card">'+
    '<input id="invQ" placeholder="🔍 Buscar por nome, marca, modelo, patrimônio, nº série..." value="'+e(invBusca)+'" '+
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
  /* lista */
  if(!itens.length){
    h+='<div class="card"><div class="empty">'+(INV.length?'Nada encontrado com esses filtros.':'Nenhum equipamento cadastrado ainda.'+(pode?' Toque em "Novo equipamento".':''))+'</div></div>';
  }else{
    h+='<div class="card">';
    itens.forEach(it=>{
      const cor=it.estado==='Em reparo'?'#b8860b':it.estado==='Inativo'?'#999':it.estado==='Novo'?'#1c7a4e':'#356';
      h+='<div class="info-row" style="align-items:flex-start;cursor:pointer" onclick="invDet(\''+it.id+'\')">'+
        '<span style="display:flex;gap:10px;align-items:flex-start;text-align:left">'+
        (it.foto_url?'<img src="'+e(fotoSrc(it.foto_url))+'" style="width:52px;height:52px;object-fit:cover;border-radius:8px;background:#eef" loading="lazy" onerror="this.style.visibility=\'hidden\'">':
          '<span style="width:52px;height:52px;border-radius:8px;background:#eef;display:flex;align-items:center;justify-content:center;font-size:22px">🎧</span>')+
        '<span><b>'+e(it.nome)+'</b><br>'+
        '<span style="font-size:12.5px;color:#567">'+e([it.marca,it.modelo].filter(Boolean).join(' '))+
        (it.patrimonio?' • 🏷 '+e(it.patrimonio):'')+(it.local?' • 📍 '+e(it.local):'')+'</span><br>'+
        '<span style="font-size:11px;font-weight:800;color:'+cor+'">'+e(it.estado||'')+
        (it.categoria?' • '+e(it.categoria):'')+'</span></span></span></div>';
    });
    h+='</div>';
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
    ['Categoria',it.categoria],['Marca',it.marca],['Modelo',it.modelo],
    ['Nº de série',it.serie],['Patrimônio',it.patrimonio],['Estado',it.estado],
    ['Local',it.local],['Valor',brl(it.valor)],['Aquisição',dtBR(it.data_aquisicao)],
    ['Garantia até',dtBR(it.garantia_ate)],[ 'Observações',it.obs],
    ['Cadastrado por',it.criado_por_nome],['Cadastrado em',it.created_at?new Date(it.created_at).toLocaleString('pt-BR'):'']
  ].filter(l=>l[1]);
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

/* ---------- formulário ---------- */
window.invForm=function(id){
  if(!podeInv()) return toast('Sem permissão para editar o inventário.');
  const it=id?INV.find(x=>x.id===id):null;
  const opt=(lista,val)=>lista.map(o=>'<option'+(o===val?' selected':'')+'>'+e(o)+'</option>').join('');
  abrirModal('<h3>'+(it?'✏ Editar':'＋ Novo')+' equipamento</h3>'+
    '<div style="display:grid;gap:8px;margin-top:8px">'+
    '<input id="ivNome" placeholder="Nome * (ex.: Teclado Yamaha PSR-SX600)" value="'+e(it?it.nome:'')+'" style="padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:15px;font-weight:700">'+
    '<div style="display:flex;gap:8px">'+
      '<select id="ivCat" style="flex:1;padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px">'+opt(CATEGORIAS,it?it.categoria:'Geral')+'</select>'+
      '<select id="ivEstado" style="flex:1;padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px">'+opt(ESTADOS,it?it.estado:'Bom')+'</select></div>'+
    '<div style="display:flex;gap:8px">'+
      '<input id="ivMarca" placeholder="Marca" value="'+e(it?it.marca:'')+'" style="flex:1;padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px">'+
      '<input id="ivModelo" placeholder="Modelo" value="'+e(it?it.modelo:'')+'" style="flex:1;padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px"></div>'+
    '<div style="display:flex;gap:8px">'+
      '<input id="ivSerie" placeholder="Nº de série" value="'+e(it?it.serie:'')+'" style="flex:1;padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px">'+
      '<input id="ivPatr" placeholder="Patrimônio (código interno)" value="'+e(it?it.patrimonio:'')+'" style="flex:1;padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px"></div>'+
    '<input id="ivLocal" placeholder="Local (ex.: Palco, Almoxarifado, Sala do ministério)" value="'+e(it?it.local:'')+'" style="padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px">'+
    '<div style="display:flex;gap:8px">'+
      '<input id="ivValor" type="number" inputmode="decimal" step="0.01" min="0" placeholder="Valor (R$)" value="'+(it&&it.valor!=null?Number(it.valor).toFixed(2):'')+'" style="flex:1;padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px">'+
      '<input id="ivAq" type="date" title="Data de aquisição" value="'+e(it&&it.data_aquisicao?String(it.data_aquisicao):'')+'" style="flex:1;padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px"></div>'+
    '<input id="ivGar" type="date" title="Garantia até" value="'+e(it&&it.garantia_ate?String(it.garantia_ate):'')+'" style="padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px">'+
    '<textarea id="ivObs" placeholder="Observações (acessórios, defeitos, histórico...)" style="padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px;min-height:60px">'+e(it?it.obs:'')+'</textarea>'+
    '<label style="font-size:13px;color:#456">📷 Foto do equipamento (vai para o Google Drive)<input id="ivFoto" type="file" accept="image/*" capture="environment" style="display:block;margin-top:4px;font-size:13px"></label>'+
    '</div><div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn btn-primary" onclick="invSalvar(\''+(it?it.id:'')+'\')">Salvar</button></div>');
};
window.invSalvar=async function(id){
  const nome=(($('#ivNome')||{}).value||'').trim();
  if(!nome) return toast('Dê um nome ao equipamento.');
  const dados={
    nome,
    categoria:($('#ivCat')||{}).value||'Geral',
    estado:($('#ivEstado')||{}).value||'Bom',
    marca:(($('#ivMarca')||{}).value||'').trim(),
    modelo:(($('#ivModelo')||{}).value||'').trim(),
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
