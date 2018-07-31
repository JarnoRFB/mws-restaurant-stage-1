const dbPromise = idb.open('restaurant-db', 1);

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
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    dbPromise.then(db => {
      const tx = db.transaction('restaurants');
      const restaurantStore = tx.objectStore('restaurants');
      return restaurantStore.get(Number(id));

    }).then(requestedRestaurant => {
      callback(null, requestedRestaurant)
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
      .then(unique)
      .then(cuisines => {
      callback(null, cuisines)
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

// dbPromise = createDb()
// DBHelper.fetchRestaurants()