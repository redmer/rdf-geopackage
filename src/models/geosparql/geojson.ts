import type * as RDF from "@rdfjs/types";
import stringify from "json-stable-stringify";
import { DataFactory } from "rdf-data-factory";
import reproject from "reproject";
import * as wkx from "wkx";
import { CLIContext, FeatureTableContext } from "../../interfaces.js";
import { GEO, RDFNS } from "../../prefixes.js";

export default function* quadsForGeoJSON(
  data: wkx.Geometry,
  feature: RDF.Quad_Subject,
  geom: RDF.Quad_Subject,
  graph: RDF.Quad_Graph,
  ctx: FeatureTableContext & CLIContext,
  factory: RDF.DataFactory,
) {
  const { srs } = ctx;
  const { literal, quad } = factory ?? new DataFactory();

  yield quad(feature, GEO("hasDefaultGeometry"), geom, graph);
  yield quad(geom, RDFNS("type"), GEO("Geometry"), graph);

  const wgs84ProjectedJSON = reproject.reproject(
    data.toGeoJSON(),
    srs.definition_12_063,
    "EPSG:4326",
  );

  yield quad(
    geom,
    GEO("asGeoJSON"),
    literal(stringify(wgs84ProjectedJSON), GEO("geoJSONLiteral")),
    graph,
  );
}
