// Service worker : met tout le jeu en cache pour jouer hors ligne
const CACHE = 'mettwurst-combat-v1.5.0';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'js/util.js',
  'js/audio.js',
  'js/input.js',
  'js/roster.js',
  'js/draw.js',
  'js/stage.js',
  'js/fighter.js',
  'js/ai.js',
  'js/fight.js',
  'js/ui.js',
  'js/main.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord (pour recevoir les mises à jour), cache en secours hors ligne
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // les autres sites (ex. le classement en ligne) ne passent pas par le cache
  if (new URL(e.request.url).origin !== location.origin) return;
  const sameOrigin = true;
  // 'no-cache' : on revalide toujours auprès du serveur (sinon le cache HTTP
  // de 10 minutes de GitHub Pages servait d'anciennes versions du jeu)
  e.respondWith(
    (sameOrigin ? fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(e.request))
      .then((res) => {
        if (res && res.ok && sameOrigin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
