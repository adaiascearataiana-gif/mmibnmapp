/* ============================================================
   ⏳ TEMPORÁRIO — EDIÇÃO DOS REGISTROS DE "MÚSICAS JÁ CANTADAS"
   (importação REMOVIDA sob comando do ADM)

   PARA REMOVER EM UM ÚNICO COMANDO:
     1) apagar este arquivo (temp-acervo.js)
     2) apagar no index.html a linha:
          <script src="temp-acervo.js"></script>
     3) (opcional) tirar './temp-acervo.js' da lista CORE do sw.js
   Nada fora destes pontos depende deste arquivo.

   O que faz:
     - Botão ✏️ Editar registros na tela "Músicas que já cantamos":
       lista tudo com busca e permite editar os campos
       (música, artista, data, dia, evento, tom, web) ou excluir.
   ============================================================ */
(function(){
'use strict';

const sem = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const e   = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const adm = () => { try{ return !!ehAdmin(); }catch(_){ return false; } };

/* ---------------- CSS do temporário ---------------- */
const css = `
.tmp-ac-bar{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 4px}
.tmp-ac-lst{max-height:52vh;overflow:auto;border:1px solid #dde;border-radius:10px;background:#fff}
.tmp-ac-r{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid #eef1ef;font-size:13px;color:var(--verde-escuro)}
.tmp-ac-r:last-child{border-bottom:0}
.tmp-ac-r .tx{flex:1;min-width:0}
.tmp-ac-r .tx b{display:block;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tmp-ac-r .tx small{color:#789;font-size:11.5px}
.tmp-ac-r button{border:1px solid #c9ced6;background:#fff;border-radius:8px;height:32px;padding:0 10px;font-weight:800;color:var(--verde-escuro);cursor:pointer;flex:none}
.tmp-ac-r button.tmp-ac-del{border-color:#e6b0aa;color:#c0392b}
.tmp-ac-busca{width:100%;margin-bottom:8px;box-sizing:border-box}
.tmp-ac-dica{font-size:12.5px;color:#556;background:#eef6f2;border-radius:10px;padding:8px 10px;margin:6px 0}
.tmp-ac-form .field{margin-top:8px}
.tmp-ac-form input{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #ccd;border-radius:8px;font-size:14px}
`;
const st = document.createElement('style'); st.id='tmpAcervo'; st.textContent = css; document.head.appendChild(st);

/* ============================================================
   INJEÇÃO NA TELA "MÚSICAS QUE JÁ CANTAMOS" (ADM)
   ============================================================ */
const ANCORA = '<button id="fcStatsBtn" class="st-btn" onclick="toggleStatsCantadas()">📊 Ver estatísticas</button>';
const BARRA = '<div class="tmp-ac-bar">'+
  '<button class="mini-btn" onclick="tmpAcEditar()">✏️ Editar registros</button>'+
  '</div>';

if(typeof ROTAS!=='undefined' && ROTAS.cantadas){
  const _r = ROTAS.cantadas;
  ROTAS.cantadas = function(){
    const h = _r.apply(this, arguments);
    if(!adm() || typeof h!=='string') return h;
    if(h.indexOf('tmp-ac-bar')>=0) return h;
    if(h.indexOf(ANCORA)>=0) return h.replace(ANCORA, ANCORA+BARRA);
    return h.replace('<div class="page-ttl">🎶 Histórico de músicas</div>',
      '<div class="page-ttl">🎶 Histórico de músicas</div>'+BARRA);
  };
}

/* ============================================================
   EDIÇÃO DOS REGISTROS
   ============================================================ */
let _regs = [];
let _q = '', _lstSt = 0;

window.tmpAcEditar = async function(){
  if(!adm()) return;
  _q = ''; _lstSt = 0;
  abrirModal('<h3>✏️ Editar registros</h3><div class="tmp-ac-dica">Toque em ✏️ para editar os campos. Use 🗑 ao lado do lápis para excluir.</div><div id="tmpAcBox">Carregando…</div>'+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Fechar</button></div>');
  try{
    const {data, error} = await sb.from('musicas_cantadas').select('*').order('ordem',{ascending:true}).limit(10000);
    if(error) throw error;
    _regs = data||[];
  }catch(err){ _regs = []; const b=document.getElementById('tmpAcBox'); if(b) b.innerHTML='<b>Erro:</b> '+e(err.message||err); return; }
  tmpAcLista('');
};

window.tmpAcLista = function(q){
  const box = document.getElementById('tmpAcBox'); if(!box) return;
  const wy = window.scrollY;
  /* preserva a posição da lista ao re-renderizar (excluir/busca) */
  const prev = box.querySelector('.tmp-ac-lst');
  if(prev){ if((q||'')===_q) _lstSt = prev.scrollTop; else _lstSt = 0; }
  else if((q||'')!==_q) _lstSt = 0;
  _q = q||'';
  const nq = sem(_q);
  const r = _regs.filter(x=> !nq || sem([x.musica,x.artista,x.evento,x.data,x.dia].join(' ')).includes(nq));
  box.innerHTML = '<input class="tmp-ac-busca" type="search" placeholder="🔎 Buscar registro…" value="'+e(_q)+'" oninput="tmpAcLista(this.value)">'+
    '<div class="tmp-ac-lst">'+
    (r.length? r.map(x=>{
      const idx = _regs.indexOf(x);
      return '<div class="tmp-ac-r"><span class="tx"><b>'+e(x.musica||'(sem música)')+'</b>'+
        '<small>'+e(x.data||'sem data')+(x.dia?' · '+e(x.dia):'')+(x.evento?' · '+e(x.evento):'')+(x.artista?' · '+e(x.artista):'')+'</small></span>'+
        '<button onclick="tmpAcAbrir('+idx+')">✏️</button><button class="tmp-ac-del" onclick="tmpAcExcluir('+idx+')" aria-label="Excluir registro">🗑</button></div>';
    }).join('') : '<div class="tmp-ac-r"><span class="tx"><b>Nenhum registro.</b></span></div>')+
    '</div>';
  const lst = box.querySelector('.tmp-ac-lst'); if(lst) lst.scrollTop = _lstSt;
  const inp = box.querySelector('.tmp-ac-busca');
  if(inp && _q){ inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  window.scrollTo(0, wy);
};

function _cantorAuto(ddmm){ try{
  const m=String(ddmm||'').match(/(\d{1,2})\/(\d{1,2})/); if(!m) return '';
  const dd=String(m[1]).padStart(2,'0')+'/'+String(m[2]).padStart(2,'0');
  const E=(window.escalaAtiva&&window.escalaAtiva())||null; if(!E||!E.linhas) return '';
  const cols=E.colunas||[]; const cC=cols.findIndex(c=>/cantor|vocal|solista|voz/i.test(c)); if(cC<0) return '';
  const cD=cols.findIndex(c=>/^data/i.test(c)); if(cD<0) return '';
  for(const l of E.linhas){ const cel=l.celulas||{}; const dv=String(cel[cols[cD]]||'');
    const mm=dv.match(/(\d{1,2})\/(\d{1,2})/); if(!mm) continue;
    if(String(mm[1]).padStart(2,'0')+'/'+String(mm[2]).padStart(2,'0')===dd) return String(cel[cols[cC]]||'').trim(); }
}catch(e){} return ''; }
window.tmpAcAbrir = function(i){
  const x = _regs[i]; if(!x) return;
  const box = document.getElementById('tmpAcBox'); if(!box) return;
  const _l = box.querySelector('.tmp-ac-lst'); if(_l) _lstSt = _l.scrollTop;
  box.innerHTML = '<div class="tmp-ac-form">'+
    '<div class="field"><label>Música</label><input id="txMus" value="'+e(x.musica||'')+'"></div>'+
    '<div class="field"><label>Artista</label><input id="txArt" value="'+e(x.artista||'')+'"></div>'+
    '<div class="field"><label>Data (dd/mm/aaaa)</label><input id="txData" inputmode="numeric" placeholder="05/12/2026" value="'+e(x.data||'')+'"></div>'+
    '<div class="field"><label>Dia</label><input id="txDia" placeholder="SÁBADO" value="'+e(x.dia||'')+'"></div>'+
    '<div class="field"><label>Evento</label><input id="txEv" value="'+e(x.evento||'')+'"></div>'+
    '<div class="field"><label>Tom</label><input id="txTom" value="'+e(x.tom||'')+'"></div>'+
    '<div class="field"><label>Link (web/YouTube)</label><input id="txWeb" inputmode="url" value="'+e(x.web||'')+'"></div>'+
    '<div class="field"><label>Cantor(a) escalado(a)</label><input id="txCantor" value="'+e(x.cantor||'')+'" placeholder="'+e(_cantorAuto(x.data)||'nome de quem cantou')+'"></div>'+
    '</div>'+
    '<div class="modal-acts" style="flex-wrap:wrap">'+
      '<button class="btn btn-dark" onclick="tmpAcLista(_q)">← Voltar</button>'+
      '<button class="btn btn-primary" onclick="tmpAcSalvar('+i+')">💾 Salvar</button>'+
    '</div>';
};

window.tmpAcSalvar = async function(i){
  const x = _regs[i]; if(!x || !x.id) return;
  const g = id => (document.getElementById(id)||{}).value || '';
  const data = g('txData').trim();
  if(data && !/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(data)) return toast('Data no formato dd/mm/aaaa (ou vazio).');
  const reg = {
    musica: g('txMus').trim(), artista: g('txArt').trim(), data,
    dia: g('txDia').trim().toUpperCase(), evento: g('txEv').trim(),
    tom: g('txTom').trim(), web: g('txWeb').trim(), cantor: g('txCantor').trim()
  };
  if(!reg.musica) return toast('Informe a música.');
  try{
    let {error} = await sb.from('musicas_cantadas').update(reg).eq('id', x.id);
    if(error && /cantor/i.test(error.message||'')){                     /* coluna nova do SQL21 ainda não rodou */
      const {cantor:_c, ...semCol}=reg;
      ({error} = await sb.from('musicas_cantadas').update(semCol).eq('id', x.id));
      if(!error){ toast('Salvo — rode a atualização do SQL (seção21) para gravar o campo Cantor.'); }
    }
    if(error) throw error;
    Object.assign(x, reg);
    try{ cloudCantadas(); }catch(_){}
    toast('Registro atualizado ✓');
    tmpAcLista(_q);
  }catch(err){
    const msg=(err.message||err);
    if(/fetch|network|Failed/i.test(String(msg))){ filaEnvia('mcUpdate',[x.id,reg]); tmpAcLista(_q); return; }
    toast('Erro ao salvar: '+msg);
  }
};

window.tmpAcExcluir = async function(i){
  const x = _regs[i]; if(!x || !x.id) return;
  if(!window.confirm('Excluir o registro "'+(x.musica||'')+'"'+(x.data?' de '+x.data:'')+'?')) return;
  /* UI IMEDIATA: sai da lista na hora, sem esperar a rede */
  _regs.splice(i,1);
  tmpAcLista(_q);
  toast('Registro excluído.');
  /* servidor em segundo plano (não trava a tela) */
  try{
    const {error} = await sb.from('musicas_cantadas').delete().eq('id', x.id);
    if(error) throw error;
    try{ cloudCantadas(); }catch(_){}   /* re-sincroniza sem bloquear a UI */
  }catch(err){
    const msg=(err.message||err);
    if(/fetch|network|Failed/i.test(String(msg))){ filaEnvia('mcDelete',[x.id]); return; }  /* sobe quando voltar a internet */
    /* servidor recusou → devolve o registro e avisa */
    try{ _regs.splice(Math.min(i,_regs.length),0,x); tmpAcLista(_q); }catch(_){}
    toast('Erro ao excluir: '+msg);
  }
};

})();
