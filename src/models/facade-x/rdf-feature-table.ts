import { FeatureConverter } from "@ngageoint/simple-features-geojson-js";
import { GeometryWriter } from "@ngageoint/simple-features-wkt-js";
import type * as RDF from "@rdfjs/types";
import type { Feature, Geometry } from "geojson";
import stringify from "json-stable-stringify";
import { DataFactory } from "rdf-data-factory";
import { GEO, RDFNS } from "../../prefixes.js";
import { enumerate } from "../../py-enumerate.js";
import {
  QuadsFromTableOptions,
  getRowNode,
  getTableNode,
  quadsForAttributes,
  quadsForTableAndRow,
} from "./rdf-table-common.js";

const DF = new DataFactory();

/** An OGC Simple Features WKT string representation from a GeoJSON Geometry */
function sfWKTFromGeoJSONGeometry(geometry: Geometry): string {
  const sf =
    FeatureConverter.toSimpleFeaturesGeometryFromGeometryObject(geometry);
  return GeometryWriter.writeGeometry(sf);
}

/** Generate GeoSPARQL quads from a feature's geometry */
export function* quadsForGeometry(
  geometry: Geometry,
  subject: RDF.Quad_Subject,
  graph: RDF.Quad_Graph,
) {
  const geo = DF.blankNode();

  yield DF.quad(subject, RDFNS("type"), GEO("Feature"), graph);
  yield DF.quad(subject, GEO("hasDefaultGeometry"), geo, graph);
  yield DF.quad(geo, RDFNS("type"), GEO("Geometry"), graph);

  yield DF.quad(
    geo,
    GEO("asGeoJSON"),
    DF.literal(stringify(geometry), GEO("geoJSONLiteral")),
    graph,
  );
  yield DF.quad(
    geo,
    GEO("asWKT"),
    DF.literal(sfWKTFromGeoJSONGeometry(geometry), GEO("wktLiteral")),
    graph,
  );
}

/** Generate RDF quads from a GeoPackage feature table */
export function* quadsFromFeatureTable(
  iterator: IterableIterator<Feature>,
  options: QuadsFromTableOptions,
) {
  const graph = getTableNode(options.tableName);

  for (const [i, feature] of enumerate(iterator, 1)) {
    const subject = getRowNode(
      `${options.tableName}_${feature.id ?? i}`,
      options.baseIRI,
    );

    yield* quadsForTableAndRow(graph, subject, i);
    yield* quadsForAttributes(feature.properties, subject, graph, options);
    yield* quadsForGeometry(feature.geometry, subject, graph);
  }
}
