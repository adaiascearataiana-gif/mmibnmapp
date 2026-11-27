/* Motor de BPM e compasso — do app Compasso, integrado ao MM IBNM (Ferramentas → BPM, compasso e tom) */
/* ═══════════════════════════════════════════════════════════════
   COMPASSO · Motor DSP — 100% offline
   Pipeline: mono mix → resample 11.025 kHz (alta qualidade)
   → envelope de transientes por spectral-flux (log-magnitude,
     meio-onda retificada) → remoção de média local
   → andamento: autocorrelação com soma harmônica + refinamento
     por banco de filtros comb com otimização de fase
   → grade de batidas com snap sub-frame (interpolação parabólica)
   → compasso: classificação de acento por agrupamento modular
   ═══════════════════════════════════════════════════════════════ */
'use strict';

window.DPF = (function () {

  var ANALYSIS_SR = 11025;
  var FFT_SIZE = 1024;
  var HOP = 128;
  /* o envoltório espectral de um frame representa o ÁUDIO NO CENTRO da janela,
     não o início — sem esta correção os marcos ficam ~46 ms adiantados */
  var HALF_WINDOW_SEC = (FFT_SIZE / 2) / ANALYSIS_SR;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

  /* ── mixdown ─────────────────────────────────────────────── */
  function mixToMono(buffer) {
    var ch = buffer.numberOfChannels, len = buffer.length;
    var out = new Float32Array(len);
    if (ch === 1) { out.set(buffer.getChannelData(0)); return out; }
    for (var c = 0; c < ch; c++) {
      var d = buffer.getChannelData(c);
      for (var i = 0; i < len; i++) out[i] += d[i] / ch;
    }
    return out;
  }

  /* ── reamostragem de alta qualidade via OfflineAudioContext ─ */
  async function resampleHQ(mono, fromRate, toRate) {
    if (fromRate === toRate) return mono.slice();
    var targetLen = Math.max(1, Math.round(mono.length * toRate / fromRate));
    var off = new OfflineAudioContext(1, targetLen, toRate);
    var srcBuf = off.createBuffer(1, mono.length, fromRate);
    srcBuf.copyToChannel(mono, 0);
    var src = off.createBufferSource();
    src.buffer = srcBuf;
    src.connect(off.destination);
    src.start(0);
    var rendered = await off.startRendering();
    return rendered.getChannelData(0);
  }

  /* ── FFT radix-2 in-place ────────────────────────────────── */
  function fftInPlace(re, im) {
    var n = re.length, i, j, k, len, ang, wRe, wIm, curRe, curIm, tmpRe;
    for (i = 1, j = 0; i < n; i++) {
      var bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        var tr = re[i]; re[i] = re[j]; re[j] = tr;
        var ti = im[i]; im[i] = im[j]; im[j] = ti;
      }
    }
    for (len = 2; len <= n; len <<= 1) {
      ang = -2 * Math.PI / len;
      wRe = Math.cos(ang); wIm = Math.sin(ang);
      var half = len >> 1;
      for (i = 0; i < n; i += len) {
        curRe = 1; curIm = 0;
        for (k = 0; k < half; k++) {
          var uRe = re[i + k], uIm = im[i + k];
          var vRe = re[i + k + half] * curRe - im[i + k + half] * curIm;
          var vIm = re[i + k + half] * curIm + im[i + k + half] * curRe;
          re[i + k] = uRe + vRe; im[i + k] = uIm + vIm;
          re[i + k + half] = uRe - vRe; im[i + k + half] = uIm - vIm;
          tmpRe = curRe * wRe - curIm * wIm;
          curIm = curRe * wIm + curIm * wRe;
          curRe = tmpRe;
        }
      }
    }
  }

  function parabolicOffset(y0, y1, y2) {
    var d = y0 - 2 * y1 + y2;
    if (Math.abs(d) < 1e-12) return 0;
    var o = 0.5 * (y0 - y2) / d;
    return o > 1 ? 1 : o < -1 ? -1 : o;
  }

  /* ── spectral-flux onset envelope ─────────────────────────── */
  async function spectrumNovelty(rs, onProgress, isCancelled) {
    var frames = Math.floor((rs.length - FFT_SIZE) / HOP) + 1;
    if (frames < 8) throw new Error('Áudio curto demais para analisar (mínimo ~1 s).');
    var fr = ANALYSIS_SR / HOP; // ≈ 86.13 fps
    var win = new Float32Array(FFT_SIZE);
    for (var i = 0; i < FFT_SIZE; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (FFT_SIZE - 1));
    var bins = FFT_SIZE / 2 + 1;
    var prev = new Float32Array(bins);
    var novelty = new Float32Array(frames);
    var re = new Float32Array(FFT_SIZE), im = new Float32Array(FFT_SIZE);

    for (var t = 0; t < frames; t++) {
      if (isCancelled && isCancelled()) { var e = new Error('cancelled'); e.name = 'AbortError'; throw e; }
      var off = t * HOP;
      for (var j = 0; j < FFT_SIZE; j++) { re[j] = rs[off + j] * win[j]; im[j] = 0; }
      fftInPlace(re, im);
      var flux = 0;
      for (var k = 1; k < bins; k++) {
        var mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
        /* compressão suave (sqrt): preserva o contraste de acentuação */
        var lm = Math.sqrt(mag);
        var d = lm - prev[k];
        if (d > 0) {
          /* inclinação leve para o grave (bumbo um pouco preferido,
             mas TODOS os ataques contribuem — evita erro de oitava
             quando a caixa/hat carregam o groove)                */
          flux += d / Math.pow(1 + k / 18, 0.75);
        }
        prev[k] = lm;
      }
      novelty[t] = flux;
      if (onProgress && (t & 511) === 0) { onProgress(t / frames); await tick(); }
    }
    return { novelty: novelty, frameRate: fr };
  }

  /* ── envelope de baixas frequências (p/ força do tempo) ──────
     Um one-pole LP a ~160 Hz isola bumbo/baixo — a energia ali é a
     pista mais robusta para "qual tempo é o mais forte", imune a
     chiados, pratos e ruído.                                 */
  function lowBandEnvelope(rs) {
    var a = 1 - Math.exp(-2 * Math.PI * 160 / ANALYSIS_SR);
    var y = 0, out = new Float32Array(rs.length);
    for (var i = 0; i < rs.length; i++) {
      y += a * (rs[i] - y);
      out[i] = y * y;
    }
    return out;
  }

  function midBandEnvelope(rs) {
    var a = 1 - Math.exp(-2 * Math.PI * 3500 / ANALYSIS_SR);
    var y = 0, out = new Float32Array(rs.length);
    for (var i = 0; i < rs.length; i++) {
      var ax = rs[i] < 0 ? -rs[i] : rs[i];
      y += a * (ax - y);
      out[i] = y;
    }
    return out;
  }

  /* remove o pedestal sustentado (baixo contínuo, pads) e fica só com
     os TRANSITÓRIOS do grave — o kick salta para fora do ruído de fundo */
  function transientEnvelope(e, halfWinSec) {
    var n = e.length, w = Math.max(1, Math.round((halfWinSec || 0.18) * ANALYSIS_SR));
    var prefix = new Float64Array(n + 1);
    for (var i = 0; i < n; i++) prefix[i + 1] = prefix[i] + e[i];
    /* mediana global como referência de pedestal nas bordas — nas primeiras
       e últimas w amostras a janela clipada engoliria o próprio ataque   */
    var sorted = Float32Array.from(e).sort();
    var gmed = sorted[Math.floor(sorted.length / 2)] || 0;
    var out = new Float32Array(n);
    for (var j = 0; j < n; j++) {
      var a = Math.max(0, j - w), b = Math.min(n - 1, j + w);
      var mean = (prefix[b + 1] - prefix[a]) / (b - a + 1);
      if (j < w || j > n - 1 - w) mean = Math.min(mean, gmed * 4);
      var v = e[j] - mean;
      out[j] = v > 0 ? v : 0;
    }
    return out;
  }

  function lowEnergyPeak(e, tSec, halfWinSec) {
    var c = Math.round(tSec * ANALYSIS_SR);
    var w = Math.round((halfWinSec || 0.022) * ANALYSIS_SR);
    var a = Math.max(0, c - w), b = Math.min(e.length - 1, c + w), m = 0;
    for (var i = a; i <= b; i++) if (e[i] > m) m = e[i];
    return m;
  }

  /* ── refinamento sub-amostrado dos marcos ────────────────────
     Para cada batida aproxima o instante exato do ataque: pico da
     derivada da energia de baixo (subida mais íngreme) no entorno,
     com interpolação parabólica → precisão < 1 ms.            */
  function refineBeatTimes(lowE, beats) {
    var SR = ANALYSIS_SR, maxS = lowE.length - 2;
    var w = Math.round(0.055 * SR); // ±55 ms
    for (var b = 0; b < beats.length; b++) {
      var c = Math.round(beats[b].time * SR);
      var a = Math.max(1, c - w), z = Math.min(maxS, c + w);
      var dPrev = lowE[a - 1], best = 0, bi = -1;
      for (var i = a; i <= z; i++) {
        var d = lowE[i] - dPrev;
        dPrev = lowE[i];
        if (d > best) { best = d; bi = i; }
      }
      if (bi > 0 && best > 0) {
        var dm1 = bi > 1 ? lowE[bi - 1] - lowE[bi - 2] : best;
        var d0 = lowE[bi] - lowE[bi - 1];
        var dp1 = bi < maxS ? lowE[bi + 1] - lowE[bi] : d0;
        var off = parabolicOffset(dm1, d0, dp1);
        beats[b].time = (bi + off) / SR;
      }
    }
  }

  /* ── remoção de média local + normalização robusta ──────────
     Referência = percentil 97 (não o máximo): um pico de borda ou
     um crash isolado não pode comprimir todos os outros picos.   */
  function normalizeNovelty(nov, fr) {
    var n = nov.length;
    var w = Math.max(4, Math.round(0.4 * fr)); // ± 400 ms
    var prefix = new Float64Array(n + 1);
    for (var i = 0; i < n; i++) prefix[i + 1] = prefix[i] + nov[i];
    var out = new Float32Array(n);
    for (var j = 0; j < n; j++) {
      var a = Math.max(0, j - w), b = Math.min(n - 1, j + w);
      var mean = (prefix[b + 1] - prefix[a]) / (b - a + 1);
      var v = nov[j] - mean;
      out[j] = v < 0 ? 0 : v;
    }
    /* percentil 97 somente dos valores não-nulos (a maior parte da grade é zero) */
    var positives = [];
    for (var p = 0; p < n; p++) if (out[p] > 0) positives.push(out[p]);
    if (positives.length) {
      positives.sort(function (a, b) { return a - b; });
      var ref = positives[Math.min(positives.length - 1, Math.floor(0.97 * (positives.length - 1)))];
      if (!(ref > 0)) ref = positives[positives.length - 1];
      if (ref > 0) {
        var inv = 1 / ref;
        for (var k = 0; k < n; k++) { var nv = out[k] * inv; out[k] = nv > 1 ? 1 : nv; }
      }
    }
    return out;
  }

  function sampleAt(arr, pos) {
    var i = Math.floor(pos);
    if (i < 0) return arr[0];
    if (i >= arr.length - 1) return arr[arr.length - 1];
    var f = pos - i;
    return arr[i] * (1 - f) + arr[i + 1] * f;
  }

  /* ── comb-filter: melhor (fase, escore) para um período ───── */
  function combAt(nov, fr, bpm) {
    var period = 60 * fr / bpm;
    function sumAtPhase(phase) {
      var sum = 0, cnt = 0;
      for (var t = phase; t < nov.length; t += period) {
        var i = Math.floor(t), f = t - i;
        var v0 = nov[i], v1 = (i + 1 < nov.length ? nov[i + 1] : 0);
        sum += v0 + (v1 - v0) * f;
        cnt++;
      }
      return { sum: sum, cnt: cnt };
    }
    /* objetivo balanceado sum/√cnt: penaliza grade esparsa demais (meio-tempo)
       sem favorecer o dobro do tempo — o mean puro sempre perde para grades
       mais esparsas (só os downbeats mais fortes) */
    function scoreOf(r) { return r.cnt ? r.sum / Math.sqrt(r.cnt) : 0; }
    var PH = 40, bestScore = -1, bestPhase = 0, bestSum = 0, bestCnt = 0, p, phase, s;
    for (p = 0; p < PH; p++) {
      phase = (p + 0.5) * (period / PH);
      var r = sumAtPhase(phase);
      s = scoreOf(r);
      if (s > bestScore) { bestScore = s; bestPhase = phase; bestSum = r.sum; bestCnt = r.cnt; }
    }
    // refino local de fase (±1 divisão, 16 sub-passos)
    var half = (period / PH) / 8;
    for (var k = -8; k <= 8; k++) {
      var ph2 = bestPhase + k * half;
      if (ph2 < 0) continue;
      var r2 = sumAtPhase(ph2);
      var s2 = scoreOf(r2);
      if (s2 > bestScore) { bestScore = s2; bestPhase = ph2; bestSum = r2.sum; bestCnt = r2.cnt; }
    }
    return { score: bestScore, phase: bestPhase, period: period, mean: bestCnt ? bestSum / bestCnt : 0 };
  }

  /* ── estimativa de andamento ──────────────────────────────── */
  function estimateTempo(nov, fr) {
    var n = nov.length;
    var minLag = Math.max(2, Math.floor(fr * 60 / 212));
    var maxLag = Math.min(n - 2, Math.ceil(fr * 60 / 55));
    var extLag = Math.min(n - 1, maxLag * 2 + 1);

    var prefix = new Float64Array(n + 1);
    for (var i = 0; i < n; i++) prefix[i + 1] = prefix[i] + nov[i] * nov[i];

    var ac = new Float32Array(extLag + 1);
    for (var lag = minLag; lag <= extLag; lag++) {
      var sum = 0;
      for (var j = 0; j + lag < n; j++) sum += nov[j] * nov[j + lag];
      var e1 = prefix[n - lag], e2 = prefix[n] - prefix[lag];
      ac[lag] = sum / (Math.sqrt(e1 * e2) + 1e-9);
    }

    // combinação harmônica (favorece o lag cujo 2× e 3× também batem)
    var comb = new Float32Array(maxLag + 1);
    for (var l = minLag; l <= maxLag; l++) {
      var c = ac[l];
      if (2 * l <= extLag) c += 0.55 * ac[2 * l];
      if (3 * l <= extLag) c += 0.20 * ac[3 * l];
      comb[l] = c;
    }

    var peaks = [];
    for (var p = minLag + 1; p < maxLag; p++) {
      if (comb[p] >= comb[p - 1] && comb[p] > comb[p + 1]) peaks.push({ lag: p, score: comb[p] });
    }
    peaks.sort(function (a, b) { return b.score - a.score; });

    var cand = [];
    for (var q = 0; q < peaks.length && cand.length < 4; q++) {
      var bpmC = 60 * fr / peaks[q].lag;
      var dup = false;
      for (var m = 0; m < cand.length; m++) if (Math.abs(cand[m] - bpmC) / bpmC < 0.04) { dup = true; break; }
      if (!dup) cand.push(bpmC);
    }
    if (!cand.length) cand.push(120);

    var best = null;
    for (var ci = 0; ci < cand.length; ci++) {
      var lo = Math.max(55, cand[ci] - 2.5), hi = Math.min(215, cand[ci] + 2.5);
      for (var bpm = lo; bpm <= hi; bpm += 0.1) {
        var r = combAt(nov, fr, bpm);
        if (!best || r.score > best.score) best = { bpm: bpm, score: r.score, phase: r.phase, period: r.period, mean: r.mean };
      }
    }
    // preferência por meio-tempo quando o encaixe é praticamente equivalente
    // — grades duplas "acidentalmente" periódicas (waltz com hats em colcheias)
    // empatam em sum/√cnt com o meio-tempo; o tempo mais lento é o musical.
    var lowHalf = best.bpm / 2;
    if (lowHalf >= 55) {
      var rHalf = combAt(nov, fr, lowHalf);
      for (var b2 = lowHalf - 1.5; b2 <= lowHalf + 1.5 && b2 >= 55; b2 += 0.1) {
        var r3 = combAt(nov, fr, b2);
        if (r3.score > rHalf.score) rHalf = r3;
      }
      if (rHalf.score >= 0.92 * best.score) { best = rHalf; best.bpm = 60 * fr / best.period; }
    }
    // polimento fino ±0.15 BPM @ 0.05 BPM
    var c2 = best.bpm;
    for (var bpm2 = c2 - 0.15; bpm2 <= c2 + 0.15; bpm2 += 0.05) {
      if (bpm2 <= 0) continue;
      var r2 = combAt(nov, fr, bpm2);
      if (r2.score > best.score) best = { bpm: bpm2, score: r2.score, phase: r2.phase, period: r2.period, mean: r2.mean };
    }
    return best;
  }

  /* ── grade de batidas + snap sub-frame ────────────────────── */
  function buildBeats(nov, fr, periodFrames, phaseFrames) {
    var beats = [];
    var snapWin = Math.max(2, Math.round(periodFrames * 0.08)); // ±8% do período (máx ~70 ms)
    var gridStart = phaseFrames - periodFrames; // possível slot do t≈0 (downbeat inicial)
    if (gridStart > 0 || gridStart < -periodFrames * 0.3) gridStart = phaseFrames;

    /* slot líder: só entra se houver onset real no início do arquivo
       (o kick do t≈0 vive no espectro do primeiro frame)            */
    if (gridStart < 0) {
      var leadWin = Math.max(2, Math.round(0.055 * fr));
      var leadMax = -1, leadIdx = -1;
      for (var li = 0; li <= Math.min(leadWin, nov.length - 1); li++) {
        if (nov[li] > leadMax) { leadMax = nov[li]; leadIdx = li; }
      }
      if (leadIdx >= 0 && leadMax > 0.12) {
        beats.push({ frame: leadIdx, time: leadIdx / fr + HALF_WINDOW_SEC, strength: sampleAt(nov, leadIdx) });
      }
    }

    for (var t = Math.max(0, gridStart); t < nov.length - 1; t += periodFrames) {
      var st = t;
      var ci = Math.round(t);
      var lo = Math.max(0, ci - snapWin), hi = Math.min(nov.length - 1, ci + snapWin);
      var mi = lo, mv = -1;
      for (var i = lo; i <= hi; i++) if (nov[i] > mv) { mv = nov[i]; mi = i; }
      if (mv > 0.12) {
        var off = (mi > 0 && mi < nov.length - 1) ? parabolicOffset(nov[mi - 1], nov[mi], nov[mi + 1]) : 0;
        st = mi + off;
      }
      beats.push({ frame: st, time: st / fr + HALF_WINDOW_SEC, strength: sampleAt(nov, st) });
    }
    /* remove slots que colapsaram no mesmo onset (ex.: slot líder + primeiro da grade) */
    if (beats.length > 1) {
      var periodSec = periodFrames / fr;
      var minGap = periodSec * 0.4;
      var deduped = [beats[0]];
      for (var bi = 1; bi < beats.length; bi++) {
        var prev = deduped[deduped.length - 1], cur = beats[bi];
        if (cur.time - prev.time < minGap) {
          if (cur.strength > prev.strength) deduped[deduped.length - 1] = cur;
        } else {
          deduped.push(cur);
        }
      }
      beats = deduped;
    }
    return beats;
  }

  /* ── compasso + tempo forte ───────────────────────────────── */
  var SIG = {
    2: { top: '2', bottom: '4', label: '2/4', sub: '2 tempos por compasso' },
    3: { top: '3', bottom: '4', label: '3/4', sub: '3 tempos por compasso · valsa' },
    4: { top: '4', bottom: '4', label: '4/4', sub: '4 tempos por compasso' },
    6: { top: '6', bottom: '8', label: '6/8', sub: 'compasso composto · 2 pulsos de 3' }
  };

  function analyzeMeter(nov, beats) {
    var n = beats.length;
    var s = new Float32Array(n);
    var mean = 0, i;
    for (i = 0; i < n; i++) { s[i] = beats[i].strength; mean += s[i]; }
    mean /= Math.max(1, n);
    var varSum = 0;
    for (i = 0; i < n; i++) varSum += (s[i] - mean) * (s[i] - mean);
    var V = varSum / Math.max(1, n);
    var sd = Math.sqrt(V) || 1e-6;

    var groups = [2, 3, 4, 6];
    var results = [];
    for (var gi = 0; gi < groups.length; gi++) {
      var m = groups[gi];
      var sums = new Float64Array(m), counts = new Float64Array(m);
      for (i = 0; i < n; i++) { var r = i % m; sums[r] += s[i]; counts[r]++; }
      var means = new Float64Array(m);
      for (i = 0; i < m; i++) means[i] = counts[i] ? sums[i] / counts[i] : 0;
      /* variância residual após ajuste por slot → % explicada pelo agrupamento */
      var resSum = 0;
      for (i = 0; i < n; i++) { var d = s[i] - means[i % m]; resSum += d * d; }
      var explained = V > 1e-9 ? clamp01(1 - (resSum / n) / V) : 0;
      var accentIdx = 0;
      for (i = 1; i < m; i++) if (means[i] > means[accentIdx]) accentIdx = i;
      var accent = means[accentIdx];
      /* contraste vs slots FRACOS apenas — slots com energia acima da média
         (ex.: kick no 3º tempo em backbeat) funcionam como subacentos de
         compasso e não devem diluir o contraste do acento principal        */
      var slotAvg = 0;
      for (i = 0; i < m; i++) slotAvg += means[i];
      slotAvg /= m;
      var restSum = 0, restCnt = 0;
      for (i = 0; i < m; i++) {
        if (i === accentIdx || means[i] > slotAvg * 1.05) continue;
        restSum += means[i]; restCnt++;
      }
      var restMean = restCnt ? restSum / restCnt : accent * 0.5;
      var z = (accent - mean) / sd;
      var ratio = accent / (restMean + 1e-6);
      /* pontuação: variância explicada (dominante) + contraste do acento − penalidade de complexidade */
      var prior = (m === 4) ? 0.32 : (m === 6 ? -0.05 : 0);
      var score = explained * 3 + 0.9 * Math.log(Math.max(ratio, 1e-3) + 0.35) + 0.12 * z - 0.07 * (m - 2) + prior;
      results.push({ m: m, accentIdx: accentIdx, means: Array.from(means), z: z, ratio: ratio, explained: explained, score: score });
    }
    results.sort(function (a, b) { return b.score - a.score; });
    var best = results[0], second = results[1];
    var margin = best.score - (second ? second.score : 0);

    var mChosen = best.m, accChosen = best.accentIdx;

    var m2 = mChosen, acc = accChosen;
    for (i = 0; i < n; i++) {
      var rel = (((i - acc) % m2) + m2) % m2;
      beats[i].beatInMeasure = rel + 1;
      beats[i].isDownbeat = rel === 0;
      var meas = Math.floor((i - acc) / m2) + 1;
      beats[i].measure = meas < 1 ? 0 : meas; // 0 = anacruse (levada)
    }

    return {
      meter: m2, accentIndex: acc, accentPosition: 1, z: best.z, ratio: best.ratio,
      explained: best.explained, margin: margin, score: best.score, means: best.means,
      ranking: results.map(function (r) { return { meter: r.m, score: r.score, z: r.z, explained: r.explained }; })
    };
  }

  function computeConfidence(est, meanNov, meter) {
    var slotMean = (est && est.mean != null) ? est.mean : ((est && est.score) || 0);
    var pulseClarity = clamp01((slotMean / (meanNov + 1e-6) - 0.8) / 2.6);
    var accentQ = clamp01((meter.explained != null ? meter.explained : meter.z / 2.4) * 2.2);
    var marginQ = clamp01(meter.margin / 1.4);
    var conf = 100 * clamp01(0.30 * pulseClarity + 0.52 * accentQ + 0.18 * marginQ);
    return Math.max(6, Math.min(98, Math.round(conf)));
  }

  /* ── picos de forma de onda para desenhar ─────────────────── */
  function computePeaks(rs, bucketSec) {
    var bucket = Math.max(1, Math.floor(ANALYSIS_SR * (bucketSec || 0.008)));
    var count = Math.ceil(rs.length / bucket);
    var min = new Float32Array(count), max = new Float32Array(count);
    for (var b = 0; b < count; b++) {
      var lo = b * bucket, hi = Math.min(rs.length, lo + bucket);
      var mn = 1, mx = -1;
      for (var i = lo; i < hi; i++) { var v = rs[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
      min[b] = mn; max[b] = mx;
    }
    return { min: min, max: max, bucketSec: bucketSec || 0.008 };
  }

  /* ── entrada principal ─────────────────────────────────────── */
  async function analyze(buffer, onStage, isCancelled) {
    function stage(p, s) { if (onStage) onStage({ progress: p, stage: s }); }

    stage(4, 'Preparando áudio…');
    await tick();
    var mono = mixToMono(buffer);

    stage(9, 'Reamostrando para 11.025 Hz (alta qualidade)…');
    var rs = await resampleHQ(mono, buffer.sampleRate, ANALYSIS_SR);

    var spec = await spectrumNovelty(rs, function (f) {
      stage(12 + Math.round(f * 34), 'Extraindo transientes (spectral flux)…');
    }, isCancelled);

    stage(48, 'Isolando baixas frequências (bumbo/baixo)…');
    await tick();
    var lowE = lowBandEnvelope(rs);
    var lowETransient = transientEnvelope(lowE, 0.18);
    var midE = midBandEnvelope(rs);
    var midETransient = transientEnvelope(midE, 0.18);

    stage(53, 'Removendo ruído de fundo do envelope…');
    await tick();
    var nov = normalizeNovelty(spec.novelty, spec.frameRate);

    var meanSum = 0;
    for (var i = 0; i < nov.length; i++) meanSum += nov[i];
    var meanNov = meanSum / nov.length;

    stage(60, 'Estimando andamento — autocorrelação + comb filters…');
    await tick();
    var est = estimateTempo(nov, spec.frameRate);

    if (isCancelled && isCancelled()) { var e = new Error('cancelled'); e.name = 'AbortError'; throw e; }

    stage(80, 'Sincronizando grade de batidas (snap sub-frame)…');
    await tick();
    var beats = buildBeats(nov, spec.frameRate, est.period, est.phase);

    refineBeatTimes(lowE, beats);

    /* força de cada tempo = resíduos transitórios de grave E banda média
       (ataque de bumbo / caixa) — pedestal contínuo removido nos dois.   */
    var ei, lowVals = new Float32Array(beats.length), midVals = new Float32Array(beats.length);
    for (ei = 0; ei < beats.length; ei++) {
      lowVals[ei] = lowEnergyPeak(lowETransient, beats[ei].time, 0.035);
      midVals[ei] = lowEnergyPeak(midETransient, beats[ei].time, 0.035);
    }
    function p97(arr) {
      var s = Array.from(arr).sort(function (a, b) { return a - b; });
      var v = s[Math.min(s.length - 1, Math.floor(0.97 * (s.length - 1)))];
      return v > 0 ? v : (s[s.length - 1] || 1);
    }
    var refL = p97(lowVals), refM = p97(midVals);
    for (ei = 0; ei < beats.length; ei++) {
      var sL = Math.min(1, lowVals[ei] / refL);
      var sM = Math.min(1, midVals[ei] / refM);
      beats[ei].strength = clamp01(0.72 * sL + 0.28 * sM);
    }
    /* descarta slots fantasma de borda (grade inicia/termina fora da música) */
    while (beats.length && beats[0].strength < 0.05) beats.shift();
    while (beats.length && beats[beats.length - 1].strength < 0.05) beats.pop();

    stage(88, 'Classificando compasso e acento…');
    await tick();
    var meter = analyzeMeter(nov, beats);

    stage(95, 'Renderizando picos de forma de onda…');
    await tick();
    var peaks = computePeaks(rs, 0.008);

    var sig = SIG[meter.meter] || SIG[4];
    var confidence = computeConfidence(est, meanNov, meter);
    var downbeats = 0;
    for (var d = 0; d < beats.length; d++) if (beats[d].isDownbeat) downbeats++;
    var measures = 0;
    for (var b = 0; b < beats.length; b++) if (beats[b].measure > measures) measures = beats[b].measure;

    stage(100, 'Pronto');
    return {
      bpm: est.bpm,
      beatPeriod: est.period / spec.frameRate,
      duration: buffer.duration,
      beats: beats,
      beatCount: beats.length,
      downbeatCount: downbeats,
      measureCount: measures,
      beatsPerMeasure: meter.meter,
      accentIndex: meter.accentIndex,
      accentPosition: 1, // a grade é renumerada para o slot acentuado = tempo 1
      timeSignature: sig,
      confidence: confidence,
      peakStrengthRatio: meter.ratio,
      meterRanking: meter.ranking,
      meterMargin: meter.margin,
      peaks: peaks,
      firstDownbeat: (beats.find(function (bt) { return bt.isDownbeat; }) || beats[0] || { time: 0 }).time
    };
  }

  return {
    analyze: analyze,
    mixToMono: mixToMono,
    SIG: SIG
  };
})();
