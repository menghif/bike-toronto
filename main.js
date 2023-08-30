const map = new maplibregl.Map({
  container: "map", // container id
  style:
    "https://api.maptiler.com/maps/streets/style.json?key=DdZLalB3JPwuIhjynQG1",
  center: [-79.38, 43.7], // starting position
  zoom: 10.5, // starting zoom
});

function createPopupContent(stationName) {
  return `<h3>${stationName}</h3>`;
}

// Add geolocate control to the map.
map.addControl(
  new maplibregl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true,
    },
    trackUserLocation: true,
  })
);

const stations_coord_url =
  "https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_information";
const station_info_url =
  "https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_status";

let combinedStations = [];

fetch(stations_coord_url)
  .then((res) => {
    // handle the response
    return res.json();
  })
  .then((data) => {
    if (data && data.data.stations) {
      // Access the array of stations
      const stationsCoords = data.data.stations;
      // console.log(
      //   "------------------ Stations Coordinates -----------------------"
      // );
      // console.log(data);
      const stationIds = stationsCoords.map(
        (station) => station.station_id
      );

      return fetch(station_info_url)
        .then((res) => {
          return res.json();
        })
        .then((data) => {
          // console.log(
          //   "------------------ Available Space! -----------------------"
          // );
          // console.log(data);

          if (data && data.data.stations) {
            const stationsInfo = data.data.stations;

            // Combine data from both APIs
            combinedStations = stationsCoords.map((station) => {
              const stationId = station.station_id;
              const matchingStation = stationsInfo.find(
                (stationInfo) => stationInfo.station_id === stationId
              );

              if (matchingStation) {
                return {
                  ...station,
                  num_docks_available:
                    matchingStation.num_docks_available,
                  num_bikes_available:
                    matchingStation.num_bikes_available,
                };
              }

              return station;
            });
            // console.log("Combined Stations:", combinedStations);
          } else {
            console.log("Invalid response format from second API.");
          }
        })
        .catch((err) => {
          // handle the error
          console.error(err);
        });
    } else {
      console.log("Invalid response format.");
    }
  })
  .catch((err) => {
    // handle the error
    console.error(err);
  });

map.on("load", () => {
  if (combinedStations) {
    combinedStations.forEach((station) => {
      const marker = new maplibregl.Marker()
        .setLngLat([station.lon, station.lat])
        .addTo(map)
        .setPopup(
          new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true,
          }).setHTML(createPopupContent(station.name))
        );

      station.marker = marker; // Store marker instance in combinedStations array
    });
    // Set initial marker sizes based on zoom level
    updateMarkerSizes();

    // Update marker sizes when the zoom level changes
    map.on("zoom", () => {
      updateMarkerSizes();
    });
  }
});

function updateMarkerSizes() {
  const zoom = map.getZoom();
  // console.log(zoom);
  combinedStations.forEach((station) => {
    const markerSize = getMarkerSize(zoom);
    const markerElement = station.marker.getElement();

    // Update the SVG width and height attributes
    const svgElement = markerElement.querySelector("svg"); // Assuming the SVG is the first child
    if (svgElement) {
      svgElement.setAttribute("width", markerSize);
      // svgElement.setAttribute("height", markerSize);
    }
  });
}

function getMarkerSize(zoom) {
  // Define your logic here to adjust the marker size based on the zoom level
  // Example: The marker size increases as the zoom level decreases
  return zoom > 12 ? 35 : 25;
}