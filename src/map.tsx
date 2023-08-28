import { MapContainer, TileLayer, Marker } from "react-leaflet";
import useSwr from "swr";
import PopupComponent from "./popup";
import Loading from "./loading";
import { useEffect, useState } from "react";
import customIcon from "./customIcon";

// API key from https://rapidapi.com/
const apiKey = import.meta.env.VITE_API_KEY

const fetcher = (...args: never[]) =>
  fetch(args[0], ...args.slice(1)).then((response) => response.json());
const url =
  "https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_information";

interface Station {
  station_id: number;
  name: string;
  lat: number;
  lon: number;
}

const useDelayedSWR = (
  url: string,
  fetcher: (...args: never[]) => Promise<any>
) => {
  const [isLoading, setLoading] = useState(true);
  const { data, error } = useSwr(url, fetcher);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const loadingTimer = setTimeout(() => {
      setLoading(false);
    }, 500); // Minimum loading time

    return () => clearTimeout(loadingTimer);
  }, [isLoading]);

  return { data, error, isLoading };
};

export default function BikeMap() {
  const { data, error, isLoading } = useDelayedSWR(url, fetcher);

  const stations: Station[] = data && !error ? data?.data?.stations : [];

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <MapContainer
      attributionControl={false}
        style={{ height: "100dvh" }}
        id="map"
        center={[43.65107, -79.347015]}
        zoom={13}
        scrollWheelZoom={true}
      >
        <TileLayer
          url={`https://retina-tiles.p.rapidapi.com/local/osm{r}/v1/{z}/{x}/{y}.png?rapidapi-key=${apiKey}`}
        />
        {stations.map((station) => (
          <div key={station.station_id}>
            <Marker position={[station.lat, station.lon]} icon={customIcon}>
              <PopupComponent
                stationId={station.station_id}
                stationName={station.name}
              />
            </Marker>
          </div>
        ))}
      </MapContainer>
    </>
  );
}
