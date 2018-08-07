let restaurants;
let neighborhoods;
let cuisines;
let map;
let markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
const initSite = () => {
  document.addEventListener('DOMContentLoaded', (event) => {
      console.log('DOM loaded');
      DBHelper.fetchRestaurantByCuisineAndNeighborhood('all', 'all', (error, restaurants) => {
        if (error) { // Got an error!
          console.error(error);
        } else {
          console.log('filling restaurants');
          resetRestaurants(restaurants);
          fillRestaurantsHTML();
        }
      })
      fetchNeighborhoods();
      fetchCuisines();
    }); 
}

const registerServiceWorker = () => {
  navigator.serviceWorker.register('./serviceWorker.js')
  .then(reg => {
    console.log('registering sw');
    reg.addEventListener('activate', event => console.log('sw activation event'));
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

if ('serviceWorker' in navigator) {
  // Use the window load event to keep the page load performant
  window.addEventListener('load', () => {
    registerServiceWorker()
  });
}

initSite();

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
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
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
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
const fetchCuisines = () => {
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
const fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = () => {
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
const resetRestaurants = (restaurants) => {
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
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
}

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = `Example image for restaurant ${restaurant.name}`
  li.append(image);

  const name = document.createElement('h3');
  name.innerHTML = restaurant.name;
  li.append(name);

  const favoriteBtn = document.createElement('button');
  favoriteBtn.innerHTML = '<3';
  const isFavorite = normalizeFavoriteStatus(restaurant.is_favorite);
  toggleFavoriteClass(favoriteBtn, isFavorite);
  favoriteBtn.onclick = async function() {
    const updatedRestaurant = await DBHelper.fetchRestaurantByIdWithoutCallback(restaurant.id);
    const isFavorite = !normalizeFavoriteStatus(updatedRestaurant.is_favorite);
    toggleFavoriteClass(favoriteBtn, isFavorite);
    DBHelper.updateFavoriteStatus(restaurant.id, isFavorite);
  }
  li.append(favoriteBtn);

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

/*
 * Needed because the API stores the status as a string once it is changed.
 */
const normalizeFavoriteStatus = (favoriteStatus) => {
  if (typeof(favoriteStatus) === 'string') {
    return favoriteStatus === 'true';
  } else if (typeof(favoriteStatus) === 'boolean') {
    return favoriteStatus;
  } else {
    return false;
  }

}

function toggleFavoriteClass(favoriteBtn, isFavorite){
  if (isFavorite) {
    favoriteBtn.classList.remove('favorite-button__off');
    favoriteBtn.classList.add('favorite-button__on');
    favoriteBtn.setAttribute('aria-label', 'Add restaurant to favorites.');

  } else {
    favoriteBtn.classList.remove('favorite-button__on');
    favoriteBtn.classList.add('favorite-button__off');
    favoriteBtn.setAttribute('aria-label', 'Remove restaurant from favorites.');
  }

}

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}
