/* Service Worker - Ministério de Música IBNM */
const CACHE = 'mmibnm-v9';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './hinos.js',
  './cantor.js',
  './academia.js',
  './melhorias.js',
  './culto.js',
  './escala.js',
  './membros.js',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE).catch(function () {}); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Supabase / CDNs externas: sempre a rede (dados em tempo real).
  if (url.origin !== location.origin) return;

  // Abrir o app: rede primeiro; sem internet, usa a cópia guardada.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (r) {
        const cp = r.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', cp); });
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

  // Scripts e demais arquivos: responde na hora com o que tem guardado
  // e busca a versão nova em segundo plano (na próxima abertura já vem atualizado).
  e.respondWith(
    caches.open(CACHE).then(function (c) {
      return c.match(req).then(function (hit) {
        const rede = fetch(req).then(function (r) {
          if (r && r.ok) c.put(req, r.clone());
          return r;
        }).catch(function () { return hit; });
        return hit || rede;
      });
    })
  );
});
