import { GeoPackage } from "@ngageoint/geopackage";
import type * as RDF from "@rdfjs/types";
import { WGS84_CODE } from "../../bounding-box.js";
import { CLIContext, RDFContext, RDFOptions } from "../../interfaces.js";
import { queryAllFeatures } from "./featuredao-helper.js";
import { quadsFromAttributeTable } from "./rdf-attribute-table.js";
import { quadsFromFeatureTable } from "./rdf-feature-table.js";

/**
 * Generate RDF quads from the GeoPackage. The quads are in a Facade-X-like model for their
 * generic attributes; feature geometries are modelled with GeoSPARQL.
 *
 * @param filepath Path to the GeoPackage
 * @param boundingBox Only process features that are within this EPSG:4326 bounding box.
 *   If not provided, all features are processed.
 * @param allowedLayers If provided, only these layers are processed
 */
export function* quadsFromGeoPackage(
  geopackage: GeoPackage,
  options: CLIContext & RDFContext & RDFOptions,
): Generator<RDF.Quad> {
  const { boundingBox, baseIRI, allowedLayers } = options;

  // Iterate user attribute tables
  for (const tableName of geopackage.getAttributesTables()) {
    if (allowedLayers && !allowedLayers.includes(tableName)) continue;

    // The Data Access Object can query iteratively and provide metadata
    const dao = geopackage.getAttributeDao(tableName);
    // TODO: I can't seem to find table definitions. ColumnDao.Mimetype are empty...
    const iter = dao.queryForEach();

    yield* quadsFromAttributeTable(iter, {
      tableIDColumns: dao.idColumns,
      tableName,
      baseIRI,
      includeBinaryValues: options.includeBinaryValues,
      factory: options.factory,
      geoSPARQLModels: options.geoSPARQLModels,
      model: options.model,
    });
  }

  // Iterate the feature tables
  for (const tableName of geopackage.getFeatureTables()) {
    if (allowedLayers && !allowedLayers.includes(tableName)) continue;
    // The bounding box is optional, but useful for large GeoPackages
    const dao = geopackage.getFeatureDao(tableName);

    const it = boundingBox
      ? dao.fastQueryBoundingBox(boundingBox, WGS84_CODE)
      : queryAllFeatures(dao);

    yield* quadsFromFeatureTable(it, {
      tableName,
      baseIRI,
      includeBinaryValues: options.includeBinaryValues,
      srs: dao.srs, // table SRS
      model: options.model,
      geoSPARQLModels: options.geoSPARQLModels,
      factory: options.factory,
    });
  }
}
