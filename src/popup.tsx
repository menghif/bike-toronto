import { Popup } from 'react-leaflet';
import useSwr from "swr";
import LinearProgress from '@mui/joy/LinearProgress';

const fetcher = (...args: any[]) => fetch(args[0], ...args.slice(1)).then(response => response.json());
const url = "https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_status";

interface Station {
  station_id: number;
  station_name: string;
  num_bikes_available: number;
  num_docks_available: number;
}

interface MyComponentProps {
  stationId: number;
  stationName: string;
}

const percentBikesAvailable = (docksAvailable: number, bikesAvailable: number) => {
  return bikesAvailable / (bikesAvailable + docksAvailable) * 100
}

const PopupComponent: React.FC<MyComponentProps> = ({ stationId, stationName }) => {
  
  const { data, error } = useSwr(url, { fetcher });
  const stations: Station[] = data && !error ? data?.data?.stations : [];
  
  // Filter the stations by ID
  const station1 = stations.find((station: Station) => station.station_id === stationId) ;

  return <Popup>
    <p><b>{stationName}</b></p>
    <p>Bikes available: {station1 ? station1.num_bikes_available : "???"}
      <br/>Docks available: {station1 ? station1.num_docks_available : "???"}</p>
      <LinearProgress determinate value={station1 ? percentBikesAvailable(station1.num_docks_available, station1.num_bikes_available) : 0} />

    </Popup>;
};

export default PopupComponent;
