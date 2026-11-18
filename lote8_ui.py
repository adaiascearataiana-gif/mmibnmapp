# Lote8: UI/mobile + histórico (roda na raiz do repo; valida antes de escrever)
import os, sys
B = os.path.expanduser('~/mmibnmapp-repo' if os.path.isdir(os.path.expanduser('~/mmibnmapp-repo')) else 'mmibnmapp')
def P(f): return os.path.join(B, f)
files = {}
def load(f):
    if f not in files: files[f] = open(P(f), encoding='utf-8').read()
    return files[f]
plan = []
def need(f, old, new, label, mode=1):
    s = load(f)
    if new and new in s: print(label, ': já aplicado'); return
    n = s.count(old)
    if (mode=='all' and n>=1) or (mode==1 and n==1): plan.append((f, old, new, mode)); return
    sys.exit('FALHA %s: achou %d - nada alterado' % (label, n))

# ---------- index.html ----------
need('index.html',
"""function go(page,arg){ toggleMenu(false); window.scrollTo(0,0);
  const u=usuarioAtual(); if(!u) return;
  if(page==='ajuda'){ telaBoasVindas(false); return; }
  const fn = ROTAS[page]; $('#content').innerHTML = fn? fn(arg) : '<div class="empty">Página não encontrada.</div>';
  atualizaBadge();
}""",
"""let _pagAtual=null; const _scrollMem={};
function navSave(){ if(_pagAtual!=null) _scrollMem[_pagAtual]=window.scrollY; }
function go(page,arg){ toggleMenu(false); navSave();
  const u=usuarioAtual(); if(!u) return;
  if(page==='ajuda'){ telaBoasVindas(false); return; }
  const fn = ROTAS[page]; $('#content').innerHTML = fn? fn(arg) : '<div class="empty">Página não encontrada.</div>';
  atualizaBadge();
  _pagAtual=page;
  window.scrollTo(0, _scrollMem[page]||0);
}""", 'go-scroll')

need('index.html',
"function abrirMusica(id,aba){ musicaAberta=id; abaAtual=aba||'cifra';",
"function abrirMusica(id,aba){ if(typeof navSave==='function') navSave(); if(typeof _pagAtual!=='undefined') _pagAtual='musica'; musicaAberta=id; abaAtual=aba||'cifra';", 'abrirMusica-scroll')

need('index.html',
"""function abrirModal(html){ $('#modalBox').innerHTML=html; $('#modalBg').classList.add('show'); }
function fecharModal(){ $('#modalBg').classList.remove('show'); }""",
"""function abrirModal(html){ $('#modalBox').innerHTML=html; $('#modalBox').classList.remove('modal-part'); $('#modalBg').classList.remove('mp'); $('#modalBg').classList.add('show'); }
function fecharModal(){ $('#modalBg').classList.remove('show'); $('#modalBox').classList.remove('modal-part'); $('#modalBg').classList.remove('mp'); }
document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ const bg=document.getElementById('modalBg'); if(bg&&bg.classList.contains('show')){ e.preventDefault(); fecharModal(); } } });""", 'esc-modal')

need('index.html',
"""'<p class="part-dica">Toque na imagem para ampliar (arraste para ver o resto da página).</p>'+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Fechar</button></div>');
}""",
"""'<p class="part-dica">Toque na imagem para ampliar (arraste para ver o resto da página).</p>'+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Fechar</button></div>');
  document.getElementById('modalBox').classList.add('modal-part');
  document.getElementById('modalBg').classList.add('mp');
}""", 'part-fullscreen')

need('index.html',
".zoom-bar .zh{font-size:12px;color:#789;font-weight:600}",
""".zoom-bar .zh{font-size:12px;color:#789;font-weight:600}
/* ---- Mobile: segurança de layout + partitura em tela cheia ---- */
@media (max-width:640px){
  .song-head .t,.song-head .a,.page-ttl,.s-nm{overflow-wrap:anywhere}
  .info-row{flex-wrap:wrap;gap:4px}
  .tabs3{gap:6px}
  .tabs3 button{min-width:0;font-size:13px;padding:10px 6px}
  .modal-bg.mp{padding:0}
  .modal-bg.mp .modal{max-width:none;width:100%;height:100%;max-height:100%;border-radius:0;padding:10px 10px 14px;display:flex;flex-direction:column}
  .modal-bg.mp .modal .part-box{max-height:none;flex:1;min-height:0;border-radius:0}
  .modal-bg.mp .modal .part-dica{display:none}
  .modal-bg.mp .modal .modal-acts{position:sticky;bottom:0;background:#fff;padding-top:8px}
  .modal-bg.mp .modal h3{position:sticky;top:-10px;background:#fff;margin:-10px -10px 8px;padding:12px 10px 6px;z-index:2}
}""", 'css-mobile')

need('index.html', "nm:'Músicas que já cantamos'", "nm:'Histórico de músicas'", 'menu-rename')

# ---------- cantor.js ----------
need('cantor.js',
'.cc-tools .tog[aria-pressed="true"]{background:var(--verde-med);color:#fff}',
""".cc-tools .tog[aria-pressed="true"]{background:var(--verde-med);color:#fff}
.cc-tools .tog.cc-part{margin:0;position:static;height:38px;box-sizing:border-box;white-space:nowrap}""", 'partituras-align')

need('cantor.js',
'.cc-part.estrofe{padding-left:0}',
""".cc-part.estrofe{padding-left:0}
.cc-letbaix{margin:18px 0 6px;text-align:center}
.cc-letbaix .cc-song{margin-top:12px;text-align:left;background:#fff;border:1px solid #e3eae5;border-radius:10px;padding:10px 12px}""", 'css-letbaix')

need('cantor.js',
"""  const c=document.getElementById('content');
  if(c){ c.innerHTML='<div class="page cc-page">'+html+'</div>'; }""",
"""  const c=document.getElementById('content');
  const _lb=(h.letra&&!modoLetra)? '<div class="cc-letbaix"><button class="tog'+(_ccLetra?' on':'')+'" onclick="cantorLetra('+n+')">\\uD83D\\uDCDC '+(_ccLetra?'OCULTAR LETRA':'LETRA DO HINO')+'</button>'+(_ccLetra? '<div class="cc-song'+(editMode?' editing':'')+'" style="--cc-fs:'+prefs.fs+'px">'+h.letra.split('\\n').map(function(l){return '<p class="ln">'+esc(l)+'</p>';}).join('')+'</div>' : '')+'</div>' : '';
  if(c){ c.innerHTML='<div class="page cc-page">'+html+_lb+'</div>'; }""", 'botao-letra-final')

need('cantor.js',
"window.cantorAbrir=function(n){ editMode=false; stopScroll(); abrirHino(+n); };",
"""let _ccLetra=false;
window.cantorLetra=function(n){ _ccLetra=!_ccLetra; abrirHino(+n,true); };
window.cantorAbrir=function(n){ if(typeof navSave==='function') navSave(); if(typeof _pagAtual!=='undefined') _pagAtual='hino'; editMode=false; stopScroll(); abrirHino(+n); };""", 'cantor-letra+scroll')

# ---------- melhorias.js ----------
s = load('melhorias.js')
ini = s.find('/* ---- atalho na aba Cifra para o ADM ---- */')
if ini < 0:
    if 'Áudios (' not in s: print('remocao audios: já aplicado')
    else: sys.exit('FALHA remocao-audios: marcador não encontrado')
else:
    fim = s.find('return h;\n};', ini)
    if fim < 0: sys.exit('FALHA remocao-audios: fim não encontrado')
    fim += len('return h;\n};')
    plan.append(('melhorias.js', s[ini:fim], '', 1))

# ---------- temp-acervo.js ----------
need('temp-acervo.js',
"""'<button onclick="tmpAcAbrir('+idx+')">✏️</button></div>';""",
"""'<button onclick="tmpAcAbrir('+idx+')">✏️</button><button class="tmp-ac-del" onclick="tmpAcExcluir('+idx+')" aria-label="Excluir registro">🗑</button></div>';""", 'excluir-ao-lado-lapis')

s = load('temp-acervo.js')
linhas = s.split('\n')
alvos = [i for i, l in enumerate(linhas) if "tmpAcExcluir('+i+')" in l]
if len(alvos) == 1:
    del linhas[alvos[0]]
    files['temp-acervo.js'] = '\n'.join(linhas)
    print('excluir-dentro-do-lapis: removido')
elif "tmpAcExcluir('+i+')" not in s:
    print('excluir-dentro-do-lapis: já removido')
else:
    sys.exit('FALHA excluir-dentro-do-lapis: achou %d linhas' % len(alvos))

need('temp-acervo.js',
"Toque em ✏️ para editar os campos de um registro ou 🗑 para excluí-lo.",
"Toque em ✏️ para editar os campos. Use 🗑 ao lado do lápis para excluir.", 'dica-editar')

need('temp-acervo.js',
".tmp-ac-r button{border:1px solid #c9ced6;background:#fff;border-radius:8px;height:32px;padding:0 10px;font-weight:800;color:var(--verde-escuro);cursor:pointer;flex:none}",
""".tmp-ac-r button{border:1px solid #c9ced6;background:#fff;border-radius:8px;height:32px;padding:0 10px;font-weight:800;color:var(--verde-escuro);cursor:pointer;flex:none}
.tmp-ac-r button.tmp-ac-del{border-color:#e6b0aa;color:#c0392b}""", 'css-del')

need('temp-acervo.js', 'page-ttl">🎶 Músicas que já cantamos</div>', 'page-ttl">🎶 Histórico de músicas</div>', 'temp-acervo-rename', mode='all')

# ---------- culto.js ----------
need('culto.js',
"""/* Grava os eventos do setlist em "Músicas já cantadas" (idempotente):
   só insere música+data que ainda não existe. Chamado automaticamente a
   cada salvamento da playlist e também pelo concluirEvento. */""",
"""/* Grava os eventos do setlist em "Músicas já cantadas" (idempotente):
   só insere música+data que ainda não existe. Chamado SOMENTE pelo
   concluirEvento (sem histórico ao montar/publicar a playlist). */""", 'comentario-hist')

s = load('culto.js')
ini = s.find('/* ---------- automático: ao salvar a playlist')
if ini < 0:
    if 'automático: ao salvar' not in s: print('wrapper-gravarEventos: já removido')
    else: sys.exit('FALHA wrapper: marcador não encontrado')
else:
    marca = 'window.salvarConfig=novo;'
    p = s.find(marca, ini)
    fim = s.find('})();', p)
    if p < 0 or fim < 0: sys.exit('FALHA wrapper: fim não encontrado')
    fim += len('})();')
    if not s[fim:fim+6].strip().startswith('})();'): sys.exit('FALHA wrapper: estrutura inesperada após o bloco')
    plan.append(('culto.js', s[ini:fim], '', 1))

# ---------- avisos.js ----------
need('avisos.js', "if(/cantadas|ja cantamos/.test(t)) return 'go:cantadas';",
                 "if(/cantadas|ja cantamos|hist[óo]rico/.test(t)) return 'go:cantadas';", 'avisos-regex')
s = load('avisos.js')
old_opt = 'go:cantadas">Músicas que já cantamos</option>'
if old_opt in s: plan.append(('avisos.js', old_opt, 'go:cantadas">Histórico de músicas</option>', 1))
elif 'go:cantadas">Histórico de músicas</option>' in s: print('avisos-option: já aplicado')
else: sys.exit('FALHA avisos-option')

# ---------- cantadas.js ----------
need('cantadas.js', 'page-ttl">🎶 Músicas que já cantamos</div>', 'page-ttl">🎶 Histórico de músicas</div>', 'cantadas-rename')

# ---------- aplica ----------
for f, old, new, mode in plan:
    files[f] = files[f].replace(old, new, -1 if mode=='all' else 1)
for f, s in files.items():
    open(P(f), 'w', encoding='utf-8').write(s)
    print('gravado:', f)
# verificações finais
chk = {f: open(P(f), encoding='utf-8').read() for f in files}
assert 'navSave' in chk['index.html'] and 'modal-part' in chk['index.html']
assert '_ccLetra' in chk['cantor.js'] and 'cantorLetra' in chk['cantor.js']
assert 'Áudios (' not in chk['melhorias.js']
assert "tmpAcExcluir('+i+')" not in chk['temp-acervo.js']
assert "tmpAcExcluir('+idx+')" in chk['temp-acervo.js']
assert 'automático: ao salvar' not in chk['culto.js']
assert 'Histórico de músicas' in chk['cantadas.js'] and 'Histórico de músicas' in chk['avisos.js']
print('TODOS OS PATCHES LOTE8 OK')
