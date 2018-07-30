// import idb from 'idb';

const staticCacheName = 'restaurant-cache-v1'

const urlsToCache = [
    '/',
    '/restaurant.html',
    '/css/styles.css',
    '/img/1.jpg',
    '/img/2.jpg',
    '/img/3.jpg',
    '/img/4.jpg',
    '/img/5.jpg',
    '/img/6.jpg',
    '/img/7.jpg',
    '/img/8.jpg',
    '/img/9.jpg',
    '/img/10.jpg',
    '/js/main.js',
    '/js/restaurant_info.js',
    '/js/dbhelper.js',
    '/offline.html'

];


self.addEventListener('install', event => {
    event.waitUntil(
        cacheResources()
    )
});

self.addEventListener('activate', event => {
    event.waitUntil(
        deleteOldCaches()
    )
});

self.addEventListener('fetch', event => {
    event.respondWith(serveOrFetch(event.request))
   
});

async function cacheResources() {
    const cache = await caches.open(staticCacheName);
    return cache.addAll(urlsToCache);
}

async function deleteOldCaches() {
    const cacheNames = await caches.keys();
    const deleteCachePromises = [];
    for (let cacheName of cacheNames) {
        if (cacheName.startsWith('restaurant-') && (cacheName !== staticCacheName)) {
            deleteCachePromises.push(caches.delete(cacheName));
        }
    } 
    return Promise.all(deleteCachePromises);
}


function serveOrFetch(request) {
    return  caches.match(request).then(response => {
            return response || fetch(request);
        }).then(response => {
            return caches.open(staticCacheName).then(cache => {
              cache.put(request, response.clone());
              return response
            })  
        })
        // In case everything goes wrong...
        .catch(() => caches.match('/offline.html'))
}

