import type { GeoPackage, GeometryData } from "@ngageoint/geopackage";
import type * as RDF from "@rdfjs/types";
import type {
  CLIContext,
  FeatureTableContext,
  RDFContext,
  RDFOptions,
} from "../interfaces.js";

/** Generic quads generator for anything but geometry literals */
export interface QuadsGen {
  id: string;
  getQuads(
    from: GeoPackage,
    ctx: CLIContext & RDFContext & RDFOptions,
  ): Generator<RDF.Quad>;
}

/** Quads generator for geometry literals */
export interface GeomQuadsGen {
  id: string;

  /**
   * The type signature of a quads generation function for different RDF
   * geometry serializations.
   *
   * @param data The GeoPackage GeometryData
   * @param feature The RDF term of the feature
   * @param geom The RDF term of the geometry
   * @param graph The RDF term of the graph of the quads
   * @param ctx Any table context
   * @param factory An RDF/JS DataFactory
   */
  getQuads(
    data: GeometryData,
    feature: RDF.Quad_Subject,
    geom: RDF.Quad_Subject,
    graph: RDF.Quad_Graph,
    ctx: FeatureTableContext,
    factory: RDF.DataFactory,
  ): Generator<RDF.Quad>;

  /** Can this geo:Geometry not be combined with other serializations? */
  requiresSeparateGeomSubject?(ctx: FeatureTableContext): boolean;
}

export enum Registry {
  /** The registry for RDF geometry literal serializations */
  Geometry = "geom",
  /** The registry for generic RDF attribute data models */
  Generic = "alg",
}

// type RegistryType = "geom" | "alg";

/** Singleton registry of Quad generating models */
export class ModuleRegistry {
  private static MODEL_REGISTRY: {
    geom: Record<string, GeomQuadsGen>;
    alg: Record<string, QuadsGen>;
  } = { geom: {}, alg: {} };

  /**
   * Register a quads generator
   *
   * @param name Name to register the model by
   * @param cls Function that returns a quads generator
   * @param type The type of registry.
   */
  static add(type: Registry.Generic, name: string, cls: QuadsGen): void;
  static add(type: Registry.Geometry, name: string, cls: GeomQuadsGen): void;
  static add(type: Registry, name: string, cls: QuadsGen | GeomQuadsGen) {
    this.MODEL_REGISTRY[type][name] = cls;
  }

  /**
   * Get a registered quads generator
   *
   * @param modelName Name of registered generator
   * @param type The type of registry.
   */
  static get(type: Registry.Generic, modelName: string): QuadsGen;
  static get(type: Registry.Geometry, modelName: string): GeomQuadsGen;
  static get(type: Registry, modelName: string): QuadsGen | GeomQuadsGen {
    return this.MODEL_REGISTRY[type][modelName];
  }

  /**
   * Return a list of known models for the registry type
   *
   * @param type The type of registry.
   * */
  static knownModels(type: Registry): string[] {
    return Object.keys(this.MODEL_REGISTRY[type]);
  }
}
