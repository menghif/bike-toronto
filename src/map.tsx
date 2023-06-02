import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import useSwr from "swr";
import PopupComponent from './popup';


const fetcher = (...args: never[]) => fetch(args[0], ...args.slice(1)).then(response => response.json());
const url = "https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_information";

interface Station {
  station_id: number;
  name: string;
  lat: number;
  lon: number;
}

export default function BikeMap() {
  const { data, error } = useSwr(url, { fetcher });

  const stations: Station[] = data && !error ? data?.data?.stations : [];
  return (
    <>
      <MapContainer style={{ height: 600, width: '100%' }} id='map' center={[43.651070, -79.347015]} zoom={13} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
          {stations.map(station => (
            <div key={station.station_id}>
            <Marker
            position={[station.lat, station.lon]}>
            <PopupComponent stationId={station.station_id} stationName={station.name} />
            </Marker>
            </div>)
        )}
      </MapContainer>
    </>
  );
}