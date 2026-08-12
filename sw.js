const CACHE_NAME = 'rifa-pwa-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/admin.js',
  '/Logo.jpg',
  '/Rifa.jpg'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Notificación de Rifa Pulsar',
    icon: '/Logo.jpg',
    badge: '/Logo.jpg'
  };
  event.waitUntil(self.registration.showNotification('Rifa Pulsar NS400Z', options));
});