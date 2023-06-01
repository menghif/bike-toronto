import { Popup } from 'react-leaflet';
import useSwr from "swr";

const fetcher = (...args: any[]) => fetch(args[0], ...args.slice(1)).then(response => response.json());
const url = "https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_status";

interface Station {
  station_id: number;
  num_bikes_available: number;
  num_docks_available: number;
}

interface MyComponentProps {
  stationId: number;
}

const PopupComponent: React.FC<MyComponentProps> = ({ stationId }) => {
  
  const { data, error } = useSwr(url, { fetcher });
  const stations: Station[] = data && !error ? data?.data?.stations : [];
  
  // Filter the stations by ID
  const station1 = stations.find((station: Station) => station.station_id === stationId) ;

  return <Popup>Bikes available {station1 ? station1.num_bikes_available : "???"}</Popup>;
};

export default PopupComponent;
