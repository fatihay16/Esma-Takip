const CACHE_NAME = 'esma-v3'; // Önbellek sürümünü güncelledik

const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json'
];

/* ============================================================
   SERVICE WORKER KURULUMU
   ============================================================ */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    // Yeni Service Worker'ın Safari'de beklemeden hemen aktifleşmesini sağla
    self.skipWaiting();
});

/* ============================================================
   SERVICE WORKER AKTİVASYONU
   ============================================================ */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Eski önbellekleri temizle
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Safari'de açık kalan sekmelerin kontrolünü anında devral
            return self.clients.claim();
        })
    );
});

/* ============================================================
   DOSYA VE İSTEK YÖNETİMİ (Safari Uyumlu Önbellek Stratejisi)
   ============================================================ */
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const requestURL = new URL(event.request.url);

    // Harici kaynakları (Google Fonts vb.) SW yönetmesin
    if (requestURL.origin !== self.location.origin) {
        return;
    }

    /*
     * 1. HTML SAYFALARI (NETWORK FIRST)
     * Safari'nin eski HTML sayfasını sonsuza kadar göstermesini engeller.
     * Önce ağdan günceli çekmeye çalışır, internet yoksa önbelleği kullanır.
     */
    if (event.request.mode === 'navigate' || requestURL.pathname.endsWith('.html') || requestURL.pathname === '/') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (!response || response.status !== 200) {
                        return response;
                    }
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // İnternet bağlantısı yoksa önbellekten yükle
                    return caches.match(event.request);
                })
        );
        return;
    }

    /*
     * 2. DİĞER DOSYALAR (STALE-WHILE-REVALIDATE)
     * Resim, CSS veya Manifest gibi dosyaları önbellekten hızlıca sunar, 
     * arka planda ağdan günceller.
     */
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            const fetchPromise = fetch(event.request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {/* İnternet yoksa sessizce yut */});

            // Önbellekte varsa hemen ver, arka planda ağ isteğini çalıştır
            return cachedResponse || fetchPromise;
        })
    );
});
