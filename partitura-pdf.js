/* ============================================================
   MM IBNM — PARTITURA do Cantor Cristão em PDF
   Abre partituras/cc/NNN.pdf (tom original, Coletânea Cantor Cristão)
   dentro do app, página por página, com zoom.
   Hinos com mais de uma música (60, 326, 371) mostram as opções.
============================================================ */
(function(){
'use strict';
const PASTA='partituras/cc/';
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
let indice=null, pdfjsPronto=null;

function aviso(t){ if(typeof toast==='function') toast(t); else alert(t); }

function carregaIndice(){
  if(indice) return Promise.resolve(indice);
  return fetch(PASTA+'index.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{}).catch(()=>({})).then(j=>(indice=j||{}));
}
function carregaPdfjs(){
  if(window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if(pdfjsPronto) return pdfjsPronto;
  pdfjsPronto=new Promise((ok,erro)=>{
    const s=document.createElement('script'); s.src=PDFJS+'pdf.min.js';
    s.onload=()=>{ window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+'pdf.worker.min.js'; ok(window.pdfjsLib); };
    s.onerror=()=>{ pdfjsPronto=null; erro(new Error('leitor de PDF não carregou')); };
    document.head.appendChild(s);
  });
  return pdfjsPronto;
}

function fecha(){ const b=document.querySelector('.ppdf-bg'); if(b) b.remove(); }

async function desenha(caixa, arquivo, zoom){
  const corpo=caixa.querySelector('.ppdf-corpo');
  corpo.innerHTML='<p class="ppdf-msg">Abrindo a partitura…</p>';
  try{
    const lib=await carregaPdfjs();
    const doc=await lib.getDocument(PASTA+arquivo).promise;
    corpo.innerHTML='';
    const largura=Math.min(corpo.clientWidth||window.innerWidth, 1100)*zoom;
    const dpr=Math.min(window.devicePixelRatio||1, 3);
    for(let i=1;i<=doc.numPages;i++){
      const pg=await doc.getPage(i);
      const v1=pg.getViewport({scale:1});
      const esc=largura/v1.width;
      const vp=pg.getViewport({scale:esc*dpr});
      const cv=document.createElement('canvas');
      cv.width=vp.width; cv.height=vp.height;
      cv.style.width=Math.round(v1.width*esc)+'px';
      corpo.appendChild(cv);
      await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
    }
  }catch(e){
    corpo.innerHTML='<p class="ppdf-msg">Não deu para mostrar aqui. '+
      '<a href="'+PASTA+arquivo+'" target="_blank" rel="noopener">Abrir o PDF</a></p>';
  }
}

window.cantorPartitura=async function(n){
  n=+n;
  const idx=await carregaIndice();
  const arquivos=idx[String(n)]||[];
  if(!arquivos.length) return aviso('A partitura do hino '+n+' ainda não foi baixada para o app.');
  fecha();
  let atual=0, zoom=1;
  const bg=document.createElement('div');
  bg.className='ppdf-bg cc-sheet-bg';
  bg.innerHTML=
    '<div class="ppdf-topo">'+
      '<button class="ppdf-x" aria-label="Fechar">✕</button>'+
      '<b>Hino '+n+' · Partitura</b>'+
      '<span class="ppdf-zoom"><button data-z="-1" aria-label="Diminuir">A−</button><button data-z="1" aria-label="Aumentar">A+</button></span>'+
    '</div>'+
    (arquivos.length>1?'<div class="ppdf-abas">'+arquivos.map((a,i)=>'<button data-i="'+i+'"'+(i?'':' class="on"')+'>Música '+(i+1)+'</button>').join('')+'</div>':'')+
    '<div class="ppdf-corpo"></div>';
  document.body.appendChild(bg);
  bg.querySelector('.ppdf-x').onclick=()=>{ if(window.__voltar) history.back(); else fecha(); };
  bg.querySelectorAll('.ppdf-zoom button').forEach(b=>b.onclick=()=>{
    zoom=Math.max(1,Math.min(3,zoom+(+b.dataset.z)*0.5)); desenha(bg,arquivos[atual],zoom);
  });
  bg.querySelectorAll('.ppdf-abas button').forEach(b=>b.onclick=()=>{
    atual=+b.dataset.i; bg.querySelectorAll('.ppdf-abas button').forEach(x=>x.classList.toggle('on',x===b));
    desenha(bg,arquivos[atual],zoom);
  });
  try{ history.pushState({ibnm:1,ppdf:1},''); }catch(_){}
  desenha(bg,arquivos[0],zoom);
};

/* se o Voltar não passar pelo app, fecha mesmo assim */
window.addEventListener('popstate',()=>{ setTimeout(()=>{ if(!(history.state&&history.state.ppdf)) fecha(); },0); });

const st=document.createElement('style'); st.textContent=`
.ppdf-bg{position:fixed;inset:0;z-index:9000;background:#fff;display:flex;flex-direction:column;color:#1b1b1b}
.ppdf-topo{display:flex;align-items:center;gap:10px;padding:10px 12px;padding-top:calc(10px + env(safe-area-inset-top,0px));background:var(--verde-med,#1f6f4a);color:#fff}
.ppdf-topo b{flex:1;font-size:16px}
.ppdf-topo button{background:rgba(255,255,255,.18);color:#fff;border:0;border-radius:8px;min-width:40px;height:36px;font-size:15px;font-weight:700}
.ppdf-zoom{display:flex;gap:6px}
.ppdf-abas{display:flex;gap:6px;padding:8px 12px;background:#f1f4f2;overflow-x:auto}
.ppdf-abas button{border:1px solid #c9d3cd;background:#fff;border-radius:18px;padding:6px 14px;font-weight:600;color:#1b1b1b}
.ppdf-abas button.on{background:var(--verde-med,#1f6f4a);border-color:transparent;color:#fff}
.ppdf-corpo{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:8px 0 calc(16px + env(safe-area-inset-bottom,0px));text-align:center;background:#fff}
.ppdf-corpo canvas{display:block;margin:0 auto 10px;max-width:none;background:#fff}
.ppdf-msg{padding:40px 20px;color:#444}
.ppdf-msg a{color:var(--verde-med,#1f6f4a);font-weight:700}
`; document.head.appendChild(st);
})();
