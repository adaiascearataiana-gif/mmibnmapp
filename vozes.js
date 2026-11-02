/* ============================================================
   MM IBNM — Áudios por voz (v1.0.0)
   Na aba Áudio de cada música (ADM): PRINCIPAL, BACK 1 e BACK 2.
   Cada um: gravar / enviar arquivo / colar link, marcar o cantor
   (quem tem voz no cadastro, com prévia ao digitar) e 💾 Salvar.
   Quem for marcado recebe notificação.
============================================================ */
(function(){
'use strict';
const e = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sem = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const $id = id => document.getElementById(id);
const SLOTS=[['principal','🎤 PRINCIPAL'],['back1','🎶 BACK 1'],['back2','🎶 BACK 2']];
const NOME_SLOT={principal:'Principal',back1:'Back 1',back2:'Back 2'};
const PEND={};                        /* PEND[slot] = {blob, url, ext, cantor_id, cantor_nome, mexeu} */
let MID=null;

function cantores(q){
  const t=sem(q).split(/\s+/).filter(Boolean);
  return (DB.usuarios||[]).filter(u=>(u.vocal||[]).length && t.every(x=>sem(u.nome).includes(x)))
    .sort((a,b)=>a.nome.localeCompare(b.nome,'pt')).slice(0,8);
}
const audioDo = (m,slot) => (m.audios||[]).find(a=>a.slot===slot) || null;
function cartao(m){
  MID=m.id;
  return '<div class="card vz-card"><h3>🎧 Áudios por voz <span class="admin-tag">ADM</span></h3><p class="vz-p">Grave ou envie o áudio de cada voz, marque quem canta e toque em <b>Salvar</b>. A pessoa marcada recebe uma notificação.</p>'+
    SLOTS.map(([k,t])=>slotHTML(m,k,t)).join('')+'</div>';
}
function slotHTML(m,k,t){
  const a=audioDo(m,k); const p=PEND[k]||{};
  const cid=p.cantor_id!==undefined? p.cantor_id : (a&&a.cantor_id)||''; const cnome=p.cantor_nome!==undefined? p.cantor_nome : (a&&a.cantor_nome)||'';
  return '<div class="vz-slot" id="vz_'+k+'"><div class="vz-h"><b>'+t+'</b>'+(a&&a.url?'<span class="vz-ok">✔ tem áudio</span>':'<span class="vz-no">sem áudio</span>')+'</div>'+
    (a&&a.url?'<div class="vz-atual"><audio controls preload="none" src="'+e(a.url)+'"></audio><button class="vz-del" onclick="vzRemover(\''+k+'\')" aria-label="Remover áudio">🗑️</button></div>':'')+
    '<div class="vz-acts"><button class="vz-b rec" id="vzRec_'+k+'" onclick="vzGravar(\''+k+'\')">🎙️ '+(a&&a.url?'Regravar':'Gravar')+'</button>'+
      '<button class="vz-b" onclick="vzArquivo(\''+k+'\')">📁 Enviar arquivo</button><input type="file" id="vzArq_'+k+'" hidden accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac" onchange="vzArquivoEscolhido(\''+k+'\',this)">'+
      '<button class="vz-b" onclick="vzLink(\''+k+'\')">🔗 Link</button></div>'+
    '<div class="vz-prev" id="vzPrev_'+k+'">'+(p.blob||p.url? previaHTML(k) : '')+'</div>'+
    '<div class="vz-cant"><label>Quem canta</label><input id="vzCan_'+k+'" autocomplete="off" placeholder="Digite o nome (só quem tem voz no cadastro)" value="'+e(cnome)+'" data-id="'+e(cid)+'" oninput="vzBusca(\''+k+'\')" onfocus="vzFecha(\''+k+'\')" onblur="setTimeout(()=>vzFecha(),180)">'+
      '<div class="vz-sug" id="vzSug_'+k+'"></div></div>'+
    '<button class="vz-salvar" onclick="vzSalvar(\''+k+'\')">💾 Salvar '+NOME_SLOT[k]+'</button></div>';
}
function previaHTML(k){ const p=PEND[k]||{}; const src=p.blob? URL.createObjectURL(p.blob) : p.url;
  return '<div class="vz-novo">Novo áudio (ainda não salvo)'+(p.blob?' · '+Math.max(1,Math.round(p.blob.size/1024))+' KB':'')+'<audio controls src="'+e(src)+'"></audio></div>'; }
function redesenha(){ const c=document.querySelector('.vz-card'); const m=(DB.musicas||[]).find(x=>x.id===MID); if(c&&m) c.outerHTML=cartao(m); }

/* ---------- cantor com prévia ---------- */
/* fecha as listas de sugestão (todas, ou todas menos a do campo k) */
window.vzFecha=function(exceto){ document.querySelectorAll('.vz-sug').forEach(b=>{ if(!exceto || b.id!=='vzSug_'+exceto) b.innerHTML=''; }); };
window.vzBusca=function(k){
  const inp=$id('vzCan_'+k), box=$id('vzSug_'+k); if(!inp||!box) return;
  vzFecha(k);
  inp.dataset.id=''; PEND[k]=Object.assign(PEND[k]||{},{cantor_id:'',cantor_nome:inp.value,mexeu:true});
  if(!inp.value.trim()){ box.innerHTML=''; return; }            /* só mostra a lista quando começa a digitar */
  const lista=cantores(inp.value);
  box.innerHTML=lista.length? lista.map(u=>'<button type="button" onmousedown="event.preventDefault()" onclick="vzEscolhe(\''+k+'\',\''+e(u.id)+'\')">'+(u.foto?'<img src="'+e(u.foto)+'" alt="">':'<span class="ini">'+e((u.nome||'?').charAt(0))+'</span>')+'<span><b>'+e(u.nome)+'</b><small>'+e((u.vocal||[]).join(', '))+'</small></span></button>').join('')
    : '<div class="vz-nada">Ninguém com voz cadastrada com esse nome.</div>';
};
window.vzEscolhe=function(k,uid){
  const u=(DB.usuarios||[]).find(x=>x.id===uid); if(!u) return;
  const inp=$id('vzCan_'+k); inp.value=u.nome; inp.dataset.id=u.id; vzFecha(); inp.blur();
  PEND[k]=Object.assign(PEND[k]||{},{cantor_id:u.id,cantor_nome:u.nome,mexeu:true});
};
document.addEventListener('click',ev=>{ if(!ev.target.closest('.vz-cant')) document.querySelectorAll('.vz-sug').forEach(b=>b.innerHTML=''); });

/* ---------- áudio: gravar / arquivo / link ---------- */
let REC=null;
window.vzGravar=async function(k){
  if(REC && REC.mr.state==='recording'){ REC.mr.stop(); return; }
  if(!window.MediaRecorder||!navigator.mediaDevices) return toast('Este navegador não grava áudio. Use "Enviar arquivo".');
  const D=window.__drive; if(D && D.ok() && !D.conectado()){ const ok=await D.conectar(); if(!ok) return; }
  let st; try{ st=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}}); }catch(_){ return toast('Permita o uso do microfone para gravar.'); }
  const tipos=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/webm']; let tipo=''; for(const t of tipos){ try{ if(MediaRecorder.isTypeSupported(t)){ tipo=t; break; } }catch(_){} }
  const mr=new MediaRecorder(st,tipo?{mimeType:tipo,audioBitsPerSecond:64000}:{}); REC={mr,st,partes:[],k,ini:Date.now()};
  mr.ondataavailable=ev=>{ if(ev.data&&ev.data.size) REC.partes.push(ev.data); };
  mr.onstop=()=>{ clearInterval(REC.t); REC.st.getTracks().forEach(t=>t.stop()); const b=new Blob(REC.partes,{type:mr.mimeType||tipo||'audio/webm'});
    const t=b.type; PEND[k]=Object.assign(PEND[k]||{},{blob:b,url:'',ext:/mp4|m4a|aac/.test(t)?'m4a':/ogg/.test(t)?'ogg':'webm',mexeu:true}); REC=null;
    const bt=$id('vzRec_'+k); if(bt){ bt.classList.remove('on'); bt.textContent='🎙️ Regravar'; } const pv=$id('vzPrev_'+k); if(pv) pv.innerHTML=previaHTML(k); };
  mr.start(1000);
  const bt=$id('vzRec_'+k); if(bt){ bt.classList.add('on'); }
  REC.t=setInterval(()=>{ const s=Math.floor((Date.now()-REC.ini)/1000); const b=$id('vzRec_'+k); if(b) b.textContent='⏹ Parar ('+Math.floor(s/60)+':'+String(s%60).padStart(2,'0')+')'; if(s>=600) mr.stop(); },500);
};
window.vzArquivo=function(k){
  const D=window.__drive; if(!D||!D.ok()) return toast('Configure o Google Drive no Painel do ADM primeiro.');
  if(!D.conectado()){ D.conectar().then(ok=>{ if(ok) toast('Conectado! Toque de novo em "Enviar arquivo".'); }); return; }
  const i=$id('vzArq_'+k); if(i) i.click();
};
window.vzArquivoEscolhido=function(k,inp){ const f=inp.files&&inp.files[0]; inp.value=''; if(!f) return;
  PEND[k]=Object.assign(PEND[k]||{},{blob:f,url:'',ext:(f.name.split('.').pop()||'mp3').toLowerCase(),mexeu:true}); const pv=$id('vzPrev_'+k); if(pv) pv.innerHTML=previaHTML(k); };
window.vzLink=function(k){
  let v=prompt('Cole o link do áudio (Google Drive, MP3…):'); if(!v) return; v=v.trim();
  const d=v.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=)([-\w]{20,})/); let url=v;
  if(d) url=(typeof driveUrl==='function'? driveUrl(d[1]) : 'https://drive.google.com/uc?export=download&id='+d[1]);
  else if(!/^https?:\/\//i.test(v)) return toast('Link inválido.');
  PEND[k]=Object.assign(PEND[k]||{},{blob:null,url,mexeu:true}); const pv=$id('vzPrev_'+k); if(pv) pv.innerHTML=previaHTML(k);
};

/* ---------- salvar ---------- */
async function gravaLista(m){
  const ordem={principal:0,back1:1,back2:2};
  m.audios=(m.audios||[]).slice().sort((a,b)=>(a.slot?ordem[a.slot]:9)-(b.slot?ordem[b.slot]:9));
  const {error}=await sb.from('musicas').update({audios:m.audios}).eq('id',m.id);
  if(error){ toast('Erro ao salvar: '+error.message); return false; } return true;
}
window.vzSalvar=async function(k){
  const m=(DB.musicas||[]).find(x=>x.id===MID); if(!m) return;
  const p=PEND[k]||{}; const atual=audioDo(m,k);
  const inp=$id('vzCan_'+k); const cid=inp? inp.dataset.id||'' : (p.cantor_id||'');
  const u=cid? (DB.usuarios||[]).find(x=>x.id===cid) : null;
  if(inp && inp.value.trim() && !u) return toast('Escolha o cantor na lista (só quem tem voz no cadastro).');
  if(!atual && !p.blob && !p.url) return toast('Grave, envie ou cole o link do áudio de '+NOME_SLOT[k]+' antes de salvar.');
  const bt=document.querySelector('#vz_'+k+' .vz-salvar'); if(bt){ bt.disabled=true; bt.textContent='Salvando…'; }
  try{
    let url=atual? atual.url : '', drive=atual? atual.drive : '';
    if(p.blob){
      const D=window.__drive; if(!D||!D.ok()) throw new Error('Configure o Google Drive no Painel do ADM.');
      if(!D.conectado()){ const ok=await D.conectar(); if(!ok) throw new Error('Conecte ao Google Drive.'); }
      const nomeArq=(m.titulo+' - '+NOME_SLOT[k]+(u?' - '+u.nome:'')).replace(/[\\/:*?"<>|]+/g,' ').slice(0,90)+'.'+(p.ext||'webm');
      const fid=await D.sobe(p.blob,nomeArq,'MM IBNM - Áudios',f=>{ if(bt) bt.textContent='Enviando… '+Math.round(f*100)+'%'; });
      url=(typeof driveUrl==='function'? driveUrl(fid) : 'https://drive.google.com/uc?export=download&id='+fid); drive=fid;
    } else if(p.url){ url=p.url; drive=''; }
    const novo={slot:k,nome:NOME_SLOT[k]+(u?' — '+u.nome:''),url,drive:drive||'',cantor_id:u?u.id:'',cantor_nome:u?u.nome:''};
    const antes=atual? atual.cantor_id : '';
    m.audios=(m.audios||[]).filter(a=>a.slot!==k); m.audios.push(novo);
    if(!(await gravaLista(m))) throw new Error('não salvou');
    delete PEND[k];
    /* avisa quem foi marcado (se mudou ou se o áudio é novo) */
    const eu=(typeof usuarioAtual==='function'&&usuarioAtual())||{};
    if(u && u.email!==eu.email && (u.id!==antes || p.blob || p.url)){
      notificar(u.email,'🎤','Você foi marcado(a) em um áudio','"'+m.titulo+'" — voz '+NOME_SLOT[k].toUpperCase()+'. Toque para ouvir e ensaiar.',{link:'musaudio:'+m.id});
      toast(NOME_SLOT[k]+' salvo. '+u.nome.split(' ')[0]+' foi avisado(a). 🔔');
    } else toast(NOME_SLOT[k]+' salvo.');
    redesenha();
  }catch(err){ toast('Não foi possível salvar: '+(err.message||err)); if(bt){ bt.disabled=false; bt.textContent='💾 Salvar '+NOME_SLOT[k]; } }
};
window.vzRemover=async function(k){
  const m=(DB.musicas||[]).find(x=>x.id===MID); if(!m) return; const a=audioDo(m,k); if(!a) return;
  if(!confirm('Remover o áudio de '+NOME_SLOT[k]+'?')) return;
  m.audios=(m.audios||[]).filter(x=>x.slot!==k);
  if(await gravaLista(m)){ try{ if(a.drive && window.__drive && window.__drive.conectado() && typeof _gisTok!=='undefined') fetch('https://www.googleapis.com/drive/v3/files/'+a.drive,{method:'DELETE',headers:{Authorization:'Bearer '+_gisTok}}); }catch(_){} toast('Áudio removido.'); redesenha(); }
};

/* ---------- na aba Áudio ---------- */
if(typeof renderMusica==='function'){
  const _rm=renderMusica;
  window.renderMusica=renderMusica=function(){
    let h=_rm.apply(this,arguments);
    try{ if(typeof h==='string' && abaAtual==='audio' && ehAdmin()){ const m=DB.musicas.find(x=>x.id===musicaAberta);
      if(m){ if(MID!==m.id){ Object.keys(PEND).forEach(k=>delete PEND[k]); }
        const k=h.indexOf('<div class="card au-card">'); const bloco=cartao(m);
        h = k>=0? h.slice(0,k)+bloco+h.slice(k).replace('🎧 Áudios da música','📂 Outros áudios') : h.slice(0,h.lastIndexOf('</div>'))+bloco+h.slice(h.lastIndexOf('</div>')); } } }catch(_){}
    return h;
  };
}
const st=document.createElement('style'); st.textContent=`
.vz-p{font-size:12.5px;color:#556;margin:0 0 10px}
.vz-slot{border:1px solid #e3ece7;border-radius:14px;padding:12px;margin-bottom:12px;background:#fbfdfc}
.vz-h{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.vz-h b{font-size:15px;color:var(--verde-escuro);flex:1}
.vz-ok{font-size:11px;font-weight:800;color:#1c6b47;background:#e1f4ea;border-radius:10px;padding:2px 8px}
.vz-no{font-size:11px;font-weight:800;color:#8a9;background:#eef1ef;border-radius:10px;padding:2px 8px}
.vz-atual{display:flex;gap:6px;align-items:center;margin-bottom:8px}
.vz-atual audio{flex:1;min-width:0;height:40px}
.vz-del{border:1px solid #efc2ba;background:#fff5f3;border-radius:10px;width:42px;height:40px}
.vz-acts{display:flex;gap:6px;flex-wrap:wrap}
.vz-b{flex:1;min-width:96px;height:42px;border-radius:12px;border:1px solid var(--verde-med);background:#fff;color:var(--verde-escuro);font-weight:800;font-size:13px}
.vz-b.rec{background:#c0392b;border-color:#c0392b;color:#fff}
.vz-b.rec.on{animation:auPulse 1s infinite}
.vz-novo{margin-top:8px;background:#fff8dc;border:1px solid #f0d97a;border-radius:10px;padding:8px;font-size:12px;font-weight:700;color:#5a4700}
.vz-novo audio{width:100%;margin-top:6px}
.vz-cant{position:relative;margin-top:10px}
.vz-cant label{display:block;font-size:12px;font-weight:800;color:#5d7c6e;margin-bottom:4px}
.vz-cant input{width:100%;height:42px;border:1px solid #cfdad4;border-radius:10px;padding:0 12px;font-size:14px;background:#fff;box-sizing:border-box}
.vz-sug{display:flex;flex-direction:column;gap:4px;margin-top:4px}
.vz-sug:empty{display:none}
.vz-sug button{display:flex;align-items:center;gap:10px;border:1px solid #dfe7e3;background:#fff;border-radius:10px;padding:6px 10px;text-align:left}
.vz-sug img,.vz-sug .ini{width:30px;height:30px;border-radius:50%;object-fit:cover;background:var(--verde-med);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;flex:none}
.vz-sug span{display:flex;flex-direction:column}
.vz-sug b{font-size:14px;color:var(--verde-escuro)}
.vz-sug small{font-size:11.5px;color:#6b8378}
.vz-nada{font-size:12.5px;color:#9aa;padding:4px 2px}
.vz-salvar{width:100%;height:44px;margin-top:10px;border:0;border-radius:12px;background:var(--dourado);color:#3a2f00;font-weight:900;font-size:14.5px}
`; document.head.appendChild(st);
})();
