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

// Which overlays the user wants visible. Layers may not exist yet when a
// toggle is clicked (style or station data still loading), so this state is
// re-applied whenever layers are added.
const visibility = { stations: true, bikeLanes: true };

const STATION_LAYERS = ["stations-circles"];
const BIKE_LANE_LAYERS = ["bike-lanes", "bike-lanes-shared"];

function applyVisibility() {
  const setLayers = (ids, visible) => {
    ids.forEach((id) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
      }
    });
  };
  setLayers(STATION_LAYERS, visibility.stations);
  setLayers(BIKE_LANE_LAYERS, visibility.bikeLanes);
  // Station pins are DOM markers, not map layers, so hide them via CSS.
  map.getContainer().classList.toggle("hide-stations", !visibility.stations);
  // Don't leave a popup floating over a station that's no longer shown.
  if (!visibility.stations) closeStationPopup();
}

// The station popup currently open, if any (pins and circles both open one).
let openStationPopup = null;

function createStationPopup(station) {
  const popup = new Popup({ closeButton: true, closeOnClick: true }).setHTML(
    createPopupContent(station)
  );
  popup.on("open", () => {
    openStationPopup = popup;
  });
  popup.on("close", () => {
    if (openStationPopup === popup) openStationPopup = null;
  });
  return popup;
}

function closeStationPopup() {
  openStationPopup?.remove();
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeStationPopup();
});

const STATIONS_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>`;
// "bike" icon from Lucide (https://lucide.dev/icons/bike), ISC license.
const BIKE_LANES_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>`;

// Map control with on/off buttons for the station and bike lane overlays,
// styled like (and stacked under) the zoom buttons.
class OverlayToggleControl {
  onAdd() {
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";
    this._addButton("stations", "stations", STATIONS_ICON);
    this._addButton("bikeLanes", "bike lanes", BIKE_LANES_ICON);
    return this._container;
  }

  _addButton(key, label, icon) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "overlay-toggle";
    button.innerHTML = icon;
    const sync = () => {
      const on = visibility[key];
      button.setAttribute("aria-pressed", String(on));
      button.title = `${on ? "Hide" : "Show"} ${label}`;
      button.setAttribute("aria-label", button.title);
    };
    button.addEventListener("click", () => {
      visibility[key] = !visibility[key];
      sync();
      applyVisibility();
    });
    sync();
    this._container.appendChild(button);
  }

  onRemove() {
    this._container.remove();
  }
}

map.addControl(new OverlayToggleControl());

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
  applyVisibility();

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
    createStationPopup(station)
      .setLngLat(feature.geometry.coordinates)
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
      .setPopup(createStationPopup(station))
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
  applyVisibility();
}
