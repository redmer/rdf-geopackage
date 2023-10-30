import type {
  BoundingBox,
  SpatialReferenceSystem,
} from "@ngageoint/geopackage";
import type * as RDF from "@rdfjs/types";

/** Info on a table */
export interface TableContext {
  /** Name of the originating table */
  tableName: string;
  /** Columns that are unique ID columns */
  tableIDColumns?: string[];
}

/** Info on a feature table */
export interface FeatureTableContext extends TableContext {
  /** Spatial Reference System of this table */
  srs: SpatialReferenceSystem;
}

/** Info on the CLI parameters */
export interface CLIContext {
  /** Limit the processed feature layers and attribute tables */
  allowedLayers?: string[];
  /** Only process features within this EPSG:4326 bounding box. By default, all
   * features are processed. */
  boundingBox?: BoundingBox;
}

/** Context info for the generation of RDF */
export interface RDFContext {
  /** The base IRI for generated RDF */
  baseIRI: string;
  /** An optional RDF/JS data factory */
  factory: RDF.DataFactory;
}

/** Info on how to generate RDF */
export interface RDFOptions {
  /** Generate quads where the object/value is a (base64 encoded) binary */
  includeBinaryValues: boolean;
  /** Data meta model identifier by which triples are generated */
  model: string;
  /** Limit the generated GeoSPARQL serializations */
  geoSPARQLModels: string[];
}
