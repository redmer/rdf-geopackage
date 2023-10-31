import type * as RDF from "@rdfjs/types";
import { DataFactory } from "rdf-data-factory";
import { Transform, type TransformCallback } from "stream";

export interface OverrideGraphOptions {
  /** Override the context/graph of the quad into */
  intoGraph?: RDF.Quad_Graph;
}

export class MergeGraphsStream extends Transform implements RDF.Stream {
  #targetGraph: RDF.Quad_Graph;
  #DF: RDF.DataFactory;

  /** Merge all quads in an RDF.Stream into a single graph */
  constructor(options: OverrideGraphOptions) {
    super({ readableObjectMode: true, writableObjectMode: true });
    this.#targetGraph = options.intoGraph;
    this.#DF = new DataFactory();
  }

  _transform(
    quad: RDF.Quad,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    this.push(
      this.#DF.quad(
        quad.subject,
        quad.predicate,
        quad.object,
        this.#targetGraph ?? quad.graph,
      ),
    );
    return callback();
  }
}
