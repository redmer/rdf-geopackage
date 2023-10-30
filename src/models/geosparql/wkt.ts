import { SpatialReferenceSystem } from "@ngageoint/geopackage";
import type * as RDF from "@rdfjs/types";
import { DataFactory } from "rdf-data-factory";
import * as wkx from "wkx";
import { CLIContext, FeatureTableContext } from "../../interfaces.js";
import { GEO, RDFNS } from "../../prefixes.js";

function srsOpengisUrl(srs: SpatialReferenceSystem) {
  const { organization, organization_coordsys_id: id } = srs;

  // TODO: Determine if this is always valid. Issue GH-23
  return `http://www.opengis.net/def/crs/${organization.toUpperCase()}/0/${id}`;
}

export default function* quadsForWKT(
  data: wkx.Geometry,
  feature: RDF.Quad_Subject,
  geom: RDF.Quad_Subject,
  graph: RDF.Quad_Graph,
  ctx: FeatureTableContext & CLIContext,
  factory?: RDF.DataFactory,
) {
  const { literal, quad } = factory ?? new DataFactory();
  yield quad(feature, GEO("hasDefaultGeometry"), geom, graph);
  yield quad(geom, RDFNS("type"), GEO("Geometry"), graph);

  const { srs } = ctx;
  const wktLiteral = `<${srsOpengisUrl(srs)}> ${data.toWkt()}`;

  yield quad(geom, GEO("asWKT"), literal(wktLiteral, GEO("wktLiteral")), graph);
}
