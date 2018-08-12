# Udacity Mobile Web Specialist Certification Course

This project is a fully responsive, offline first progressive web app.
Page contents can be viewed offline, once they were visited online. 
Restaurant reviews can be submitted offline as well. The 
project is build with Workbox, SCSS, gulp and asynchronous JavaScript.

This project was done for the Udacity Nanodegree *Mobile Web Specialist* as part of the Google Developer Scholarship program.

## Running the project locally
To run the project locally

Clone and run the data server from https://github.com/udacity/mws-restaurant-stage-3
then in this repository

    $ npm install
    $ gulp

The page should open on `localhost:3000`.

### Clearing the cache
The app can be confused by existing caches and databases from previous apps and especially after running lighthouse.
To avoid that 
* delete all existing caches and idbs.
* set service worker to "Update on reload"
* reload the page
* uncheck service worker "Update on reload" again

or alternatively just "Clear storage" via the "Application" tab.

Now everything should work as intended.

### Testing offline submission
To test the offline form submission:
* turn off the backend server
* turn off the network (`$ nmcli networking off` on Ubuntu)
* submit a review
* a notification should appear that you are offline
* once you are online again a notification should tell you that the review was submitted


## Attribution
Icon made by Freepik from www.flaticon.com.

