function createDb(){
  console.log('creating db')
  const dbPromise = idb.open('restaurant-db', 1, upgradeDb => {
      console.log(upgradeDb.oldVersion)
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

// from https://stackoverflow.com/questions/1960473/get-all-unique-values-in-a-javascript-array-remove-duplicates
function onlyUnique(value, index, self) { 
  return self.indexOf(value) === index;
}

function unique(iterable){
  return iterable.filter(onlyUnique)
}

/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    fetch(DBHelper.DATABASE_URL)
    .then(response => response.json())
    // .then(response => callback(null, response))
    .then(response => writeToDb(dbPromise, response))
    .catch(error => callback(error, null))
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    dbPromise.then(db => {
      const tx = db.transaction('restaurants');
      const restaurantStore = tx.objectStore('restaurants');
      console.log(id)
      return restaurantStore.get(Number(id));

    }).then(requestedRestaurant => {
      console.log('matched restaurants');

      console.log(requestedRestaurant);
      callback('hello', requestedRestaurant)
    }).catch(error => {
      callback('Restaurant does not exist', null);
    });
}

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    dbPromise.then(db => {
      const tx = db.transaction('restaurants');
      const restaurantStore = tx.objectStore('restaurants');
      const cuisineIndex = restaurantStore.index('cuisine');
      return cuisineIndex.getAll(cuisine);

    }).then(requestedRestaurant => {
      callback(null, requestedRestaurant)
    }).catch(error => {
      callback(error, null);
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    dbPromise.then(db => {
      const tx = db.transaction('restaurants');
      const restaurantStore = tx.objectStore('restaurants');
      const neighborhoodIndex = restaurantStore.index('neighborhood');
      return neighborhoodIndex.getAll(neighborhood);
    }).then(requestedRestaurant => {
      callback(null, requestedRestaurant)
    }).catch(error => {
      callback(error, null);
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  // static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
  //   // Fetch all restaurants
  //   DBHelper.fetchRestaurants((error, restaurants) => {
  //     if (error) {
  //       callback(error, null);
  //     } else {
  //       let results = restaurants
  //       if (cuisine != 'all') { // filter by cuisine
  //         results = results.filter(r => r.cuisine_type == cuisine);
  //       }
  //       if (neighborhood != 'all') { // filter by neighborhood
  //         results = results.filter(r => r.neighborhood == neighborhood);
  //       }
  //       callback(null, results);
  //     }
  //   });
  // }

  static async fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    dbPromise.then(db => {
      const tx = db.transaction('restaurants');
      const restaurantStore = tx.objectStore('restaurants');
      return restaurantStore.getAll();
    }).then(restaurants => {

      if (cuisine != 'all') { // filter by cuisine
        restaurants = restaurants.filter(r => r.cuisine_type == cuisine);
      }
      if (neighborhood != 'all') { // filter by neighborhood
        restaurants = restaurants.filter(r => r.neighborhood == neighborhood);
      }
      callback(null, restaurants);
    }).catch(error => {
      callback(error, null);
    });
  }


  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    dbPromise.then(db => {
      const tx = db.transaction('restaurants');
      const restaurantStore = tx.objectStore('restaurants');
      return restaurantStore.getAll();
    }).then(restaurants => restaurants.map(restaurant => restaurant.neighborhood))
    .then(unique)
      .then(neighborhoods => {
      callback(null, neighborhoods)
    }).catch(error => {
      callback(error, null);
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    dbPromise.then(db => {
      const tx = db.transaction('restaurants');
      const restaurantStore = tx.objectStore('restaurants');
      return restaurantStore.getAll();

    }).then(restaurants => restaurants.map(restaurant => restaurant.cuisine_type))
      
      .then(cui => {
      console.log(cui)
      return unique(cui)})
      .then(neighborhoods => {
      callback(null, neighborhoods)
    }).catch(error => {
      callback(error, null);
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    if (restaurant.photograph){
      return (`/img/${restaurant.photograph}.jpg`);
    } else {
      // For restautrant 10 which does not have a photgraph entry.
      return (`/img/${restaurant.id}.jpg`);
    }
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

}

dbPromise = createDb()
DBHelper.fetchRestaurants()