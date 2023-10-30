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

export default function* quadsForFeature(
  data: wkx.Geometry,
  feature: RDF.Quad_Subject,
  geom: RDF.Quad_Subject,
  graph: RDF.Quad_Graph,
  ctx: FeatureTableContext & CLIContext,
  factory?: RDF.DataFactory,
) {
  const { literal, quad } = factory ?? new DataFactory();
  yield quad(feature, RDFNS("type"), GEO("Feature"), graph);
}
