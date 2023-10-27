import {
  GeoPackage,
  GeometryData,
  SpatialReferenceSystem,
} from "@ngageoint/geopackage";
import type { FeatureRow } from "@ngageoint/geopackage/dist/lib/features/user/featureRow.js";
import type * as RDF from "@rdfjs/types";
import type { Feature } from "geojson";
import stringify from "json-stable-stringify";
import { DataFactory } from "rdf-data-factory";
import { Warn } from "../../cli-error.js";
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

function srsOpengisUrl(srs: SpatialReferenceSystem) {
  const { organization, organization_coordsys_id: id } = srs;

  return `http://www.opengis.net/def/crs/${organization.toUpperCase()}/0/${id}`;
}

/** Generate GeoSPARQL quads from a feature's geometry */
export function* quadsForGeometry(
  origData: GeometryData,
  geoJSONData: Feature | undefined,
  subject: RDF.Quad_Subject,
  graph: RDF.Quad_Graph,
  options: QuadsFromTableOptions,
) {
  // The underlying libraries (as of writing) do not support all
  // types of geometries. {geoJSONData} and {origData.geometry}
  // can therefore be empty.

  yield DF.quad(subject, RDFNS("type"), GEO("Feature"), graph);
  const geometry = origData.geometry;

  if (
    geometry === undefined ||
    origData.geometryError ||
    geoJSONData === undefined
  )
    return Warn(
      `Feature geometry type not supported in ${options.tableName} (_:${subject.value}) (skipped)`,
    );

  const geo = DF.blankNode();
  yield DF.quad(subject, GEO("hasDefaultGeometry"), geo, graph);
  yield DF.quad(geo, RDFNS("type"), GEO("Geometry"), graph);

  const { srs } = options;
  const wktLiteral = `<${srsOpengisUrl(srs)}> ${geometry.toWkt()}`;

  yield DF.quad(
    geo,
    GEO("asWKT"),
    DF.literal(wktLiteral, GEO("wktLiteral")),
    graph,
  );

  // Q: Is this the only identifier of WGS84 herein?
  const isWGS84 =
    `${srs.organization}:${srs.organization_coordsys_id}` == "EPSG:4326";

  // See issue https://github.com/redmer/rdf-geopackage/issues/19
  const wgs84Geom = isWGS84 ? geo : DF.blankNode();
  yield DF.quad(subject, GEO("hasDefaultGeometry"), wgs84Geom, graph);
  yield DF.quad(wgs84Geom, RDFNS("type"), GEO("Geometry"), graph);

  yield DF.quad(
    wgs84Geom,
    GEO("asGeoJSON"),
    DF.literal(stringify(geoJSONData.geometry), GEO("geoJSONLiteral")),
    graph,
  );
}

/** Generate RDF quads from a GeoPackage feature table */
export function* quadsFromFeatureTable(
  iterator: IterableIterator<FeatureRow>,
  options: QuadsFromTableOptions,
) {
  const graph = getTableNode(options.tableName);

  for (const [i, feature] of enumerate(iterator, 1)) {
    const subject = getRowNode(
      `${options.tableName}_${feature.id ?? i}`,
      options.baseIRI,
    );

    yield* quadsForTableAndRow(graph, subject, i);
    yield* quadsForAttributes(feature.values, subject, graph, options);
    yield* quadsForGeometry(
      feature.geometry,
      GeoPackage.parseFeatureRowIntoGeoJSON(feature, options.srs),
      subject,
      graph,
      options,
    );
  }
}
