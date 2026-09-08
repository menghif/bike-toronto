export function getMarkerColor(bikesAvailable) {
  if (bikesAvailable === 0) return "#EBEBEB";
  if (bikesAvailable <= 3) return "#759180";
  return "#3A644B";
}

export function combineStationData(stationsCoords, stationsInfo) {
  return stationsCoords.map((station) => {
    const matchingStation = stationsInfo.find(
      (stationInfo) => stationInfo.station_id === station.station_id
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
}

export function createPopupContent(station) {
  const bikesAvailable =
    station.num_bikes_available === 0 ? "zero" : "non-zero";
  const docksAvailable =
    station.num_docks_available === 0 ? "zero" : "non-zero";

  return `<h1 class="station-name">${station.name}</h1>
  <p class="num-bikes-available">Available Bikes: <span class="${bikesAvailable}">${station.num_bikes_available}</span></p>
  <p class="num-docks-available">Available Docks: <span class="${docksAvailable}">${station.num_docks_available}</span></p>`;
}
