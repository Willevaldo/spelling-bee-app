const CACHE_NAME = `spelling-bee-${APP_VERSION}`; // <--- Cambia este número (v1, v2, v3) cada vez que subas algo
const assets = [
  './',
  './index.html',
  './app.js',
  './datos.js',
  './manifest.json',
  './sounds/exito.mp3', // NUEVO: REGISTRO DE SONIDO PARA MODO OFFLINE
  './sounds/error.mp3',  // NUEVO: REGISTRO DE SONIDO PARA MODO OFFLINE
  // Añade aquí tus imágenes nuevas si quieres que funcionen offline
  './img/apple.jpg',
  './img/robot.jpg',
  './img/science.jpg'
];

// Instalación: Guarda los archivos en el caché
self.addEventListener('install', event => {
  self.skipWaiting(); // Fuerza al nuevo SW a tomar el control de inmediato
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// Activación: Borra cachés viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Estrategia: Primero buscar en internet, si falla, usar el caché
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});