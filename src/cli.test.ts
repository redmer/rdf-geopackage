import { readFileSync } from "node:fs";
import * as path from "node:path";
import { PassThrough } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { DataFactory } from "rdf-data-factory";
import { getRawBoundingBox } from "./bounding-box.js";
import { GeoPackageParser } from "./geopackage.js";
import { ModuleRegistry, Registry } from "./models/models-registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_GPKG = path.join(__dirname, "..", "test", "example-geopackage.gpkg");

describe("GeoPackage RDF CLI Integration Tests", () => {
  const factory = new DataFactory();

  const readGPKG = () => readFileSync(TEST_GPKG);

  const parseToQuads = async (options = {}) => {
    const buffer = readGPKG();
    const parser = new GeoPackageParser(buffer, {
      factory,
      geoSPARQLModels: ["wkt"],
      model: "facade-x",
      ...options,
    });

    const quads = [];
    const output = new PassThrough({ objectMode: true });
    output.on("data", (quad) => quads.push(quad));

    await pipeline(parser, output);
    return quads;
  };

  it("should convert GeoPackage to RDF quads with default settings", async () => {
    const quads = await parseToQuads();

    expect(quads.length).toBeGreaterThan(0);
    // Verify default WKT output
    const wktQuads = quads.filter((q) => q.predicate.value.includes("asWKT"));
    expect(wktQuads.length).toBeGreaterThan(0);
  });

  it("should filter features by bounding box", async () => {
    // Use a bounding box that includes only part of the data
    const quads = await parseToQuads({
      boundingBox: getRawBoundingBox("-1 1 -1 1"),
    });

    const allQuads = await parseToQuads();
    expect(quads.length).toBeLessThan(allQuads.length);
  });

  it("should respect layer filtering", async () => {
    const layerName = "points"; // Use an actual layer name from your test GeoPackage
    const quads = await parseToQuads({
      allowedLayers: [layerName],
    });

    // Verify only quads from the specified layer are present
    const otherLayerQuads = quads.filter(
      (q) => !q.graph.value.endsWith(encodeURIComponent(layerName)),
    );
    expect(otherLayerQuads.length).toBe(0);
  });

  it("should include binary values when specified", async () => {
    const quads = await parseToQuads({
      includeBinaryValues: true,
    });

    const binaryQuads = quads.filter(
      (q) =>
        q.object.termType === "Literal" &&
        q.object.datatype?.value === "http://www.w3.org/2001/XMLSchema#base64Binary",
    );
    expect(binaryQuads.length).toBeGreaterThan(0);
  });

  it("should use custom base IRI", async () => {
    const baseIRI = "http://example.org/test#";
    const quads = await parseToQuads({
      baseIRI,
    });

    const customIRIQuads = quads.filter((q) => q.graph.value.startsWith(baseIRI));
    expect(customIRIQuads.length).toBeGreaterThan(0);
  });

  it("should output different GeoSPARQL formats", async () => {
    // Test each available GeoSPARQL format
    const formats = ModuleRegistry.knownModels(Registry.Geometry);

    for (const format of formats) {
      const quads = await parseToQuads({
        geoSPARQLModels: [format],
      });

      // Verify format-specific predicates are present
      const formatQuads = quads.filter((q) => {
        const p = q.predicate.value;
        switch (format) {
          case "wkt":
            return p.includes("asWKT");
          case "geojson":
            return p.includes("asGeoJSON");
          case "bbox":
            return p.includes("hasBoundingBox");
          case "centroid":
            return p.includes("hasCentroid");
          case "length-area":
            return p.includes("hasMetricLength") || p.includes("hasMetricArea");
          default:
            return false;
        }
      });

      expect(formatQuads.length).toBeGreaterThan(0);
    }
  });

  it("should handle multiple GeoSPARQL formats simultaneously", async () => {
    const formats = ["wkt", "geojson"];
    const quads = await parseToQuads({
      geoSPARQLModels: formats,
    });

    // Verify both WKT and GeoJSON representations are present
    const wktQuads = quads.filter((q) => q.predicate.value.includes("asWKT"));
    const geojsonQuads = quads.filter((q) => q.predicate.value.includes("asGeoJSON"));

    expect(wktQuads.length).toBeGreaterThan(0);
    expect(geojsonQuads.length).toBeGreaterThan(0);
  });
});
