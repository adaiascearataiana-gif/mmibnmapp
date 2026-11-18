/* ============================================================
   DSP core: FFT, detecção de tom (chroma + Krumhansl-Schmuckler)
   e mudança de tom (phase vocoder + resample).
   Código puro (sem APIs de navegador) para rodar tanto no
   Web Worker do app quanto em testes no Node.
============================================================ */
(function(root, factory){
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DSP = factory();
})(typeof self !== 'undefined' ? self : this, function(){
'use strict';

/* ---------- FFT radix-2 iterativa (in-place) ---------- */
function fft(re, im){
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++){
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j){
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1){
    const ang = -2 * Math.PI / len;
    const wr0 = Math.cos(ang), wi0 = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len){
      let curR = 1, curI = 0;
      for (let j = 0; j < half; j++){
        const ur = re[i + j], ui = im[i + j];
        const tr = re[i + j + half] * curR - im[i + j + half] * curI;
        const ti = re[i + j + half] * curI + im[i + j + half] * curR;
        re[i + j] = ur + tr; im[i + j] = ui + ti;
        re[i + j + half] = ur - tr; im[i + j + half] = ui - ti;
        const nr = curR * wr0 - curI * wi0;
        const ni = curR * wi0 + curI * wr0;
        curR = nr; curI = ni;
      }
    }
  }
}
function ifft(re, im){
  const n = re.length;
  for (let i = 0; i < n; i++) im[i] = -im[i];
  fft(re, im);
  for (let i = 0; i < n; i++){ re[i] = re[i] / n; im[i] = -im[i] / n; }
}
function nextPow2(x){ let p = 1; while (p < x) p <<= 1; return p; }

function hannWindow(N){
  const w = new Float32Array(N);
  for (let i = 0; i < N; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
  return w;
}

/* ---------- downsample simples (média de blocos) ---------- */
function downsample(samples, srIn, srOut){
  if (srOut >= srIn) return { samples, sr: srIn };
  const ratio = srIn / srOut;
  const outLen = Math.floor(samples.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++){
    const start = Math.floor(i * ratio), end = Math.floor((i + 1) * ratio);
    let sum = 0, cnt = 0;
    for (let k = start; k < end && k < samples.length; k++){ sum += samples[k]; cnt++; }
    out[i] = cnt ? sum / cnt : 0;
  }
  return { samples: out, sr: srOut };
}

/* ---------- detecção de tom (chroma + Krumhansl-Schmuckler) ---------- */
const NOTA_SH = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTA_PT = {C:'Dó','C#':'Dó#',D:'Ré','D#':'Ré#',E:'Mi',F:'Fá','F#':'Fá#',G:'Sol','G#':'Sol#',A:'Lá','A#':'Lá#',B:'Si'};
const NOTA_PT_B = {C:'Dó',Db:'Réb',D:'Ré',Eb:'Mib',E:'Mi',F:'Fá',Gb:'Solb',G:'Sol',Ab:'Láb',A:'Lá',Bb:'Sib',B:'Si'};
const KS_MAJOR = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88];
const KS_MINOR = [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];

function chromaDeAmostras(samples, sr, opts){
  opts = opts || {};
  const frameSize = opts.frameSize || 4096;
  const hop = opts.hop || Math.floor(frameSize / 2);
  const fMin = opts.fMin || 55;    /* ~A1 */
  const fMax = opts.fMax || 2000;  /* ~B6 */
  const win = hannWindow(frameSize);
  const chroma = new Float64Array(12);
  const re = new Float32Array(frameSize);
  const im = new Float32Array(frameSize);
  const maxLen = Math.min(samples.length, opts.maxSamples || samples.length);
  let frames = 0;
  for (let pos = 0; pos + frameSize <= maxLen; pos += hop){
    for (let i = 0; i < frameSize; i++){ re[i] = samples[pos + i] * win[i]; im[i] = 0; }
    fft(re, im);
    const half = frameSize / 2;
    for (let k = 1; k < half; k++){
      const freq = k * sr / frameSize;
      if (freq < fMin || freq > fMax) continue;
      const mag = Math.sqrt(re[k]*re[k] + im[k]*im[k]);
      const midi = 69 + 12 * Math.log2(freq / 440);
      const pc = ((Math.round(midi) % 12) + 12) % 12;
      chroma[pc] += mag;
    }
    frames++;
  }
  return { chroma, frames };
}

function correl(a, b){
  const n = a.length;
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++){ ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++){
    const xa = a[i] - ma, xb = b[i] - mb;
    num += xa * xb; da += xa * xa; db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den ? num / den : 0;
}
function rotate(arr, n){
  const out = new Array(arr.length);
  for (let i = 0; i < arr.length; i++) out[i] = arr[(i - n + arr.length * 2) % arr.length];
  return out;
}

function detectarTomDeChroma(chroma){
  const candidatos = [];
  for (let tonica = 0; tonica < 12; tonica++){
    const perfilMaior = rotate(KS_MAJOR, tonica);
    const perfilMenor = rotate(KS_MINOR, tonica);
    candidatos.push({ tonica, modo: 'maior', score: correl(chroma, perfilMaior) });
    candidatos.push({ tonica, modo: 'menor', score: correl(chroma, perfilMenor) });
  }
  candidatos.sort((a, b) => b.score - a.score);
  const top = candidatos[0], segundo = candidatos[1];
  const confianca = Math.max(0, Math.min(1, (top.score - segundo.score) / (Math.abs(top.score) + 1e-6) + 0.35));
  return { melhor: top, segundo, candidatos, confianca };
}

function nomeNota(pc, bemol){
  const sh = NOTA_SH[pc];
  if (!bemol) return sh;
  const FL = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  return FL[pc];
}
function formatarTom(pc, modo, usarBemol){
  const letra = nomeNota(pc, usarBemol);
  const pt = usarBemol ? (NOTA_PT_B[letra] || letra) : (NOTA_PT[letra] || letra);
  return {
    letra: letra + (modo === 'menor' ? 'm' : ''),
    pt: pt + (modo === 'menor' ? ' menor' : ' maior')
  };
}

/* API principal de detecção: recebe PCM mono + sampleRate, devolve estimativa */
function detectarTom(samplesIn, srIn){
  const dsOpts = downsample(samplesIn, srIn, 11025);
  const samples = dsOpts.samples, sr = dsOpts.sr;
  const cap = Math.min(samples.length, sr * 90); /* no máx. 90s analisados */
  const { chroma } = chromaDeAmostras(samples, sr, { frameSize: 4096, hop: 2048, maxSamples: cap });
  let soma = 0; for (let i = 0; i < 12; i++) soma += chroma[i];
  if (soma <= 0) return null;
  const norm = Array.from(chroma, v => v / soma);
  const { melhor, segundo, confianca } = detectarTomDeChroma(norm);
  const bemolKeys = new Set([5,10,3,8,1]); /* F, Bb, Eb, Ab, Db tendem a ser grafadas com bemol */
  const usarBemol = bemolKeys.has(melhor.tonica);
  const nomeMelhor = formatarTom(melhor.tonica, melhor.modo, usarBemol);
  const nomeAlt = formatarTom(segundo.tonica, segundo.modo, usarBemol);
  return {
    tonica: melhor.tonica, modo: melhor.modo,
    nome: nomeMelhor, alternativa: nomeAlt,
    confianca: Math.round(confianca * 100)
  };
}

/* ---------- Phase vocoder: time-stretch preservando o tom ---------- */
function phaseVocoderStretch(samples, stretch, frameSize, analysisHop){
  frameSize = frameSize || 2048;
  analysisHop = analysisHop || frameSize / 4;
  const synthHop = Math.round(analysisHop * stretch);
  const win = hannWindow(frameSize);
  const numFrames = Math.max(1, Math.floor((samples.length - frameSize) / analysisHop));
  const outLen = Math.ceil(numFrames * synthHop) + frameSize + 1;
  const out = new Float32Array(outLen);
  const wsum = new Float32Array(outLen);

  const half = frameSize / 2;
  let lastPhase = new Float32Array(half + 1);
  let sumPhase = new Float32Array(half + 1);
  const re = new Float32Array(frameSize), im = new Float32Array(frameSize);
  const omega = new Float32Array(half + 1);
  for (let k = 0; k <= half; k++) omega[k] = 2 * Math.PI * k * analysisHop / frameSize;

  let synthPos = 0;
  for (let frame = 0; frame < numFrames; frame++){
    const analysisPos = frame * analysisHop;
    for (let i = 0; i < frameSize; i++){
      const s = analysisPos + i < samples.length ? samples[analysisPos + i] : 0;
      re[i] = s * win[i]; im[i] = 0;
    }
    fft(re, im);
    const mag = new Float32Array(half + 1), ph = new Float32Array(half + 1);
    for (let k = 0; k <= half; k++){
      mag[k] = Math.sqrt(re[k]*re[k] + im[k]*im[k]);
      ph[k] = Math.atan2(im[k], re[k]);
    }
    if (frame === 0){
      sumPhase = ph.slice();
    } else {
      for (let k = 0; k <= half; k++){
        let delta = ph[k] - lastPhase[k] - omega[k];
        delta = delta - 2 * Math.PI * Math.round(delta / (2 * Math.PI));
        const trueFreq = omega[k] + delta;
        sumPhase[k] += trueFreq * (synthHop / analysisHop);
      }
    }
    lastPhase = ph;
    const re2 = new Float32Array(frameSize), im2 = new Float32Array(frameSize);
    for (let k = 0; k <= half; k++){
      re2[k] = mag[k] * Math.cos(sumPhase[k]);
      im2[k] = mag[k] * Math.sin(sumPhase[k]);
      if (k > 0 && k < half){
        re2[frameSize - k] = re2[k];
        im2[frameSize - k] = -im2[k];
      }
    }
    ifft(re2, im2);
    for (let i = 0; i < frameSize; i++){
      const idx = synthPos + i;
      if (idx < outLen){ out[idx] += re2[i] * win[i]; wsum[idx] += win[i] * win[i]; }
    }
    synthPos += synthHop;
  }
  for (let i = 0; i < outLen; i++) if (wsum[i] > 1e-8) out[i] /= wsum[i];
  const finalLen = Math.round(samples.length * stretch);
  return out.slice(0, finalLen);
}

/* resample linear simples (muda a duração, o que — após o time-stretch —
   produz a mudança de tom final sem alterar a duração original) */
function resampleLinear(samples, ratio /* >1 encolhe (agudiza), <1 estica (grava) */, targetLen){
  const outLen = targetLen != null ? targetLen : Math.round(samples.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++){
    const srcPos = i * ratio;
    const i0 = Math.floor(srcPos), i1 = Math.min(i0 + 1, samples.length - 1);
    const frac = srcPos - i0;
    const s0 = samples[i0] || 0, s1 = samples[i1] || 0;
    out[i] = s0 + (s1 - s0) * frac;
  }
  return out;
}

/* API principal: desloca o tom em `semitons` (pode ser fracionário),
   mantendo a duração original. */
function mudarTom(samples, semitons, frameSize, analysisHop){
  if (!semitons) return samples;
  const ratio = Math.pow(2, semitons / 12); /* >1 sobe o tom */
  const stretched = phaseVocoderStretch(samples, ratio, frameSize, analysisHop);
  return resampleLinear(stretched, ratio, samples.length);
}

/* ---------- WAV encode (PCM 16-bit) ---------- */
function floatTo16BitPCM(view, offset, input){
  for (let i = 0; i < input.length; i++, offset += 2){
    let s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}
function writeString(view, offset, str){
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
function encodeWAV(samples, sr){
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPCM(view, 44, samples);
  return buffer;
}

return {
  fft, ifft, nextPow2, hannWindow, downsample,
  chromaDeAmostras, detectarTomDeChroma, detectarTom, formatarTom, nomeNota,
  phaseVocoderStretch, resampleLinear, mudarTom,
  encodeWAV,
  NOTA_SH, NOTA_PT, NOTA_PT_B, KS_MAJOR, KS_MINOR
};
});
