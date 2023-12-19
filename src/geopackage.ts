import { GeoPackage, GeoPackageAPI } from "@ngageoint/geopackage";
import type * as RDF from "@rdfjs/types";
import { Readable } from "node:stream";
import { DataFactory } from "rdf-data-factory";
import type { CLIContext, RDFContext, RDFOptions } from "./interfaces.js";
import { FacadeXWithGeoSparql } from "./models/facade-x/facade-x.js";
import { BoundingBoxGeometry } from "./models/geosparql/bbox.js";
import { CentroidGeometry } from "./models/geosparql/centroid.js";
import { GeoJSONSerializer } from "./models/geosparql/geojson.js";
import { FeatureMetrics } from "./models/geosparql/metrics.js";
import { WktSerialization } from "./models/geosparql/wkt.js";
import {
  ModuleRegistry,
  Registry,
  type QuadsGen,
} from "./models/models-registry.js";

// Register known quad generating modules here.
// I don't know how to make this a true plugin (but that's not really necessary either)
// The order of models is important: the first model is the default.
for (const model of [
  new WktSerialization(),
  new GeoJSONSerializer(),
  new BoundingBoxGeometry(),
  new CentroidGeometry(),
  new FeatureMetrics(),
])
  ModuleRegistry.add(Registry.Geometry, model.id, model);

for (const model of [new FacadeXWithGeoSparql()])
  ModuleRegistry.add(Registry.Generic, model.id, model);

/** Helper class to parse */
export class GeoPackageParser extends Readable implements RDF.Stream {
  options: CLIContext & RDFContext & RDFOptions;
  filepathOrBuffer: string | Buffer | Uint8Array;
  iterQuad: Generator<RDF.Quad>;
  gpkg: GeoPackage;
  shouldRead: boolean;
  generator: QuadsGen;

  /**
   * Read a GeoPackage and output a stream of RDF.Quads
   * @param filepathOrBuffer Path to GeoPackage file
   * @param options Options
   */
  constructor(
    filepathOrBuffer: string | Buffer | Uint8Array,
    options: CLIContext & RDFContext & RDFOptions,
  ) {
    super({ objectMode: true });

    this.filepathOrBuffer = filepathOrBuffer;
    this.options = {
      ...options,
      factory: options.factory ?? new DataFactory(),
    };
    this.generator = ModuleRegistry.get(Registry.Generic, this.options.model);
    this.shouldRead = false;
  }

  _construct(callback: (error?: Error) => void): void {
    GeoPackageAPI.open(this.filepathOrBuffer)
      .then((gpkg) => {
        this.gpkg = gpkg;
        this.iterQuad = this.generator.getQuads(this.gpkg, this.options);
        callback();
      })
      .catch(callback);
  }

  _read(size: number): void {
    // _read() manages backpressure: start pushing quads when _read() is called
    // but stop as soon as this.push() returns falsy. Then stop iteration and
    // simply wait until _read() is called again.
    this.shouldRead = true;

    let shouldContinue: boolean;
    while (this.shouldRead) {
      const iter = this.iterQuad.next();
      if (iter.value) shouldContinue = this.push(iter.value);
      if (iter.done) this.push(null); // EOF = push null chunk
      this.shouldRead = shouldContinue;
    }
  }

  _destroy(error: Error, callback: (error?: Error) => void): void {
    try {
      if (this.gpkg) this.gpkg.close();
    } catch {
      callback(error);
    }
    callback(error);
  }
}
