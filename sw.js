const CACHE_NAME = 'esma-v1';
const assetsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Service Worker Kurulumu ve Dosyaları Önbelleğe Alma
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assetsToCache);
    })
  );
  self.skipWaiting();
});

// Eski Önbellekleri Temizleme
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Çevrimdışı Çalışma İçin İstekleri Yakalama
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        // İnternet yoksa ve önbellekte bulunamazsa ana sayfaya yönlendir
        return caches.match('./index.html');
      });
    })
  );
});