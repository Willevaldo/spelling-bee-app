// Service Worker: Spelling Bee Trainer v2.0
// Se encarga de la persistencia offline y el cacheo dinámico.

const CACHE_NAME = `spelling-bee-v2.0.0`; // Actualizado a la versión de recolección de datos

// Lista de archivos esenciales para el esqueleto de la App
const assets = [
  './',
  './index.html',
  './version.js',
  './datos.js',
  './core.js',
  './app_pc.js',
  './app_tablet.js',
  './manifest.json',
  './sounds/exito.mp3',
  './sounds/error.mp3'
];

// Instalación: Guarda el esqueleto fundamental
self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log(' [SW] Cacheando esqueleto de la aplicación');
      return cache.addAll(assets);
    })
  );
});

// Activación: Limpieza de cachés antiguos para evitar conflictos de versión
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Estrategia: Red con Guardado Dinámico
// Esto permite que las imágenes nuevas que descargues se guarden automáticamente para uso offline
self.addEventListener('fetch', event => {
  event.respondWith(
    // 1. Intentamos obtener el recurso de la red
    fetch(event.request)
      .then(networkResponse => {
        // Si la red responde, guardamos/actualizamos en el caché
        if (networkResponse && networkResponse.status === 200) {
          return caches.open(CACHE_NAME).then(cache => {
            // Clonamos la respuesta porque solo se puede consumir una vez
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 2. Si no hay internet, buscamos en el caché de emergencia
        console.log(' [SW] Modo Offline: Recuperando desde caché');
        return caches.match(event.request);
      })
  );
});