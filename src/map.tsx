import { MapContainer, TileLayer, Marker } from "react-leaflet";
import useSwr from "swr";
import PopupComponent from "./popup";
import Loading from "./loading";
import { useEffect, useState } from "react";

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
      return; // Loading state is already set to false
    }

    const loadingTimer = setTimeout(() => {
      setLoading(false);
    }, 1000); // Set your desired minimum loading time here

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
        style={{ height: "100dvh" }}
        id="map"
        center={[43.65107, -79.347015]}
        zoom={13}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {stations.map((station) => (
          <div key={station.station_id}>
            <Marker position={[station.lat, station.lon]}>
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
