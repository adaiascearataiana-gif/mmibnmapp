/* ============================================================
   MM IBNM — Escudo de segurança do app (v1.0)
   Carrega logo depois do Supabase e ANTES de todo o resto.
   1) Tudo o que vem do banco (consultas, tempo real e o que ficou guardado
      no celular) é limpo antes de aparecer na tela: código escondido em
      nomes, títulos, cifras, links "javascript:" etc. não roda.
   2) Links perigosos são bloqueados no clique.
   Não muda nada no banco e não muda nada para quem usa o app normalmente.
   ============================================================ */
(function(){
  'use strict';
  if (window.__ibnmEscudo) return; window.__ibnmEscudo = '1.0';

  /* ---------- regras ---------- */
  const CHAVES_HTML = /^(cifra|letra|texto|html|conteudo|cifra_html|corpo_html)$/i;   /* campos que podem ter formatação */
  const CHAVES_IGUAIS = /^(id|user_id|uid|email|destino_email|chave|endpoint|p256dh|auth|created_at|updated_at|criado_em|data|semana|tipo|status)$/i;
  const SUSPEITO = /<\s*\/?\s*(script|iframe|frame|object|embed|applet|svg|math|img|image|video|audio|source|track|style|link|meta|base|form|input|button|textarea|select|option|template|noscript|xml|portal|marquee|body|html|head|dialog|details)\b|\son[a-z]+\s*=|(java|vb)\s*script\s*:|data\s*:\s*text\/html/i;
  const TAG_PERIGO = new Set(['SCRIPT','IFRAME','FRAME','FRAMESET','OBJECT','EMBED','APPLET','SVG','MATH','IMG','IMAGE','VIDEO','AUDIO','SOURCE','TRACK','STYLE','LINK','META','BASE','FORM','INPUT','BUTTON','TEXTAREA','SELECT','OPTION','TEMPLATE','NOSCRIPT','XML','PORTAL','MARQUEE','DIALOG','DETAILS','TITLE','HEAD']);
  const TAG_OK = new Set(['B','STRONG','I','EM','U','S','STRIKE','SPAN','DIV','P','BR','PRE','SUP','SUB','SMALL','BIG','MARK','FONT','H1','H2','H3','H4','H5','H6','UL','OL','LI','HR','TABLE','THEAD','TBODY','TFOOT','TR','TD','TH','CODE','BLOCKQUOTE','CENTER','A']);
  const ATR_OK = /^(class|style|color|face|size|colspan|rowspan|align|title|href|target|rel|data-[\w-]+)$/i;

  /* endereço perigoso? (javascript:, vbscript:, data:text/html… mesmo disfarçado) */
  function urlPerigosa(s){
    if (typeof s !== 'string' || s.length > 4096 && !/^\s*data:/i.test(s)) return false;
    let v = s.replace(/&#x([0-9a-f]+);?/gi, (_,h)=>String.fromCharCode(parseInt(h,16)))
             .replace(/&#(\d+);?/g, (_,d)=>String.fromCharCode(+d))
             .replace(/&(tab|newline|colon);/gi, (_,n)=>({tab:'\t',newline:'\n',colon:':'}[n.toLowerCase()]))
             .replace(/[\u0000-\u0020\u007f-\u00a0\u200b-\u200f\u2028\u2029\ufeff]/g, '').toLowerCase();
    if (/^(javascript|vbscript|livescript|mocha):/.test(v)) return true;
    if (/^data:/.test(v) && !/^data:(image\/(png|jpe?g|gif|webp|bmp|avif)|audio\/|video\/|application\/pdf|application\/octet-stream)/.test(v)) return true;
    return false;
  }

  /* texto comum: sem tags e sem aspas que "quebram" o HTML ou o código da página */
  function limpaTexto(s){
    if (urlPerigosa(s)) return '#';
    if (!/[<>"'`\\]/.test(s)) return s;
    return s.replace(/<[^<>]*>/g, '')
            .replace(/</g, '‹').replace(/>/g, '›')
            .replace(/"/g, '”').replace(/'/g, '’').replace(/`/g, '´').replace(/\\/g, '∖');
  }

  /* texto com formatação (cifra/letra): mantém negrito, cores etc.; tira o resto */
  function limpaHTML(s){
    if (!SUSPEITO.test(s)) return s;
    try {
      const tpl = document.createElement('template');      /* conteúdo "morto": nada roda, nada carrega */
      tpl.innerHTML = s;
      const anda = (raiz) => {
        [...raiz.childNodes].forEach(n => {
          if (n.nodeType === 8) { n.remove(); return; }       /* comentários */
          if (n.nodeType !== 1) return;
          const tag = n.tagName.toUpperCase();
          if (TAG_PERIGO.has(tag) || n.namespaceURI !== 'http://www.w3.org/1999/xhtml') { n.remove(); return; }
          if (!TAG_OK.has(tag)) { anda(n); n.replaceWith(...n.childNodes); return; }
          [...n.attributes].forEach(a => {
            const nome = a.name.toLowerCase(), val = a.value;
            if (!ATR_OK.test(nome) || /^on/i.test(nome)) n.removeAttribute(a.name);
            else if ((nome === 'href') && urlPerigosa(val)) n.setAttribute('href', '#');
            else if (nome === 'style' && /url\s*\(|expression|javascript|@import|behavior|-moz-binding/i.test(val)) n.removeAttribute(a.name);
          });
          if (tag === 'A') { n.setAttribute('rel', 'noopener noreferrer'); }
          anda(n);
        });
      };
      anda(tpl.content);
      return tpl.innerHTML;
    } catch (_) { return limpaTexto(s); }
  }

  function limpaValor(v, chave){
    if (typeof v === 'string') {
      if (chave && CHAVES_IGUAIS.test(chave)) return urlPerigosa(v) ? '' : v;
      const t = v.trim();
      if ((t[0] === '{' && t[t.length-1] === '}') || (t[0] === '[' && t[t.length-1] === ']')) {   /* JSON guardado como texto */
        try { return JSON.stringify(limpaDados(JSON.parse(t))); } catch (_) {}
      }
      return (chave && CHAVES_HTML.test(chave)) ? limpaHTML(v) : limpaTexto(v);
    }
    if (v && typeof v === 'object') return limpaDados(v, 0, chave);
    return v;
  }
  function limpaDados(d, prof, chavePai){
    prof = prof || 0; if (prof > 12 || d == null) return d;
    if (Array.isArray(d)) { for (let i = 0; i < d.length; i++) d[i] = (typeof d[i] === 'object' && d[i]) ? limpaDados(d[i], prof+1) : limpaValor(d[i], chavePai); return d; }
    if (typeof d === 'object') {
      if (d instanceof Blob || d instanceof ArrayBuffer || ArrayBuffer.isView(d)) return d;
      for (const k of Object.keys(d)) {
        const v = d[k];
        d[k] = (v && typeof v === 'object') ? limpaDados(v, prof+1, k) : limpaValor(v, k);
      }
      return d;
    }
    return limpaValor(d);
  }
  window.ibnmLimpa = { dados: limpaDados, texto: limpaTexto, html: limpaHTML, urlPerigosa: urlPerigosa };

  /* ---------- 1) tudo o que vem do Supabase passa pela limpeza ---------- */
  function protegeCliente(cli){
    if (!cli || cli.__escudo) return cli; cli.__escudo = 1;
    try {   /* consultas, gravações com retorno e funções (rpc) */
      const amostra = cli.from('__escudo__').select('*');
      let p = amostra; while (p && !Object.prototype.hasOwnProperty.call(p, 'then')) p = Object.getPrototypeOf(p);
      if (p && !p.__escudo) {
        const then0 = p.then; p.__escudo = 1;
        p.then = function(ok, ko){
          return then0.call(this, function(r){ try { if (r && r.data != null && typeof r.data === 'object') r.data = limpaDados(r.data); } catch (_) {} return ok ? ok(r) : r; }, ko);
        };
      }
    } catch (_) {}
    try {   /* tempo real */
      const ch0 = cli.channel && cli.channel.bind(cli);
      if (ch0) cli.channel = function(){
        const ch = ch0.apply(this, arguments);
        if (ch && !ch.__escudo && typeof ch.on === 'function') {
          ch.__escudo = 1; const on0 = ch.on;
          ch.on = function(tipo, filtro, cb){
            if (tipo === 'postgres_changes' && typeof cb === 'function') {
              const cb0 = cb;
              cb = function(pl){ try { if (pl) { if (pl.new) limpaDados(pl.new); if (pl.old) limpaDados(pl.old); } } catch (_) {} return cb0.apply(this, arguments); };
            } else if (tipo === 'broadcast' && typeof cb === 'function') {
              const cb0 = cb;
              cb = function(pl){ try { if (pl && pl.payload) limpaDados(pl.payload); } catch (_) {} return cb0.apply(this, arguments); };
            }
            return on0.call(this, tipo, filtro, cb);
          };
        }
        return ch;
      };
    } catch (_) {}
    return cli;
  }
  function protegeSupabase(){
    const S = window.supabase;
    if (!S || typeof S.createClient !== 'function' || S.createClient.__escudo) return;
    const cc0 = S.createClient;
    const cc = function(){ return protegeCliente(cc0.apply(this, arguments)); };
    cc.__escudo = 1;
    try { S.createClient = cc; } catch (_) {}
    if (S.createClient !== cc) { try { Object.defineProperty(S, 'createClient', { value: cc, configurable: true, writable: true }); } catch (_) {} }
  }
  protegeSupabase();
  /* caso o cliente já tenha sido criado antes (ou a biblioteca chegue depois) */
  let tent = 0; const re = setInterval(() => { protegeSupabase(); try { if (window.sb) protegeCliente(window.sb); } catch (_) {} if (++tent > 40) clearInterval(re); }, 250);

  /* ---------- 2) o que ficou guardado no celular também é limpo ---------- */
  ['ibnm_mm_db_v1','ibnm_cfg_cache','ibnm_materiais','ibnm_cc_ed','ibnm_cc_yt','ibnm_hr_ed','ibnm_hr_yt','ibnm_hcc','ibnm_links_hinos','ibnm_parts'].forEach(k => {
    try {
      const v = localStorage.getItem(k); if (!v || !SUSPEITO.test(v) && !/["'\\`<>]/.test(v)) return;
      const d = JSON.parse(v); const antes = JSON.stringify(d); const depois = JSON.stringify(limpaDados(d));
      if (antes !== depois) localStorage.setItem(k, depois);
    } catch (_) {}
  });

  /* ---------- 3) rede de segurança na tela ---------- */
  /* clique em link "javascript:" (que não seja o do próprio app) não roda */
  document.addEventListener('click', ev => {
    const a = ev.target && ev.target.closest && ev.target.closest('a[href],area[href]');
    if (!a) return;
    const h = a.getAttribute('href') || '';
    if (/^\s*javascript:\s*(void\s*\(?\s*0\s*\)?\s*;?|;)?\s*$/i.test(h)) return;      /* javascript:void(0) do app */
    if (urlPerigosa(h)) { ev.preventDefault(); ev.stopImmediatePropagation(); }
  }, true);
  /* links e imagens com endereço perigoso são desarmados assim que aparecem */
  function desarma(raiz){
    try {
      (raiz.querySelectorAll ? raiz.querySelectorAll('a[href],area[href],iframe[src],embed[src],object[data],form[action],button[formaction],[src^="javascript" i]') : []).forEach(el => {
        ['href','src','data','action','formaction'].forEach(at => {
          const v = el.getAttribute(at);
          if (v && !/^\s*javascript:\s*(void\s*\(?\s*0\s*\)?\s*;?|;)?\s*$/i.test(v) && urlPerigosa(v)) el.setAttribute(at, '#');
        });
      });
    } catch (_) {}
  }
  const iniciaObs = () => {
    try {
      new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) desarma(n); })
        .observe(document.documentElement, { childList: true, subtree: true });
    } catch (_) {}
  };
  if (document.documentElement) iniciaObs(); else document.addEventListener('DOMContentLoaded', iniciaObs);
})();
