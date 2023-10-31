import type { SpatialReferenceSystem } from "@ngageoint/geopackage";
import type * as RDF from "@rdfjs/types";
import type * as wkx from "wkx";
import type { FeatureTableContext } from "../../interfaces.js";
import { GEO, RDFNS } from "../../prefixes.js";
import type { GeomQuadsGen } from "../models-registry.js";

export class WktSerialization implements GeomQuadsGen {
  get id() {
    return "wkt";
  }

  /** Calculate wktLiteral CRS prefix */
  srsOpengisUrl(srs: SpatialReferenceSystem) {
    const { organization, organization_coordsys_id: id } = srs;

    // TODO: Determine if this is always valid. Issue GH-23
    return `http://www.opengis.net/def/crs/${organization.toUpperCase()}/0/${id}`;
  }

  *getQuads(
    data: wkx.Geometry,
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
    const wktLiteral = `<${this.srsOpengisUrl(srs)}> ${data.toWkt()}`;

    yield quad(
      geom,
      GEO("asWKT"),
      literal(wktLiteral, GEO("wktLiteral")),
      graph,
    );
  }
}
