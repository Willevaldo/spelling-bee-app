const CACHE_NAME = `spelling-bee-${APP_VERSION}`; 
const assets = [
  './',
  './index.html',
  './app.js',
  './datos.js',
  './manifest.json',
  './sounds/exito.mp3',
  './sounds/error.mp3'
];

// Instalación: Guarda solo lo esencial (el esqueleto)
self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// Activación: Limpieza total de versiones viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// CAMBIO: Estrategia de Red con Guardado Dinámico
self.addEventListener('fetch', event => {
  event.respondWith(
    // 1. Intentamos ir a la red primero
    fetch(event.request)
      .then(networkResponse => {
        // Si la respuesta es válida, la guardamos en el caché
        return caches.open(CACHE_NAME).then(cache => {
          // IMPORTANTE: Debemos clonar la respuesta. 
          // Una respuesta es un flujo que solo se puede leer una vez.
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // 2. Si el internet falla (offline), buscamos en el caché
        return caches.match(event.request);
      })
  );
});