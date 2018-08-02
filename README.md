# Mobile Web Specialist Certification Course
---
#### _Three Stage Course Material Project - Restaurant Reviews_

## Project Overview: Stage 2

To run the project locally

Clone and run the data server from https://github.com/udacity/mws-restaurant-stage-2
then in this repository

    $ npm install
    $ gulp

The page should open on `localhost:3000`.
The app can be confused by existing caches and databases from previous apps and especially after running lighthouse.
To avoid that 
* delete all existing caches and idbs.
* set service worker to "Update on reload"
* reload the page
* uncheck service worker "Update on reload" again

or alternatively just "Clear storage" via the "Application" tab.

Now everything should work as intended.

Icon made by Freepik from www.flaticon.com.

