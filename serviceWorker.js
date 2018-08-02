const idb = require('idb');

const staticCacheName = 'restaurant-cache-v1'

const port = 1337
const DATABASE_URL = `http://localhost:${port}/restaurants`;

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

function getPathname(request){
    return new URL(request.url).pathname
}

function getCacheKey(request){
    let cacheKey;
    if (!request.url.includes('maps')){
        cacheKey = getPathname(request)
    } else {
        cacheKey = request
    }
    return cacheKey;
}



function shouldBeCached(request){
    return (request.method === 'GET'
            && !request.url.includes('browser-sync'))
}

function createDb(){
    console.log('creating db')
    const dbPromise = idb.open('restaurant-db', 1, upgradeDb => {
        switch(upgradeDb.oldVersion) {
          case 0:
            const restaurantStore = upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
            restaurantStore.createIndex('cuisine', 'cuisine_type');
            restaurantStore.createIndex('neighborhood', 'neighborhood')
        }     
    });
    return dbPromise
  }

function writeToDb(db, response) {
    console.log('writing to db');
    return db.then(db => {
        const tx = db.transaction('restaurants', 'readwrite');
        const restaurantStore = tx.objectStore('restaurants');
        for (restaurant of response){
        restaurantStore.put(restaurant);
        }
        return tx.complete;
    })
}

function fetchRestaurants() {
    dbPromise = createDb();
    return fetch(DATABASE_URL)
    .then(response => response.json())
    .then(response => writeToDb(dbPromise, response))
    .catch(error => console.log(error))
  }


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
    const cacheKey = getCacheKey(request);
    return  caches.match(cacheKey).then(response => {
            return response || fetch(request);
        }).then(response => {
            return caches.open(staticCacheName).then(cache => {

                if (shouldBeCached(request)){
                    cache.put(cacheKey, response.clone());
                }
              return response
            })  
        })
        // In case everything goes wrong...
        .catch(() => caches.match('/offline.html'))
}

self.addEventListener('install', event => {
    event.waitUntil(
        cacheResources()
    )
});

self.addEventListener('activate', event => {
    event.waitUntil(
        Promise.all([
            fetchRestaurants(),
            deleteOldCaches()
        ])
    )
});

self.addEventListener('fetch', event => {
    event.respondWith(serveOrFetch(event.request))
   
});

