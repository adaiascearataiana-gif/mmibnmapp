/* ============================================================
   ⏳ TEMPORÁRIO — IMPORTADOR DE ACERVO → "MÚSICAS JÁ CANTADAS"
   + EDIÇÃO DOS REGISTROS DA TABELA (ADM)

   Criado sob comando do ADM. PARA REMOVER EM UM ÚNICO COMANDO:
     1) apagar este arquivo (temp-acervo.js)
     2) apagar no index.html a linha:
          <script src="temp-acervo.js"></script>
     3) (opcional) tirar './temp-acervo.js' da lista CORE do sw.js
   Nada fora destes pontos depende deste arquivo.

   O que faz:
     - Botão 📥 Importar JSON na tela "Músicas que já cantamos":
       lê acervo.json (do extrair) OU result.json (export do Telegram
       Desktop, flat ou chats.list) e lança tudo em musicas_cantadas
       com data (dd/mm/aaaa), dia da semana, evento "ACERVO TELEGRAM",
       música, artista, tom vazio, web vazia e ordem cronológica.
       Idempotente: registros já existentes (música+data) são pulados.
     - Botão ✏️ Editar registros: lista tudo e permite editar os campos
       (data, dia, evento, música, artista, tom, web) ou excluir.
   ============================================================ */
(function(){
'use strict';

const sem = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const e   = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const adm = () => { try{ return !!ehAdmin(); }catch(_){ return false; } };
const EVENTO_PADRAO = 'ACERVO TELEGRAM';
const DIAS = ['DOMINGO','SEGUNDA','TERÇA','QUARTA','QUINTA','SEXTA','SÁBADO'];
const pad2 = n => String(n).padStart(2,'0');

/* ---------------- conversões de data ---------------- */
function dataBR(iso){
  const p = String(iso||'').slice(0,10).split('-');
  return (p.length===3 && p[0]) ? p[2]+'/'+p[1]+'/'+p[0] : '';
}
function diaDe(iso){
  const p = String(iso||'').slice(0,10).split('-').map(Number);
  if(p.length!==3 || !p[0]) return '';
  return DIAS[new Date(p[0],p[1]-1,p[2]).getDay()];
}

/* ---------------- título/artista entre parênteses ---------------- */
function pareceArtista(s){
  const t = String(s||'').trim();
  if(!t || t.length>80) return false;
  if(t.length<=4 && /^[A-Ga-g][#b]?(m|min|aug|dim|sus|M)?\d*$/.test(t)) return false;
  const nao = ['ao vivo','live','versão','versao','acústica','acustica','instrumental','demo','remix','cover','feat','ft','participação','participacao','karaoke','cifra','tom'];
  const tl = t.toLowerCase();
  return !nao.some(p=> tl===p || tl.startsWith(p+' ') || tl.endsWith(' '+p));
}
function sepTituloArtista(nome){
  let titulo = String(nome||'').replace(/\s+/g,' ').trim();
  const original = titulo; let artista = null;
  for(let i=0;i<5;i++){
    const m = titulo.match(/\s*[（(]([^()（）]+)[)）]\s*$/);
    if(!m) break;
    const cand = m[1].replace(/\s+/g,' ').trim();
    titulo = titulo.slice(0,m.index).trim();
    if(pareceArtista(cand)){ artista = cand; break; }
  }
  if(!titulo) titulo = original;
  return {titulo, artista};
}

/* ---------------- leitura das mensagens ---------------- */
function textoDe(msg){
  const ent = msg && msg.text_entities;
  if(Array.isArray(ent) && ent.length) return ent.map(x=> typeof x==='string'? x : (x&&x.text)||'').join('');
  const t = msg && msg.text;
  if(typeof t==='string') return t;
  if(Array.isArray(t)) return t.map(x=> typeof x==='string'? x : (x&&x.text)||'').join('');
  return '';
}
function dataMsg(m){ return String((m&&m.date)||'').slice(0,10); }

/* primeira data do tópico: 1ª mensagem COM texto; senão, 1ª data qualquer */
function primeiraData(msgs){
  const ordenados = msgs.slice().sort((a,b)=> (Number(a.date_unixtime||0)-Number(b.date_unixtime||0)) || (Number(a.id||0)-Number(b.id||0)));
  let vazio = '';
  for(const m of ordenados){
    const d = dataMsg(m); if(!d) continue;
    if(!vazio) vazio = d;
    if(textoDe(m).trim()) return d;
  }
  return vazio;
}

/* ---- formato A: acervo.json (gerado pelo extrair.js) ---- */
function linhasDeAcervo(j){
  return (j.musicas||[]).map(m=>({
    titulo: String(m.titulo||'').trim(),
    artista: String(m.artista||'').trim(),
    iso: String(m.primeira_data||m.ultima_data||'').slice(0,10)
  })).filter(x=>x.titulo);
}

/* ---- formato B: result.json flat (topic_created + reply chain) ---- */
function linhasDeFlat(j){
  const msgs = j.messages||[];
  const byId = new Map(msgs.map(m=>[m.id,m]));
  const raizes = new Map();
  for(const m of msgs){ if(m.type==='service' && m.action==='topic_created' && m.title) raizes.set(m.id, String(m.title).trim()); }
  const raizDe = m => {
    let cur = m;
    for(let h=0; cur && cur.reply_to_message_id!=null && h<30; h++){
      const p = byId.get(cur.reply_to_message_id);
      if(!p) return null;
      if(raizes.has(p.id)) return p.id;
      cur = p;
    }
    return null;
  };
  const porTopico = new Map();
  for(const m of msgs){ if(m.type!=='message') continue; const r = raizDe(m); if(r==null) continue;
    if(!porTopico.has(r)) porTopico.set(r, []); porTopico.get(r).push(m); }
  const out = [];
  for(const [rid, titulo] of raizes){
    const msgsT = porTopico.get(rid)||[];
    out.push({titulo, iso: primeiraData(msgsT)});
  }
  return out;
}

/* ---- formato C: export Desktop com chats.list (1 chat = 1 tópico) ---- */
function linhasDeChats(j){
  const nomeGrupo = sem(j.name||'');
  const out = [];
  for(const chat of (j.chats&&j.chats.list)||[]){
    const nome = String(chat.name||'').trim();
    if(!nome) continue;
    if(nomeGrupo && sem(nome)===nomeGrupo) continue; // chat principal
    out.push({titulo: nome, iso: primeiraData(chat.messages||[])});
  }
  return out;
}

/* ---------------- montagem das linhas ---------------- */
function montarLinhas(json){
  let brutas;
  if(Array.isArray(json.musicas)) brutas = linhasDeAcervo(json);
  else if(Array.isArray(json.messages)) brutas = linhasDeFlat(json);
  else if(json.chats && Array.isArray(json.chats.list)) brutas = linhasDeChats(json);
  else throw new Error('JSON não reconhecido (esperado acervo.json ou result.json do Telegram)');

  /* separa artista se o título trouxe "(Autor)" */
  brutas = brutas.map(x=>{ const s = sepTituloArtista(x.titulo);
    return {titulo: s.titulo, artista: x.artista || s.artista || '', iso: x.iso||''}; })
    .filter(x=>x.titulo);

  /* ordena por data (sem data fica no fim) e deduplica por título normalizado */
  brutas.sort((a,b)=> (a.iso||'9999').localeCompare(b.iso||'9999'));
  const vistas = new Set();
  const out = [];
  for(const x of brutas){
    const k = sem(x.titulo);
    if(vistas.has(k)) continue;
    vistas.add(k);
    out.push({
      data: dataBR(x.iso), dia: diaDe(x.iso), evento: EVENTO_PADRAO,
      musica: x.titulo, artista: x.artista||'', tom: '', web: '',
      _iso: x.iso||''
    });
  }
  return out;
}

/* pula o que já existe na tabela (música + data) */
function filtraExistentes(linhas, existentes){
  const chaves = new Set((existentes||[]).map(r=> sem(r.musica)+'|'+String(r.data||'').trim()));
  const novas = [], dup = [];
  for(const l of linhas){ (chaves.has(sem(l.musica)+'|'+l.data) ? dup : novas).push(l); }
  return {novas, dup};
}

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
.tmp-ac-busca{width:100%;margin-bottom:8px;box-sizing:border-box}
.tmp-ac-prev{background:#eef6f2;border:1px solid #cfe6db;border-radius:10px;padding:10px 12px;font-size:13px;color:#234;margin:10px 0}
.tmp-ac-prev b{color:var(--verde-escuro)}
.tmp-ac-form .field{margin-top:8px}
.tmp-ac-form input,.tmp-ac-form textarea{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #ccd;border-radius:8px;font-size:14px}
.tmp-ac-dica{font-size:12.5px;color:#556;background:#eef6f2;border-radius:10px;padding:8px 10px;margin:6px 0}
`;
const st = document.createElement('style'); st.id='tmpAcervo'; st.textContent = css; document.head.appendChild(st);

/* ============================================================
   INJEÇÃO NA TELA "MÚSICAS QUE JÁ CANTAMOS" (ADM)
   ============================================================ */
const ANCORA = '<button id="fcStatsBtn" class="st-btn" onclick="toggleStatsCantadas()">📊 Ver estatísticas</button>';
const BARRA = '<div class="tmp-ac-bar">'+
  '<button class="mini-btn" onclick="tmpAcImporta()">📥 Importar JSON (acervo)</button>'+
  '<button class="mini-btn" onclick="tmpAcEditar()">✏️ Editar registros</button>'+
  '</div>';

if(typeof ROTAS!=='undefined' && ROTAS.cantadas){
  const _r = ROTAS.cantadas;
  ROTAS.cantadas = function(){
    const h = _r.apply(this, arguments);
    if(!adm() || typeof h!=='string') return h;
    if(h.indexOf('tmp-ac-bar')>=0) return h;
    if(h.indexOf(ANCORA)>=0) return h.replace(ANCORA, ANCORA+BARRA);
    return h.replace('<div class="page-ttl">🎶 Músicas que já cantamos</div>',
      '<div class="page-ttl">🎶 Músicas que já cantamos</div>'+BARRA);
  };
}

/* ============================================================
   IMPORTAÇÃO
   ============================================================ */
let _pend = null; // linhas prontas p/ importar

window.tmpAcImporta = function(){
  if(!adm()) return;
  _pend = null;
  abrirModal('<h3>📥 Importar acervo → Músicas já cantadas</h3>'+
    '<div class="tmp-ac-dica">Escolha o <b>acervo.json</b> (gerado pelo extrair) ou o <b>result.json</b> do Telegram. '+
    'Cada música entra com <b>data</b> (dia da primeira mensagem), <b>dia da semana</b>, evento <b>'+EVENTO_PADRAO+'</b>, '+
    'música e artista. O que já existir (mesma música + data) é pulado. Depois é só ajustar em ✏️ Editar registros.</div>'+
    '<div class="field"><label>Arquivo .json</label><input type="file" id="tmpAcFile" accept=".json,application/json" onchange="tmpAcLer(this)"></div>'+
    '<div id="tmpAcPrev" class="tmp-ac-prev">Nenhum arquivo lido ainda.</div>'+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn btn-primary" id="tmpAcGo" disabled onclick="tmpAcRun()">📥 Importar</button></div>');
};

window.tmpAcLer = async function(inp){
  const prev = document.getElementById('tmpAcPrev');
  const go = document.getElementById('tmpAcGo');
  const arq = inp.files && inp.files[0];
  if(!arq) return;
  let json;
  try{ json = JSON.parse(await arq.text()); }
  catch(err){ if(prev) prev.innerHTML='<b>❌ JSON inválido:</b> '+e(err.message); if(go) go.disabled=true; _pend=null; return; }
  let linhas;
  try{ linhas = montarLinhas(json); }
  catch(err){ if(prev) prev.innerHTML='<b>❌ '+e(err.message)+'</b>'; if(go) go.disabled=true; _pend=null; return; }
  let existentes = [];
  try{
    const {data} = await sb.from('musicas_cantadas').select('musica,data').limit(10000);
    existentes = data||[];
  }catch(_){}
  const {novas, dup} = filtraExistentes(linhas, existentes);
  _pend = novas;
  const datas = novas.map(l=>l._iso).filter(Boolean).sort();
  const per = datas.length? dataBR(datas[0])+' a '+dataBR(datas[datas.length-1]) : 'sem datas';
  if(prev) prev.innerHTML =
    '<b>'+e(arq.name)+'</b> reconhecido ✓<br>'+
    '🎵 <b>'+linhas.length+'</b> música(s) no arquivo · '+
    '🆕 <b>'+novas.length+'</b> nova(s) para importar · '+
    '♻️ '+dup.length+' já existente(s) pulada(s)<br>'+
    '📅 período: <b>'+per+'</b> · evento: <b>'+EVENTO_PADRAO+'</b>';
  if(go) go.disabled = !novas.length;
  if(!novas.length && prev) prev.innerHTML += '<br><i>Nada novo para importar.</i>';
};

window.tmpAcRun = async function(){
  if(!adm()) return;
  if(!_pend || !_pend.length) return toast('Nada para importar.');
  const bt = document.getElementById('tmpAcGo');
  if(bt){ bt.disabled = true; bt.textContent = 'Importando…'; }
  try{
    const ult = await sb.from('musicas_cantadas').select('ordem').order('ordem',{ascending:false}).limit(1);
    let base = (ult.data && ult.data[0] && typeof ult.data[0].ordem==='number') ? ult.data[0].ordem : 0;
    const linhas = _pend.map((l,i)=>({ data:l.data, dia:l.dia, evento:l.evento, musica:l.musica, artista:l.artista, tom:l.tom, web:l.web, ordem: base+i+1 }));
    for(let i=0;i<linhas.length;i+=100){
      const {error} = await sb.from('musicas_cantadas').insert(linhas.slice(i,i+100));
      if(error) throw error;
    }
    const n = linhas.length;
    _pend = null;
    try{ await cloudCantadas(); }catch(_){}
    fecharModal();
    toast('🎉 Importadas '+n+' música(s) em "Músicas já cantadas"!');
    go('cantadas');
  }catch(err){
    if(bt){ bt.disabled = false; bt.textContent = '📥 Importar'; }
    toast('Erro ao importar: '+(err.message||err));
  }
};

/* ============================================================
   EDIÇÃO DOS REGISTROS
   ============================================================ */
let _regs = [];

window.tmpAcEditar = async function(){
  if(!adm()) return;
  abrirModal('<h3>✏️ Editar registros</h3><div class="tmp-ac-dica">Toque em ✏️ para editar os campos de um registro ou 🗑 para excluí-lo.</div><div id="tmpAcBox">Carregando…</div>'+
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
  const nq = sem(q);
  const r = _regs.filter(x=> !nq || sem([x.musica,x.artista,x.evento,x.data,x.dia].join(' ')).includes(nq));
  box.innerHTML = '<input class="tmp-ac-busca" type="search" placeholder="🔎 Buscar registro…" value="'+e(q||'')+'" oninput="tmpAcLista(this.value)">'+
    '<div class="tmp-ac-lst">'+
    (r.length? r.map(x=>{
      const idx = _regs.indexOf(x);
      return '<div class="tmp-ac-r"><span class="tx"><b>'+e(x.musica||'(sem música)')+'</b>'+
        '<small>'+e(x.data||'sem data')+(x.dia?' · '+e(x.dia):'')+(x.evento?' · '+e(x.evento):'')+(x.artista?' · '+e(x.artista):'')+'</small></span>'+
        '<button onclick="tmpAcAbrir('+idx+')">✏️</button></div>';
    }).join('') : '<div class="tmp-ac-r"><span class="tx"><b>Nenhum registro.</b></span></div>')+
    '</div>';
  const inp = box.querySelector('.tmp-ac-busca');
  if(inp && q){ inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
};

window.tmpAcAbrir = function(i){
  const x = _regs[i]; if(!x) return;
  const box = document.getElementById('tmpAcBox'); if(!box) return;
  box.innerHTML = '<div class="tmp-ac-form">'+
    '<div class="field"><label>Música</label><input id="txMus" value="'+e(x.musica||'')+'"></div>'+
    '<div class="field"><label>Artista</label><input id="txArt" value="'+e(x.artista||'')+'"></div>'+
    '<div class="field"><label>Data (dd/mm/aaaa)</label><input id="txData" inputmode="numeric" placeholder="05/12/2026" value="'+e(x.data||'')+'"></div>'+
    '<div class="field"><label>Dia</label><input id="txDia" placeholder="SÁBADO" value="'+e(x.dia||'')+'"></div>'+
    '<div class="field"><label>Evento</label><input id="txEv" value="'+e(x.evento||'')+'"></div>'+
    '<div class="field"><label>Tom</label><input id="txTom" value="'+e(x.tom||'')+'"></div>'+
    '<div class="field"><label>Link (web/YouTube)</label><input id="txWeb" inputmode="url" value="'+e(x.web||'')+'"></div>'+
    '</div>'+
    '<div class="modal-acts" style="flex-wrap:wrap">'+
      '<button class="btn btn-dark" onclick="tmpAcLista(\'\')">← Voltar</button>'+
      '<button class="btn" style="border:1px solid #c0392b;color:#c0392b;background:#fff" onclick="tmpAcExcluir('+i+')">🗑 Excluir</button>'+
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
    tom: g('txTom').trim(), web: g('txWeb').trim()
  };
  if(!reg.musica) return toast('Informe a música.');
  try{
    const {error} = await sb.from('musicas_cantadas').update(reg).eq('id', x.id);
    if(error) throw error;
    Object.assign(x, reg);
    try{ await cloudCantadas(); }catch(_){}
    toast('Registro atualizado ✓');
    tmpAcLista('');
  }catch(err){ toast('Erro ao salvar: '+(err.message||err)); }
};

window.tmpAcExcluir = async function(i){
  const x = _regs[i]; if(!x || !x.id) return;
  if(!window.confirm('Excluir o registro "'+(x.musica||'')+'"'+(x.data?' de '+x.data:'')+'?')) return;
  try{
    const {error} = await sb.from('musicas_cantadas').delete().eq('id', x.id);
    if(error) throw error;
    _regs.splice(i,1);
    try{ await cloudCantadas(); }catch(_){}
    toast('Registro excluído.');
    tmpAcLista('');
  }catch(err){ toast('Erro ao excluir: '+(err.message||err)); }
};

/* ---------------- ganchos p/ teste automatizado ---------------- */
window.__tmpAcervo = { montarLinhas, filtraExistentes, dataBR, diaDe, sem, sepTituloArtista, EVENTO_PADRAO };

})();
