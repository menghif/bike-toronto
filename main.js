// API key from https://cloud.maptiler.com/account/keys/
const apiKey = import.meta.env.VITE_API_KEY

const map = new maplibregl.Map({
  container: "map", // container id
  style:
    `https://api.maptiler.com/maps/streets/style.json?key=${apiKey}`,
  center: [-79.38, 43.7], // starting position
  zoom: 10.5, // starting zoom
});

function createPopupContent(station) {
  const bikesAvailable =
    station.num_bikes_available === 0 ? "zero" : "non-zero";
  const docksAvailable =
    station.num_docks_available === 0 ? "zero" : "non-zero";

  return `<h1 class="station-name">${station.name}</h1>
  <p class="num-bikes-available">Available Bikes: <span class="${bikesAvailable}">${station.num_bikes_available}</span></p>
  <p class="num-docks-available">Available Docks: <span class="${docksAvailable}">${station.num_docks_available}</span></p>`;
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

map.addControl(new maplibregl.NavigationControl());

const stations_coord_url =
  "https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_information";
const station_info_url =
  "https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_status";

let combinedData = [];
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

            // Combine data from both APIs
            combinedData = stationsCoords.map((station) => {
              const stationId = station.station_id;
              const matchingStation = stationsInfo.find(
                (stationInfo) => stationInfo.station_id === stationId
              );

              if (matchingStation) {
                return {
                  ...station,
                  num_docks_available: matchingStation.num_docks_available,
                  num_bikes_available: matchingStation.num_bikes_available,
                };
              }

              return station;
            });
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
      let markerColor = "#3A644B";
      if (station.num_bikes_available <= 3) markerColor = "#759180";
      if (station.num_bikes_available === 0) markerColor = "#EBEBEB";

      new maplibregl.Marker({
        color: markerColor,
        anchor: "bottom",
        offset: [0, 5],
      })
        .setLngLat([station.lon, station.lat])
        .setPopup(
          new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true,
          }).setHTML(createPopupContent(station))
        )
        .addTo(map);
    });
  }
});
