import { BoundingBox, GeoPackage } from "@ngageoint/geopackage";

/** Calculate the smallest bounding box that encompasses features from all layers */
export function allLayersBoundingBox(
  geopackage: GeoPackage,
  allowedLayers: string[],
): BoundingBox {
  // The zero bounding box is the starting point, that only grows after each layer
  let bb: BoundingBox = new BoundingBox(0, 0, 0, 0);

  // Only feature layers are bounded
  for (const tableName of geopackage.getTables().features) {
    if (allowedLayers && !allowedLayers.includes(tableName)) continue;
    // The bounding box is saved in the layer, but SRS dependently
    const { min_x, min_y, max_x, max_y, srs_id } =
      geopackage.getTableContents(tableName);
    const srs = geopackage.getSrs(srs_id);

    // Project the bounding box values from the layer SRS to the GeoJSON default
    const layerBB = new BoundingBox(
      min_x,
      max_x,
      min_y,
      max_y,
    ).projectBoundingBox(srs.projection, "EPSG:4326");

    // Now, make the final bounding box, by only keeping the biggest values across layers.
    bb = new BoundingBox(
      Math.max(layerBB.minLongitude, bb.minLongitude),
      Math.max(layerBB.maxLongitude, bb.maxLongitude),
      Math.max(layerBB.minLatitude, bb.minLatitude),
      Math.max(layerBB.maxLatitude, bb.maxLatitude),
    );
  }
  return bb;
}
