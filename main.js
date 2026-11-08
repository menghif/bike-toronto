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
  center: [-79.38, 43.7],
  zoom: 10.5,
  dragRotate: false,
  pitchWithRotate: false,
  touchPitch: false,
});

map.touchZoomRotate.disableRotation();

// Add geolocate control to the map.
map.addControl(
  new GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true,
    },
    trackUserLocation: true,
  })
);

map.addControl(new NavigationControl({ showCompass: false }));

const stations_coord_url =
  "https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_information";
const station_info_url =
  "https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_status";

// Below this zoom level stations are drawn as small circles (a WebGL layer)
// instead of pins, so the dense downtown core doesn't become a pile of
// overlapping markers when viewing the whole city.
const PIN_MIN_ZOOM = 13;

let sortedStations = [];

const stationsLoaded = fetch(stations_coord_url)
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

// Bike lane geometry from the City of Toronto's Cycling Network open
// dataset (https://open.toronto.ca/dataset/cycling-network/), vendored
// locally as public/cycling-network.geojson to avoid a ~3MB fetch from
// the city's server on every page load. See README for how to refresh it.
map.on("load", () => {
  map.addSource("bike-lanes", {
    type: "geojson",
    data: "/cycling-network.geojson",
  });

  // Bike lanes and cycle tracks (regular, protected on-street infrastructure).
  const bikeLaneTypes = [
    "Cycle Track",
    "Bi-Directional Cycle Track",
    "Cycle Track - Contraflow",
    "Bike Lane",
    "Bike Lane - Contraflow",
    "Bike Lane - Buffered",
  ];
  // Multi-use trails, off-street and generally wider/separated paths.
  const trailTypes = [
    "Multi-Use Trail",
    "Multi-Use Trail - Entrance",
    "Multi-Use Trail - Boulevard",
    "Multi-Use Trail - Existing Connector",
    "Multi-Use Trail - Connector",
  ];

  map.addLayer({
    id: "bike-lanes",
    type: "line",
    source: "bike-lanes",
    filter: [
      "in",
      ["get", "INFRA_HIGHORDER"],
      ["literal", [...bikeLaneTypes, ...trailTypes]],
    ],
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 16, 4],
      "line-color": [
        "match",
        ["get", "INFRA_HIGHORDER"],
        bikeLaneTypes,
        "#3aa655",
        trailTypes,
        "#1b5e20",
        "#3aa655",
      ],
    },
  });

  // Sharrows and other shared-road infrastructure (no dedicated lane), drawn
  // as a dotted light green line since cyclists share the roadway here.
  map.addLayer({
    id: "bike-lanes-shared",
    type: "line",
    source: "bike-lanes",
    filter: [
      "!",
      [
        "in",
        ["get", "INFRA_HIGHORDER"],
        ["literal", [...bikeLaneTypes, ...trailTypes]],
      ],
    ],
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 16, 3],
      "line-color": "#a5d6a7",
      "line-dasharray": [1, 2],
    },
  });

  // Station data is fetched in parallel with the map style, so wait for it
  // here rather than assuming it already arrived.
  stationsLoaded.then(() => addStations());
});

function addStations() {
  map.addSource("stations", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: sortedStations.map((station, index) => ({
        type: "Feature",
        id: index,
        geometry: { type: "Point", coordinates: [station.lon, station.lat] },
        properties: {
          color: getMarkerColor(station.num_bikes_available),
        },
      })),
    },
  });

  map.addLayer({
    id: "stations-circles",
    type: "circle",
    source: "stations",
    maxzoom: PIN_MIN_ZOOM,
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3, 13, 6],
      "circle-stroke-color": "#1f3a2a",
      "circle-stroke-width": 1,
    },
  });

  map.on("click", "stations-circles", (e) => {
    const feature = e.features[0];
    const station = sortedStations[feature.id];
    new Popup({ closeButton: true, closeOnClick: true })
      .setLngLat(feature.geometry.coordinates)
      .setHTML(createPopupContent(station))
      .addTo(map);
  });
  map.on("mouseenter", "stations-circles", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "stations-circles", () => {
    map.getCanvas().style.cursor = "";
  });

  sortedStations.forEach((station) => {
    new Marker({
      color: getMarkerColor(station.num_bikes_available),
      anchor: "bottom",
      offset: [0, 5],
      className: "station-pin",
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

  // Pins are DOM elements, so toggle them with a class on the container
  // instead of adding/removing hundreds of markers on every zoom.
  const updatePinVisibility = () => {
    map
      .getContainer()
      .classList.toggle("show-pins", map.getZoom() >= PIN_MIN_ZOOM);
  };
  map.on("zoom", updatePinVisibility);
  updatePinVisibility();
}
