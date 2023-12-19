import type { GeometryData } from "@ngageoint/geopackage";
import type * as RDF from "@rdfjs/types";
import area from "@turf/area";
import length from "@turf/length";
import type { Geometry } from "geojson";
import type { FeatureTableContext } from "../../interfaces.js";
import { GEO, XSD } from "../../prefixes.js";
import type { GeomQuadsGen } from "../models-registry.js";
import { GeoJSONSerializer } from "./geojson.js";

/**
 * Calculate the metrics of a feature.
 *
 * This only generates quads if the measure makes sense for this feature's
 * geometry type.
 * The metrics are calculated in EPSG:4326 and therefore require a conversion
 * if the Geometry is in another SRS.
 * Supported:
 *
 * - geo:hasMetricLength: in m, up to 3 decimals (mm)
 * - geo:hasMetricArea: in m², up to 6 decimals (mm²)
 *
 * Unsupported:
 *
 * - geo:hasMetricPerimeterLength
 * - geo:hasMetricVolume
 */
export class FeatureMetrics implements GeomQuadsGen {
  get id() {
    return "length-area";
  }

  /**
   * Only these Geometry types have a sensible length.
   * Perhaps more types than supported in GeoJSON.
   */
  geometryTypeSupportsLength(type: string) {
    return [
      "CURVE",
      "LINE",
      "LINEARRING",
      "LINESTRING",
      "MULTICURVE",
      "MULTILINESTRING",
    ].includes(type.toUpperCase());
  }

  /**
   * Only these Geometry types have a sensible area.
   * Perhaps more types than supported in GeoJSON.
   */
  geometryTypeSupportsArea(type: string) {
    return [
      "ENVELOPE",
      "MULTIPOLYGON",
      "MULTISURFACE",
      "POLYGON",
      "POLYHEDRALSURFACE",
      "SURFACE",
      "TIN",
      "TRIANGLE",
    ].includes(type.toUpperCase());
  }

  *getQuads(
    data: GeometryData,
    feature: RDF.Quad_Subject,
    _geom: RDF.Quad_Subject,
    graph: RDF.Quad_Graph,
    ctx: FeatureTableContext,
    factory: RDF.DataFactory,
  ) {
    const { literal, quad } = factory;
    const reprojData = new GeoJSONSerializer().epsg4326GeoJSON(
      data,
      ctx,
    ) as Geometry;

    let value: string;

    if (this.geometryTypeSupportsLength(reprojData.type)) {
      // default UoM: km
      value = parseFloat((length(reprojData) * 100).toFixed(3)).toString();

      yield quad(
        feature,
        GEO("hasMetricLength"),
        literal(value, XSD("double")),
        graph,
      );
    }

    if (this.geometryTypeSupportsArea(reprojData.type)) {
      value = parseFloat(area(reprojData).toFixed(3)).toString();

      yield quad(
        feature,
        GEO("hasMetricArea"),
        literal(value, XSD("double")),
        graph,
      );
    }
  }
}
