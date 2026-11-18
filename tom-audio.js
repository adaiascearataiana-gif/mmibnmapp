/* ============================================================
   MM IBNM — Detectar e alterar o tom de um áudio (v1.1)
   Funciona tanto para áudios de "Músicas" quanto de hinos
   (Cantor Cristão, Harpa, HCC), através de um "alvo":
     {tipo:'musica', id}                 — uma música do repertório
     {tipo:'hino', livro:'cc'|'hr'|'hcc', num}  — um hino
   ADM envia um MP3/M4A/WAV (ou usa um áudio já salvo); o app
   detecta a tonalidade automaticamente (chroma + perfil de
   Krumhansl-Schmuckler) e permite tocar/salvar o mesmo áudio em
   outro tom (phase vocoder, roda num Web Worker).
   Link do YouTube: o navegador não tem permissão de ler o áudio
   de um vídeo do YouTube diretamente — por isso essa ferramenta
   funciona com o ARQUIVO do áudio (baixado ou já salvo).
============================================================ */
(function(){
'use strict';
if (typeof DB === 'undefined') return;
const e = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- worker ---------- */
let _worker = null, _reqId = 0;
const _pending = {};
function getWorker(){
  if (_worker) return _worker;
  _worker = new Worker('tom-worker.js');
  _worker.onmessage = function(ev){
    const d = ev.data || {};
    const p = _pending[d.id]; if (!p) return; delete _pending[d.id];
    if (d.ok) p.resolve(d); else p.reject(new Error(d.erro || 'Falha ao processar o áudio.'));
  };
  _worker.onerror = function(){
    Object.keys(_pending).forEach(k=>{ _pending[k].reject(new Error('Erro inesperado ao processar o áudio.')); delete _pending[k]; });
  };
  return _worker;
}
function workerCall(cmd, payload, transfer){
  return new Promise((resolve, reject) => {
    const id = ++_reqId;
    _pending[id] = { resolve, reject };
    try{ getWorker().postMessage(Object.assign({ id, cmd }, payload), transfer || []); }
    catch(err){ delete _pending[id]; reject(err); }
  });
}

/* ---------- decodificação de áudio ---------- */
function paraMono(audioBuffer){
  const ch = audioBuffer.numberOfChannels;
  const len = audioBuffer.length;
  if (ch === 1) return audioBuffer.getChannelData(0).slice();
  const out = new Float32Array(len);
  for (let c=0;c<ch;c++){ const d=audioBuffer.getChannelData(c); for (let i=0;i<len;i++) out[i]+=d[i]/ch; }
  return out;
}
async function prepararAudio(arrayBuffer){
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) throw new Error('Este navegador não suporta processamento de áudio.');
  const ctx = new Ctx();
  let decoded;
  try{ decoded = await ctx.decodeAudioData(arrayBuffer.slice(0)); }
  finally{ try{ ctx.close(); }catch(_){} }
  const mono = paraMono(decoded);
  const ds = (typeof DSP!=='undefined') ? DSP.downsample(mono, decoded.sampleRate, 22050) : {samples:mono, sr:decoded.sampleRate};
  return { samples: ds.samples, sr: ds.sr, duracao: decoded.duration };
}

/* ---------- abstração do "alvo" (música OU hino) ---------- */
function alvoInfo(alvo){
  if (alvo.tipo === 'hino'){
    let lista = [];
    try{
      if (alvo.livro==='cc') lista = window.HINOS||[];
      else if (alvo.livro==='hr') lista = window.HARPA||[];
      else if (alvo.livro==='hcc' && typeof window.hccTodos==='function') lista = window.hccTodos();
    }catch(_){}
    const h = lista.find(x=>x.n===alvo.num);
    const audios = (typeof window.__audiosHino==='function') ? window.__audiosHino(alvo.livro, alvo.num) : [];
    return { titulo: (h?h.titulo:('Hino '+alvo.num)), audios: audios };
  }
  const m = DB.musicas.find(x=>x.id===alvo.id);
  return { titulo: m?m.titulo:'', audios: (m&&m.audios)||[] };
}
async function alvoSalvar(alvo, nome, extra){
  if (alvo.tipo === 'hino'){
    if (typeof window.__salvarAudioHino !== 'function') throw new Error('Função de salvar áudio do hino indisponível.');
    return window.__salvarAudioHino(alvo.livro, alvo.num, nome, extra);
  }
  const m = DB.musicas.find(x=>x.id===alvo.id); if (!m) return;
  m.audios = m.audios || [];
  m.audios.push(Object.assign({ nome }, extra));
  if (typeof sb !== 'undefined' && sb){
    const { error } = await sb.from('musicas').update({ audios: m.audios }).eq('id', m.id);
    if (error) throw new Error(error.message);
  } else if (typeof saveDB === 'function') saveDB();
}
function alvoTocar(alvo, url, nome, titulo){
  if (typeof tocar !== 'function') return;
  if (alvo.tipo === 'hino') tocar(url, nome, 'hino:'+alvo.livro+':'+alvo.num, titulo, { tipo:'hino', livro:alvo.livro, num:alvo.num });
  else tocar(url, nome, alvo.id, titulo);
}
function alvoChave(alvo){ return alvo.tipo==='hino' ? ('hino:'+alvo.livro+':'+alvo.num) : ('musica:'+alvo.id); }

/* ---------- estado (um alvo por vez, pois é um modal) ---------- */
window.__tomEstado = null; /* {alvo, samples, sr, nome, deteccao, cacheBlob} */

function tfSetStatus(msg){ const el=document.getElementById('tfStatus'); if(el) el.textContent=msg; }

/* ---------- UI principal ----------
   `alvoOuMusicaId`: aceita tanto um id de música (string, modo antigo) quanto
   um objeto {tipo:'musica',id} ou {tipo:'hino',livro,num}. */
window.abrirFerramentaTom = function(alvoOuMusicaId){
  const alvo = (typeof alvoOuMusicaId === 'string') ? { tipo:'musica', id: alvoOuMusicaId } : alvoOuMusicaId;
  if (!alvo) return;
  const info = alvoInfo(alvo);
  const opcoesExistentes = (info.audios||[]).map((a,i)=>'<option value="idx:'+i+'">'+e(a.nome)+'</option>').join('');
  if (typeof abrirModal !== 'function') return;
  window.__tomAlvo = alvo;
  abrirModal(
    '<h3>🎼 Detectar e alterar o tom do áudio</h3>'+
    '<p class="small">'+e(info.titulo)+'</p>'+
    '<p class="small">Envie um arquivo (MP3, M4A, WAV) ou use um áudio já salvo. O app detecta a tonalidade automaticamente; você escolhe tocar ou salvar o mesmo áudio em outro tom.</p>'+
    '<div class="field"><label>Fonte do áudio</label>'+
      '<select id="tfFonte" onchange="tfMudouFonte()">'+
        '<option value="novo">📁 Enviar novo arquivo do aparelho…</option>'+
        opcoesExistentes+
        '<option value="link">🔗 Colar link direto de um MP3/M4A</option>'+
      '</select>'+
    '</div>'+
    '<input id="tfArq" type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac" hidden onchange="tfArquivoEscolhido(this)">'+
    '<div id="tfLinkWrap" style="display:none" class="field"><label>Link direto do áudio</label>'+
      '<div style="display:flex;gap:8px"><input id="tfLink" placeholder="https://..." style="flex:1"><button class="mini-btn" onclick="tfUsarLink()">Usar</button></div>'+
      '<p class="small">⚠️ Links do YouTube não funcionam aqui: o YouTube não deixa o navegador ler o áudio do vídeo diretamente. Baixe o áudio (um conversor/app) e use "Enviar novo arquivo" acima.</p>'+
    '</div>'+
    '<div id="tfStatus" class="small tf-status"></div>'+
    '<div id="tfResultado"></div>'+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Fechar</button></div>'
  );
};

window.tfMudouFonte = function(){
  const alvo = window.__tomAlvo; if (!alvo) return;
  const sel = document.getElementById('tfFonte'); if (!sel) return;
  const v = sel.value;
  const linkWrap = document.getElementById('tfLinkWrap'); if (linkWrap) linkWrap.style.display = v==='link' ? 'block':'none';
  const res = document.getElementById('tfResultado'); if (res) res.innerHTML='';
  tfSetStatus('');
  if (v === 'novo'){ const inp=document.getElementById('tfArq'); if (inp) inp.click(); }
  else if (v.indexOf('idx:')===0){
    const i = +v.slice(4);
    const info = alvoInfo(alvo); const a = info.audios[i];
    if (a) tfUsarUrl(a.url, a.nome);
  }
};

window.tfArquivoEscolhido = async function(inp){
  const f = inp.files && inp.files[0]; inp.value=''; if (!f) return;
  tfSetStatus('📂 Lendo o arquivo…');
  try{
    const buf = await f.arrayBuffer();
    tfSetStatus('🔬 Decodificando o áudio…');
    const prep = await prepararAudio(buf);
    await iniciarDeteccao(f.name.replace(/\.[^.]+$/,''), prep);
  }catch(err){ tfSetStatus('❌ Não consegui ler este arquivo: '+(err.message||err)); }
};

window.tfUsarLink = function(){
  const inp = document.getElementById('tfLink'); const v = inp? (inp.value||'').trim() : '';
  if (!v) return;
  if (/youtu\.?be/i.test(v)){ tfSetStatus('⚠️ Links do YouTube não podem ser lidos diretamente pelo navegador. Baixe o áudio do vídeo e use "Enviar novo arquivo".'); return; }
  tfUsarUrl(v, 'Áudio do link');
};

async function tfUsarUrl(url, nome){
  tfSetStatus('🌐 Baixando o áudio…');
  try{
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('HTTP '+resp.status);
    const buf = await resp.arrayBuffer();
    tfSetStatus('🔬 Decodificando o áudio…');
    const prep = await prepararAudio(buf);
    await iniciarDeteccao(nome, prep);
  }catch(err){
    tfSetStatus('❌ Não consegui baixar este áudio pelo link (bloqueio de CORS ou link indisponível). Baixe o arquivo no aparelho e use "Enviar novo arquivo".');
  }
}

async function iniciarDeteccao(nome, prep){
  window.__tomEstado = { alvo: window.__tomAlvo, samples: prep.samples, sr: prep.sr, nome, cacheBlob:null, deteccao:null };
  tfSetStatus('🔎 Detectando a tonalidade… (pode levar alguns segundos)');
  try{
    const copy = prep.samples.slice();
    const r = await workerCall('detectar', { samples: copy.buffer, sr: prep.sr }, [copy.buffer]);
    tfSetStatus('');
    mostrarResultado(r.resultado);
  }catch(err){ tfSetStatus('❌ Erro ao analisar o áudio: '+(err.message||err)); }
}

const BEMOL_PC = new Set([5,10,3,8,1]); /* F, Bb, Eb, Ab, Db */
function mostrarResultado(det){
  const estado = window.__tomEstado; if (!estado) return;
  estado.deteccao = det;
  const box = document.getElementById('tfResultado'); if (!box) return;
  if (!det){
    box.innerHTML = '<p class="small">Não consegui identificar uma tonalidade clara neste áudio (pode ser muito curto, ter muito ruído, ou não ter harmonia definida). Tente outro trecho/arquivo.</p>';
    return;
  }
  const opts = [];
  for (let s=-6; s<=6; s++){
    const pcAlvo = ((det.tonica + s) % 12 + 12) % 12;
    const nomeAlvo = DSP.formatarTom(pcAlvo, det.modo, BEMOL_PC.has(pcAlvo));
    opts.push('<option value="'+s+'"'+(s===0?' selected':'')+'>'+nomeAlvo.pt+(s!==0? ' ('+(s>0?'+':'')+s+' semitons)':' (tom original)')+'</option>');
  }
  box.innerHTML =
    '<div class="tf-det"><b>🎯 Tom detectado:</b> '+det.nome.pt+' <span class="small">(confiança '+det.confianca+'%)</span>'+
    (det.confianca<55? '<br><span class="small">Pode também ser '+det.alternativa.pt+' — confirme ouvindo e ajuste abaixo se precisar.</span>' : '')+
    '</div>'+
    '<div class="field"><label>Tocar/salvar em:</label><select id="tfAlvo">'+opts.join('')+'</select></div>'+
    '<div class="tf-acts">'+
      '<button class="au-b" id="tfPlayBtn" onclick="tfTocar()">▶ Tocar</button>'+
      '<button class="au-b ok" onclick="tfSalvar()">💾 Salvar como novo áudio</button>'+
    '</div>'+
    '<div id="tfProgresso" class="small" style="margin-top:8px"></div>';
}

async function obterBlobTransposto(estado, semitons, btnStatus){
  if (estado.cacheBlob && estado.cacheBlob.semitons === semitons) return estado.cacheBlob.blob;
  if (btnStatus) btnStatus.textContent = '⏳ Processando…';
  const copy = estado.samples.slice();
  const r = await workerCall('transpor', { samples: copy.buffer, sr: estado.sr, semitons: semitons }, [copy.buffer]);
  const blob = new Blob([r.wav], { type:'audio/wav' });
  estado.cacheBlob = { semitons, blob };
  if (btnStatus) btnStatus.textContent = '▶ Tocar';
  return blob;
}

window.tfTocar = async function(){
  const estado = window.__tomEstado; if (!estado) return;
  const sel = document.getElementById('tfAlvo'); const semitons = sel ? +sel.value : 0;
  const btn = document.getElementById('tfPlayBtn');
  try{
    const blob = await obterBlobTransposto(estado, semitons, btn);
    const url = URL.createObjectURL(blob);
    const info = alvoInfo(estado.alvo);
    const nomeFaixa = estado.nome + (semitons ? ' (tom alterado)' : ' (tom original)');
    alvoTocar(estado.alvo, url, nomeFaixa, info.titulo);
  }catch(err){ if (typeof toast==='function') toast('Não foi possível tocar: '+(err.message||err)); if (btn) btn.textContent='▶ Tocar'; }
};

window.tfSalvar = async function(){
  const estado = window.__tomEstado; if (!estado) return;
  const sel = document.getElementById('tfAlvo'); const semitons = sel ? +sel.value : 0;
  const det = estado.deteccao;
  const pcAlvo = det ? ((det.tonica + semitons) % 12 + 12) % 12 : null;
  const nomeTom = det ? DSP.formatarTom(pcAlvo, det.modo, BEMOL_PC.has(pcAlvo)).pt : (semitons+' semitons');
  const prog = document.getElementById('tfProgresso');
  const info = alvoInfo(estado.alvo);
  try{
    if (prog) prog.textContent = '⏳ Processando áudio…';
    const blob = await obterBlobTransposto(estado, semitons);
    const nomeBase = estado.nome.replace(/\.[^.]+$/,'');
    const nomeFinal = semitons===0 ? nomeBase+' (reprocessado)' : (nomeBase+' — Tom '+nomeTom);
    const temDrive = typeof driveOk==='function' && driveOk();
    if (temDrive){
      if (!(typeof conectado==='function' && conectado())){
        if (prog) prog.textContent = 'Conecte o Google Drive para salvar…';
        const ok = await (typeof conectarDrive==='function' ? conectarDrive() : Promise.resolve(false));
        if (!ok) { if (prog) prog.textContent=''; return; }
      }
      if (prog) prog.textContent = '☁️ Enviando ao Google Drive… 0%';
      const fid = await window.__drive.sobe(blob, info.titulo+' - '+nomeFinal+'.wav', 'MM IBNM - Áudios', p=>{ if (prog) prog.textContent = '☁️ Enviando… '+Math.round(p*100)+'%'; });
      await alvoSalvar(estado.alvo, nomeFinal, { url: driveUrl(fid), drive: fid });
      if (typeof toast==='function') toast('Áudio "'+nomeFinal+'" salvo no tom '+nomeTom+'! 🎧');
      if (typeof fecharModal==='function') fecharModal();
      if (estado.alvo.tipo==='hino'){ if (typeof window.__abrirHinoAudio==='function') window.__abrirHinoAudio(estado.alvo.livro, estado.alvo.num); }
      else if (typeof abrirMusica==='function') abrirMusica(estado.alvo.id,'audio');
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=nomeFinal+'.wav'; document.body.appendChild(a); a.click(); a.remove();
      if (prog) prog.textContent = '⬇️ Baixado no aparelho. Configure o Google Drive no Painel do ADM (⚙️) para salvar direto, na nuvem.';
    }
  }catch(err){ if (prog) prog.textContent=''; if (typeof toast==='function') toast('Erro ao salvar: '+(err.message||err)); }
};

/* ---------- estilo ---------- */
const st = document.createElement('style');
st.textContent =
'.tf-det{background:#f3f8f5;border:1px solid #cfe6da;border-radius:10px;padding:10px 12px;margin:6px 0 10px;font-size:14px}'+
'.tf-acts{display:flex;gap:8px;flex-wrap:wrap}'+
'.tf-status{min-height:16px}';
document.head.appendChild(st);

})();
