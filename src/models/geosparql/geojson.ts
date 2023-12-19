import { GeometryData } from "@ngageoint/geopackage";
import type * as RDF from "@rdfjs/types";
import stringify from "json-stable-stringify";
import reproject from "reproject";
import type { FeatureTableContext } from "../../interfaces.js";
import { GEO, RDFNS } from "../../prefixes.js";
import type { GeomQuadsGen } from "../models-registry.js";

/** Serialize the geometry as GeoJSON */
export class GeoJSONSerializer implements GeomQuadsGen {
  get id() {
    return "geojson";
  }

  requiresSeparateGeomSubject(ctx: FeatureTableContext) {
    return !this.isInEPSG4326(ctx);
  }

  /** EPSG:4236 is the only allowed serialization of GeoJSON */
  isInEPSG4326(ctx: FeatureTableContext): boolean {
    return (
      ctx.srs.organization.toLowerCase() == "epsg" &&
      ctx.srs.organization_coordsys_id == 4326
    );
  }

  /** Return GeoJSON in EPSG:4326 (WGS 84, GeoJSON default), reprojecting if necessary */
  epsg4326GeoJSON(data: GeometryData, ctx: FeatureTableContext): {} {
    const { srs } = ctx;

    return this.isInEPSG4326(ctx)
      ? data.geometry.toGeoJSON()
      : reproject.reproject(
          data.geometry.toGeoJSON(),
          // Ref: The line after <http://www.geopackage.org/spec121/#r117>
          srs.definition_12_063 ?? srs.definition,
          // GeoJSON is always in EPSG:4326
          "EPSG:4326",
        );
  }

  *getQuads(
    data: GeometryData,
    feature: RDF.Quad_Subject,
    geom: RDF.Quad_Subject,
    graph: RDF.Quad_Graph,
    ctx: FeatureTableContext,
    factory: RDF.DataFactory,
  ) {
    const { literal, quad } = factory;

    yield quad(feature, GEO("hasDefaultGeometry"), geom, graph);
    yield quad(geom, RDFNS("type"), GEO("Geometry"), graph);

    const payload = this.epsg4326GeoJSON(data, ctx);

    yield quad(
      geom,
      GEO("asGeoJSON"),
      literal(stringify(payload), GEO("geoJSONLiteral")),
      graph,
    );
  }
}
