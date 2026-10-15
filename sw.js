/* Service Worker - Ministerio de Musica IBNM
   Cache do "app shell" para funcionar offline + suporte a Web Push.
   Sobe este arquivo na MESMA pasta do index.html (ex.: raiz do repo). */
const CACHE = 'ibnm-v2';
const SHELL = [ './', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png' ];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Network-first para navegacao; cache-first para o resto. Nunca intercepta Supabase/Google. */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // deixa Supabase/Drive/CDN passarem direto
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html').then((r) => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then((r) => r || fetch(req).then((resp) => {
    const copy = resp.clone();
    caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
    return resp;
  }).catch(() => r)));
});

/* Web Push (opcional): funciona quando houver um backend enviando push com VAPID.
   Sem backend, as notificacoes do app aparecem com o app aberto (via Realtime). */
self.addEventListener('push', (e) => {
  let data = { title: 'IBNM Musica', body: 'Nova atualizacao no app.' };
  try { if (e.data) data = Object.assign(data, e.data.json()); } catch (err) {}
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: './icon-192.png', badge: './icon-192.png', data: data.url || './'
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then((list) => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow(e.notification.data || './');
  }));
});
