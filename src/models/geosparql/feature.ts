import type * as RDF from "@rdfjs/types";
import type * as wkx from "wkx";
import type { FeatureTableContext } from "../../interfaces.js";
import { GEO, RDFNS } from "../../prefixes.js";
import type { GeomQuadsGen } from "../models-registry.js";

export class FeatureOnlySerializer implements GeomQuadsGen {
  get id() {
    return "feature-only";
  }

  *getQuads(
    data: wkx.Geometry,
    feature: RDF.Quad_Subject,
    geom: RDF.Quad_Subject,
    graph: RDF.Quad_Graph,
    ctx: FeatureTableContext,
    factory: RDF.DataFactory,
  ) {
    yield factory.quad(feature, RDFNS("type"), GEO("Feature"), graph);
  }
}
