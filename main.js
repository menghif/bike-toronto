import {
  GeolocateControl,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  combineStationData,
  createPopupContent,
  getMarkerColor,
} from "./stations.js";

// maplibre-gl's default worker lookup is relative to its own bundled
// location, which doesn't survive Vite bundling into dist/. See the
// maplibreWorkerAssets plugin in vite.config.js, which serves the worker
// (and its sibling maplibre-gl-shared.mjs) at this fixed path instead.
setWorkerUrl("/maplibre-gl-worker.mjs");

// API key from https://cloud.maptiler.com/account/keys/
const apiKey = import.meta.env.VITE_API_KEY;

const map = new MapLibreMap({
  container: "map", // container id
  style: `https://api.maptiler.com/maps/streets/style.json?key=${apiKey}`,
  center: [-79.38, 43.7], // starting position
  zoom: 10.5, // starting zoom
});

// Add geolocate control to the map.
map.addControl(
  new GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true,
    },
    trackUserLocation: true,
  })
);

map.addControl(new NavigationControl());

const stations_coord_url =
  "https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_information";
const station_info_url =
  "https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_status";

let sortedStations = [];

fetch(stations_coord_url)
  .then((res) => {
    // handle the response
    return res.json();
  })
  .then((data) => {
    if (data && data.data.stations) {
      // Access the array of stations
      const stationsCoords = data.data.stations;

      return fetch(station_info_url)
        .then((res) => {
          return res.json();
        })
        .then((data) => {
          // get number of bikes and number of docks available for each station
          if (data && data.data.stations) {
            const stationsInfo = data.data.stations;

            const combinedData = combineStationData(
              stationsCoords,
              stationsInfo
            );
            sortedStations = combinedData.sort((a, b) => b.lat - a.lat);
          } else {
            console.log("Invalid response format from second API.");
          }
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      console.log("Invalid response format.");
    }
  })
  .catch((err) => {
    console.error(err);
  });

map.on("load", () => {
  if (sortedStations) {
    sortedStations.forEach((station) => {
      new Marker({
        color: getMarkerColor(station.num_bikes_available),
        anchor: "bottom",
        offset: [0, 5],
      })
        .setLngLat([station.lon, station.lat])
        .setPopup(
          new Popup({
            closeButton: true,
            closeOnClick: true,
          }).setHTML(createPopupContent(station))
        )
        .addTo(map);
    });
  }
});
