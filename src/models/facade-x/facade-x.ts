import type { GeoPackage, GeometryData } from "@ngageoint/geopackage";
import type { DBValue } from "@ngageoint/geopackage/dist/lib/db/dbAdapter.js";
import type { FeatureRow } from "@ngageoint/geopackage/dist/lib/features/user/featureRow.js";
import * as RDF from "@rdfjs/types";
import { WGS84_CODE } from "../../bounding-box.js";
import { CountWarn, OutputWarnCounts } from "../../cli-error.js";
import {
  CLIContext,
  FeatureTableContext,
  RDFContext,
  RDFOptions,
  TableContext,
} from "../../interfaces.js";
import { FX, GEO, RDFNS, XYZ } from "../../prefixes.js";
import { enumerate } from "../../py-enumerate.js";
import { ModuleRegistry, QuadsGen, Registry } from "../models-registry.js";
import { valueToTerm } from "../utils.js";
import { queryAllFeatures } from "./featuredao-helper.js";

export class FacadeXWithGeoSparql implements QuadsGen {
  DF: RDF.DataFactory<RDF.Quad>;

  get id() {
    return "facade-x";
  }

  /**
   * Iterate through all attribute tables and feature tables of a GeoPackage.
   * Filter tables (allowedLayers) and features (boundingBox) and passes
   * iterators on to specialized quad generating methods.
   */
  *getQuads(geopackage: GeoPackage, ctx: CLIContext & RDFContext & RDFOptions) {
    const { allowedLayers, baseIRI, boundingBox } = ctx;
    this.DF = ctx.factory;

    for (const tableName of geopackage.getAttributesTables()) {
      if (allowedLayers && !allowedLayers.includes(tableName)) continue;

      const dao = geopackage.getAttributeDao(tableName);
      const iter = dao.queryForEach();

      yield* this.quadsForAttributeTable(iter, {
        ...ctx,
        tableIDColumns: dao.idColumns,
        tableName,
        baseIRI,
        includeBinaryValues: ctx.includeBinaryValues,
      });
    }

    for (const tableName of geopackage.getFeatureTables()) {
      if (allowedLayers && !allowedLayers.includes(tableName)) continue;

      const dao = geopackage.getFeatureDao(tableName);

      // The bounding box is optional, but useful for large GeoPackages
      const it = boundingBox
        ? dao.fastQueryBoundingBox(boundingBox, WGS84_CODE)
        : queryAllFeatures(dao);

      yield* this.quadsForFeatureTable(it, {
        ...ctx,
        tableName,
        baseIRI,
        includeBinaryValues: ctx.includeBinaryValues,
        srs: dao.srs, // table SRS
      });
    }

    OutputWarnCounts();
  }

  /** A Facade-X node for each row is a blank node */
  getNodeForRow() {
    return this.DF.blankNode();
  }

  /** A Facade-X node for the table is based off its baseIRI or else `xyz:` */
  getNodeForTable(tableName: string, base?: string): RDF.NamedNode {
    const baseURL = base ?? XYZ("").value;
    const tableURL = new URL(encodeURIComponent(tableName), baseURL);
    return this.DF.namedNode(tableURL.href);
  }

  /** Generate quads that represent the table */
  *quadsForTable(tableAndGraph: RDF.Quad_Subject & RDF.Quad_Graph) {
    yield this.DF.quad(tableAndGraph, RDFNS("type"), FX("root"), tableAndGraph);
  }

  /** Generate quads that represent table rows */
  *quadsForRowOfTable(
    row: RDF.Quad_Subject,
    tableAndGraph: RDF.Quad_Subject & RDF.Quad_Graph,
    i: number,
  ) {
    yield this.DF.quad(tableAndGraph, RDFNS(`_${i}`), row, tableAndGraph);
  }

  /** Iterate properties and generate Facade-X quads */
  *quadsForAttributes(
    entry: Record<string, any>,
    subject: RDF.Quad_Subject,
    graph: RDF.Quad_Graph,
    options: RDFOptions,
  ) {
    for (const [k, v] of Object.entries(entry)) {
      const value = valueToTerm(v, options.includeBinaryValues, this.DF);
      if (value) yield this.DF.quad(subject, XYZ(encodeURI(k)), value, graph);
    }
  }

  /**
   * Check if there's a geometry and then get the geoSPARQLModels to generate
   * the quads with feature geometries.
   */
  *quadsForGeometry(
    data: GeometryData,
    feature: RDF.Quad_Subject,
    graph: RDF.Quad_Graph,
    options: FeatureTableContext & RDFOptions,
  ) {
    const geometry = data.geometry;

    // The underlying libraries (as of writing) do not support all
    // types of geometries. {geoJSONData} and {origData.geometry}
    // can therefore be empty.
    // Still, the feature is a geo:Feature and should be output as such
    yield this.DF.quad(feature, RDFNS("type"), GEO("Feature"), graph);
    if (geometry === undefined || data.geometryError)
      return CountWarn(
        `Table "${options.tableName}": "${data.geometryError}"; skipped`,
      );

    const geom = this.DF.blankNode();
    for (const modelName of options.geoSPARQLModels) {
      const geomCls = ModuleRegistry.get(Registry.Geometry, modelName);
      yield* geomCls.getQuads(
        geometry,
        feature,
        geomCls.requiresSeparateGeomSubject?.(options)
          ? this.DF.blankNode()
          : geom,
        graph,
        options,
        this.DF,
      );
    }
  }

  /** Generate RDF quads from a GeoPackage attribute table */
  *quadsForAttributeTable(
    iterator: IterableIterator<Record<string, DBValue>>,
    options: TableContext & RDFOptions & RDFContext,
  ) {
    const graph = this.getNodeForTable(options.tableName, options.baseIRI);

    yield* this.quadsForTable(graph);
    for (const [i, row] of enumerate(iterator, 1)) {
      const subject = this.getNodeForRow();

      yield* this.quadsForRowOfTable(subject, graph, i);
      yield* this.quadsForAttributes(row, subject, graph, options);
    }
  }

  /** Quads that represent the contents of a feature table */
  *quadsForFeatureTable(
    iterator: IterableIterator<FeatureRow>,
    options: TableContext & FeatureTableContext & RDFOptions & RDFContext,
  ) {
    const graph = this.getNodeForTable(options.tableName, options.baseIRI);

    yield* this.quadsForTable(graph);
    for (const [i, feature] of enumerate(iterator, 1)) {
      const subject = this.getNodeForRow();

      yield* this.quadsForRowOfTable(subject, graph, i);
      if (feature.values)
        yield* this.quadsForAttributes(feature.values, subject, graph, options);
      yield* this.quadsForGeometry(feature.geometry, subject, graph, options);
    }
  }
}
