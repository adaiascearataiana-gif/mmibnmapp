/* ============================================================
   MM IBNM — ENSAIOS (lista de ensaio + presença + cronômetro
   por música). Persiste em APP_CFG.ensaios (tabela config).
   v1.0 — 04/11/2026
============================================================ */
(function(){
'use strict';
const e = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const adm = () => { try{ return !!ehAdmin(); }catch(_){ return false; } };
const cfg = () => { try{ if(typeof APP_CFG==='undefined') return null; return APP_CFG; }catch(_){ return null; } };
const lista = () => { const c=cfg(); return (c&&Array.isArray(c.ensaios))? c.ensaios : []; };
let _sel=null;             /* ensaio aberto */
let _tm=null;              /* cronômetro: {eid, idx, t0, timer} */

const css=`
.es-lst{display:flex;flex-direction:column;gap:10px}
.es-card{background:#fff;border:1px solid #dde6e1;border-radius:14px;padding:12px 14px;cursor:pointer}
.es-card b{display:block;color:var(--verde-escuro);font-size:15.5px}
.es-card small{color:#789;font-size:12.5px}
.es-rows{background:#fff;border:1px solid #dde6e1;border-radius:14px;overflow:hidden}
.es-r{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid #eef2f0;font-size:14px;color:#234;cursor:pointer}
.es-r:last-child{border-bottom:0}
.es-r.on{background:#e9f7f1;font-weight:700;color:var(--verde-escuro)}
.es-r .tx{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.es-song{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid #eef2f0;font-size:14px}
.es-song:last-child{border-bottom:0}
.es-song .tx{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.es-tb{height:34px;min-width:64px;border-radius:9px;border:1px solid #cfdad4;background:#fff;font-weight:800;font-size:13px;color:var(--verde-escuro);padding:0 8px}
.es-tb.run{background:#c0392b;border-color:#c0392b;color:#fff}
.es-hd{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
.es-sub{font-size:12.5px;color:#7a8f86;margin:10px 0 6px;font-weight:800}
`;
const st=document.createElement('style'); st.id='ibnmEnsaio'; st.textContent=css; document.head.appendChild(st);

const fmtMs = ms => { const s=Math.floor(ms/1000); const m=Math.floor(s/60); const h=Math.floor(m/60);
  return (h? String(h).padStart(2,'0')+':' : '')+String(m%60).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); };
const dataBR = iso => { const p=String(iso||'').split('-'); return p.length>=3? p[2]+'/'+p[1]+'/'+p[0] : '—'; };

function salvar(){ try{ const c=cfg(); if(!c) return; salvarConfig('ensaios', c.ensaios||[]); }catch(_){} }
function achar(id){ return lista().find(x=>x.id===id)||null; }

/* ---------------- parar cronômetro ---------------- */
function tmPara(salva){
  if(!_tm) return;
  clearInterval(_tm.timer);
  try{ const en=(_tm.eid==='novo')?null:achar(_tm.eid);
    if(en&&en.musicas&&en.musicas[_tm.idx]){ en.musicas[_tm.idx].ms=(en.musicas[_tm.idx].ms||0)+(Date.now()-_tm.t0); if(salva!==false) salvar(); } }catch(_){}
  _tm=null;
}
window.esTimer=function(eid,idx){
  if(_tm && _tm.eid===eid && _tm.idx===idx){ tmPara(true); window.esRender&&window.esRender(); return; }
  tmPara(false);
  const en=achar(eid); if(!en||!en.musicas||!en.musicas[idx]) return;
  _tm={eid,idx,t0:Date.now(),timer:setInterval(()=>{
    const el=document.getElementById('esTick_'+idx); if(el) el.textContent=fmtMs((en.musicas[idx].ms||0)+(Date.now()-_tm.t0));
  },500)};
  window.esRender&&window.esRender();
};

/* ---------------- ações ---------------- */
window.esNovo=function(){
  abrirModal('<h3>🎼 Novo ensaio</h3>'+
    '<div class="field"><label>Data</label><input type="date" id="esData" value="'+new Date().toISOString().slice(0,10)+'"></div>'+
    '<div class="field"><label>Nome (opcional)</label><input id="esNome" placeholder="Ensaio dos louvores, secção de cordas…"></div>'+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn btn-primary" onclick="esCriar()">Criar</button></div>');
};
window.esCriar=function(){
  const data=(document.getElementById('esData')||{}).value||new Date().toISOString().slice(0,10);
  const nome=((document.getElementById('esNome')||{}).value||'').trim();
  const id=(crypto&&crypto.randomUUID)? crypto.randomUUID() : ('e'+Date.now());
  const c=cfg(); if(!c) return toast('Abra de novo o app.');
  if(!Array.isArray(c.ensaios)) c.ensaios=[];
  c.ensaios.unshift({id,data,nome,presentes:[],musicas:[],criado:new Date().toISOString()});
  salvar(); fecharModal(); _sel=id; go('ensaios');
};
window.esAbrir=function(id){ _sel=id; tmPara(false); go('ensaios'); };
window.esVoltar=function(){ tmPara(false); _sel=null; go('ensaios'); };
window.esExcluir=function(id){ if(!adm()) return;
  if(!confirm('Excluir este ensaio e tudo que foi anotado nele?')) return;
  const c=cfg(); if(!c) return; c.ensaios=(c.ensaios||[]).filter(x=>x.id!==id);
  salvar(); _sel=null; go('ensaios'); toast('Ensaio excluído.');
};
window.esToggleP=function(email){ if(!adm()) return;
  const en=achar(_sel); if(!en) return;
  en.presentes=en.presentes||[];
  const i=en.presentes.indexOf(email);
  if(i>=0) en.presentes.splice(i,1); else en.presentes.push(email);
  salvar(); window.esRender();
};
window.esAddMusica=function(){
  const en=achar(_sel); if(!en) return;
  const inp=document.getElementById('esNewMus'); const v=((inp||{}).value||'').trim();
  if(!v) return;
  en.musicas=en.musicas||[]; en.musicas.push({n:v,ms:0});
  salvar(); window.esRender();
  setTimeout(()=>{ const i=document.getElementById('esNewMus'); if(i){ i.focus(); } },80);
};
window.esDelMusica=function(idx){ const en=achar(_sel); if(!en||!adm()) return;
  if(_tm&&_tm.eid===_sel&&_tm.idx===idx) tmPara(false);
  en.musicas.splice(idx,1); salvar(); window.esRender(); };

/* ---------------- render ---------------- */
window.esRender=function(){ const alvo=document.getElementById('content'); if(alvo) alvo.innerHTML=ROTAS.ensaios(); };

if(typeof ROTAS!=='undefined'){
  ROTAS.ensaios=function(){
    if(_sel){ const en=achar(_sel); if(!en){ _sel=null; } else return _detalhe(en); }
    const L=lista().slice().sort((a,b)=>String(b.data||'').localeCompare(String(a.data||'')));
    const membros=(typeof DB!=='undefined'&&DB.usuarios)||[];
    let h='<div class="page"><div class="page-ttl">🎼 Ensaios</div>';
    h+='<div class="es-hd"><button class="mini-btn" style="margin:0" onclick="esNovo()">➕ Novo ensaio</button>'+
       '<button class="mini-btn sec" style="margin:0" onclick="abrirFerramentas()">🎛 Metrônomo / afinador</button></div>';
    if(!L.length) h+='<div class="empty"><div class="big">🎼</div>Nenhum ensaio ainda. Clique em <b>Novo ensaio</b> para começar a lista.</div>';
    else h+='<div class="es-lst">'+L.map(x=>{
      const pres=(x.presentes||[]).length, mus=(x.musicas||[]).length;
      return '<div class="es-card" onclick="esAbrir(\''+x.id+'\')"><b>'+e(x.nome||'Ensaio')+'</b>'+
        '<small>📅 '+dataBR(x.data)+' · ✅ '+pres+'/'+membros.length+' presentes · 🎵 '+mus+' música(s)</small></div>';
    }).join('')+'</div>';
    return h+'</div>';
  };
}

function _detalhe(en){
  const membros=((typeof DB!=='undefined'&&DB.usuarios)||[]).slice().sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt'));
  const pres=en.presentes||[];
  const ehAdm=adm();
  let h='<div class="page"><div class="page-ttl">🎼 '+e(en.nome||'Ensaio')+'</div>';
  h+='<div class="es-hd"><button class="mini-btn" style="margin:0" onclick="esVoltar()">← Ensaios</button>'+
     '<span style="font-size:13.5px;color:#789">📅 '+dataBR(en.data)+'</span>'+
     (ehAdm?'<button class="mini-btn sec" style="margin:0" onclick="esExcluir(\''+en.id+'\')">🗑 Excluir</button>':'')+'</div>';
  /* presenças */
  if(ehAdm){
    h+='<div class="es-sub">✅ Presença (toque para marcar) · '+pres.length+'/'+membros.length+'</div>';
    h+= membros.length? '<div class="es-rows">'+membros.map(u=>{
        const on=pres.indexOf(u.email)>=0;
        return '<div class="es-r '+(on?'on':'')+'" onclick="esToggleP(\''+e(u.email)+'\')"><span class="tx">'+e(u.nome||u.email)+'</span><b>'+(on?'✔':'')+'</b></div>';
      }).join('')+'</div>' : '<div class="empty">Sem membros carregados.</div>';
  } else {
    h+='<div class="es-sub">✅ Presentes: '+pres.length+'/'+membros.length+'</div>';
  }
  /* músicas + cronômetro */
  h+='<div class="es-sub">🎵 Músicas do ensaio'+(_tm&&_tm.eid===en.id?' · ⏱ cronômetro ativo':'')+'</div>';
  const mus=en.musicas||[];
  h+= mus.length? '<div class="es-rows">'+mus.map((m,i)=>{
      const run=_tm&&_tm.eid===en.id&&_tm.idx===i;
      const total=(m.ms||0)+(run?Date.now()-_tm.t0:0);
      return '<div class="es-song"><span class="tx">'+(i+1)+'. '+e(m.n)+'</span>'+
        '<b id="esTick_'+i+'" style="font-variant-numeric:tabular-nums;font-size:13px;color:#567">'+fmtMs(total)+'</b>'+
        '<button class="es-tb '+(run?'run':'')+'" onclick="esTimer(\''+en.id+'\','+i+')">'+(run?'■ Parar':'▶ Tempo')+'</button>'+
        (ehAdm?'<button class="es-tb" onclick="esDelMusica('+i+')" aria-label="Remover">🗑</button>':'')+'</div>';
    }).join('')+'</div>' : '<div class="empty" style="padding:14px">Nenhuma música na lista ainda.</div>';
  if(ehAdm){
    h+='<div class="es-hd" style="margin-top:10px"><input id="esNewMus" class="busca-cant" style="flex:1;min-width:180px" placeholder="Nome da próxima música…" onkeydown="if(event.key===\'Enter\')esAddMusica()">'+
       '<button class="mini-btn" style="margin:0" onclick="esAddMusica()">➕ Add</button></div>';
    h+='<p style="font-size:12.5px;color:#789">▶ Tempo mede cada música; a soma fica salva no ensaio. O 🎩 metrônomo está no botão lá em cima.</p>';
  }
  return h+'</div>';
}
})();
