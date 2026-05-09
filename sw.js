const CACHE_NAME = 'spelling-bee-v1';
const assets = [
  '/',
  '/index.html',
  '/app.js',
  '/datos.js',
  '/img/apple.jpg',
  '/img/robot.jpg',
  '/img/science.jpg'
];

// Instalar y guardar en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// Responder desde caché si no hay internet
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});