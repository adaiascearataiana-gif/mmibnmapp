#!/usr/bin/env python3
# LOTE11 — Reconstrói as 27 letras corrompidas de mmibnmapp/hinos.js a partir de
# ferramentas/fix_letras.json (fonte web: letras.com.br / letras.mus / revistaebd).
# Idempotente: se as 27 já estão limpas e as letras batem, reaplica sem mudar nada.
# Uso (Linux): python3 ferramentas/patches/lote11_letras.py
import json, re, sys

HINOS = 'mmibnmapp/hinos.js'
FIX = 'ferramentas/fix_letras.json'
ALVOS = [7,24,25,28,112,150,153,174,191,208,211,226,285,329,381,391,401,416,422,441,447,451,456,457,469,475,536]
BROKEN = re.compile(r'[#$%&*]')  # só existe em glyph ToUnicode quebrado do PDF

fix = json.load(open(FIX, encoding='utf-8'))
faltam = [n for n in ALVOS if str(n) not in fix]
if faltam:
    sys.exit(f'fix_letras.json incompleto, faltam: {faltam}')

src = open(HINOS, encoding='utf-8').read()
lines = src.split('\n')
out, aplicados, ja_ok = [], 0, 0

for ln in lines:
    s = ln.strip()
    if s.startswith('{"n":'):
        body = s[:-1] if s.endswith(',') else s
        try:
            obj = json.loads(body)
        except Exception:
            out.append(ln); continue
        n = int(obj['n'])
        if n in ALVOS:
            nova = fix[str(n)]
            if obj.get('letra') == nova:
                ja_ok += 1
                out.append(ln)
            else:
                obj['letra'] = nova
                nl = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
                if s.endswith(','):
                    nl += ','
                out.append(nl)
                aplicados += 1
            continue
    out.append(ln)

# validação estrita antes de gravar
texto = '\n'.join(out)
objs = []
for s in texto.split('\n'):
    s = s.strip()
    if s.startswith('{"n":'):
        body = s[:-1] if s.endswith(',') else s
        objs.append(json.loads(body))
if len(objs) != 581:
    sys.exit(f'FALHA: {len(objs)} objetos (esperado 581)')
nums = sorted(o['n'] for o in objs)
if nums != list(range(1, 582)):
    sys.exit(f'FALHA: numeração {nums[:5]}...{nums[-5:]}')
quebradas = [o['n'] for o in objs if BROKEN.search(o.get('letra', '')) or not o.get('letra', '').strip()]
if quebradas:
    sys.exit(f'FALHA: letras ainda quebradas/vazias: {quebradas}')
sem_letra = [o['n'] for o in objs if not o.get('letra')]
if sem_letra:
    sys.exit(f'FALHA: sem letra: {sem_letra}')
# conferência de tamanho mínimo das 27 (hino real tem estrofes)
curtas = [o['n'] for o in objs if o['n'] in ALVOS and len(o['letra']) < 150]
if curtas:
    sys.exit(f'FALHA: letras curtas demais: {curtas}')

open(HINOS, 'w', encoding='utf-8').write(texto)
print(f'LOTE11 OK — aplicados={aplicados} já-iguais={ja_ok} | 581 objetos | 0 letras quebradas')
print('27 alvos:', sorted(ALVOS))
