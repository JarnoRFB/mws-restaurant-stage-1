importScripts(
    'https://storage.googleapis.com/workbox-cdn/releases/3.0.0/workbox-sw.js',
    'js/idb.js'
);

const DatabaseURL = 'http://localhost:1337';

const dbName = 'restaurant-db'
const dbVersion = 1;

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
    const dbPromise = idb.open(dbName, dbVersion, upgradeDb => {
        switch(upgradeDb.oldVersion) {
          case 0:
            if (!upgradeDb.objectStoreNames.contains('restaurants')) {
                const restaurantStore = upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
            }
            if (!upgradeDb.objectStoreNames.contains('reviews')) {
                const reviewStore = upgradeDb.createObjectStore('reviews', {keyPath: 'id'});
                reviewStore.createIndex('restaurant_id', 'restaurant_id');
            }
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

async function serveOrFetch({url, event}) {
    const request = event.request;
    return await serveViaCache(request);
}

function managedInCache({url, event}){
    return (event.request.method === 'GET'
            && !url.href.includes('browser-sync'));
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

async function serveSingleViaDb({url, event, params}){
    console.log('single')
    const request = event.request;
    let [id] = params;
    id = Number(id);
    try {
        const db = await idb.open(dbName, dbVersion);
        const storedResponse = await getResponseStoredInDb(db, id);
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
        const db = await idb.open(dbName, dbVersion);

        const storedResponse = await getResponseStoredInDb(db, 'all');
        let response;
        if (storedResponse.length) {
            response = new Response(JSON.stringify(storedResponse));
        }
        else {
            console.log('store in db');
            response = await fetch(request);
            await storeInDb(db, 'restaurants', response);
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

async function getReviewsStoredInDb(db, restaurant_id) {
    const tx = db.transaction('reviews');
    const reviewStore = tx.objectStore('reviews');
    let storedResponse;
    if (restaurant_id === 'all'){
        storedResponse = await reviewStore.getAll();
    } else {
        const restaurantIndex = reviewStore.index('restaurant_id');
        storedResponse = await restaurantIndex.getAll(restaurant_id);
    }
    return storedResponse;
}


async function storeInDb(db, objectStore, response) {
    const responseToStore = await response.clone().json();
    const tx = db.transaction(objectStore, 'readwrite');
    const restaurantStore = tx.objectStore(objectStore);
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

async function handleFavUpdate({url, event, params}) {
    console.log('handle update')
    const [id, isFavorite] = params;
    const db = await idb.open(dbName, dbVersion);
    const tx = db.transaction('restaurants', 'readwrite');
    const restaurantStore = tx.objectStore('restaurants');
    const restaurant = await restaurantStore.get(Number(id));
    restaurant.is_favorite = isFavorite;
    restaurantStore.put(restaurant);
    return fetch(event.request)
}

const showSyncNotification = (request) => {
    if (Notification.permission === "granted") {
        self.registration.showNotification("You're online again", {
            body: 'Your review has been send to the server'
        });
    }
};

const showofflineNotification = () => {
    if (Notification.permission === "granted") {
        self.registration.showNotification("You're offline", {
            body: 'Your review will be send to the server once you are online again'
        });
    }
};
  
const bgSyncPlugin = new workbox.backgroundSync.Plugin(
    'pendingReviews', 
    {maxRetentionTime: 24 * 60, // Retry for max of 24 Hours
     callbacks: {
        requestWillEnqueue: showofflineNotification,
        queueDidReplay: showSyncNotification
     }
    }
);


async function handleReviews({url, event, params}){
    let [restaurantId] = params;
    restaurantId = Number(restaurantId);
    const request = event.request;
    const db = await idb.open(dbName, dbVersion);

    try {
        // Try network first approach. If there is no network there
        // will be no pending reviews. Moreover, the reviews in the 
        // db might be stale. Then update the db with the network 
        // response.
        const response = await fetch(request);
        await storeInDb(db, 'reviews', response);
        return response;
    } catch(ex){
        // If there is no network, we look in the cache and the 
        // queue for pending reviews.
        try {
            const storedReviews = await getReviewsStoredInDb(db, restaurantId);
            console.log('stored reviews', storedReviews)

            const pendingReviews = await getReviewsFromQueue();
            console.log('pendingReviews returned', pendingReviews)

            const allReviews = storedReviews.concat(pendingReviews);
            console.log('all reviews', allReviews)
            return new Response(JSON.stringify(allReviews))
        } catch (ex) {
            return new Response('failure in db');
        }
    }
}

async function getReviewsFromQueue(){
    try {
        const db = await idb.open('workbox-background-sync', 1);
        const tx = db.transaction('requests');
        const requestStore = tx.objectStore('requests');
        const queueNameIndex = requestStore.index('queueName');
        const pendingReviewRequests = await queueNameIndex.getAll('pendingReviews');
        console.log('pending reviews in db', pendingReviewRequests);
        const pendingReviews = [];
        for (let pendingReviewRequest of pendingReviewRequests){
            pendingReviews.push(await readBlobAsJSON(pendingReviewRequest.storableRequest.requestInit.body))
        }

        return pendingReviews;
    } catch(ex){
        console.log('Queue not yet created.')
        return [];
    }
}

// based on https://blog.shovonhasan.com/using-promises-with-filereader/
const readBlobAsJSON = (inputFile) => {
    const temporaryFileReader = new FileReader();
  
    return new Promise((resolve, reject) => {
      temporaryFileReader.onerror = () => {
        temporaryFileReader.abort();
        reject(new DOMException("Problem parsing input file."));
      };
  
      temporaryFileReader.onload = () => {
        resolve(JSON.parse(temporaryFileReader.result));
      };
      temporaryFileReader.readAsText(inputFile);
    });
};


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
    new RegExp(`${DatabaseURL}/reviews/`),
    workbox.strategies.networkOnly({
        plugins: [bgSyncPlugin]
      }),
    'POST'
);

workbox.routing.registerRoute(
    new RegExp(`${DatabaseURL}/reviews/\\?restaurant_id=(\\d+)`),
    handleReviews,
);

workbox.routing.registerRoute(
    new RegExp(`${DatabaseURL}/restaurants/(\\d+)`),
    serveSingleViaDb
);

workbox.routing.registerRoute(
    new RegExp(`${DatabaseURL}/restaurants/$`),
    serveAllViaDb
);

workbox.routing.registerRoute(
    new RegExp(`${DatabaseURL}/restaurants/(\\d+)/\\?is_favorite=(true|false)`),
    handleFavUpdate,
    'PUT'
);

workbox.routing.registerRoute(
    managedInCache,
    serveOrFetch
);
