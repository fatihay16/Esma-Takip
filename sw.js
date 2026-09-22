const CACHE_NAME = 'esma-v2';

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

        caches.open(CACHE_NAME)
            .then(cache => {

                return cache.addAll(STATIC_ASSETS);

            })
    );

    /*
     * Yeni Service Worker'ın beklemeden aktif olmasını sağlar.
     */

    self.skipWaiting();
});


/* ============================================================
   SERVICE WORKER AKTİVASYONU
   ============================================================ */

self.addEventListener('activate', event => {

    event.waitUntil(

        caches.keys()
            .then(cacheNames => {

                return Promise.all(

                    cacheNames.map(cacheName => {

                        if (cacheName !== CACHE_NAME) {

                            return caches.delete(cacheName);
                        }

                    })
                );

            })
            .then(() => {

                /*
                 * Açık olan sayfaları yeni Service Worker'a geçir.
                 */

                return self.clients.claim();

            })
    );
});


/* ============================================================
   DOSYA İSTEKLERİ
   ============================================================ */

self.addEventListener('fetch', event => {

    /*
     * Sadece GET isteklerini ele al.
     */

    if (event.request.method !== 'GET') {
        return;
    }


    const requestURL = new URL(
        event.request.url
    );


    /*
     * Başka domainlere yapılan istekleri
     * Service Worker yönetmesin.
     *
     * Örneğin Google Fonts gibi harici dosyalar.
     */

    if (requestURL.origin !== self.location.origin) {
        return;
    }


    /*
     * HTML sayfaları:
     *
     * Önce internetten güncel sürümü almaya çalış.
     * İnternet yoksa cache kullan.
     *
     * Böylece eski index.html'in Safari'de
     * sonsuza kadar cache'ten açılması engellenir.
     */

    if (
        event.request.destination === 'document' ||
        requestURL.pathname.endsWith('.html')
    ) {

        event.respondWith(

            fetch(event.request)
                .then(response => {

                    /*
                     * Güncel sayfayı cache'e de koy.
                     */

                    const responseClone =
                        response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(
                                event.request,
                                responseClone
                            );
                        });

                    return response;

                })
                .catch(() => {

                    /*
                     * İnternet yoksa cache'teki sürümü kullan.
                     */

                    return caches.match(
                        event.request
                    );

                })
        );

        return;
    }


    /*
     * Diğer yerel dosyalar:
     *
     * Önce cache,
     * yoksa internet.
     */

    event.respondWith(

        caches.match(event.request)
            .then(cachedResponse => {

                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request);

            })
    );

});
