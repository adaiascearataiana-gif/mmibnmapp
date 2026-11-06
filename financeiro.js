/* ============================================================
   MM IBNM — SETOR FINANCEIRO (v61)
   • Todos os membros veem saldo/entradas/saídas em tempo real
   • Doação PIX: gera copia-e-cola com valor + QR + WhatsApp
   • ADM financeiro: lançamentos, confirmar doações, CSV
   • ADM principal: chave PIX/WhatsApp + designa setores
   • Fotos: Google Drive (Setor Financeiro/Entradas|Saídas)
     com fallback no app (bucket "anexos")
============================================================ */
(function(){
'use strict';
const ehPdf=f=>!!f&&(/pdf/i.test(f.type||'')||/\.pdf$/i.test(f.name||''));
const $=s=>document.querySelector(s);
const e=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dtBR=d=>{ if(!d) return ''; const s=String(d); return s.slice(8,10)+'/'+s.slice(5,7); };
const PAPEIS={};
let FIN=[], DOA=[], finMes=new Date().toISOString().slice(0,7), finAba='lanc', _finCarregou=false, _finRT=false, _finT=null;

/* ---------- papéis de ADM por setor ---------- */
window.carregaPapeis=async function(){
  try{ if(typeof sb==='undefined'||!sb) return; const {data}=await sb.from('adm_papeis').select('*');
    Object.keys(PAPEIS).forEach(k=>delete PAPEIS[k]);
    (data||[]).forEach(r=>PAPEIS[r.user_id]={financeiro:!!r.financeiro,inventario:!!r.inventario});
    try{ if(typeof montaMenu==='function'&&!_finPapelRT){ _finPapelRT=true; const ch=sb.channel('papel-rt');
      ch.on('postgres_changes',{event:'*',schema:'public',table:'adm_papeis'},()=>carregaPapeis()); ch.subscribe(); } }catch(_){}
  }catch(err){}
};
let _finPapelRT=false;
window.podeSetor=function(p){
  try{ if(window.modoUsuario&&modoUsuario()) return false; }catch(_){} /* v68: modo usuário = membro comum */
  try{ if(typeof ehAdmin==='function'&&ehAdmin()) return true; }catch(_){}
  const u=(typeof usuarioAtual==='function')?usuarioAtual():null; if(!u) return false;
  const r=PAPEIS[u.id]; return !!(r&&r[p]);
};

/* ---------- carregamento + tempo real ---------- */
async function carregaFin(){
  try{ if(typeof sb==='undefined'||!sb) return;
    const r1=await sb.from('financeiro').select('*').order('data',{ascending:false}).order('created_at',{ascending:false});
    const r2=await sb.from('doacoes').select('*').order('criado_em',{ascending:false});
    const novos=JSON.stringify([(r1.data||[]).map(x=>[x.id,x.valor,x.status,x.anexo_url,x.descricao]),(r2.data||[]).map(x=>[x.id,x.status,x.valor,x.comprovante_url])]);
    FIN=r1.data||[]; DOA=r2.data||[]; _finCarregou=true;
    if(novos!==_finUlt){ _finUlt=novos; finPinta(); }
  }catch(err){}
}
let _finUlt=null;
function finPinta(){ try{ if(document.querySelector('.modal-bg.show')){ setTimeout(finPinta,600); return; } /* modal aberto: nao derruba, espera fechar */ if(document.querySelector('.fin-page')&&typeof go==='function') go('financeiro'); }catch(_){} }
window.finSync=function(){ clearTimeout(_finT); _finT=setTimeout(carregaFin,250); };
function finRT(){ try{ if(_finRT||typeof sb==='undefined'||!sb||!sb.channel) return; _finRT=true;
  const ch=sb.channel('fin-rt');
  ch.on('postgres_changes',{event:'*',schema:'public',table:'financeiro'},()=>finSync());
  ch.on('postgres_changes',{event:'*',schema:'public',table:'doacoes'},()=>finSync());
  ch.subscribe(); }catch(_){} }

/* ---------- cálculos ---------- */
function noMes(r){ return String(r.data||'').slice(0,7)===finMes; }
function finSaldos(){
  const m=FIN.filter(noMes); let ent=0,sai=0,tEnt=0,tSai=0;
  m.forEach(r=>{ if(r.tipo==='entrada') ent+=Number(r.valor); else sai+=Number(r.valor); });
  FIN.forEach(r=>{ if(r.tipo==='entrada') tEnt+=Number(r.valor); else tSai+=Number(r.valor); });
  return {ent,sai,saldo:ent-sai,total:tEnt-tSai};
}

/* ---------- PIX: copia-e-cola (BR Code) com valor ---------- */
function pixCRC16(s){ let crc=0xFFFF; for(let i=0;i<s.length;i++){ crc^=s.charCodeAt(i)<<8;
  for(let j=0;j<8;j++){ crc=(crc&0x8000)?(((crc<<1)^0x1021)&0xFFFF):((crc<<1)&0xFFFF); } }
  return crc.toString(16).toUpperCase().padStart(4,'0'); }
function pixAscii(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9 .@-]/g,''); }
function ehCopiaCola(v){ const s=String(v||'').replace(/\s+/g,''); return s.length>50&&(/^000201/.test(s)||s.indexOf('br.gov.bcb.pix')>=0); }
function pixChaveDe(p){
  try{
    const s=String(p||'').replace(/\s+/g,''); let i=0;
    while(i+4<=s.length){
      const id=s.substr(i,2), L=parseInt(s.substr(i+2,2),10);
      if(!(L>=0)||i+4+L>s.length) return '';
      const val=s.substr(i+4,L); i+=4+L;
      if(id==='26'||id==='25'){
        let j=0;
        while(j+4<=val.length){
          const sid=val.substr(j,2), SL=parseInt(val.substr(j+2,2),10);
          if(!(SL>=0)||j+4+SL>val.length) break;
          const sval=val.substr(j+4,SL); j+=4+SL;
          if(sid==='01') return sval;
        }
      }
    }
  }catch(_){}
  return '';
}
function pixComValor(p,v){
  try{
    const amt=Number(v).toFixed(2);
    const s=String(p||'').replace(/\s+/g,'').replace(/6304[0-9A-Fa-f]{4}$/,'').replace(/6304$/,'');
    const campos=[]; let i=0;
    while(i+4<=s.length){
      const id=s.substr(i,2); if(!/^[0-9][0-9]$/.test(id)) return '';
      const L=parseInt(s.substr(i+2,2),10);
      if(!(L>=0)||i+4+L>s.length) return '';
      if(id!=='54') campos.push([id,s.substr(i+4,L)]);
      i+=4+L;
    }
    if(!campos.length||i!==s.length) return '';
    let pos=-1;
    for(let t=0;t<campos.length;t++){ if(['58','59','60','62'].indexOf(campos[t][0])>=0){ pos=t; break; } }
    if(pos<0) pos=campos.length;
    campos.splice(pos,0,['54',amt]);
    let p2=campos.map(function(c){ return c[0]+String(c[1].length).padStart(2,'0')+c[1]; }).join('')+'6304';
    return p2+pixCRC16(p2);
  }catch(_){ return ''; }
}
function montaPix(chave,valor,nome,cidade){
  let k=String(chave||'').trim(); if(!k) return '';
  const v=Number(valor); if(!(v>0)) return '';
  if(ehCopiaCola(k)){
    const pronto=pixComValor(k,v); if(pronto) return pronto;
    k=pixChaveDe(k); if(!k) return '';
  }
  const n=(pixAscii(nome||'MINISTERIO DE MUSICA').slice(0,25)||'MINISTERIO DE MUSICA');
  const c=(pixAscii(cidade||'SAO PAULO').slice(0,15)||'SAO PAULO');
  const amt=v.toFixed(2);
  const mai='0014br.gov.bcb.pix'+'01'+String(k.length).padStart(2,'0')+k;
  let p='000201'+'26'+String(mai.length).padStart(2,'0')+mai
    +'52040000'+'5303986'
    +'54'+String(amt.length).padStart(2,'0')+amt
    +'5802BR'
    +'59'+String(n.length).padStart(2,'0')+n
    +'60'+String(c.length).padStart(2,'0')+c
    +'62070503***'
    +'6304';
  return p+pixCRC16(p);
}
function copiar(txt){ try{ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).catch(()=>{}); return true; } }catch(_){}
  try{ const ta=document.createElement('textarea'); ta.value=txt; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); return true; }catch(_){} return false; }
function cfgFin(){ return (typeof APP_CFG!=='undefined'&&APP_CFG.financeiro_cfg)||{}; }
function wppNormalizado(w){ let d=String(w||'').replace(/\D/g,''); if(!d) return ''; if(d.length<=11) d='55'+d; return d; }

/* ---------- anexos: Drive primeiro, fallback no app ---------- */
async function anexoSobe(caminho,file){
  const _pdf=ehPdf(file); let b=file; if(!_pdf){ try{ b=await reduzImagem(file,1600,0.8); }catch(_){} }
  const path=caminho+'/'+Date.now()+'_'+Math.random().toString(36).slice(2,7)+(_pdf?'.pdf':'.jpg');
  const up=await sb.storage.from('anexos').upload(path,b,{contentType:_pdf?'application/pdf':'image/jpeg',cacheControl:'31536000'});
  if(up.error) throw new Error(up.error.message);
  return sb.storage.from('anexos').getPublicUrl(path).data.publicUrl;
}
/* Foto: SEMPRE no app (bucket anexos) p/ todos verem; e, se o aparelho
   estiver conectado ao Drive, copia na hora pro Drive do ADM principal. */
async function anexoCompleto(caminhoBucket,file,nomeArq,pastaDriveNome){
  const _pdf=ehPdf(file); let b=file; if(!_pdf){ try{ b=await reduzImagem(file,1600,0.8); }catch(_){} }
  const path=caminhoBucket+'/'+Date.now()+'_'+Math.random().toString(36).slice(2,7)+(_pdf?'.pdf':'.jpg');
  const up=await sb.storage.from('anexos').upload(path,b,{contentType:_pdf?'application/pdf':'image/jpeg',cacheControl:'31536000'});
  if(up.error) throw new Error(up.error.message);
  const url=sb.storage.from('anexos').getPublicUrl(path).data.publicUrl;
  let drive='';
  try{ const D=window.__drive;
    if(D&&D.ok&&D.ok()&&D.conectado&&D.conectado()&&pastaDriveNome&&(typeof ehAdmin!=='function'||ehAdmin())){
      const fid=await D.sobe(b,_pdf?String(nomeArq).replace(/\.\w+$/,'')+'.pdf':nomeArq,pastaDriveNome);
      drive='https://drive.google.com/file/d/'+fid+'/view';
    } }catch(_){}
  return {url:url,drive:drive};
}
window.anexoCompleto=anexoCompleto;

/* ============================================================
   TELA
============================================================ */
ROTAS.financeiro=function(){
  finRT();
  if(!_finCarregou) setTimeout(carregaFin,0);
  const pode=podeSetor('financeiro');
  const s=finSaldos();
  const meses=[]; for(let i=0;i<6;i++){ const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-i); meses.push(d.toISOString().slice(0,7)); }
  const abas=[['lanc','📄 Lançamentos']];
  if(pode) abas.push(['doacoes','🎁 Doações recebidas']);
  abas.push(['minhas','💙 Minhas doações']);
  let h='<div class="page fin-page"><div class="page-ttl">\uD83D\uDCB0 Setor Financeiro</div>';
  /* saldo */
  h+='<div class="card" style="text-align:center">'+
     '<div style="font-size:12.5px;color:#789;font-weight:700;text-transform:uppercase;letter-spacing:.6px">Saldo do mês ('+dtBR(finMes+'-01').slice(3)+'/'+finMes.slice(0,4)+')</div>'+
     '<div style="font-size:32px;font-weight:800;color:'+(s.saldo>=0?'#1c7a4e':'#b33')+';margin:4px 0">'+brl(s.saldo)+'</div>'+
     '<div style="display:flex;justify-content:center;gap:18px;font-size:13px">'+
       '<span style="color:#1c7a4e;font-weight:700">▲ Entradas '+brl(s.ent)+'</span>'+
       '<span style="color:#b33;font-weight:700">▼ Saídas '+brl(s.sai)+'</span></div>'+
     '<div style="font-size:12px;color:#789;margin-top:6px">Saldo total acumulado: <b>'+brl(s.total)+'</b> • tempo real</div>'+
     '</div>';
  /* mês + botões */
  h+='<div class="card"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'+
     '<select id="finMes" onchange="finSetMes(this.value)" style="flex:1;min-width:120px;padding:9px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px;background:#fff">'+
       meses.map(m=>'<option value="'+m+'"'+(m===finMes?' selected':'')+'>'+(m.slice(5)+'/'+m.slice(0,4))+'</option>').join('')+'</select>';
  if(pode){
    /* v79: botao manual de ENTRADA removido — a doacao confirmada ja entra sozinha no relatorio */
    h+='<button class="mini-btn" onclick="finForm(null,\'saida\')">－ Saída</button>'+
       '<button class="mini-btn sec" onclick="finCSV()">⬇ CSV</button>';
  }
  h+='<button class="mini-btn" onclick="finDoar()" style="background:#1c7a4e;color:#fff">🎁 Doar</button>';
  h+='</div>';
  /* abas */
  h+='<div style="display:flex;gap:6px;margin-top:10px">'+abas.map(a=>'<button class="mini-btn'+(finAba===a[0]?'':' sec')+'" onclick="finSetAba(\''+a[0]+'\')">'+a[1]+'</button>').join('')+'</div></div>';
  if(finAba==='lanc') h+=finHTMLLanc(pode);
  else if(finAba==='doacoes') h+=finHTMLDoacoes();
  else h+=finHTMLMinhas();
  /* config PIX (só ADM principal/completo) */
  try{ if(ehAdmin()) h+=finHTMLCfg(); }catch(_){}
  h+='</div>';
  return h;
};

function finHTMLLanc(pode){
  const rows=FIN.filter(noMes);
  if(!rows.length) return '<div class="card"><div class="empty">Nenhum lançamento neste mês ainda.</div></div>';
  let h='<div class="card"><h3>Lançamentos de '+dtBR(finMes+'-01').slice(3)+'/'+finMes.slice(0,4)+'</h3>';
  rows.forEach(r=>{
    const ent=r.tipo==='entrada';
    h+='<div class="info-row"><span class="v" style="text-align:left">'+
      '<span style="font-weight:700">'+(ent?'▲':'▼')+' '+e(r.descricao)+'</span><br>'+
      '<span style="font-weight:400;font-size:12px;color:#789">'+dtBR(r.data)+' • '+e(r.criado_por_nome||'')+
      (r.anexo_url?' • <a href="javascript:void(0)" onclick="finVerAnexo(\''+e(r.anexo_url)+'\')" style="color:#1c7a4e;font-weight:700">ver comprovante</a>':'')+'</span></span>'+
      '<span style="white-space:nowrap"><b style="color:'+(ent?'#1c7a4e':'#b33')+'">'+(ent?'+':'−')+brl(r.valor)+'</b>'+
      (pode?' <button class="mini-btn sec" onclick="finForm(\''+r.id+'\')">✏</button> <button class="mini-btn sec" onclick="finExcluir(\''+r.id+'\')">🗑</button>':'')+
      '</span></div>';
  });
  return h+'</div>';
}

function finHTMLDoacoes(){
  if(!DOA.length) return '<div class="card"><div class="empty">Nenhuma doação recebida ainda.</div></div>';
  let h='<div class="card"><h3>Doações — '+DOA.filter(d=>d.status==='pendente').length+' pendente(s)</h3>';
  DOA.forEach(d=>{
    const badge=d.status==='confirmada'?'<span style="color:#1c7a4e;font-weight:800">✓ confirmada</span>':
                d.status==='rejeitada'?'<span style="color:#b33;font-weight:800">✗ rejeitada</span>':
                '<span style="color:#b8860b;font-weight:800">⏳ pendente</span>';
    h+='<div class="info-row"><span class="v" style="text-align:left;flex:1;min-width:0">'+
      '<span style="font-weight:700">'+e(d.nome||'Membro')+' — '+brl(d.valor)+'</span><br>'+
      '<span style="font-weight:400;font-size:12px;color:#789">'+new Date(d.criado_em).toLocaleString('pt-BR')+' • '+badge+
      (d.comprovante_url?' • <a href="javascript:void(0)" onclick="finVerAnexo(\''+e(d.comprovante_url)+'\')" style="color:#1c7a4e;font-weight:700">comprovante</a>':'')+
      '</span></span><span style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;flex:none;max-width:100%">'+
      (d.status==='pendente'?'<button class="mini-btn" onclick="doaConf(\''+d.id+'\')" style="background:#1c7a4e;color:#fff">✓</button> <button class="mini-btn sec" onclick="doaRej(\''+d.id+'\')">✗</button> ':'')+
      '<button class="mini-btn" style="background:#b33;color:#fff" onclick="doaExcluir(\''+d.id+'\')">🗑 Excluir</button>'+
      '</span></div>';
  });
  return h+'</div>';
}

function finHTMLMinhas(){
  const minhas=DOA.filter(d=>d.status!=='rejeitada'||true); /* RLS já filtra: do membro */
  if(!minhas.length) return '<div class="card"><div class="empty">Você ainda não registrou doações. Toque em 🎁 Doar!</div></div>';
  let h='<div class="card"><h3>💙 Minhas doações</h3>';
  minhas.forEach(d=>{
    const badge=d.status==='confirmada'?'<span style="color:#1c7a4e;font-weight:800">✓ confirmada</span>':
                d.status==='rejeitada'?'<span style="color:#b33;font-weight:800">✗ não localizada</span>':
                '<span style="color:#b8860b;font-weight:800">⏳ aguardando confirmação</span>';
    h+='<div class="info-row"><span class="v" style="text-align:left"><b>'+brl(d.valor)+'</b><br>'+
      '<span style="font-weight:400;font-size:12px;color:#789">'+new Date(d.criado_em).toLocaleString('pt-BR')+' • '+badge+
      (d.comprovante_url?' • <a href="javascript:void(0)" onclick="finVerAnexo(\''+e(d.comprovante_url)+'\')" style="color:#1c7a4e">comprovante</a>':'')+
      '</span></span><span>'+(d.status==='pendente'?(d.comprovante_url?'':'<button class="mini-btn" onclick="doaAnexarDepois(\''+d.id+'\')" style="background:#1c7a4e;color:#fff">📷 Anexar</button> ')+'<button class="mini-btn sec" onclick="doaApagar(\''+d.id+'\')">Cancelar</button>':'')+'</span></div>';
  });
  return h+'</div>';
}

function finHTMLCfg(){
  const c=cfgFin();
  return '<div class="card"><h3>⚙️ Configuração da doação (ADM principal)</h3>'+
    '<p style="font-size:12.5px;color:#789;margin-bottom:8px">Cole no campo abaixo a <b>chave PIX</b> (e-mail, telefone, CPF ou aleatória) <b>ou</b> o código <b>copia e cola</b> inteiro do seu banco — os dois funcionam. O QR sai com o valor doado. O WhatsApp recebe os comprovantes.</p>'+
    '<div style="display:grid;gap:8px">'+
    '<input id="cfgPix" placeholder="Chave PIX ou cole o código copia e cola" value="'+e(c.pix||'')+'" style="padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px">'+
    '<input id="cfgWpp" placeholder="WhatsApp com DDD (receberá comprovantes)" value="'+e(c.wpp||'')+'" style="padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px">'+
    '<input id="cfgNome" placeholder="Nome do recebedor (ex.: MINISTERIO DE MUSICA IBNM)" value="'+e(c.nome||'')+'" style="padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px">'+
    '<input id="cfgCidade" placeholder="Cidade (ex.: FORTALEZA)" value="'+e(c.cidade||'')+'" style="padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:14px">'+
    (c.pix_copia?'<div style="font-size:12px;color:#1c7a4e;font-weight:700;margin:-2px 0 2px">✓ Copia-e cola salvo — o QR usa o código oficial do seu banco</div>':'')+
    '<button class="mini-btn" onclick="finCfgSalvar()">Salvar configuração</button></div></div>';
}

window.finSetMes=function(m){ finMes=m; go('financeiro'); };
window.finSetAba=function(a){ finAba=a; go('financeiro'); };
window.finCfgSalvar=async function(){
  const bruto=(($('#cfgPix')||{}).value||'').trim();
  const c=cfgFin();
  const obj={pix:bruto,wpp:($('#cfgWpp')||{}).value||'',nome:($('#cfgNome')||{}).value||'',cidade:($('#cfgCidade')||{}).value||'',pix_copia:''};
  if(ehCopiaCola(bruto)){ obj.pix=pixChaveDe(bruto)||bruto; obj.pix_copia=bruto; }
  else{
    const kAntiga=c.pix_copia?pixChaveDe(c.pix_copia):'';
    if(kAntiga&&bruto===kAntiga) obj.pix_copia=c.pix_copia;
  }
  await salvarConfig('financeiro_cfg',obj);
  toast(obj.pix_copia?'Configuração salva ✓ — o QR usa o copia-e cola':'Configuração salva ✓');
};

/* ---------- ver comprovante ---------- */
window.finVerAnexo=function(u){ if(!u) return;
  if(/\.pdf(\?|$)/i.test(String(u))){
    abrirModal('<h3>📄 Comprovante (PDF)</h3><iframe src="https://docs.google.com/viewer?embedded=true&url='+encodeURIComponent(u)+'" style="width:100%;height:60vh;border:0;border-radius:10px;background:#f4f4f4"></iframe>'+
      '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Fechar</button><a class="btn btn-primary" href="'+u+'" target="_blank" rel="noopener" style="text-align:center;text-decoration:none">Abrir o PDF</a></div>');
    return;
  }
  let src=u; const m=String(u).match(/drive\.google\.com\/file\/d\/([-\w]+)/);
  if(m) src='https://drive.google.com/thumbnail?id='+m[1]+'&sz=w1200';
  abrirModal('<div style="text-align:center"><img src="'+e(src)+'" style="max-width:100%;max-height:64vh;border-radius:10px" '+
    'onerror="this.style.display=\'none\';document.getElementById(\'finAnexoErro\').style.display=\'block\'">'+
    '<p id="finAnexoErro" style="display:none;color:#c55;font-size:13px">Não consegui carregar a foto. (Se for do Drive, toque em "Abrir no Drive" na lista.)</p>'+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Fechar</button></div></div>');
};

/* ---------- formulário de lançamento ---------- */
window.finForm=function(id,tipoPrev){
  if(!podeSetor('financeiro')) return toast('Sem permissão para lançar.');
  const r=id?FIN.find(x=>x.id===id):null;
  const tipo=r?r.tipo:(tipoPrev||'entrada');
  abrirModal('<h3>'+(r?'✏ Editar':'＋ Novo')+' lançamento</h3>'+
    '<div style="display:grid;gap:8px;margin-top:8px">'+
    '<select id="lfTipo" style="padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:15px">'+
      '<option value="entrada"'+(tipo==='entrada'?' selected':'')+'>▲ Entrada</option>'+
      '<option value="saida"'+(tipo==='saida'?' selected':'')+'>▼ Saída</option></select>'+
    '<input id="lfDesc" placeholder="O que foi? (ex.: Aluguel do som, Oferta, Toner...)" value="'+e(r?r.descricao:'')+'" style="padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:15px">'+
    '<input id="lfValor" type="number" inputmode="decimal" step="0.01" min="0.01" placeholder="Valor (R$)" value="'+(r?Number(r.valor).toFixed(2):'')+'" style="padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:15px">'+
    '<input id="lfData" type="date" value="'+(r?String(r.data):new Date().toISOString().slice(0,10))+'" style="padding:10px;border:1px solid #cfd8d3;border-radius:8px;font-size:15px">'+
    '<label style="font-size:13px;color:#456">📎 Comprovante: foto ou PDF (opcional — vai p/ o Google Drive)<input id="lfFoto" type="file" accept="image/*,application/pdf" style="display:block;margin-top:4px;font-size:13px"></label>'+
    '</div><div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn btn-primary" onclick="finSalvar(\''+(r?r.id:'')+'\')">Salvar</button></div>');
};
window.finSalvar=async function(id){
  const tipo=($('#lfTipo')||{}).value, desc=(($('#lfDesc')||{}).value||'').trim(),
        valor=parseFloat(($('#lfValor')||{}).value), data=($('#lfData')||{}).value,
        foto=(($('#lfFoto')||{}).files||[])[0];
  if(!desc) return toast('Descreva o lançamento.');
  if(!(valor>0)) return toast('Informe um valor maior que zero.');
  if(!data) return toast('Informe a data.');
  const btn=event&&event.target; try{ if(btn){ btn.disabled=true; btn.textContent='Salvando…'; } }catch(_){}
  try{
    const velho=id?(FIN.find(x=>x.id===id)||{}):{};
    let url=velho.anexo_url||'', drive=velho.anexo_drive||'';
    if(foto){ const r=await anexoCompleto(tipo==='entrada'?'financeiro/entradas':'financeiro/saidas',foto,'comprovante_'+tipo+'_'+Date.now()+'.jpg',tipo==='entrada'?'Setor Financeiro/Entradas':'Setor Financeiro/Saídas'); url=r.url; drive=r.drive; }
    const u=usuarioAtual();
    if(id){
      const {error}=await sb.from('financeiro').update({tipo,descricao:desc,valor,data,anexo_url:url,anexo_drive:drive}).eq('id',id);
      if(error) throw new Error(error.message);
      toast('Lançamento atualizado ✓');
    }else{
      const {error}=await sb.from('financeiro').insert({tipo,descricao:desc,valor,data,anexo_url:url,anexo_drive:drive,criado_por:u.id,criado_por_nome:u.nome});
      if(error) throw new Error(error.message);
      toast('Lançamento salvo ✓');
    }
    fecharModal(); finSync(); setTimeout(carregaFin,400);
  }catch(err){ toast('Erro: '+(err.message||err)); try{ if(btn){ btn.disabled=false; btn.textContent='Salvar'; } }catch(_){} }
};
window.finExcluir=function(id){
  if(!podeSetor('financeiro')) return toast('Sem permissão.');
  const r=FIN.find(x=>x.id===id); if(!r) return;
  if(!confirm('Apagar "'+r.descricao+'" ('+brl(r.valor)+')?')) return;
  sb.from('financeiro').delete().eq('id',id).then(({error})=>{
    if(error) return toast('Erro: '+error.message);
    toast('Lançamento apagado ✓'); finSync(); setTimeout(carregaFin,400);
  });
};

/* ---------- doação ---------- */
window.finDoar=function(){
  const c=cfgFin();
  if(!c.pix&&!c.pix_copia) return toast('O ADM ainda não configurou a chave PIX.');
  abrirModal('<h3>🎁 Doar para o Ministério</h3>'+
    '<p style="font-size:13.5px;color:#456;margin:6px 0">Digite o valor que deseja doar. O código PIX com o valor é gerado automaticamente e copiado — é só abrir o seu banco e colar.</p>'+
    '<input id="finValor" type="number" inputmode="decimal" step="0.01" min="0.01" placeholder="Valor (R$)" '+
      'oninput="finPixAuto(this.value)" style="width:100%;padding:12px;border:1px solid #cfd8d3;border-radius:8px;font-size:18px;font-weight:700">'+
    '<div id="finPixBox" style="margin-top:10px"></div>'+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Fechar</button></div>');
};
window.finPixAuto=function(v){
  const box=$('#finPixBox'); if(!box) return;
  const n=parseFloat(v);
  if(!(n>0)){ box.innerHTML=''; return; }
  const c=cfgFin();
  const code=montaPix(c.pix_copia||c.pix,n,c.nome||'',c.cidade||'');
  if(!code){ box.innerHTML='<p style="font-size:13px;color:#b33">Chave PIX inválida — avise o ADM.</p>'; return; }
  copiar(code);
  box.innerHTML='<div style="text-align:center">'+
    '<img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data='+encodeURIComponent(code)+'" '+
      'alt="QR Code PIX" style="width:220px;max-width:80%;border-radius:10px;background:#fff" onerror="this.style.display=\'none\'">'+
    '<div style="font-size:12.5px;color:#1c7a4e;font-weight:800;margin:6px 0">✓ Código com '+brl(n)+' copiado!</div>'+
    '<div style="font-size:11.5px;color:#789;margin-bottom:6px">Abra o app do seu banco e <b>cole</b> o código (ou aponte a câmera para o QR).</div>'+
    '<div style="font-size:11px;word-break:break-all;background:#f2f6f4;border:1px solid #dde;border-radius:8px;padding:8px;text-align:left;font-family:monospace;user-select:all">'+e(code)+'</div>'+
    '</div>'+
    '<div class="modal-acts" style="flex-wrap:wrap">'+
      '<button class="btn btn-dark" onclick="finCopiarNovo(\''+encodeURIComponent(code)+'\')">📋 Copiar</button>'+
      '<button class="btn btn-primary" onclick="finJaPaguei('+n+',\''+encodeURIComponent(code)+'\')">✅ Já paguei — enviar comprovante</button>'+
    '</div>';
};
window.finCopiarNovo=function(enc){ copiar(decodeURIComponent(enc)); toast('Código copiado ✓'); };
window.finJaPaguei=function(valor,encCode){
  const u=usuarioAtual(); if(!u) return;
  const code=decodeURIComponent(encCode);
  const c=cfgFin(); const wpp=wppNormalizado(c.wpp);
    const msg='Olá! Fiz uma doação de '+brl(valor)+' para o Ministério de Música IBNM. Segue o comprovante. (Registrado no app como pendente — '+u.nome+', '+new Date().toLocaleString('pt-BR')+')';
    /* v77: NÃO abre o WhatsApp antes — ele anexa primeiro; o WhatsApp só abre no botão "Anexar e enviar" */
    abrirModal('<h3>✅ Doação registrada</h3>'+
      '<p style="font-size:14px;color:#456;margin:8px 0"><b>'+brl(valor)+'</b> registrada no seu nome — aparece como <b>pendente</b> até o ADM financeiro confirmar.</p>'+
      '<label style="font-size:14px;color:#456;font-weight:700">📷 Foto do comprovante <span class="req">*</span><input id="doaFoto" type="file" accept="image/*,application/pdf" style="display:block;margin-top:4px;font-size:13px"></label>'+
      (wpp?'<p style="font-size:13px;color:#456;margin-top:8px">Depois de anexar, o WhatsApp do ministério abre com a mensagem pronta — é só confirmar o envio.</p>':
           '<p style="font-size:13px;color:#b8860b;margin-top:8px">O ADM ainda não cadastrou o WhatsApp — o comprovante fica guardado no app.</p>')+
      '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Agora não</button>'+
      '<button class="btn btn-primary" id="doaEnvBtn" onclick="doaEnviar()">'+(wpp?'📤 Anexar e enviar no WhatsApp':'📷 Anexar comprovante')+'</button></div>');
  try{ $('#modalBox').dataset.trava='1'; }catch(_){}
  window._doaMsg=encodeURIComponent(msg);
  window._doaInsertP=sb.from('doacoes').insert({user_id:u.id,nome:u.nome,valor:valor,pix_code:code}).select('id').single().then(function(r){ if(r&&r.error) throw new Error(r.error.message); return (r.data||{}).id; });
  window._doaInsertP.catch(function(){});
};
/* v77: anexa o comprovante e SÓ ENTÃO abre o WhatsApp do ministério */
window.doaEnviar=async function(){
  const f=(($('#doaFoto')||{}).files||[])[0];
  if(!f) return toast('Anexe a foto do comprovante primeiro.');
  const b=$('#doaEnvBtn'); if(b){ b.disabled=true; b.textContent='Enviando comprovante…'; }
  try{
    if(!window._doaInsertP) throw new Error('Registro da doação não encontrado — feche e toque em Já paguei de novo.');
    const id=await window._doaInsertP;
    const url=await anexoSobe('financeiro/doacoes',f);
    const {error}=await sb.from('doacoes').update({comprovante_url:url}).eq('id',id);
    if(error) throw new Error(error.message);
    const c=cfgFin(); const wpp=wppNormalizado(c.wpp);
    toast('Comprovante anexado ✓');
    fecharModal(); finSync(); setTimeout(carregaFin,400);
    if(wpp){
      const msg=decodeURIComponent(window._doaMsg||'');
      try{ window.open('https://wa.me/'+wpp+'?text='+encodeURIComponent(msg),'_blank','noopener'); }catch(_){}
      setTimeout(function(){ try{ abrirModal('<h3>WhatsApp aberto ✓</h3><p style="font-size:14px;color:#456">A conversa com o ministério abriu com a mensagem — anexe também a foto do comprovante por lá.</p><div class="modal-acts"><button class="btn btn-primary" onclick="fecharModal()">Entendi</button></div>'); }catch(_){} },400);
    }else{
      setTimeout(function(){ try{ abrirModal('<h3>Comprovante guardado ✓</h3><p style="font-size:14px;color:#456">Sem WhatsApp cadastrado — o comprovante ficou no app para o ADM financeiro.</p><div class="modal-acts"><button class="btn btn-primary" onclick="fecharModal()">Entendi</button></div>'); }catch(_){} },400);
    }
  }catch(err){
    toast('Erro no envio: '+(err.message||err));
    if(b){ b.disabled=false; b.textContent='📤 Tentar de novo'; }
  }
};
/* v77: anexar depois, pela lista "Minhas doações" (fechar sem anexar não deixa perdido) */
window.doaAnexarDepois=function(id){
  abrirModal('<h3>📷 Anexar comprovante</h3>'+
    '<p style="font-size:13.5px;color:#456">Anexe a foto do comprovante desta doação pendente.</p>'+
    '<label style="font-size:14px;color:#456;font-weight:700">Foto do comprovante <span class="req">*</span><input id="doaFoto" type="file" accept="image/*,application/pdf" style="display:block;margin-top:4px;font-size:13px"></label>'+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn btn-primary" onclick="doaAnexar(\''+id+'\')">Salvar comprovante</button></div>');
  try{ $('#modalBox').dataset.trava='1'; }catch(_){}
};
window.doaAnexar=async function(id){
  const f=(($('#doaFoto')||{}).files||[])[0];
  if(!f) return toast('Escolha a foto ou o PDF do comprovante.');
  try{ const url=await anexoSobe('financeiro/doacoes',f);
    const {error}=await sb.from('doacoes').update({comprovante_url:url}).eq('id',id);
    if(error) throw new Error(error.message);
    toast('Comprovante anexado ✓'); fecharModal(); finSync(); setTimeout(carregaFin,400);
  }catch(err){ toast('Erro: '+(err.message||err)); }
};
window.doaApagar=function(id){
  if(!confirm('Cancelar esta doação pendente?')) return;
  /* v79: some da tela NA HORA — apaga no servidor em segundo plano */
  DOA=DOA.filter(x=>x.id!==id); try{ _finUlt=''; }catch(_){} finPinta(); toast('Doação cancelada ✓');
  sb.from('doacoes').delete().eq('id',id).then(({error})=>{ if(error) toast('Erro ao apagar: '+error.message); else { try{ finSync(); }catch(_){} } });
};
window.doaExcluir=function(id){
  if(!podeSetor('financeiro')) return toast('Sem permissão.');
  const d=DOA.find(x=>x.id===id); if(!d) return;
  if(!confirm('Excluir definitivamente a doação de '+(d.nome||'membro')+' ('+brl(d.valor)+')? Isso não pode ser desfeito.')) return;
  try{
    const u=String(d.comprovante_url||'');
    const m=u.match(/\/storage\/v1\/object\/public\/anexos\/([^?]+)/);
    if(m && typeof sb!=='undefined' && sb && sb.storage) sb.storage.from('anexos').remove([decodeURIComponent(m[1])]);
  }catch(_){}
  /* v79: apaga também a entrada que a confirmação criou no relatório */
  if(d.lancamento_id){ try{ sb.from('financeiro').delete().eq('id',d.lancamento_id); }catch(_){} }
  /* v79: some da tela NA HORA — apaga no servidor em segundo plano */
  DOA=DOA.filter(x=>x.id!==id); try{ _finUlt=''; }catch(_){} finPinta(); toast('Doação excluída ✓');
  sb.from('doacoes').delete().eq('id',id).then(({error})=>{ if(error) toast('Erro ao excluir: '+error.message); else { try{ finSync(); }catch(_){} } });
};
window.doaConf=async function(id){
  if(!podeSetor('financeiro')) return toast('Sem permissão.');
  const d=DOA.find(x=>x.id===id); if(!d) return;
  if(!confirm('Confirmar o recebimento de '+brl(d.valor)+' de '+(d.nome||'membro')+'?')) return;
  try{
    const u=usuarioAtual();
    const {data:ins,error}=await sb.from('financeiro').insert({
      tipo:'entrada',descricao:'Doação — '+(d.nome||'membro'),valor:d.valor,data:new Date().toISOString().slice(0,10),
      anexo_url:d.comprovante_url||'',criado_por:u.id,criado_por_nome:u.nome
    }).select('id').single();
    if(error) throw new Error(error.message);
    const {error:e2}=await sb.from('doacoes').update({status:'confirmada',confirmado_por_nome:u.nome,confirmado_em:new Date().toISOString(),lancamento_id:ins.id}).eq('id',id);
    if(e2) throw new Error(e2.message);
    toast('Doação confirmada ✓ virou entrada no saldo.'); finSync(); setTimeout(carregaFin,400);
  }catch(err){ toast('Erro: '+(err.message||err)); }
};
window.doaRej=async function(id){
  if(!podeSetor('financeiro')) return toast('Sem permissão.');
  if(!confirm('Marcar como NÃO recebida? (a doação sai do seu pendente)')) return;
  sb.from('doacoes').update({status:'rejeitada',confirmado_por_nome:(usuarioAtual()||{}).nome||''}).eq('id',id).then(({error})=>{
    if(error) return toast('Erro: '+error.message);
    toast('Doação marcada como não recebida'); finSync(); setTimeout(carregaFin,400);
  });
};

/* ---------- planilha CSV ---------- */
window.finCSV=function(){
  if(!podeSetor('financeiro')) return toast('Sem permissão.');
  const rows=FIN.filter(noMes).slice().sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  if(!rows.length) return toast('Nenhum lançamento neste mês.');
  let csv='\ufeffData;Tipo;Descricao;Valor (R$);Comprovante;Registrado por\n';
  rows.forEach(r=>{
    csv+=[r.data,r.tipo==='entrada'?'Entrada':'Saida','"'+String(r.descricao).replace(/"/g,'""')+'"',
      Number(r.valor).toFixed(2).replace('.',','),
      r.anexo_url?'"'+r.anexo_url+'"':'',
      '"'+String(r.criado_por_nome||'').replace(/"/g,'""')+'"'].join(';')+'\n';
  });
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='financeiro_'+finMes+'.csv'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>{ try{ URL.revokeObjectURL(a.href); }catch(_){} },5000);
  toast('Planilha do mês baixada ✓ (abre no Excel/Google Sheets)');
};

/* ============================================================
   PAINEL DO ADM — designação de setores
============================================================ */
window.cardSetores=function(){
  try{ if(typeof ehAdmin!=='function'||!ehAdmin()) return ''; }catch(_){ return ''; }
  const us=(typeof DB!=='undefined'&&DB.usuarios)||[];
  const meu=(typeof usuarioAtual==='function')?usuarioAtual():{};
  const souEu=u=>u.email&&meu.email&&u.email===meu.email;
  let h='<div class="card"><h3>👑 Painel de ADMs</h3>'+
    '<p style="font-size:12.5px;color:#789;margin-bottom:10px">'+
    '<b>👑 Principal</b> = acesso TOTAL (e pode designar outros). '+
    '<b>🛠 Setor</b> = cuida só daquela área (💰 financeiro / 🔧 inventário). '+
    '<b>👤 Membro</b> = só visualiza.</p>';
  /* ---- Principais ---- */
  h+='<div style="font-size:11.5px;font-weight:800;color:#8a9;letter-spacing:1px;text-transform:uppercase;margin:2px 0 6px">👑 Principais (acesso total)</div>';
  us.filter(u=>u.admin).forEach(u=>{
    h+='<div class="info-row"><span class="v" style="text-align:left;font-weight:700">'+e(u.nome)+
      '<br><span style="font-weight:400;font-size:12px;color:#789">'+e(u.email||'')+'</span></span>'+
      '<span>'+(souEu(u)?'<span style="font-size:11.5px;color:#1c7a4e;font-weight:800">você</span>':
        '<button class="mini-btn sec" onclick="painelToggleAdmin(\''+u.id+'\')">Remover 👑</button>')+'</span></div>';
  });
  /* ---- designar novo principal ---- */
  const futuros=us.filter(u=>!u.admin);
  if(futuros.length){
    h+='<div style="font-size:11.5px;font-weight:800;color:#8a9;letter-spacing:1px;text-transform:uppercase;margin:10px 0 6px">➕ Tornar alguém principal</div>';
    futuros.forEach(u=>{
      h+='<div class="info-row"><span class="v" style="text-align:left;font-weight:700">'+e(u.nome)+
        '<br><span style="font-weight:400;font-size:12px;color:#789">'+e(u.email||'')+'</span></span>'+
        '<span><button class="mini-btn" onclick="painelToggleAdmin(\''+u.id+'\')" style="background:#b8860b;color:#fff">Tornar 👑</button></span></div>';
    });
  }
  /* ---- setores ---- */
  h+='<div style="font-size:11.5px;font-weight:800;color:#8a9;letter-spacing:1px;text-transform:uppercase;margin:10px 0 6px">🛠 ADMs de setor (exclusivo da área)</div>';
  const setados=futuros.filter(u=>{ const p2=PAPEIS[u.id]||{}; return p2.financeiro||p2.inventario; });
  const semSet=futuros.filter(u=>setados.indexOf(u)<0);
  const linhaSet=u=>{ const p2=PAPEIS[u.id]||{};
    return '<div class="info-row"><span class="v" style="text-align:left;font-weight:700">'+e(u.nome)+
      (p2.financeiro?' <span class="admin-tag" style="background:#1c7a4e;color:#fff">💰</span>':'')+
      (p2.inventario?' <span class="admin-tag" style="background:#356;color:#fff">🔧</span>':'')+
      '<br><span style="font-weight:400;font-size:12px;color:#789">'+e(u.email||'')+'</span></span>'+
      '<span style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">'+
      '<label style="font-size:12.5px;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" '+(p2.financeiro?'checked':'')+' onchange="setorToggle(\''+u.id+'\',\'financeiro\',this.checked)"> 💰</label>'+
      '<label style="font-size:12.5px;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" '+(p2.inventario?'checked':'')+' onchange="setorToggle(\''+u.id+'\',\'inventario\',this.checked)"> 🔧</label>'+
      '</span></div>'; };
  h+=setados.map(linhaSet).join('');
  if(!setados.length) h+='<p style="font-size:12.5px;color:#789;margin:2px 0 6px">Ninguém designado ainda — marque 💰/🔧 abaixo para dar acesso exclusivo a um membro.</p>';
  if(semSet.length){
    h+='<div style="font-size:11.5px;font-weight:800;color:#8a9;letter-spacing:1px;text-transform:uppercase;margin:10px 0 6px">Membros sem setor</div>';
    h+=semSet.map(linhaSet).join('');
  }
  return h+'<p style="font-size:11.5px;color:#789;margin-top:8px">💾 As mudanças são salvas na hora no banco do app.</p></div>';
};
window.painelToggleAdmin=async function(uid){
  try{
    const u=(typeof DB!=='undefined'&&DB.usuarios||[]).find(x=>x.id===uid); if(!u) return;
    const meu=(typeof usuarioAtual==='function')?usuarioAtual():{};
    if(u.email&&meu.email&&u.email===meu.email) return toast('Você já é o ADM principal 👑');
    const admins=(typeof DB!=='undefined'&&DB.usuarios||[]).filter(x=>x.admin);
    if(u.admin && admins.length<=1) return toast('Precisa existir ao menos 1 principal 👑');
    if(u.admin){
      if(!confirm('Remover o principal de '+u.nome+'? Ele vira membro comum.')) return;
    }else{
      if(!confirm('Tornar '+u.nome+' ADM PRINCIPAL? Ele terá acesso TOTAL ao app (como você).')) return;
    }
    const novo=!u.admin;
    const {error}=await sb.from('perfis').update({admin:novo}).eq('id',u.id);
    if(error) throw new Error(error.message);
    u.admin=novo;
    toast(novo?'👑 '+u.nome+' agora é ADM principal!':'Removido de principal.');
    try{ go('admin'); }catch(_){}
  }catch(err){ toast('Erro: '+(err.message||err)); }
};
window.setorToggle=async function(uid,campo,checked){
  try{
    const cur=PAPEIS[uid]||{};
    const novo={user_id:uid,
      financeiro:campo==='financeiro'?!!checked:!!cur.financeiro,
      inventario:campo==='inventario'?!!checked:!!cur.inventario,
      atualizado_por:((typeof usuarioAtual==='function'&&usuarioAtual())||{}).nome||'',
      atualizado_em:new Date().toISOString()};
    const {error}=await sb.from('adm_papeis').upsert(novo);
    if(error) throw new Error(error.message);
    PAPEIS[uid]={financeiro:novo.financeiro,inventario:novo.inventario};
    toast('Permissão atualizada ✓');
  }catch(err){ toast('Erro: '+(err.message||err)); go('admin'); }
};

/* ============================================================
   SINCRONIZAÇÃO PRO DRIVE DO ADM PRINCIPAL
   • Toda foto nova já é salva no app (bucket) — todos veem.
   • Se o aparelho estiver conectado ao Drive, copia na hora.
   • Este aparelho (ADM principal, conectado) também varre o que
     falta e sobe automático: ao abrir o app, ao voltar pro
     primeiro plano, a cada5 min e ao conectar o Drive.
   • Secundários/membros: nunca precisam de Drive.
============================================================ */
let _sincRodando=false;
window.driveSinc=async function(){
  if(_sincRodando) return 0;
  try{
    const D=window.__drive;
    if(!D||!D.ok||!D.ok()||!D.conectado||!D.conectado()) return 0;
    if(typeof ehAdminReal!=='function'||!ehAdminReal()) return 0; /* v68: so aparelho de principal sincroniza (em qualquer modo) */
    if(typeof sb==='undefined'||!sb) return 0;
    _sincRodando=true;
    let n=0;
    const isBucket=u=>/\/storage\/v1\/object\/public\/(anexos|fotos)\//.test(String(u||''));
    const isDrive=u=>/drive\.google\.com/.test(String(u||''));
    const sobe=async(tabela,colUrl,colDrive,id,tipo)=>{
      try{
        const {data}=await sb.from(tabela).select('id,'+colUrl+','+colDrive);
        for(const r of (data||[])){
          const u=r[colUrl]||'';
          if(!u) continue;
          if(isDrive(u)){ if(!r[colDrive]) await sb.from(tabela).update({[colDrive]:u}).eq('id',r.id); continue; }
          if(r[colDrive]||!isBucket(u)) continue;
          try{
            const blob=await (await fetch(u)).blob();
            const pasta=tabela==='financeiro'?(r.tipo==='entrada'?'Setor Financeiro/Entradas':'Setor Financeiro/Saídas'):
                        tabela==='inventario'?'Inventário':tabela==='perfis'?'Perfil':'Setor Financeiro/Doações';
            const nome=tabela+'_'+r.id+'.jpg';
            const fid=await D.sobe(blob,nome,pasta);
            const novo='https://drive.google.com/file/d/'+fid+'/view';
            const up=await sb.from(tabela).update({[colDrive]:novo}).eq('id',r.id);
            if(!up.error) n++;
          }catch(_){}
        }
      }catch(_){}
    };
    await sobe('financeiro','anexo_url','anexo_drive');
    await sobe('inventario','foto_url','foto_drive');
    await sobe('doacoes','comprovante_url','comprovante_drive');
    await sobe('perfis','foto','foto_drive');
    if(n) try{ toast('☁️ '+n+' foto(s) copiadas pro seu Google Drive ✓'); }catch(_){}
    return n;
  }catch(_){ return 0; }
  finally{ _sincRodando=false; }
};
/* conexão silenciosa do Drive (só ADM completo, só uma vez por sessão) */
let _silTentou=false;
function driveSilencioso(){ return new Promise((res,rej)=>{
  try{
    const cid=(typeof driveClientId==='function')?driveClientId():'';
    if(!cid) return rej(new Error('sem client id'));
    const go=()=>{ try{
      const tc=google.accounts.oauth2.initTokenClient({client_id:cid,scope:'https://www.googleapis.com/auth/drive.file',
        callback:r=>{ if(r&&r.access_token){ try{ _gisTok=r.access_token; _gisExp=Date.now()+((r.expires_in||3600)*1000); }catch(_){} res(true); } else rej(new Error('negado')); }});
      tc.requestAccessToken({prompt:''});
    }catch(e){ rej(e); } };
    if(window.google&&window.google.accounts&&window.google.accounts.oauth2) go();
    else if(typeof carregarGIS==='function') carregarGIS().then(go).catch(rej);
    else rej(new Error('sem GIS'));
  }catch(e){ rej(e); } }); }
if(!window.__sincAgendada){
  window.__sincAgendada=true;
  try{ document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') setTimeout(()=>{ try{ driveSinc(); }catch(_){} },1500); }); }catch(_){}
  setInterval(()=>{ try{ driveSinc(); }catch(_){} },5*60*1000);
  setTimeout(()=>{ try{
    const souAdm=(typeof ehAdminReal==='function')&&ehAdminReal(); /* v68: fundo não depende do modo de vista */
    const D=window.__drive;
    if(souAdm&&D&&D.ok()&&(!D.conectado()||false)&&!_silTentou){
      _silTentou=true;
      driveSilencioso().then(()=>{ try{ driveSinc(); }catch(_){} }).catch(()=>{});
    }else{ driveSinc(); }
  }catch(_){} },9000);
  /* ao tocar em "Conectar ao Drive", sincroniza na hora */
  try{ const _cd=window.conectarDrive;
    if(typeof _cd==='function'){ window.conectarDrive=function(){ const r=_cd.apply(this,arguments);
      Promise.resolve(r).then(ok=>{ if(ok) setTimeout(()=>{ try{ driveSinc(); }catch(_){} },900); }).catch(()=>{});
      return r; }; } }catch(_){}
}
/* primeira carga */
setTimeout(()=>{ try{ carregaPapeis(); carregaFin(); }catch(_){} },1500);
})();
