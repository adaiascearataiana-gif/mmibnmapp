/* ============================================================
   MM IBNM — Músicas que já cantamos: filtros (v0.6.0)
   Letra (A–Z), cantor/artista, culto, evento, mês, data e dia;
   ordenar por data ou A–Z; lista agrupada por culto.
============================================================ */
(function(){
'use strict';
const e = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sem = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const minus=/^(da|de|do|das|dos|e|em|na|no)$/i;
function tit(s){ return String(s||'').trim().toLowerCase().replace(/(^|[\s(\/-])(\S+)/g,(m,a,w)=>a+((a&&minus.test(w))?w:w.charAt(0).toUpperCase()+w.slice(1))).replace(/\bEbd\b/,'EBD').replace(/\bHca\b/,'HCA'); }

/* ---- leitura de cada registro ---- */
function dataDe(m){ const ds=String(m.d||'').match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g)||[]; const ult=ds[ds.length-1]; if(!ult) return null;
  const p=ult.split('/'); let a=p[2]?+p[2]:new Date().getFullYear(); if(a<100) a+=2000; const d=new Date(a,+p[1]-1,+p[0],12); return isNaN(d)?null:d; }
const fmt = d => d? String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear() : 'Sem data';
const chaveMes = d => d? d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0') : '';
function tituloLimpo(t){ return String(t||'').replace(/^\s*\d+\s*[-–.:]\s*/,'').trim(); }
function letra(m){ const c=sem(tituloLimpo(m.m)).replace(/^[^a-z0-9]+/,'').charAt(0).toUpperCase(); return /[A-Z]/.test(c)?c:'#'; }
function artista(m){ const a=String(m.a||'').trim(); return (!a||/^x+$/i.test(a)||/^-+$/.test(a))? 'Não informado' : a; }
function partes(ev){ const t=String(ev||'').replace(/\n/g,' ').trim(); const m=t.match(/^(.*?)\s*\((.+)\)\s*$/); return m? [m[1].trim(),m[2].trim()] : [t,'']; }
const ehCulto = s => /culto|ebd|escola b/i.test(s);
function culto(m){ const [a,b]=partes(m.e); if(!a&&!b) return 'Não informado'; if(ehCulto(a)) return tit(a); if(ehCulto(b)) return tit(b); return tit(a); }
function evento(m){ const [a,b]=partes(m.e); if(!a&&!b) return 'Não informado';
  if(ehCulto(a)){ if(b) return tit(b); if(/^ebd$|escola b/i.test(a)) return 'Culto regular'; const x=a.replace(/culto\s*(d[aeo]s?\s*)?/i,'').trim(); return /^(noite|manh[aã]|tarde|doutrina|ora[cç][aã]o)$/i.test(x)||!x? 'Culto regular' : tit(x); }
  return b && !ehCulto(b) ? tit(a)+' ('+b+')' : tit(a); }
let CACHE=null, CACHE_REF=null;
function dados(){
  if(CACHE && CACHE_REF===MUSICAS_CANTADAS) return CACHE;
  CACHE_REF=MUSICAS_CANTADAS;
  CACHE=(MUSICAS_CANTADAS||[]).map((m,i)=>{ const dt=dataDe(m); return {m,i,dt,data:fmt(dt),mes:chaveMes(dt),letra:letra(m),artista:artista(m),culto:culto(m),evento:evento(m),dia:tit(String(m.di||'').replace(/\n/g,' ')),busca:sem([m.m,m.a,m.e,m.d,m.di,m.t].join(' '))}; });
  return CACHE;
}

/* ---- estado dos filtros ---- */
const F={q:'',letra:'',artista:'',culto:'',evento:'',mes:'',data:'',dia:'',ord:'recentes'};
function filtrar(){
  const q=sem(F.q).split(/\s+/).filter(Boolean);
  let r=dados().filter(x=>(!F.letra||x.letra===F.letra)&&(!F.artista||x.artista===F.artista)&&(!F.culto||x.culto===F.culto)&&(!F.evento||x.evento===F.evento)&&(!F.mes||x.mes===F.mes)&&(!F.data||x.data===F.data)&&(!F.dia||x.dia===F.dia)&&q.every(t=>x.busca.includes(t)));
  const porData=(a,b)=>((b.dt?b.dt.getTime():0)-(a.dt?a.dt.getTime():0))||(a.i-b.i);
  if(F.ord==='recentes') r.sort(porData);
  else if(F.ord==='antigas') r.sort((a,b)=>-porData(a,b));
  else if(F.ord==='az') r.sort((a,b)=>tituloLimpo(a.m.m).localeCompare(tituloLimpo(b.m.m),'pt'));
  else if(F.ord==='mais'){ const cnt={}; dados().forEach(x=>{ const k=sem(tituloLimpo(x.m.m)); cnt[k]=(cnt[k]||0)+1; }); r.sort((a,b)=>(cnt[sem(tituloLimpo(b.m.m))]-cnt[sem(tituloLimpo(a.m.m))])||tituloLimpo(a.m.m).localeCompare(tituloLimpo(b.m.m),'pt')); }
  return r;
}
function opcoes(campo,valorAtual,rotulo,ordenar){
  const cnt={}; dados().forEach(x=>{ const v=x[campo]; if(v) cnt[v]=(cnt[v]||0)+1; });
  let ks=Object.keys(cnt); ks.sort(ordenar||((a,b)=>a.localeCompare(b,'pt')));
  return '<option value="">'+rotulo+'</option>'+ks.map(k=>'<option value="'+e(k)+'" '+(k===valorAtual?'selected':'')+'>'+e(campo==='mes'?nomeMes(k):k)+' ('+cnt[k]+')</option>').join('');
}
function nomeMes(k){ if(!k) return ''; const [a,m]=k.split('-'); return MESES[+m-1]+'/'+a; }
function item(x){
  const m=x.m;
  const idMus=(typeof acharMusicaApp==='function'&&acharMusicaApp(m.m))||(typeof acharCifraApp==='function'&&acharCifraApp(m.m));
  const hinoN=typeof acharHinoApp==='function'&&acharHinoApp(m.m);
  const mm2=idMus?DB.musicas.find(y=>y.id===idMus):null;
  const yt=m.w?'<a class="fc-yt" href="'+e(m.w)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">▶ YouTube</a>':'';
  const badge=(mm2&&mm2.cifra)?'<span class="fc-badge">cifra ✓</span>':(hinoN?'<span class="fc-badge">📖 hino</span>':(mm2?'<span class="fc-badge">sem cifra</span>':''));
  return '<div class="fc-item" data-n="'+e(m.m)+'" data-a="'+e(m.a||'')+'" onclick="abrirPorTitulo(this.dataset.n,this.dataset.a)" style="cursor:pointer"><div class="fc-main"><div class="fc-t">'+e(m.m)+'</div>'+
    '<div class="fc-a">'+e(x.artista)+(m.t&&!/^x+$/i.test(String(m.t).trim())?' · Tom '+e(m.t):'')+'</div>'+
    (F.ord==='recentes'||F.ord==='antigas'?'':'<div class="fc-meta">'+e(x.data)+' · '+e(x.culto)+(x.evento!=='Culto regular'?' · '+e(x.evento):'')+'</div>')+
    '</div><div class="fc-side">'+badge+yt+'</div></div>';
}
function listaHTML(){
  const r=filtrar();
  if(!r.length) return '<div class="empty"><div class="big">🎶</div>Nenhuma música com esses filtros.</div>';
  if(F.ord==='recentes'||F.ord==='antigas'){
    let h='', grupo='';
    r.forEach(x=>{ const g=x.data+'|'+x.m.e; if(g!==grupo){ grupo=g; h+='<div class="ct-grp"><b>📅 '+e(x.data)+'</b>'+(x.dia?' · '+e(x.dia):'')+'<span>'+e(x.culto)+(x.evento!=='Culto regular'?' · '+e(x.evento):'')+'</span></div>'; } h+=item(x); });
    return h;
  }
  return r.map(item).join('');
}
function ativos(){ return ['letra','artista','culto','evento','mes','data','dia'].filter(k=>F[k]).length+(F.q?1:0); }
function atualiza(){
  const l=document.getElementById('fcLista'); if(l) l.innerHTML=listaHTML();
  const c=document.getElementById('ctCont'); if(c) c.textContent=filtrar().length+' de '+dados().length+' registros';
  const b=document.getElementById('ctLimpa'); if(b) b.style.display=ativos()?'':'none';
}
window.ctFiltro=function(k,v){ F[k]=v; if(k==='mes') F.data=''; if(['letra','mes','ord'].includes(k)) { go('cantadas'); return; } atualiza(); };
window.ctBusca=function(v){ F.q=v; atualiza(); };
window.ctLimpar=function(){ Object.assign(F,{q:'',letra:'',artista:'',culto:'',evento:'',mes:'',data:'',dia:''}); go('cantadas'); };
window.ctFiltrosAbertos=function(){ const b=document.getElementById('ctMais'); if(!b) return; const ab=b.classList.toggle('show'); localStorage.setItem('ibnm_ct_abertos',ab?'1':''); };

if(typeof ROTAS!=='undefined'){
  ROTAS.cantadas=function(){
    const D=dados();
    const letras=[...new Set(D.map(x=>x.letra))]; const LS='ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');
    const datas=[...new Set(D.filter(x=>!F.mes||x.mes===F.mes).map(x=>x.data))].sort((a,b)=>{ const p=s=>s.split('/').reverse().join(''); return p(b).localeCompare(p(a)); });
    const aberto=localStorage.getItem('ibnm_ct_abertos')==='1'||ativos()>0;
    return '<div class="page"><div class="page-ttl">🎶 Músicas que já cantamos</div>'+
      '<button id="fcStatsBtn" class="st-btn" onclick="toggleStatsCantadas()">📊 Ver estatísticas</button><div id="fcStats" class="st-wrap" style="display:none"></div>'+
      '<div class="ct-bar"><input class="busca-cant" type="search" placeholder="🔎 Buscar música, artista, culto ou data…" value="'+e(F.q)+'" oninput="ctBusca(this.value)">'+
      '<div class="ct-az"><button class="'+(!F.letra?'on':'')+'" onclick="ctFiltro(\'letra\',\'\')">Todas</button>'+LS.map(l=>'<button class="'+(F.letra===l?'on':'')+(letras.includes(l)?'':' vz')+'" '+(letras.includes(l)?'':'disabled')+' onclick="ctFiltro(\'letra\',\''+l+'\')">'+l+'</button>').join('')+'</div>'+
      '<div class="ct-row"><button class="ct-tg" onclick="ctFiltrosAbertos()">⚙️ Filtros'+(ativos()?' ('+ativos()+')':'')+'</button>'+
      '<select onchange="ctFiltro(\'ord\',this.value)"><option value="recentes" '+(F.ord==='recentes'?'selected':'')+'>Mais recentes</option><option value="antigas" '+(F.ord==='antigas'?'selected':'')+'>Mais antigas</option><option value="az" '+(F.ord==='az'?'selected':'')+'>A–Z</option><option value="mais" '+(F.ord==='mais'?'selected':'')+'>Mais cantadas</option></select>'+
      '<button id="ctLimpa" class="ct-lp" style="'+(ativos()?'':'display:none')+'" onclick="ctLimpar()">✕ Limpar</button></div>'+
      '<div id="ctMais" class="ct-mais '+(aberto?'show':'')+'">'+
        '<label>🎤 Cantor / artista<select onchange="ctFiltro(\'artista\',this.value)">'+opcoes('artista',F.artista,'Todos')+'</select></label>'+
        '<label>⛪ Culto<select onchange="ctFiltro(\'culto\',this.value)">'+opcoes('culto',F.culto,'Todos')+'</select></label>'+
        '<label>🎪 Evento<select onchange="ctFiltro(\'evento\',this.value)">'+opcoes('evento',F.evento,'Todos')+'</select></label>'+
        '<label>📆 Mês<select onchange="ctFiltro(\'mes\',this.value)">'+opcoes('mes',F.mes,'Todos',(a,b)=>b.localeCompare(a))+'</select></label>'+
        '<label>📅 Data<select onchange="ctFiltro(\'data\',this.value)"><option value="">Todas</option>'+datas.map(d=>'<option '+(F.data===d?'selected':'')+'>'+e(d)+'</option>').join('')+'</select></label>'+
        '<label>🗓️ Dia da semana<select onchange="ctFiltro(\'dia\',this.value)">'+opcoes('dia',F.dia,'Todos')+'</select></label>'+
      '</div></div>'+
      '<div class="ct-cont" id="ctCont">'+filtrar().length+' de '+D.length+' registros</div>'+
      '<div id="fcLista" class="fc-wrap">'+listaHTML()+'</div></div>';
  };
}
/* as estatísticas antigas continuam usando a lista completa */
window.listaCantadasHTML=listaCantadasHTML=listaHTML;

const css=`
.ct-bar{position:sticky;top:var(--ibnm-topbar,64px);z-index:30;background:var(--cinza,#eef4f1);margin:0 -14px 6px;padding:8px 14px 6px;box-shadow:0 6px 10px -8px rgba(0,0,0,.25)}
.ct-bar .busca-cant{width:100%;margin-bottom:6px}
.ct-az{display:flex;gap:4px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
.ct-az::-webkit-scrollbar{display:none}
.ct-az button{flex:none;min-width:32px;height:32px;border-radius:8px;border:1px solid #cfdad4;background:#fff;font-weight:800;font-size:13px;color:var(--verde-escuro);padding:0 6px}
.ct-az button.on{background:var(--verde-med);border-color:var(--verde-med);color:#fff}
.ct-az button.vz{opacity:.3}
.ct-row{display:flex;gap:6px;margin-top:4px}
.ct-row select,.ct-tg,.ct-lp{height:38px;border-radius:10px;border:1px solid #cfdad4;background:#fff;font-weight:700;font-size:13px;color:var(--verde-escuro);padding:0 10px}
.ct-row select{flex:1;min-width:0}
.ct-lp{color:#b3261e}
.ct-mais{display:none;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.ct-mais.show{display:grid}
.ct-mais label{font-size:11.5px;font-weight:800;color:#5d7c6e;display:flex;flex-direction:column;gap:3px}
.ct-mais select{height:38px;border-radius:10px;border:1px solid #cfdad4;background:#fff;font-size:13px;color:var(--verde-escuro);padding:0 6px;min-width:0}
.ct-cont{font-size:12px;color:#7a8f86;margin:4px 0 8px}
.ct-grp{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;margin:14px 2px 6px;font-size:13.5px;color:var(--verde-escuro)}
.ct-grp span{font-size:12px;color:#6b8378;font-weight:700;background:#e3efe9;border-radius:10px;padding:2px 8px}
`;
const st=document.createElement('style'); st.id='ibnmCantadas'; st.textContent=css; document.head.appendChild(st);
})();
