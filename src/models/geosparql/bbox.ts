import type { GeometryData } from "@ngageoint/geopackage";
import type * as RDF from "@rdfjs/types";
import { default as bbox } from "@turf/bbox";
import { default as bboxPolygon } from "@turf/bbox-polygon";
import * as wkx from "wkx";
import type { FeatureTableContext } from "../../interfaces.js";
import { GEO, RDFNS, SF } from "../../prefixes.js";
import type { GeomQuadsGen } from "../models-registry.js";
import { srsOpengisUrl } from "./srs-url-helper.js";

export class BoundingBoxGeometry implements GeomQuadsGen {
  get id() {
    return "bbox";
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

    yield quad(feature, GEO("hasBoundingBox"), geom, graph);
    yield quad(geom, RDFNS("type"), GEO("Geometry"), graph);
    yield quad(geom, RDFNS("type"), SF("Envelope"), graph);

    const bboxElements = bbox(data.geometry.toGeoJSON());
    const bboxData = bboxPolygon(bboxElements);
    const geometry = wkx.Geometry.parseGeoJSON(bboxData["geometry"]);

    const { srs } = ctx;
    const wktLiteral = `<${srsOpengisUrl(srs)}> ${geometry.toWkt()}`;

    yield quad(
      geom,
      GEO("asWKT"),
      literal(wktLiteral, GEO("wktLiteral")),
      graph,
    );
  }
}
