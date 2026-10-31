/* ============================================================
   MM IBNM — Escala em cartões (v0.4.1)
   Um cartão por culto: data em destaque, cada função com os
   nomes em "etiquetas" grandes; o seu nome em dourado.
   Filtros: Próximas · Todas · Só as minhas. Tabela continua
   disponível para quem preferir.
   Também corrige a "semana vigente" para datas como 7-Jun,
   2-Aug, 07/06, 7 de junho.
============================================================ */
(function(){
'use strict';
const e = s => String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sem = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

/* ---------------- datas ---------------- */
const MESES={jan:0,fev:1,feb:1,mar:2,abr:3,apr:3,mai:4,may:4,jun:5,jul:6,ago:7,aug:7,set:8,sep:8,out:9,oct:9,nov:10,dez:11,dec:11};
const MES_PT=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const DIAS_PT=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
function lerData(txt){
  const t=sem(txt); if(!t) return null;
  let m=t.match(/(\d{1,2})\s*(?:de\s+|[-\/. ])\s*([a-z]{3})[a-z]*\.?(?:\s*(?:de\s+|[-\/. ])\s*(\d{2,4}))?/);
  if(m && m[2] in MESES) return {d:+m[1],m:MESES[m[2]],a:m[3]?(+m[3]<100?2000+ +m[3]:+m[3]):null};
  m=t.match(/(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/);
  if(m){ let d=+m[1], mo=+m[2]; if(mo>12 && d<=12){ const x=d; d=mo; mo=x; } if(mo<1||mo>12||d<1||d>31) return null;
    return {d,m:mo-1,a:m[3]?(+m[3]<100?2000+ +m[3]:+m[3]):null}; }
  m=t.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return {d:+m[3],m:+m[2]-1,a:+m[1]};
  return null;
}
function acharColunas(cols){
  const ix=re=>cols.findIndex(c=>re.test(sem(c)));
  let data=ix(/^data\b|^dt$|^dia\s*\/|^date/); if(data<0) data=0;
  const dia=ix(/^dia$|^dia da semana|^semana$|^weekday/);
  const evento=ix(/evento|culto|programa|ocasiao/);
  return {data,dia,evento};
}
/* datas reais de cada linha (ano inferido em sequência; aceita virada de ano) */
function datasDasLinhas(E){
  const C=acharColunas(E.colunas); const col=E.colunas[C.data];
  const hoje=new Date(); let ano=hoje.getFullYear(), ultimo=null;
  const brutas=E.linhas.map(l=>{
    if(l.periodoInicio){ const x=new Date(l.periodoInicio); if(!isNaN(x)) return {d:x.getDate(),m:x.getMonth(),a:x.getFullYear()}; }
    return lerData(l.celulas[col]);
  });
  /* escolhe o ano inicial para a escala ficar perto de hoje */
  const prim=brutas.find(Boolean);
  if(prim && prim.a==null){ if(prim.m-hoje.getMonth()>6) ano--; else if(hoje.getMonth()-prim.m>6) ano++; }
  return brutas.map(b=>{
    if(!b) return null;
    let a=b.a!=null?b.a:ano;
    if(b.a==null && ultimo && (b.m<ultimo.getMonth()-6)) a=ultimo.getFullYear()+1;
    else if(b.a==null && ultimo) a=Math.max(a,ultimo.getFullYear());
    const dt=new Date(a,b.m,b.d,12); ultimo=dt; ano=a; return dt;
  });
}
function inicioDoDia(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
function segunda(d){ const x=inicioDoDia(d); const w=(x.getDay()+6)%7; x.setDate(x.getDate()-w); return x; }
/* linha "desta semana": a que cai entre segunda e domingo; senão a próxima data */
function indiceVigente(E){
  const ds=datasDasLinhas(E); const s=segunda(new Date()), f=new Date(s); f.setDate(s.getDate()+7);
  let i=ds.findIndex(d=>d && d>=s && d<f);
  if(i<0){ const hj=inicioDoDia(new Date()); i=ds.findIndex(d=>d && d>=hj); if(i>=0 && ds[i]-hj>14*864e5) i=-1; }
  return i;
}
/* usados pelos avisos: linha de uma semana (0 = esta, 1 = próxima) e dados da linha */
window.__escIdxSemana=function(off){
  try{ const E=escalaAtiva(); if(!E||!E.linhas||!E.linhas.length) return -1;
    if(!off) return linhaVigenteIdx();
    const ds=datasDasLinhas(E); const s=segunda(new Date()); s.setDate(s.getDate()+7*off); const f=new Date(s); f.setDate(s.getDate()+7);
    return ds.findIndex(d=>d && d>=s && d<f);
  }catch(_){ return -1; }
};
window.__escLinhaInfo=function(i){
  try{ const E=escalaAtiva(); const l=E.linhas[i]; if(!l) return null; const C=acharColunas(E.colunas); const dt=datasDasLinhas(E)[i];
    const ev=C.evento>=0? l.celulas[E.colunas[C.evento]] : '';
    return {dt, data: dt? String(dt.getDate()).padStart(2,'0')+'/'+String(dt.getMonth()+1).padStart(2,'0') : (l.celulas[E.colunas[C.data]]||''), dia: dt? DIAS_PT[dt.getDay()] : '', evento: titulo(ev||'Culto'), linha:l};
  }catch(_){ return null; }
};
/* corrige a semana vigente usada em todo o app (aviso, presença, "você está na escala") */
if(typeof linhaVigenteIdx==='function'){
  const _orig=linhaVigenteIdx;
  window.linhaVigenteIdx=linhaVigenteIdx=function(){
    try{ const E=escalaAtiva(); if(E&&E.linhas&&E.linhas.length){ const i=indiceVigente(E); if(i>=0) return i; } }catch(_){}
    return _orig.apply(this,arguments);
  };
}


/* ---------------- colunas: só até a última preenchida ---------------- */
const temValor=v=>String(v==null?'':v).trim()!=='';
const nomeGenerico=c=>/^(col\s*\d+|__empty(_\d+)?|coluna\s*\d+)?$/i.test(String(c||'').trim());
/* recebe a matriz da planilha (1ª linha = cabeçalho) e devolve {colunas, linhas} limpos */
function limparPlanilha(rows){
  const cab=(rows[0]||[]).map(c=>String(c==null?'':c).trim());
  const dados=rows.slice(1).filter(r=>(r||[]).some(temValor));
  const larg=Math.max(cab.length,...dados.map(r=>(r||[]).length),0);
  let ultima=-1;
  for(let j=0;j<larg;j++) if(dados.some(r=>temValor((r||[])[j]))) ultima=j;
  if(ultima<0) for(let j=0;j<cab.length;j++) if(temValor(cab[j])) ultima=j;
  const usar=[]; for(let j=0;j<=ultima;j++){ const temDado=dados.some(r=>temValor((r||[])[j])); if(temDado || temValor(cab[j])) usar.push(j); }
  const vistos={};
  const colunas=usar.map(j=>{ let n=cab[j]||('Coluna '+(j+1)); if(vistos[n]){ vistos[n]++; n=n+' ('+vistos[n]+')'; } else vistos[n]=1; return n; });
  const linhas=dados.map(r=>{ const cel={}; usar.forEach((j,k)=>cel[colunas[k]]=String((r||[])[j]==null?'':(r||[])[j]).trim()); return cel; });
  return {colunas,linhas};
}
/* escala já salva: esconde as colunas vazias do fim (e as sem nome e sem dado) */
function aparar(E){
  if(!E||!E.colunas||!E.colunas.length) return E;
  const cols=E.colunas, ls=E.linhas||[];
  let ultima=-1; cols.forEach((c,j)=>{ if(ls.some(l=>temValor((l.celulas||{})[c]))) ultima=j; });
  if(ultima<0) return E;
  const ok=cols.filter((c,j)=>j<=ultima && (ls.some(l=>temValor((l.celulas||{})[c])) || !nomeGenerico(c)));
  if(ok.length===cols.length) return E;
  return Object.assign({},E,{colunas:ok});
}
if(typeof escalaAtiva==='function'){
  const _ea=escalaAtiva;
  window.escalaAtiva=escalaAtiva=function(){ return aparar(_ea.apply(this,arguments)); };
}
/* importação (ADM): já grava só até a última coluna preenchida */
window.importarEscala=importarEscala=function(inp){
  const f=inp.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=async ev=>{ try{
    const wb=XLSX.read(new Uint8Array(ev.target.result),{type:'array',cellDates:true});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false,blankrows:false});
    if(!rows.length) return toast('Planilha vazia.');
    const {colunas,linhas:cels}=limparPlanilha(rows);
    if(!colunas.length||!cels.length) return toast('Não encontrei dados na planilha.');
    const linhas=cels.map(cel=>{ const per=detectaPeriodo(colunas,cel); return {periodoInicio:per.ini,periodoFim:per.fim,celulas:cel}; });
    DB.escala={colunas,linhas};
    if(typeof sb!=='undefined'&&sb){ const {error}=await sb.from('escala').update({colunas,linhas,updated_at:new Date().toISOString()}).eq('id',1); if(error) return toast('Erro ao salvar: '+error.message); }
    else if(typeof saveDB==='function') saveDB();
    try{ notificarImportacaoEscala(); }catch(_){}
    toast('Escala importada! '+linhas.length+' culto(s), '+colunas.length+' coluna(s).'); go('escala');
    if(inp) inp.value='';
  }catch(err){ toast('Erro ao ler o arquivo: '+err.message); } };
  r.readAsArrayBuffer(f);
};
window.__limparPlanilha=limparPlanilha;

/* ---------------- nomes ---------------- */
const VAZIO=/^(x+|-+|—|–|\.+|n\/?a|nenhum|ninguem|sem|a definir|definir|\?+)$/i;
function nomes(v){
  const t=String(v||'').trim(); if(!t || VAZIO.test(sem(t))) return [];
  return t.split(/\s*[\/,;+&|]\s*|\s+e\s+|\n/).map(x=>x.trim()).filter(x=>x && !VAZIO.test(sem(x)));
}
function titulo(c){ const t=String(c||'').trim().toLowerCase(); return t.replace(/(^|\s|\/)(\S+)/g,(m,a,w)=>a+((a&&/^(da|do|das|dos|de|e|em|na|no)$/.test(w))?w:w.charAt(0).toUpperCase()+w.slice(1))); }
function souEu(nome,u){ try{ return !!(u && nomeNaCelula(nome,u)); }catch(_){ return false; } }

/* ---------------- estilos ---------------- */
const css=`
.esc-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;position:sticky;top:var(--ibnm-topbar,64px);z-index:30;background:var(--cinza,#eef4f1);margin:0 -14px 12px;padding:8px 14px;box-shadow:0 6px 10px -8px rgba(0,0,0,.25)}
/* modo tabela: só a tabela rola (para cima/baixo e para os lados), com o cabeçalho fixo */
.esc-tabela .escala-wrap{max-height:calc(100vh - var(--ibnm-topbar,64px) - 76px);max-height:calc(100dvh - var(--ibnm-topbar,64px) - 76px);overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.esc-tabela table.escala th{position:sticky;top:0;z-index:2}
.esc-seg{display:flex;flex:1;min-width:230px;background:#fff;border:1px solid #d6e2dc;border-radius:12px;overflow:hidden}
.esc-seg button{flex:1;height:40px;border:0;background:none;font-weight:700;font-size:13px;color:var(--verde-escuro)}
.esc-seg button+button{border-left:1px solid #d6e2dc}
.esc-seg button.on{background:var(--verde-med);color:#fff}
.esc-modo{height:40px;border:1px solid #d6e2dc;background:#fff;border-radius:12px;padding:0 12px;font-weight:700;font-size:13px;color:var(--verde-escuro)}
.esc-card{background:#fff;border-radius:16px;box-shadow:0 3px 14px rgba(11,61,46,.10);margin:0 0 14px;overflow:hidden;border:1px solid #e3ece7}
.esc-card.vig{border:2px solid var(--dourado);box-shadow:0 6px 20px rgba(201,162,0,.25)}
.esc-card.passado{opacity:.6}
.esc-head{display:flex;align-items:center;gap:12px;padding:12px 14px;background:linear-gradient(120deg,#f2f8f5,#fff)}
.esc-card.vig .esc-head{background:linear-gradient(120deg,#fff6cf,#fffdf3)}
.esc-dt{flex:none;width:58px;border-radius:12px;background:var(--verde-escuro);color:#fff;text-align:center;padding:6px 0 7px;line-height:1}
.esc-card.vig .esc-dt{background:var(--dourado);color:#3a2f00}
.esc-dt b{display:block;font-size:24px;font-weight:900}
.esc-dt span{display:block;font-size:11.5px;font-weight:800;letter-spacing:.06em;margin-top:3px}
.esc-ev{flex:1;min-width:0}
.esc-ev .t{font-size:16px;font-weight:800;color:var(--verde-escuro);line-height:1.2}
.esc-ev .s{font-size:12.5px;color:#6b8378;margin-top:2px}
.esc-tag{flex:none;font-size:10.5px;font-weight:900;letter-spacing:.06em;border-radius:20px;padding:4px 9px;background:var(--dourado);color:#3a2f00}
.esc-tag.eu{background:var(--verde-med);color:#fff}
.esc-body{padding:2px 14px 8px}
.esc-row{display:flex;gap:10px;padding:10px 0;border-top:1px solid #edf2ef;align-items:flex-start}
.esc-role{flex:none;width:92px;font-size:12px;font-weight:800;color:#5d7c6e;padding-top:6px;line-height:1.25;word-break:break-word}
.esc-nomes{flex:1;display:flex;flex-wrap:wrap;gap:6px}
.esc-nome{display:inline-block;background:#e9f5ef;color:#0b3d2e;font-weight:700;font-size:15.5px;line-height:1.2;border-radius:20px;padding:6px 12px}
.esc-nome.eu{background:var(--dourado);color:#3a2f00;box-shadow:0 0 0 2px #fff,0 0 0 4px var(--dourado)}
.esc-vazio{font-size:13px;color:#9aa;font-style:italic;padding-top:6px}
.esc-vazia{text-align:center;color:#8a9;padding:30px 10px;font-size:14px}
.escala-wrap table.escala{font-size:14px}
.escala-wrap table.escala td{padding:11px 10px;vertical-align:top}
@media (max-width:360px){ .esc-role{width:76px} .esc-nome{font-size:14.5px;padding:5px 10px} }
`;
const st=document.createElement('style'); st.id='ibnmEscala'; st.textContent=css; document.head.appendChild(st);

/* ---------------- tela ---------------- */
const PREF='ibnm_escala_vis';
function pref(){ try{ return Object.assign({filtro:'proximas',modo:'cartoes'},JSON.parse(localStorage.getItem(PREF)||'{}')); }catch(_){ return {filtro:'proximas',modo:'cartoes'}; } }
function salva(p){ localStorage.setItem(PREF,JSON.stringify(p)); }
window.escalaFiltro=function(f){ const p=pref(); p.filtro=f; salva(p); go('escala'); };
window.escalaModo=function(){ const p=pref(); p.modo=p.modo==='tabela'?'cartoes':'tabela'; salva(p); go('escala'); };

function cartoes(E){
  const u=usuarioAtual(); const p=pref(); const C=acharColunas(E.colunas);
  const ds=datasDasLinhas(E); const vig=indiceVigente(E); const hj=inicioDoDia(new Date());
  const papeis=E.colunas.map((c,i)=>i).filter(i=>i!==C.data && i!==C.dia && i!==C.evento);
  let itens=E.linhas.map((l,i)=>({l,i,dt:ds[i]}));
  const minha=it=>papeis.some(k=>nomes(it.l.celulas[E.colunas[k]]).some(n=>souEu(n,u)));
  if(p.filtro==='proximas'){ const corte=vig>=0? vig : itens.findIndex(it=>it.dt && it.dt>=hj); itens = corte>=0? itens.slice(corte) : itens.filter(it=>!it.dt||it.dt>=hj); }
  if(p.filtro==='minhas') itens=itens.filter(minha);
  const seg='<div class="esc-seg">'+[['proximas','Próximas'],['todas','Todas'],['minhas','Minhas']].map(([k,t])=>'<button class="'+(p.filtro===k?'on':'')+'" onclick="escalaFiltro(\''+k+'\')">'+t+'</button>').join('')+'</div>';
  let h='<div class="esc-bar">'+seg+'<button class="esc-modo" onclick="escalaModo()">▦ Tabela</button></div>';
  if(!itens.length) return h+'<div class="esc-vazia">'+(p.filtro==='minhas'?'Você não aparece na escala por enquanto.':'Nenhum culto para mostrar.')+'</div>';
  h+=itens.map(({l,i,dt})=>{
    const ev=C.evento>=0? l.celulas[E.colunas[C.evento]] : '';
    const diaTxt=C.dia>=0? l.celulas[E.colunas[C.dia]] : (dt?DIAS_PT[dt.getDay()]:'');
    const dataTxt=l.celulas[E.colunas[C.data]]||'';
    const eu=minha({l});
    const passado=dt && dt<hj && i!==vig;
    const caixa=dt? '<div class="esc-dt"><b>'+dt.getDate()+'</b><span>'+MES_PT[dt.getMonth()].toUpperCase()+'</span></div>'
                  : '<div class="esc-dt"><b style="font-size:13px">'+e(dataTxt||'—')+'</b></div>';
    const linhas=papeis.map(k=>{ const c=E.colunas[k]; const ns=nomes(l.celulas[c]);
      return '<div class="esc-row"><div class="esc-role">'+e(titulo(c))+'</div><div class="esc-nomes">'+
        (ns.length? ns.map(n=>'<span class="esc-nome'+(souEu(n,u)?' eu':'')+'">'+e(window.capTitulo?capTitulo(n):n)+(souEu(n,u)?' · você':'')+'</span>').join('') : '<span class="esc-vazio">a definir</span>')+
        '</div></div>'; }).join('');
    return '<div class="esc-card'+(i===vig?' vig':'')+(passado?' passado':'')+'" '+(i===vig?'id="escVig"':'')+'>'+
      '<div class="esc-head">'+caixa+'<div class="esc-ev"><div class="t">'+e(titulo(ev)||'Culto')+'</div><div class="s">'+e(titulo(diaTxt))+'</div></div>'+
      (i===vig?'<span class="esc-tag">ESTA SEMANA</span>':(eu?'<span class="esc-tag eu">VOCÊ</span>':''))+'</div>'+
      '<div class="esc-body">'+linhas+'</div></div>';
  }).join('');
  return h;
}

if(typeof ROTAS!=='undefined' && ROTAS.escala){
  const _esc=ROTAS.escala;
  ROTAS.escala=function(){
    let html=_esc.apply(this,arguments);
    const p=pref(); const E=escalaAtiva();
    if(!E||!E.colunas||!E.colunas.length) return html;
    const a=html.indexOf('<div class="escala-wrap">'); if(a<0) return html;
    const b=html.indexOf('</table></div>',a); if(b<0) return html;
    if(p.modo==='tabela'){
      setTimeout(()=>{ const w=document.querySelector('.esc-tabela .escala-wrap'); if(w) scrollTo(0, w.getBoundingClientRect().top+scrollY-(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ibnm-topbar'))||64)-62); },80);
      const b2=html.indexOf('</table></div>',a)+'</table></div>'.length;
      return html.slice(0,a)+'<div class="esc-tabela"><div class="esc-bar"><span style="flex:1;font-size:13px;color:#5d7c6e;font-weight:700">Arraste a tabela para os lados</span><button class="esc-modo" onclick="escalaModo()">▤ Cartões</button></div>'+html.slice(a,b2)+'</div>'+html.slice(b2);
    }
    html=html.replace('A linha vigente da semana aparece destacada. Atualiza toda segunda-feira às 00:01.','O culto desta semana aparece em dourado; seu nome também.');
    const a2=html.indexOf('<div class="escala-wrap">');
    const b2=html.indexOf('</table></div>',a2)+'</table></div>'.length;
    if(p.filtro==='todas') setTimeout(()=>{ const v=document.getElementById('escVig'); if(v) scrollTo(0, v.getBoundingClientRect().top+scrollY-140); },60);
    return html.slice(0,a2)+cartoes(E)+html.slice(b2);
  };
}
})();
