import { BoundingBox, GeoPackage, GeoPackageAPI } from "@ngageoint/geopackage";
import type * as RDF from "@rdfjs/types";
import { Readable } from "node:stream";
import { DataFactory } from "rdf-data-factory";
import { quadsFromGeoPackage } from "./rdf-geopackage.js";

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
}

export class GeoPackageParser extends Readable implements RDF.Stream {
  options: GeoPackageOptions;
  filepath: string;
  iterQuad: Generator<RDF.Quad>;
  gpkg: GeoPackage;
  shouldRead: boolean;

  /**
   * Read a GeoPackage and output a stream of RDF.Quads
   * @param filepath Path to GeoPackage file
   * @param options Options
   */
  constructor(filepath: string, options: GeoPackageOptions) {
    super({ objectMode: true });

    this.filepath = filepath;
    this.options = { dataFactory: new DataFactory(), ...options };
    this.shouldRead = false;
  }

  _construct(callback: (error?: Error) => void): void {
    GeoPackageAPI.open(this.filepath)
      .then((gpkg) => {
        this.gpkg = gpkg;
        this.iterQuad = quadsFromGeoPackage(this.gpkg, this.options);
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
