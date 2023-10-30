import type * as RDF from "@rdfjs/types";
import stringify from "json-stable-stringify";
import { DataFactory } from "rdf-data-factory";
import reproject from "reproject";
import * as wkx from "wkx";
import { FeatureTableContext } from "../../interfaces.js";
import { GEO, RDFNS } from "../../prefixes.js";
import { GeomQuadsGen } from "../models-registry.js";

export class GeoJSONSerializer implements GeomQuadsGen {
  get id() {
    return "geojson";
  }

  *getQuads(
    data: wkx.Geometry,
    feature: RDF.Quad_Subject,
    geom: RDF.Quad_Subject,
    graph: RDF.Quad_Graph,
    ctx: FeatureTableContext,
    factory: RDF.DataFactory,
  ) {
    const { srs } = ctx;
    const { literal, quad } = factory ?? new DataFactory();

    yield quad(feature, GEO("hasDefaultGeometry"), geom, graph);
    yield quad(geom, RDFNS("type"), GEO("Geometry"), graph);

    const wgs84ProjectedJSON = reproject.reproject(
      data.toGeoJSON(),
      // Ref: The line after <http://www.geopackage.org/spec121/#r117>
      srs.definition_12_063 ?? srs.definition,
      // GeoJSON is always in EPSG:4326
      "EPSG:4326",
    );

    yield quad(
      geom,
      GEO("asGeoJSON"),
      literal(stringify(wgs84ProjectedJSON), GEO("geoJSONLiteral")),
      graph,
    );
  }
}
