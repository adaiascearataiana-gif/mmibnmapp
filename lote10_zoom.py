#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""LOTE 10 — Zoom da partitura: barra A−/A+/Resetar, toque e pinça (2 dedos)."""
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

# ---------- index.html: função abrirPartitura inteira + controles de zoom ----------
s = load('index.html')
ini = s.find('function abrirPartitura(url, titulo){')
if ini >= 0 and 'partZoom(' in s[ini:ini+3000]:
    print('partitura-zoom: já aplicado')
else:
    if ini < 0:
        sys.exit('FALHA partitura-zoom: início não encontrado')
    fim = s.find("document.getElementById('modalBg').classList.add('mp');\n}", ini)
    if fim < 0:
        sys.exit('FALHA partitura-zoom: fim não encontrado')
    fim += len("document.getElementById('modalBg').classList.add('mp');\n}")
    novo = """let _pz=100;
function partSetZoom(w){
  _pz=Math.max(100,Math.min(500,w));
  const im=document.getElementById('partImg');
  if(im){ im.style.width=_pz+'%'; im.classList.remove('zoom'); }
  const lb=document.getElementById('pzLbl');
  if(lb) lb.textContent=Math.round(_pz)+'%';
}
function partZoom(step){
  if(step===0) return partSetZoom(100);
  if(step==='tap') return partSetZoom(_pz>100?100:220);
  partSetZoom(_pz*(step>0?1.35:1/1.35));
}
function _pzDist(t){ const dx=t[0].clientX-t[1].clientX, dy=t[0].clientY-t[1].clientY; return Math.sqrt(dx*dx+dy*dy)||1; }
function _pzInit(){
  const im=document.getElementById('partImg'); if(!im||im._pzOn) return; im._pzOn=1;
  let d0=0, w0=100;
  im.addEventListener('touchstart',function(e){ if(e.touches.length===2){ d0=_pzDist(e.touches); w0=_pz; } },{passive:true});
  im.addEventListener('touchmove',function(e){ if(e.touches.length===2&&d0){ e.preventDefault(); partSetZoom(w0*_pzDist(e.touches)/d0); } },{passive:false});
  im.addEventListener('touchend',function(){ if(!d0) return; d0=0; },{passive:true});
}
function abrirPartitura(url, titulo){
  _pz=100;
  abrirModal('<h3>\\uD83D\\uDCDC '+esc(titulo||'Partitura')+'</h3>'+
    '<div class="zoom-bar part-zoom"><button type="button" onclick="partZoom(-1)">A\\u2212</button><span class="zh" id="pzLbl">100%</span><button type="button" onclick="partZoom(1)">A+</button><button type="button" class="rst" onclick="partZoom(0)">Resetar</button></div>'+
    '<div class="part-box"><img id="partImg" src="'+esc(url)+'" alt="Partitura de '+esc(titulo||'')+'" style="width:100%" onclick="partZoom(&#39;tap&#39;)" onerror="this.parentElement.innerHTML=\\'<p style=&quot;padding:30px;color:#789&quot;>Partitura ainda n&atilde;o dispon&iacute;vel neste aparelho.</p>\\'"></div>'+
    '<p class="part-dica">Toque na imagem ou use A+/A\\u2212 \\u2014 pin\\u00e7a com dois dedos tamb\\u00e9m funciona. Arraste para navegar.</p>'+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Fechar</button></div>');
  document.getElementById('modalBox').classList.add('modal-part');
  document.getElementById('modalBg').classList.add('mp');
  _pzInit();
}"""
    plan.append(('index.html', s[ini:fim], novo, 1))

# ---------- CSS: barra de zoom da partitura no topo do box (herda .zoom-bar) ----------
need('index.html',
     ".part-box{max-height:72vh;overflow:auto;text-align:center;background:#f4f6f5;border-radius:10px;padding:6px}",
     ".part-zoom{margin-bottom:8px}\n.part-box{max-height:72vh;overflow:auto;text-align:center;background:#f4f6f5;border-radius:10px;padding:6px;touch-action:pan-x pan-y}",
     'css-part-zoom')

for f, old, new, mode in plan:
    files[f] = files[f].replace(old, new, -1 if mode == 'all' else 1)
for f, s2 in files.items():
    open(P(f), 'w', encoding='utf-8').write(s2)
    print('gravado:', f)

chk = {f: open(P(f), encoding='utf-8').read() for f in files}
for tok in ['partZoom(', 'partSetZoom', '_pzInit', 'pzLbl', 'part-zoom']:
    assert tok in chk['index.html'], 'falta ' + tok
print('TODOS OS PATCHES LOTE10 OK')
