import type { GeometryData } from "@ngageoint/geopackage";
import type * as RDF from "@rdfjs/types";
import { default as centroid } from "@turf/centroid";
import * as wkx from "wkx";
import type { FeatureTableContext } from "../../interfaces.js";
import { GEO, RDFNS, SF } from "../../prefixes.js";
import type { GeomQuadsGen } from "../models-registry.js";
import { srsOpengisUrl } from "./srs-url-helper.js";

/** Generate a Geometry for the centroid */
export class CentroidGeometry implements GeomQuadsGen {
  get id() {
    return "centroid";
  }

  requiresSeparateGeomSubject(ctx: FeatureTableContext) {
    return true;
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

    yield quad(feature, GEO("hasCentroid"), geom, graph);
    yield quad(geom, RDFNS("type"), GEO("Geometry"), graph);
    yield quad(geom, RDFNS("type"), SF("Point"), graph);

    //@ts-ignore
    const value = centroid(data.geometry.toGeoJSON() as any);
    const geometry = wkx.Geometry.parseGeoJSON(value["geometry"]);

    const { srs } = ctx;
    const wktLiteral = `<${srsOpengisUrl(srs)}> ${geometry.toWkt()}`;

    yield quad(geom, GEO("asWKT"), literal(wktLiteral, GEO("wktLiteral")), graph);
  }
}
