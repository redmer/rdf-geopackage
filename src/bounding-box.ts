import { BoundingBox } from "@ngageoint/geopackage";
import fetch from "node-fetch";
import proj4 from "proj4";
import { Bye } from "./cli-error.js";

export const WGS84_CODE = "EPSG:4326";

async function fetchEPSGProjectionWKT(epsgCode: string): Promise<string> {
  try {
    const [_, code] = epsgCode.split(":", 2);
    const request = await fetch(`https://epsg.io/${code}.wkt`, {});
    if (request.ok) return request.text();
    Bye(
      `Code '${epsgCode}' could not be fetched. Supply a projection WKT.`,
      request.statusText,
    );
  } catch (e) {
    Bye(
      `Code '${epsgCode}' could not be fetched. Supply a projection WKT.`,
      e.message,
    );
  }
}

/** Get a CRS Converter to WGS84 (GeoJSON's only known CRS). */
export async function getWGS84Converter(
  crsProj: string,
): Promise<proj4.Converter> {
  try {
    return proj4(crsProj, WGS84_CODE);
  } catch (e) {
    // Proj4 does not know this projection. Fetch the projection definition if it's an EPSG code
    if (crsProj.toLowerCase().startsWith(`epsg:`))
      return getWGS84Converter(await fetchEPSGProjectionWKT(crsProj));

    // It's not an EPSG code, but a code nonetheless. Tip: use a WKT
    if (crsProj.includes(`:`))
      Bye(`Code '${crsProj}' unknown. Supply a projection WKT.`);

    // It's not even a projection code. Possibly a projection WKT?
    Bye(`Projection WKT '${crsProj}' could not be parsed`);
  }
}

export function suppliedBoundingBox(
  bbstring: string,
  inCRS: proj4.Converter | string,
) {
  try {
    const [west, east, south, north] = bbstring
      .split(" ", 4)
      .map((c) => Number(c));
    const bb = new BoundingBox(west, east, south, north);
    return bb.projectBoundingBox(inCRS, WGS84_CODE);
  } catch (e) {
    Bye(
      `Bounding box could not be parsed. Provide as a single space-separated string:`,
      `"{min long (west)} {max long (east)} {min lat (south)} {max lat (north)}".`,
    );
  }
}
