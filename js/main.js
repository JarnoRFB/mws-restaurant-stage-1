let restaurants;
let neighborhoods;
let cuisines;
let map;
let markers = []
registerServiceWorker = () => {
  navigator.serviceWorker.register('./serviceWorker.js')
  .then(reg => {
    if (reg.installing) {
      console.log('Service worker is being installed')
    } else if (reg.waiting) {
      console.log('Service worker sucessfully installed')
    } else if (reg.active) {
      console.log('Service worker is active')
    }

    console.log(`scope is ${reg.scope}`);
  }).catch(err => {
    console.log(`Failed to register service worker with ${err}`)
  });
}

registerServiceWorker()

getStaticAllRestaurantsMapImage = (restaurants) => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  // Create static map image for initial display
  let mapURL = `http://maps.googleapis.com/maps/api/staticmap?center=${
  loc.lat},${loc.lng}&zoom=12&size=${
  document.documentElement.clientWidth}x400&markers=color:red`;
  restaurants.forEach(r => {
    mapURL += `|${r.latlng.lat},${r.latlng.lng}`;
  });
  mapURL += "&key=AIzaSyBxkAzlvKkueSTlEnrx9SswARuAli4Eiw4";

  return mapURL;
}

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  DBHelper.fetchRestaurantByCuisineAndNeighborhood('all', 'all', (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
      addMarkersToMap();

    }
  })
  fetchNeighborhoods();
  fetchCuisines();

  /**
 * Initialize Google map, called from HTML.
 */

}); 

window.initMap = () => //console.log('init map');
{
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  // updateRestaurants();
}

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

// /**
//  * Initialize Google map, called from HTML.
//  */
// window.initMap = () => {
//   // let loc = {
//   //   lat: 40.722216,
//   //   lng: -73.987501
//   // };
//   // self.map = new google.maps.Map(document.getElementById('map'), {
//   //   zoom: 12,
//   //   center: loc,
//   //   scrollwheel: false
//   // });
//   updateRestaurants();
// }

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
      addMarkersToMap(restaurants);
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.setMap(null));
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = `Example image for restaurant ${restaurant.name}`
  li.append(image);

  const name = document.createElement('h3');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more)

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}

