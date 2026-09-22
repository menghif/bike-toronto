import { describe, expect, it } from "vitest";
import {
  combineStationData,
  createPopupContent,
  getMarkerColor,
} from "./stations.js";

describe("getMarkerColor", () => {
  it("returns the empty color when no bikes are available", () => {
    expect(getMarkerColor(0)).toBe("#EBEBEB");
  });

  it("returns the low-availability color at or below 3 bikes", () => {
    expect(getMarkerColor(1)).toBe("#759180");
    expect(getMarkerColor(3)).toBe("#759180");
  });

  it("returns the default color above 3 bikes", () => {
    expect(getMarkerColor(4)).toBe("#3A644B");
  });
});

describe("combineStationData", () => {
  it("merges availability info into matching stations by station_id", () => {
    const coords = [
      { station_id: "1", name: "Station A", lat: 43.7, lon: -79.4 },
      { station_id: "2", name: "Station B", lat: 43.6, lon: -79.3 },
    ];
    const info = [
      { station_id: "1", num_bikes_available: 5, num_docks_available: 2 },
      { station_id: "2", num_bikes_available: 0, num_docks_available: 10 },
    ];

    expect(combineStationData(coords, info)).toEqual([
      {
        station_id: "1",
        name: "Station A",
        lat: 43.7,
        lon: -79.4,
        num_bikes_available: 5,
        num_docks_available: 2,
      },
      {
        station_id: "2",
        name: "Station B",
        lat: 43.6,
        lon: -79.3,
        num_bikes_available: 0,
        num_docks_available: 10,
      },
    ]);
  });

  it("leaves a station unchanged when no matching info is found", () => {
    const coords = [{ station_id: "1", name: "Station A" }];

    expect(combineStationData(coords, [])).toEqual([
      { station_id: "1", name: "Station A" },
    ]);
  });
});

describe("createPopupContent", () => {
  it("marks zero bikes and docks as the zero class", () => {
    const html = createPopupContent({
      name: "Station A",
      num_bikes_available: 0,
      num_docks_available: 0,
    });

    expect(html).toContain(">Station A<");
    expect(html).toContain('<span class="zero">0</span>');
  });

  it("marks non-zero bikes and docks as the non-zero class", () => {
    const html = createPopupContent({
      name: "Station A",
      num_bikes_available: 5,
      num_docks_available: 3,
    });

    expect(html).toContain('<span class="non-zero">5</span>');
    expect(html).toContain('<span class="non-zero">3</span>');
  });
});
