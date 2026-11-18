/* ============================================================
   Web Worker: roda a detecção/alteração de tom fora da thread
   principal, para não travar a tela enquanto processa.
============================================================ */
importScripts('dsp_core.js');

self.onmessage = function(e){
  const data = e.data || {};
  const id = data.id, cmd = data.cmd, sr = data.sr;
  try{
    if (cmd === 'detectar'){
      const samples = new Float32Array(data.samples);
      const resultado = DSP.detectarTom(samples, sr);
      self.postMessage({ id, ok:true, resultado });
    } else if (cmd === 'transpor'){
      const samples = new Float32Array(data.samples);
      const semitons = data.semitons || 0;
      const novo = DSP.mudarTom(samples, semitons, 2048, 512);
      const wav = DSP.encodeWAV(novo, sr);
      self.postMessage({ id, ok:true, wav, sr }, [wav]);
    } else {
      self.postMessage({ id, ok:false, erro:'Comando desconhecido: '+cmd });
    }
  } catch(err){
    self.postMessage({ id, ok:false, erro:(err && err.message) || String(err) });
  }
};
