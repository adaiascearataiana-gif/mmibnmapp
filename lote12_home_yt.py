#!/usr/bin/env python3
# LOTE12 — Zoom livre na partitura + playlist do YouTube na home + scroll do
# "Editar registros" preservado ao excluir.
# Valida os marcadores nos arquivos de mmibnmapp/; se faltarem, copia os
# arquivos já aplicados de entregas/lote8_entrega/codigo_pra_subir_github/.
# Idempotente. Uso (Linux): python3 ferramentas/patches/lote12_home_yt.py
import os, shutil, sys

MARCADORES = {
    'mmibnmapp/index.html': ['_pzClamp', 'yt-home', 'modal-bg.show'],
    'mmibnmapp/culto.js': ['margin-top:10px"><a class="sl-yt"'],
    'mmibnmapp/temp-acervo.js': ['_lstSt'],
    'mmibnmapp/sw.js': ["mmibnm-v41"],
}
ENT = 'entregas/lote8_entrega/codigo_pra_subir_github'

def falta():
    f = []
    for arq, marks in MARCADORES.items():
        try:
            t = open(arq, encoding='utf-8').read()
        except OSError:
            f.append(arq); continue
        for m in marks:
            if m not in t:
                f.append(arq + ' <- ' + m); break
    return f

f = falta()
if f:
    print('aplicando lote12 (faltavam):', *f, sep='\n  ')
    for arq in MARCADORES:
        src = os.path.join(ENT, os.path.basename(arq))
        if not os.path.exists(src):
            sys.exit('FALHA: fonte não encontrada: ' + src)
        shutil.copyfile(src, arq)
    f = falta()
    if f:
        sys.exit('FALHA após cópia: ' + str(f))

# validação final dos 4 pontos
checks = [
    ('zoom livre', '_pzClamp' in open('mmibnmapp/index.html', encoding='utf-8').read()),
    ('botão YT na home', 'yt-home' in open('mmibnmapp/index.html', encoding='utf-8').read()),
    ('YT no card de eventos', 'margin-top:10px"><a class="sl-yt"' in open('mmibnmapp/culto.js', encoding='utf-8').read()),
    ('scroll do modal preservado', '_lstSt' in open('mmibnmapp/temp-acervo.js', encoding='utf-8').read()),
    ('cache v41', 'mmibnm-v41' in open('mmibnmapp/sw.js', encoding='utf-8').read()),
]
for nome, ok in checks:
    print(('OK  ' if ok else 'ERRO') + ' ' + nome)
if not all(ok for _, ok in checks):
    sys.exit('FALHA LOTE12')
print('LOTE12 OK — zoom livre + YT na home + scroll fix + v41')
