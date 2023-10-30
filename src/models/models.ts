import type { GeoPackage } from "@ngageoint/geopackage";
import type * as RDF from "@rdfjs/types";
import { CLIContext, RDFContext, RDFOptions } from "../interfaces.js";

/**
 * The type signature of a quads generating function
 *
 * @param geopackage The GeoPackage instance
 * @param options Options that may guide the generation of the quads.
 */
export type QuadsGeneratorFunc = (
  geopackage: GeoPackage,
  options: CLIContext & RDFContext & RDFOptions,
) => Generator<RDF.Quad>;

/** Singleton registry of Quad generating models */
export class ModelRegistry {
  private static MODEL_REGISTRY: Record<string, QuadsGeneratorFunc> = {};
  /**
   * Register a quads generator
   *
   * @param modelName Name to register the model by
   * @param mainFunc Function that returns a quads generator
   */
  static add(modelName: string, mainFunc: QuadsGeneratorFunc) {
    this.MODEL_REGISTRY[modelName] = mainFunc;
  }

  /**
   * Get a registered quads generator
   *
   * @param modelName Name of registered generator
   */
  static get(modelName: string): QuadsGeneratorFunc {
    return this.MODEL_REGISTRY[modelName];
  }

  /** Return a list of known models */
  static knownModels(): string[] {
    return Object.keys(this.MODEL_REGISTRY);
  }
}
