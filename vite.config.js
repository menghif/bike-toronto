import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// maplibre-gl's worker is shipped as two files that import each other by a
// hardcoded relative path (maplibre-gl-worker.mjs -> ./maplibre-gl-shared.mjs).
// It's only ever loaded at runtime via `new Worker(url)`, so Vite has no way
// to see that relationship and bundle it - both files need to be served
// unbundled, side by side, at a fixed path instead.
function maplibreWorkerAssets() {
  const files = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];
  const dir = fileURLToPath(
    new URL("./node_modules/maplibre-gl/dist/", import.meta.url)
  );

  return {
    name: "maplibre-worker-assets",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = req.url?.split("?")[0]?.slice(1);
        if (!files.includes(file)) return next();
        res.setHeader("Content-Type", "text/javascript");
        res.end(readFileSync(dir + file));
      });
    },
    generateBundle() {
      for (const file of files) {
        this.emitFile({
          type: "asset",
          fileName: file,
          source: readFileSync(dir + file),
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [maplibreWorkerAssets()],
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  build: {
    chunkSizeWarningLimit: 1100,
  },
});
