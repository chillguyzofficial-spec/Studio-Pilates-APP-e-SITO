// generato da _build/build.js
const CACHE = 'cento-respiri-v9';
const FILES = ["./","index.html","app.css?v=9","dati.js?v=9","app.js?v=9","manifest.webmanifest","../assets/css/base.css?v=9","../assets/js/qrcode.min.js?v=9","../assets/fonts/gilda-display-latin.woff2","../assets/fonts/hanken-grotesk-latin.woff2","../assets/icone/icona-192.png","../assets/foto/480/app-benvenuto.webp","../assets/foto/800/app-benvenuto.webp","../assets/foto/480/app-home.webp","../assets/foto/800/app-home.webp","../assets/foto/480/app-lezione-base.webp","../assets/foto/800/app-lezione-base.webp","../assets/foto/480/app-lezione-intermedio.webp","../assets/foto/800/app-lezione-intermedio.webp","../assets/foto/480/app-lezione-avanzato.webp","../assets/foto/800/app-lezione-avanzato.webp","../assets/foto/480/app-lezione-prenatale.webp","../assets/foto/800/app-lezione-prenatale.webp","../assets/foto/480/app-lezione-tower.webp","../assets/foto/800/app-lezione-tower.webp","../assets/foto/480/app-prova.webp","../assets/foto/800/app-prova.webp"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // prima la rete (così gli aggiornamenti arrivano), la cache se si è offline
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); if (r.ok) caches.open(CACHE).then(k => k.put(e.request, c)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: false }).then(r => r || caches.match('index.html'))));
});
// tocco su una notifica: apre (o riporta in primo piano) l'app sulla schermata giusta
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data && e.notification.data.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) if ('focus' in c) { c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
