import L from "leaflet";

const customIcon = L.icon({
  iconSize: [25, 41],
  iconAnchor: [10, 41],
  popupAnchor: [3, -40],
  iconUrl: "marker-icon.svg",
  shadowUrl: "marker-shadow.png",
  shadowAnchor: [10, 44] 
});

export default customIcon;