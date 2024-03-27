import type { SpatialReferenceSystem } from "@ngageoint/geopackage";

/** Calculate wktLiteral CRS prefix */
export function srsOpengisUrl(srs: SpatialReferenceSystem) {
  const { organization, organization_coordsys_id: id } = srs;

  // TODO: Determine if this is always valid. Issue GH-23
  return `http://www.opengis.net/def/crs/${organization.toUpperCase()}/0/${id}`;
}
