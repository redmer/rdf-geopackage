import { GeoPackageAPI, type BoundingBox } from "@ngageoint/geopackage";
import type * as RDF from "@rdfjs/types";
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
export async function quadsFromGeoPackage(
  filepath: string,
  boundingBox?: BoundingBox,
  allowedLayers?: string[],
): Promise<RDF.Quad[]> {
  const geopackage = await GeoPackageAPI.open(filepath);
  const quads = [];

  for (const tableName of geopackage.getAttributesTables()) {
    if (allowedLayers && !allowedLayers.includes(tableName)) continue;

    // The Data Access Object can query iteratively and provide metadata
    const dao = geopackage.getAttributeDao(tableName);
    // TODO: I can't seem to find table definitions. ColumnDao.Mimetype are empty...
    const iter = dao.queryForEach();

    quads.push(...quadsFromAttributeTable(iter, dao.idColumns, tableName));
  }

  for (const tableName of geopackage.getFeatureTables()) {
    if (allowedLayers && !allowedLayers.includes(tableName)) continue;

    // The bounding box is optional, but recommended for large gpkgs
    const it = boundingBox
      ? geopackage
          .queryForGeoJSONFeaturesInTable(tableName, boundingBox)
          .values()
      : geopackage.iterateGeoJSONFeatures(tableName);

    quads.push(...quadsFromFeatureTable(it, tableName));
  }

  return quads;
}
