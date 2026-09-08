# Bike Share Toronto

A single-page map showing live availability of Bike Share Toronto stations —
bikes and docks per station, updated from the city's public GBFS feeds.

## Stack

- [Vite](https://vite.dev/) — dev server / bundler
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) — map rendering
- [MapTiler](https://www.maptiler.com/) — map style/tiles (requires an API key)
- Vanilla JS, no framework

## Setup

This project uses [pnpm](https://pnpm.io/).

```bash
pnpm install
```

Copy `.env.example` to `.env` and set `VITE_API_KEY` to a MapTiler API key
(get one at https://cloud.maptiler.com/account/keys/). Restrict the key to
your site's domain(s) in the MapTiler dashboard — it ships in the client
bundle.

```bash
cp .env.example .env
```

## Scripts

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `pnpm dev`          | Start the dev server                 |
| `pnpm build`        | Build for production into `dist/`    |
| `pnpm preview`      | Preview the production build locally |
| `pnpm lint`         | Lint with ESLint                     |
| `pnpm format`       | Format with Prettier                 |
| `pnpm format:check` | Check formatting without writing     |
| `pnpm test`         | Run the test suite once              |
| `pnpm test:watch`   | Run tests in watch mode              |

## Data sources

Station locations and live availability come from the Bike Share Toronto
GBFS feeds:

- `https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_information` —
  station coordinates and metadata
- `https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_status` — live
  bikes/docks available per station

`main.js` fetches both and merges them by `station_id` (see
`combineStationData` in `stations.js`) before rendering markers.
