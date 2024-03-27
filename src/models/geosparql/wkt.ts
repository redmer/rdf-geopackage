import { GeometryData } from "@ngageoint/geopackage";
import type * as RDF from "@rdfjs/types";
import type { FeatureTableContext } from "../../interfaces.js";
import { GEO, RDFNS } from "../../prefixes.js";
import type { GeomQuadsGen } from "../models-registry.js";
import { srsOpengisUrl } from "./srs-url-helper.js";

export class WktSerialization implements GeomQuadsGen {
  get id() {
    return "wkt";
  }

  *getQuads(
    data: GeometryData,
    feature: RDF.Quad_Subject,
    geom: RDF.Quad_Subject,
    graph: RDF.Quad_Graph,
    ctx: FeatureTableContext,
    factory: RDF.DataFactory,
  ) {
    const { literal, quad } = factory;
    yield quad(feature, GEO("hasDefaultGeometry"), geom, graph);
    yield quad(geom, RDFNS("type"), GEO("Geometry"), graph);

    const { srs } = ctx;
    const wktLiteral = `<${srsOpengisUrl(srs)}> ${data.geometry.toWkt()}`;

    yield quad(
      geom,
      GEO("asWKT"),
      literal(wktLiteral, GEO("wktLiteral")),
      graph,
    );
  }
}
