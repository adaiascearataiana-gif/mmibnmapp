#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""LOTE 9 — Tela Músicas (abas/paginação/tema), tema no Histórico, WhatsApp.
Valida todos os alvos ANTES de gravar nada (mesmo padrão do lote8_ui.py)."""
import os, sys

B = os.path.expanduser('~/mmibnmapp-repo')
if not os.path.isdir(B):
    B = os.path.expanduser('~/mmibnmapp')
if not os.path.isdir(B):
    B = '/home/user/mmibnmapp'

def P(f): return os.path.join(B, f)

files = {}
def load(f):
    if f not in files:
        files[f] = open(P(f), encoding='utf-8').read()
    return files[f]

plan = []
def need(f, old, new, label, mode=1):
    s = load(f)
    if new and new in s:
        print(label, ': já aplicado')
        return
    n = s.count(old)
    if (mode == 'all' and n >= 1) or (mode == 1 and n == 1):
        plan.append((f, old, new, mode))
        return
    sys.exit('FALHA %s: achou %d - nada alterado' % (label, n))

# ---------------------------------------------------------------- index.html
# 1) estado dos filtros novos
need('index.html',
     "let paginaMusicas='musicas';",
     "let paginaMusicas='musicas';\nlet filtroOrigem='todos', filtroTema='', musLim=30;\n"
     "function escA(t){ return esc(t).replace(/\"/g,'&quot;').replace(/'/g,'&#39;'); }",
     'estado-filtros')

# 2) CSS das abas/chips/rodapé
need('index.html',
     ".tabs3 button.active{background:var(--verde-med);color:#fff}",
     """.tabs3 button.active{background:var(--verde-med);color:#fff}
.mt-tabs{display:flex;gap:6px;margin-bottom:10px}
.mt-tabs button{flex:1;min-width:0;padding:8px 4px;border-radius:10px;background:#fff;color:var(--verde-escuro);font-weight:700;font-size:12.5px;border:1px solid #e3eae5;cursor:pointer}
.mt-tabs button b{display:block;font-size:15px}
.mt-tabs button.active{background:var(--verde-med);color:#fff;border-color:transparent}
.mt-temas{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.mt-temas button{padding:7px 12px;border-radius:999px;background:#fff;border:1px solid #d9e2dd;font-size:12.5px;font-weight:700;color:#345;cursor:pointer}
.mt-temas button.active{background:#f39c12;color:#fff;border-color:transparent}
.mt-more{display:flex;justify-content:center;padding:10px 0 4px}
.mt-count{font-size:12.5px;color:#789}""", 'css-mt')

# 3) renderListaMusicas — abas Todos|Culto|Telegram + chips de tema
need('index.html',
"""function renderListaMusicas(soFav){
  const adm=ehAdmin(); const u=usuarioAtual();
  let musicas = DB.musicas.slice();
  if(soFav){ const fv=DB.favoritos[u.email]||[]; musicas=musicas.filter(m=>fv.includes(m.id)); }
  const letras='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const comLetra=new Set(musicas.map(m=>(m.titulo[0]||'#').toUpperCase()));
  const alpha = `<div class="alpha-bar"><button class="${filtroLetra==='TODAS'?'active':''}" onclick="setLetra('TODAS')">Tudo</button>`+
    letras.map(l=>`<button class="${filtroLetra===l?'active':''} ${comLetra.has(l)?'has':''}" onclick="setLetra('${l}')">${l}</button>`).join('')+`</div>`;
  return `<div class="page"><div class="page-ttl">${soFav?'\\u2B50 Favoritos':'\\uD83C\\uDFB5 Músicas'}</div>
    <input class="search-box" id="buscaMusica" placeholder="\\uD83D\\uDD0D Buscar música ou artista..." value="${esc(filtroBusca)}" oninput="buscarMusicas(this.value)">
    ${alpha}
    ${adm&&!soFav? `<button class="mini-btn" style="margin-bottom:12px" onclick="modalNovaMusica()">\\u2795 Adicionar música</button> <button class="mini-btn sec" style="margin-bottom:12px" onclick="modalTitulosParecidos()">🔍 Títulos parecidos</button>`:''}
    <div id="listaMusicas">${listaMusicasHTML(soFav)}</div></div>`;
}""",
"""function renderListaMusicas(soFav){
  const adm=ehAdmin(); const u=usuarioAtual();
  let musicas = DB.musicas.slice();
  if(soFav){ const fv=DB.favoritos[u.email]||[]; musicas=musicas.filter(m=>fv.includes(m.id)); }
  const cnt={todos:musicas.length,culto:0,telegram:0};
  musicas.forEach(m=>{ cnt[m.origem==='telegram'?'telegram':'culto']++; });
  const tabs=`<div class="mt-tabs">
    <button class="${filtroOrigem==='todos'?'active':''}" onclick="setOrigem('todos')">Todos <b>${cnt.todos}</b></button>
    <button class="${filtroOrigem==='culto'?'active':''}" onclick="setOrigem('culto')">Culto <b>${cnt.culto}</b></button>
    <button class="${filtroOrigem==='telegram'?'active':''}" onclick="setOrigem('telegram')">Telegram <b>${cnt.telegram}</b></button></div>`;
  const temas=[...new Set(musicas.map(m=>String(m.tema||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt'));
  const chips = temas.length? `<div class="mt-temas"><button class="${filtroTema?'':'active'}" onclick="setTema('')">🏷️ Todas</button>`+
    temas.map(t=>`<button class="${filtroTema===t?'active':''}" data-t="${escA(t)}" onclick="setTema(this.dataset.t)">${esc(t)}</button>`).join('')+`</div>` : '';
  const letras='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const comLetra=new Set(musicas.map(m=>(ntTit(m.titulo).charAt(0)||'#').toUpperCase()));
  const alpha = `<div class="alpha-bar"><button class="${filtroLetra==='TODAS'?'active':''}" onclick="setLetra('TODAS')">Tudo</button>`+
    letras.map(l=>`<button class="${filtroLetra===l?'active':''} ${comLetra.has(l)?'has':''}" onclick="setLetra('${l}')">${l}</button>`).join('')+`</div>`;
  return `<div class="page"><div class="page-ttl">${soFav?'\\u2B50 Favoritos':'\\uD83C\\uDFB5 Músicas'}</div>
    ${tabs}
    <input class="search-box" id="buscaMusica" placeholder="\\uD83D\\uDD0D Buscar por título, artista ou trecho da letra" value="${esc(filtroBusca)}" oninput="buscarMusicas(this.value)">
    ${chips}
    ${alpha}
    ${adm&&!soFav? `<button class="mini-btn" style="margin-bottom:12px" onclick="modalNovaMusica()">\\u2795 Adicionar música</button> <button class="mini-btn sec" style="margin-bottom:12px" onclick="modalTitulosParecidos()">🔍 Títulos parecidos</button>`:''}
    <div id="listaMusicas">${listaMusicasHTML(soFav)}</div></div>`;
}""", 'render-abas-chips')

# 4) listaMusicasHTML — origem + tema + busca sem acento + paginação
need('index.html',
"""function listaMusicasHTML(soFav){
  const u=usuarioAtual(); let musicas=DB.musicas.slice();
  if(soFav){ const fv=DB.favoritos[u.email]||[]; musicas=musicas.filter(m=>fv.includes(m.id)); }
  let vis=musicas.filter(m=>{
    const okL = filtroLetra==='TODAS' || (m.titulo[0]||'').toUpperCase()===filtroLetra;
    const okB = !filtroBusca || (m.titulo+' '+(m.artista||'')).toLowerCase().includes(filtroBusca.toLowerCase());
    return okL&&okB; });
  vis.sort((a,b)=>a.titulo.localeCompare(b.titulo,'pt'));
  return vis.length? vis.map(m=>`<div class="song-row" onclick="abrirMusica('${m.id}')">
      <div class="s-ic">\\uD83C\\uDFB5</div><div style="flex:1"><div class="s-nm">${esc(m.titulo)}</div><div class="s-ar">${esc(m.artista||'')}</div></div>
      <span class="star ${ehFav(m.id)?'on':''}" onclick="toggleFav('${m.id}',event)">\\u2605</span></div>`).join('')
    : `<div class="empty"><div class="big">${soFav?'\\u2B50':'\\uD83C\\uDFB5'}</div>${soFav?'Você ainda não tem favoritos. Toque na estrela de uma música.':'Nenhuma música encontrada.'}</div>`;
}
function buscarMusicas(val){ filtroBusca=val; const soFav=(typeof paginaMusicas!=='undefined' && paginaMusicas==='favoritos'); const el=document.getElementById('listaMusicas'); if(el) el.innerHTML=listaMusicasHTML(soFav); }
function setLetra(l){ filtroLetra=l; go(paginaMusicas); }""",
"""function listaMusicasHTML(soFav){
  const u=usuarioAtual(); let musicas=DB.musicas.slice();
  if(soFav){ const fv=DB.favoritos[u.email]||[]; musicas=musicas.filter(m=>fv.includes(m.id)); }
  musicas=musicas.filter(m=>{
    if(filtroOrigem!=='todos' && (m.origem||'culto')!==filtroOrigem) return false;
    if(filtroTema && String(m.tema||'').trim()!==filtroTema) return false;
    return true;
  });
  const q=ntTit(filtroBusca).trim().split(/\\s+/).filter(Boolean);
  let vis=musicas.filter(m=>{
    const pri=(ntTit(m.titulo).charAt(0)||'#').toUpperCase();
    const okL = filtroLetra==='TODAS' || pri===filtroLetra;
    const alvo=ntTit(m.titulo+' '+(m.artista||'')+' '+String(m.letra||'').slice(0,4000));
    return okL && q.every(t=>alvo.includes(t)); });
  vis.sort((a,b)=>a.titulo.localeCompare(b.titulo,'pt'));
  const total=vis.length, mostrados=vis.slice(0,musLim);
  const rows = mostrados.length? mostrados.map(m=>`<div class="song-row" onclick="abrirMusica('${m.id}')">
      <div class="s-ic">\\uD83C\\uDFB5</div><div style="flex:1;min-width:0"><div class="s-nm">${esc(m.titulo)}</div><div class="s-ar">${esc(m.artista||'')}${m.tema?' · 🏷️ '+esc(m.tema):''}</div></div>
      <span class="star ${ehFav(m.id)?'on':''}" onclick="toggleFav('${m.id}',event)">\\u2605</span></div>`).join('')
    : `<div class="empty"><div class="big">${soFav?'\\u2B50':'\\uD83C\\uDFB5'}</div>${soFav?'Você ainda não tem favoritos. Toque na estrela de uma música.':'Nenhuma música encontrada.'}</div>`;
  const rodape = total>musLim
    ? `<div class="mt-more"><button class="mini-btn sec" onclick="musMais()">▶ Ver mais (${total-musLim} restantes)</button></div>`
    : (total? `<div class="mt-more"><span class="mt-count">${total} música(s)</span></div>` : '');
  return rows+rodape;
}
function buscarMusicas(val){ filtroBusca=val; musLim=30; const soFav=(typeof paginaMusicas!=='undefined' && paginaMusicas==='favoritos'); const el=document.getElementById('listaMusicas'); if(el) el.innerHTML=listaMusicasHTML(soFav); }
function setLetra(l){ filtroLetra=l; musLim=30; go(paginaMusicas); }
function setOrigem(o){ filtroOrigem=o; musLim=30; go(paginaMusicas); }
function setTema(t){ filtroTema=t||''; musLim=30; go(paginaMusicas); }
function musMais(){ musLim+=30; const el=document.getElementById('listaMusicas'); if(el) el.innerHTML=listaMusicasHTML(paginaMusicas==='favoritos'); }""", 'lista-filtros-paginacao')

# 5) botão WhatsApp no detalhe da música + funções de compartilhar
need('index.html',
"""    ${adm?`<button class="mini-btn" style="margin:10px 0 2px" onclick="enviarPraPlaylist('${m.id}')">➕ Enviar para a playlist</button>`:''}
    ${corpo}</div>`;""",
"""    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 2px">
      ${adm?`<button class="mini-btn" style="margin:0" onclick="enviarPraPlaylist('${m.id}')">➕ Enviar para a playlist</button>`:''}
      <button class="mini-btn" style="margin:0" onclick="musWhats('${m.id}')">📱 WhatsApp</button></div>
    ${corpo}</div>`;""", 'btn-whatsapp-musica')

need('index.html',
"""function renderCifraView(c){ if(!c) return ''; if(/<[a-z!/][\\s\\S]*>/i.test(c)) return limparCifraHtml(c); return realcaCifra(c); }""",
"""function renderCifraView(c){ if(!c) return ''; if(/<[a-z!\\/][\\s\\S]*>/i.test(c)) return limparCifraHtml(c); return realcaCifra(c); }
function musWhatsTxt(id, aba){
  const m=DB.musicas.find(x=>x.id===id); if(!m) return '';
  const a=aba||abaAtual;
  let corpo='';
  if(a==='letra') corpo=String(m.letra||'').trim();
  else corpo=String(m.cifra||'').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/[ \\t]+\\n/g,'\\n').replace(/\\n{3,}/g,'\\n\\n').trim();
  if(!corpo) corpo='(sem '+(a==='letra'?'letra':'cifra')+' cadastrada ainda)';
  return '*'+m.titulo+'*'+(m.artista?' — '+m.artista:'')+'\\n\\n'+corpo+'\\n\\n— enviado do app Música Ministração';
}
window.musWhats=function(id, aba){ const t=musWhatsTxt(id, aba); if(!t) return; window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank'); };""", 'funcoes-whatsapp-musica')

# 6) campo Tema no editor + salvar com tolerância à coluna ausente
need('index.html',
"""      <div class="field"><label>Link do vídeo no YouTube</label><input id="edYt" value="${esc(m.youtube||'')}" placeholder="https://youtube.com/watch?v=..."></div>
    </div>""",
"""      <div class="field"><label>Link do vídeo no YouTube</label><input id="edYt" value="${esc(m.youtube||'')}" placeholder="https://youtube.com/watch?v=..."></div>
      <div class="field"><label>Coleção / tema</label><input id="edTema" list="temasDl" value="${escA(m.tema||'')}" placeholder="Ex.: Ceia, Páscoa, Batalha espiritual"><datalist id="temasDl"><option>Ceia</option><option>Páscoa</option><option>Natal</option><option>Ação de Graças</option><option>Batalha espiritual</option><option>Adoração</option><option>Consagração</option><option>Missões</option></datalist></div>
    </div>""", 'campo-tema-editor')

need('index.html',
"""async function salvarCifra(id,publicar){ const m=DB.musicas.find(x=>x.id===id); if(!m) return;
  m.titulo=$('#edTit').value.trim()||m.titulo; m.artista=$('#edArt').value.trim(); m.youtube=$('#edYt').value.trim();
  m.cifra=getCifraHtml(); m.letra=$('#edLetra').value;
  const jaPub=m.publicada; if(publicar) m.publicada=true;
  await sb.from('musicas').update({titulo:m.titulo,artista:m.artista,youtube:m.youtube,cifra:m.cifra,letra:m.letra,dados:{publicada:!!m.publicada}}).eq('id',id);
  if(publicar){ if(!jaPub) notificarTodos('\\uD83C\\uDFBC','Nova música disponível','\\"'+m.titulo+'\\" foi publicada no app. Confira a cifra, letra e audio!');
    toast('Publicado!'+((typeof APP_CFG!=='undefined'&&APP_CFG.notif_cfg&&APP_CFG.notif_cfg.auto_musica)?' Todos foram notificados.':' Avise pela Central de avisos quando quiser.')); _editando=false; abrirMusica(id,'cifra'); }
  else toast('Rascunho salvo.');
}""",
"""async function salvarCifra(id,publicar){ const m=DB.musicas.find(x=>x.id===id); if(!m) return;
  m.titulo=$('#edTit').value.trim()||m.titulo; m.artista=$('#edArt').value.trim(); m.youtube=$('#edYt').value.trim();
  m.tema=$('#edTema')?$('#edTema').value.trim():'';
  m.cifra=getCifraHtml(); m.letra=$('#edLetra').value;
  const jaPub=m.publicada; if(publicar) m.publicada=true;
  const upd={titulo:m.titulo,artista:m.artista,youtube:m.youtube,cifra:m.cifra,letra:m.letra,tema:m.tema||null,dados:{publicada:!!m.publicada}};
  let {error}=await sb.from('musicas').update(upd).eq('id',id);
  if(error && /tema/i.test(error.message||'')){ delete upd.tema;
    const r2=await sb.from('musicas').update(upd).eq('id',id); error=r2.error;
    if(!error) toast('Salvo! Para usar coleções, rode o SQL lote9_tema.sql no Editor.'); }
  else if(error){ toast('Erro ao salvar: '+error.message); }
  if(publicar){ if(!jaPub) notificarTodos('\\uD83C\\uDFBC','Nova música disponível','\\"'+m.titulo+'\\" foi publicada no app. Confira a cifra, letra e audio!');
    toast('Publicado!'+((typeof APP_CFG!=='undefined'&&APP_CFG.notif_cfg&&APP_CFG.notif_cfg.auto_musica)?' Todos foram notificados.':' Avise pela Central de avisos quando quiser.')); _editando=false; abrirMusica(id,'cifra'); }
  else if(!error) toast('Rascunho salvo.');
}""", 'salvar-tema')

# ---------------------------------------------------------------- melhorias.js
# 7) remover overrides de lista (agora implementados uma única vez no index.html)
s = load('melhorias.js')
ini = s.find('if(typeof listaMusicasHTML===\'function\'){')
fim = s.find('/* ---------- 6) AO VIVO')
if ini < 0:
    if 'window.listaMusicasHTML' not in s:
        print('overrides-lista: já removidos')
    else:
        sys.exit('FALHA overrides-lista: inicio')
elif fim < 0 or fim < ini:
    sys.exit('FALHA overrides-lista: fim')
else:
    plan.append(('melhorias.js', s[ini:fim],
                 '/* listaMusicasHTML/renderListaMusicas: movidos para o index.html (lote9 —\n'
                 '   abas Todos|Culto|Telegram, coleções/tema e paginação). */\n\n', 1))

# 8) ccWhats (WhatsApp do hino) ao lado do ccCompartilhar
need('melhorias.js',
"""  else if(navigator.clipboard){ navigator.clipboard.writeText(txt+'\\n'+url).then(()=>toast('Link copiado!'),()=>prompt('Copie o link:',url)); }
  else prompt('Copie o link:',url);
};""",
"""  else if(navigator.clipboard){ navigator.clipboard.writeText(txt+'\\n'+url).then(()=>toast('Link copiado!'),()=>prompt('Copie o link:',url)); }
  else prompt('Copie o link:',url);
};
window.ccWhats=function(n){
  const hh=(window.HINOS||[]).find(x=>x.n===+n); if(!hh) return;
  let corpo='';
  try{ corpo=(hh.partes||[]).map(p=>(p.tipo==='coro'?'\\n— Coro —\\n':'\\n')+(p.linhas||[]).join('\\n')).join('\\n'); }catch(e){ corpo=''; }
  if(!corpo) corpo=String(hh.letra||'');
  if(!corpo) return toast('Hino sem letra/cifra para compartilhar.');
  const txt='*Hino '+n+' — '+hh.titulo+'*'+(hh.tom?' (Tom '+hh.tom+')':'')+'\\n\\n'+corpo+'\\n\\n— Cantor Cristão · app Música Ministração';
  window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');
};""", 'cc-whatsapp')

# ---------------------------------------------------------------- cantor.js
need('cantor.js',
"""    '<button class="ib" onclick="ccCompartilhar('+n+')" aria-label="Compartilhar hino">↗</button>'+""",
"""    '<button class="ib" onclick="ccCompartilhar('+n+')" aria-label="Compartilhar hino">↗</button>'+
    '<button class="ib" onclick="ccWhats('+n+')" aria-label="Enviar no WhatsApp">📱</button>'+""", 'cantor-btn-whatsapp')

# ---------------------------------------------------------------- cantadas.js
need('cantadas.js',
     "const F={q:'',letra:'',artista:'',culto:'',evento:'',mes:'',data:'',dia:'',ord:'recentes'};",
     "const F={q:'',letra:'',artista:'',culto:'',evento:'',mes:'',data:'',dia:'',tema:'',ord:'recentes'};",
     'cantadas-F-tema')

need('cantadas.js',
"""function dados(){
  if(CACHE && CACHE_REF===MUSICAS_CANTADAS) return CACHE;
  CACHE_REF=MUSICAS_CANTADAS;
  CACHE=(MUSICAS_CANTADAS||[]).map((m,i)=>{ const dt=dataDe(m); return {m,i,dt,data:fmt(dt),mes:chaveMes(dt),letra:letra(m),artista:artista(m),culto:culto(m),evento:evento(m),dia:tit(String(m.di||'').replace(/\\n/g,' ')),busca:sem([m.m,m.a,m.e,m.d,m.di,m.t].join(' '))}; });
  return CACHE;
}""",
"""function temaDe(tit){
  try{
    const k=sem(tituloLimpo(tit));
    const arr=(typeof DB!=='undefined'&&DB.musicas)||[];
    for(let i=0;i<arr.length;i++){ const t=String(arr[i].tema||'').trim(); if(t && sem(tituloLimpo(arr[i].titulo))===k) return t; }
  }catch(e){}
  return '';
}
function dados(){
  if(CACHE && CACHE_REF===MUSICAS_CANTADAS) return CACHE;
  CACHE_REF=MUSICAS_CANTADAS;
  CACHE=(MUSICAS_CANTADAS||[]).map((m,i)=>{ const dt=dataDe(m); return {m,i,dt,data:fmt(dt),mes:chaveMes(dt),letra:letra(m),artista:artista(m),culto:culto(m),evento:evento(m),tema:temaDe(m.m),dia:tit(String(m.di||'').replace(/\\n/g,' ')),busca:sem([m.m,m.a,m.e,m.d,m.di,m.t].join(' '))}; });
  return CACHE;
}""", 'cantadas-tema-dados')

need('cantadas.js',
     "!F.dia||x.dia===F.dia)&&q.every(t=>x.busca.includes(t))",
     "!F.dia||x.dia===F.dia)&&(!F.tema||x.tema===F.tema)&&q.every(t=>x.busca.includes(t))",
     'cantadas-tema-filtrar')

need('cantadas.js',
     "function ativos(){ return ['letra','artista','culto','evento','mes','data','dia'].filter(k=>F[k]).length+(F.q?1:0); }",
     "function ativos(){ return ['letra','artista','culto','evento','mes','data','dia','tema'].filter(k=>F[k]).length+(F.q?1:0); }",
     'cantadas-tema-ativos')

need('cantadas.js',
     "window.ctLimpar=function(){ Object.assign(F,{q:'',letra:'',artista:'',culto:'',evento:'',mes:'',data:'',dia:''}); go('cantadas'); };",
     "window.ctLimpar=function(){ Object.assign(F,{q:'',letra:'',artista:'',culto:'',evento:'',mes:'',data:'',dia:'',tema:''}); go('cantadas'); };",
     'cantadas-tema-limpar')

need('cantadas.js',
"""        '<label>🗓️ Dia da semana<select onchange="ctFiltro(\\'dia\\',this.value)">'+opcoes('dia',F.dia,'Todos')+'</select></label>'+
      '</div></div>'+""",
"""        '<label>🗓️ Dia da semana<select onchange="ctFiltro(\\'dia\\',this.value)">'+opcoes('dia',F.dia,'Todos')+'</select></label>'+
        '<label>🏷️ Coleção / tema<select onchange="ctFiltro(\\'tema\\',this.value)">'+opcoes('tema',F.tema,'Todas')+'</select></label>'+
      '</div></div>'+""", 'cantadas-tema-select')

# ---------------------------------------------------------------- gravação
for f, old, new, mode in plan:
    files[f] = files[f].replace(old, new, -1 if mode == 'all' else 1)
for f, s in files.items():
    open(P(f), 'w', encoding='utf-8').write(s)
    print('gravado:', f)

# ---------------------------------------------------------------- asserts
chk = {f: open(P(f), encoding='utf-8').read() for f in files}
for token in ['filtroOrigem', 'setOrigem(', 'musMais(', 'mt-tabs', 'edTema',
              'musWhats(', 'wa.me/?text=', 'escA(', 'filtroTema']:
    assert token in chk['index.html'], 'falta em index.html: ' + token
assert 'window.listaMusicasHTML=listaMusicasHTML=function' not in chk['melhorias.js']
assert 'window.ccWhats=' in chk['melhorias.js']
assert "ccWhats('+n+')" in chk['cantor.js']
assert "tema:''" in chk['cantadas.js'] and "opcoes('tema'" in chk['cantadas.js']
assert 'temaDe' in chk['cantadas.js']
print('TODOS OS PATCHES LOTE9 OK')
