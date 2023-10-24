import { BoundingBox, GeoPackage, GeoPackageAPI } from "@ngageoint/geopackage";
import type * as RDF from "@rdfjs/types";
import { Readable } from "node:stream";
import { DataFactory } from "rdf-data-factory";
import { quadsFromGeoPackage } from "./models/facade-x/rdf-geopackage.js";
import { ModelRegistry, QuadsGeneratorFunc } from "./models/models.js";

// Register known quad generating modules here.
// I don't know how to make this a true plugin (but that's not really necessary either)
// The order of models is important: the first model is the default.
const WellKnownModels = { "facade-x": quadsFromGeoPackage };
for (const [modelName, func] of Object.entries(WellKnownModels))
  ModelRegistry.add(modelName, func);

export interface GeoPackageOptions {
  /** Pass a data factory or rdf-data-factory is used */
  dataFactory?: RDF.DataFactory;
  /** The URL base for local URLs in this GeoPackage */
  baseIRI?: string;
  /** Limit the processed feature layers and attribute tables */
  allowedLayers?: string[];
  /** Only process features within this EPSG:4326 bounding box. By default, all
   * features are processed. */
  boundingBox?: BoundingBox;
  /** Generate quads where the object/value is a binary (Base-64 encoded). */
  includeBinaryValues?: boolean;
  /** Data meta model by which triples are generated */
  model: string;
}

export class GeoPackageParser extends Readable implements RDF.Stream {
  options: GeoPackageOptions;
  filepathOrBuffer: string | Buffer | Uint8Array;
  iterQuad: Generator<RDF.Quad>;
  gpkg: GeoPackage;
  shouldRead: boolean;
  generator: QuadsGeneratorFunc;

  /**
   * Read a GeoPackage and output a stream of RDF.Quads
   * @param filepathOrBuffer Path to GeoPackage file
   * @param options Options
   */
  constructor(
    filepathOrBuffer: string | Buffer | Uint8Array,
    options: GeoPackageOptions,
  ) {
    super({ objectMode: true });

    this.filepathOrBuffer = filepathOrBuffer;
    this.options = { dataFactory: new DataFactory(), ...options };
    this.generator = ModelRegistry.get(this.options.model);
    this.shouldRead = false;
  }

  _construct(callback: (error?: Error) => void): void {
    GeoPackageAPI.open(this.filepathOrBuffer)
      .then((gpkg) => {
        this.gpkg = gpkg;
        this.iterQuad = this.generator(this.gpkg, this.options);
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
