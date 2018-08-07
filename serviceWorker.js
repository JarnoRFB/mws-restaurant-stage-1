importScripts(
    'https://storage.googleapis.com/workbox-cdn/releases/3.0.0/workbox-sw.js',
    'js/idb.js'
);

if (workbox) {
  console.log(`Yay! Workbox is loaded 🎉`);
  workbox.precaching.precacheAndRoute([]);
} else {
  console.log(`Boo! Workbox didn't load 😬`);
}

const DatabaseURL = 'http://localhost:1337';

const dbName = 'restaurant-db'

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

async function cacheResources() {
    const cache = await caches.open(staticCacheName);
    return cache.addAll(urlsToCache);
}


function createDb(){
    console.log('creating db')
    const dbPromise = idb.open(dbName, 1, upgradeDb => {
        switch(upgradeDb.oldVersion) {
          case 0:
            if (!upgradeDb.objectStoreNames.contains('restaurants')) {
                const restaurantStore = upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
            }
            // restaurantStore.createIndex('cuisine', 'cuisine_type');
            // restaurantStore.createIndex('neighborhood', 'neighborhood')
        }     
    });
    return dbPromise
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


  async function serveOrFetch({url, event, params}) {
    const request = event.request;
    if (managedInCache(request)){
        return await serveViaCache(request);
    } else {
        return await fetch(request);
    }
}

function managedInDb(request){
    const requestURL = new URL(request.url);
    return requestURL.port === '1337';
}

function managedInCache(request){
    return (request.method === 'GET'
            && !request.url.includes('browser-sync'));
}

async function serveViaDb(request) {
    console.log('serve via db');
    if (isRequestForSingleRestaurant(request)){
        console.log('single')
        return serveSingleViaDb(request);
    } else {
        console.log('all')

        return serveAllViaDb(request);
    }

}

function isRequestForSingleRestaurant(request){
    const parts = request.url.split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart !== 'restaurants' && lastPart.length > 0;
}

async function serveSingleViaDb({url, event}){
    console.log('single')
    const request = event.request;
    try {
        const db = await idb.open(dbName, 1);
        const storedResponse = await getResponseStoredInDb(db, getIdFromRequest(request));
        console.log(storedResponse);
        if (storedResponse) {
            response = new Response(JSON.stringify(storedResponse));
        }
        else {
            console.log('store in db');
            response = await fetch(request);
            await storeSingleInDb(db, response);
        }
        return response;
    } catch (ex) {
        return new Response('failure in db');
    }
}

function getIdFromRequest(request){
    const parts = request.url.split('/');
    return Number(parts[parts.length - 1]);
}

async function serveAllViaDb({url, event}){
    console.log('all')

    const request = event.request;
    try {
        const db = await idb.open(dbName, 1);

        const storedResponse = await getResponseStoredInDb(db, 'all');
        let response;
        if (storedResponse.length) {
            response = new Response(JSON.stringify(storedResponse));
        }
        else {
            console.log('store in db');
            response = await fetch(request);
            await storeInDb(db, response);
        }
        return response;
    } catch (ex) {
        return new Response('failure in db');
    }
}

async function getResponseStoredInDb(db, id) {
    const tx = db.transaction('restaurants');
    const restaurantStore = tx.objectStore('restaurants');
    let storedResponse;
    if (id === 'all'){
        storedResponse = await restaurantStore.getAll();
    } else {
        storedResponse = await restaurantStore.get(id);
    }
    return storedResponse;
}

async function storeInDb(db, response) {
    const responseToStore = await response.clone().json();
    const tx = db.transaction('restaurants', 'readwrite');
    const restaurantStore = tx.objectStore('restaurants');
    for (let restaurant of responseToStore) {
        restaurantStore.put(restaurant);
    }
}

async function storeSingleInDb(db, response) {
    const responseToStore = await response.clone().json();
    const tx = db.transaction('restaurants', 'readwrite');
    const restaurantStore = tx.objectStore('restaurants');
    restaurantStore.put(responseToStore);
}

async function serveViaCache(request){
    try {
        const cacheKey = getCacheKey(request);
        const cachedResponse = await caches.match(cacheKey);
        const response = cachedResponse || await fetch(request);
        const cache = await caches.open(staticCacheName);
        cache.put(cacheKey, response.clone());
        return response;
    } catch (ex) {
        // In case everything goes wrong...
        return caches.match('/offline.html');
    }
}

function getCacheKey(request){
    let cacheKey;
    if (!request.url.includes('maps')){
        cacheKey = getPathname(request)
    } else {
        cacheKey = request;
    }
    return cacheKey;
}

function getPathname(request){
    return new URL(request.url).pathname
}


self.addEventListener('install', event => {
    event.waitUntil(
        cacheResources()
    )
});

self.addEventListener('activate', event => {
    event.waitUntil(
        Promise.all([
            createDb(),
            deleteOldCaches()
        ])
    )
});


workbox.routing.registerRoute(
    new RegExp(`${DatabaseURL}/reviews/\\?restaurant_id=\\d+`),

    workbox.strategies.staleWhileRevalidate(),
);

workbox.routing.registerRoute(
    new RegExp(`${DatabaseURL}/restaurants/\\d+`),
    serveSingleViaDb
); 

workbox.routing.registerRoute(
    new RegExp(`${DatabaseURL}/restaurants/$`),
    serveAllViaDb
);

workbox.routing.setDefaultHandler(serveOrFetch);
