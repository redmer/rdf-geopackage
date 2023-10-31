import type * as RDF from "@rdfjs/types";
import stringify from "json-stable-stringify";
import reproject from "reproject";
import type * as wkx from "wkx";
import type { FeatureTableContext } from "../../interfaces.js";
import { GEO, RDFNS } from "../../prefixes.js";
import type { GeomQuadsGen } from "../models-registry.js";

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

  *getQuads(
    data: wkx.Geometry,
    feature: RDF.Quad_Subject,
    geom: RDF.Quad_Subject,
    graph: RDF.Quad_Graph,
    ctx: FeatureTableContext,
    factory: RDF.DataFactory,
  ) {
    const { srs } = ctx;
    const { literal, quad } = factory;

    yield quad(feature, GEO("hasDefaultGeometry"), geom, graph);
    yield quad(geom, RDFNS("type"), GEO("Geometry"), graph);

    const payload = this.isInEPSG4326(ctx)
      ? data.toGeoJSON()
      : reproject.reproject(
          data.toGeoJSON(),
          // Ref: The line after <http://www.geopackage.org/spec121/#r117>
          srs.definition_12_063 ?? srs.definition,
          // GeoJSON is always in EPSG:4326
          "EPSG:4326",
        );

    yield quad(
      geom,
      GEO("asGeoJSON"),
      literal(stringify(payload), GEO("geoJSONLiteral")),
      graph,
    );
  }
}
