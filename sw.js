/* Service Worker - Ministério de Música IBNM */
const CACHE = 'mmibnm-v162';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './hinos.js',
  './cantor.js',
  './harpa.js',
  './harpa_data.js',
  './academia.js',
  './melhorias.js',
  './culto.js',
  './escala.js',
  './membros.js',
  './cantadas.js',
  './ensaio.js',
  './temp-acervo.js',
  './avisos.js',
  './central.js',
  './telegram.js',
  './cifras.js',
  './vozes.js',
  './cores.js',
  './push.js',
  './tour.js',
  './ajustes.js',
  './extras.js',
  './seguranca.js',
  './sync.js',
  './financeiro.js',
  './inventario.js',
  './papeis.js',
  './biblia-versos.js',
  './biblia.js',
  './compasso-dsp.js',
  './compasso.js',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
  './badge-96.png',
  './notif-icon-192.png'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    /* arquivo por arquivo: um falho na rede não derruba a instalação inteira */
    /* cache:'reload' = pega do servidor, nunca da cópia velha do navegador */
    return Promise.all(CORE.map(function (u) { return c.add(new Request(u, { cache: 'reload' })).catch(function () {}); }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE && k !== 'ibnm-fotos' && k !== 'ibnm-arquivos' && k !== 'mmibnm-audios'; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // sw.js sempre vai direto à rede: a página usa isso para conferir se há versão nova
  if (/\/sw\.js$/.test(url.pathname)) return;
  // Partituras, áudios, anexos e fotos do Supabase: baixam 1 vez e ficam no celular (economiza a cota do Supabase).
  if (/supabase\.co$/.test(url.hostname) && /\/storage\/v1\/object\/public\/(partituras|audios|anexos|fotos|materiais)\//.test(url.pathname) && url.pathname.indexOf('/__priv__/') < 0) {
    e.respondWith(arquivoSupabase(req, url));
    return;
  }
  // Fotos de perfil do Supabase: guardadas no celular (não baixam de novo a cada abertura).
  if (/supabase\.co$/.test(url.hostname) && url.pathname.indexOf('/storage/v1/object/public/fotos/') >= 0) {
    e.respondWith(caches.open('ibnm-fotos').then(function (c) {
      return c.match(req).then(function (hit) {
        return hit || fetch(req).then(function (r) { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; });
      });
    }));
    return;
  }
  // Supabase (dados) / CDNs externas: sempre a rede.
  if (url.origin !== location.origin) return;

  // Abrir o app: rede primeiro; sem internet, usa a cópia guardada.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then(function (r) {
        const cp = r.clone();
        if (/\/(index\.html)?$/.test(url.pathname)) caches.open(CACHE).then(function (c) { c.put('./index.html', cp); });   /* só a tela do app (não a do Drive) */
        return r;
      }).catch(function () { return caches.match('./index.html'); })
    );
    return;
  }

  // Imagens das intros: não mudam, então cache primeiro.
  if (url.pathname.indexOf('/cc-intro/') >= 0) {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (r) {
        if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); }
        return r;
      });
    }));
    return;
  }

  // Partituras da Harpa: não mudam, então cache primeiro.
  if (url.pathname.indexOf('/partituras') >= 0) {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (r) {
        if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); }
        return r;
      });
    }));
    return;
  }

  // Scripts e demais arquivos: SEMPRE a versão do servidor (rede primeiro).
  // Sem internet (ou se demorar mais de 5 s), usa a cópia guardada.
  e.respondWith(
    caches.open(CACHE).then(function (c) {
      const rede = fetch(req, { cache: 'no-cache' }).then(function (r) {
        if (r && r.ok) c.put(req, r.clone());
        return r;
      });
      const espera = new Promise(function (ok) { setTimeout(ok, 5000); }).then(function () { return c.match(req); });
      return Promise.race([rede.catch(function () { return c.match(req); }), espera.then(function (hit) { return hit || rede; })])
        .then(function (r) { return r || rede; })
        .catch(function () { return c.match(req); });
    })
  );
});

/* ===== Notificações na barra do celular (Web Push) ===== */
self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'MM IBNM', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    // app aberto na tela: ele mesmo mostra o aviso (som/janela)
    if (cs.some(function (c) { return c.visibilityState === 'visible'; })) return;
    return self.registration.showNotification(d.title || 'Ministério de Música IBNM', {
      body: d.body || '', icon: 'notif-icon-192.png', badge: 'badge-96.png',
      tag: d.id ? 'ibnm-' + d.id : undefined, renotify: true, vibrate: [80, 40, 80],
      data: { link: d.link || '' }
    });
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var link = (e.notification.data && e.notification.data.link) || '';
  var url = './' + (link ? '?n=' + encodeURIComponent(link) : '');
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { var c = cs[i]; if ('focus' in c) { c.postMessage({ tipo: 'abrir', link: link }); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});

/* ---- arquivos do Supabase guardados no celular (com suporte a trecho, para o áudio poder avançar) ---- */
var ARQ = 'ibnm-arquivos';
function arquivoSupabase(req, url) {
  var chave = url.origin + url.pathname + (url.search || '');
  return caches.open(ARQ).then(function (c) {
    return c.match(chave).then(function (hit) {
      if (hit) return hit;
      return fetch(chave, { mode: 'cors', credentials: 'omit' }).then(function (r) {
        if (r && r.status === 200) { c.put(chave, r.clone()).then(function () { limpaArq(c); }).catch(function () {}); }
        return r;
      });
    });
  }).then(function (resp) { return trecho(req, resp); }).catch(function () { return fetch(req); });
}
function trecho(req, resp) {
  var rg = req.headers.get('range'); if (!rg || !resp || resp.status !== 200) return resp;
  var m = /bytes=(\d*)-(\d*)/.exec(rg); if (!m) return resp;
  return resp.arrayBuffer().then(function (buf) {
    var tot = buf.byteLength, s, f;
    if (m[1] === '') { s = Math.max(0, tot - (+m[2] || 0)); f = tot - 1; } else { s = +m[1]; f = m[2] === '' ? tot - 1 : Math.min(+m[2], tot - 1); }
    if (s >= tot) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + tot } });
    return new Response(buf.slice(s, f + 1), { status: 206, headers: { 'Content-Type': resp.headers.get('Content-Type') || 'application/octet-stream', 'Content-Range': 'bytes ' + s + '-' + f + '/' + tot, 'Content-Length': String(f - s + 1), 'Accept-Ranges': 'bytes' } });
  });
}
function limpaArq(c) { c.keys().then(function (ks) { var x = ks.length - 300; for (var i = 0; i < x; i++) c.delete(ks[i]); }); }
