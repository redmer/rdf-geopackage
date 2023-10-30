import type { GeoPackage, GeometryData } from "@ngageoint/geopackage";
import type { DBValue } from "@ngageoint/geopackage/dist/lib/db/dbAdapter.js";
import type { FeatureRow } from "@ngageoint/geopackage/dist/lib/features/user/featureRow.js";
import * as RDF from "@rdfjs/types";
import { WGS84_CODE } from "../../bounding-box.js";
import { Warn } from "../../cli-error.js";
import {
  CLIContext,
  FeatureTableContext,
  RDFContext,
  RDFOptions,
  TableContext,
} from "../../interfaces.js";
import { FX, RDFNS, XYZ } from "../../prefixes.js";
import { enumerate } from "../../py-enumerate.js";
import { ModuleRegistry, QuadsGen, Registry } from "../models-registry.js";
import { valueToTerm } from "../utils.js";
import { queryAllFeatures } from "./featuredao-helper.js";

export class FacadeXWithGeoSparql implements QuadsGen {
  DF: RDF.DataFactory<RDF.Quad>;

  get id() {
    return "facade-x";
  }

  getRowNode() {
    return this.DF.blankNode();
  }

  /** Generate quads that represent the table and its rows */
  *quadsForTableAndRow(
    tableAndGraph: RDF.Quad_Subject & RDF.Quad_Graph,
    row: RDF.Quad_Subject,
    i: number,
  ) {
    const { quad } = this.DF;
    yield quad(tableAndGraph, RDFNS("type"), FX("root"), tableAndGraph);
    yield quad(tableAndGraph, RDFNS(`_${i}`), row, tableAndGraph);
  }

  /** Iterate properties and generate Facade-X quads */
  *quadsForAttributes(
    entry: Record<string, any>,
    subject: RDF.Quad_Subject,
    graph: RDF.Quad_Graph,
    options: RDFOptions & TableContext & RDFContext,
  ) {
    const { quad } = options.factory;
    for (const [k, v] of Object.entries(entry)) {
      const value = valueToTerm(
        v,
        options.includeBinaryValues,
        options.factory,
      );
      if (value) yield quad(subject, XYZ(encodeURI(k)), value, graph);
    }
  }

  getTableNode(tableName: string, base?: string): RDF.NamedNode {
    const baseURL = base ?? XYZ("").value;
    const tableURL = new URL(encodeURIComponent(tableName), baseURL);
    return this.DF.namedNode(tableURL.href);
  }

  /** Generate RDF quads from a GeoPackage attribute table */
  *quadsForAttributeTable(
    iterator: IterableIterator<Record<string, DBValue>>,
    options: TableContext & RDFOptions & RDFContext,
  ) {
    const graph = this.getTableNode(options.tableName, options.baseIRI);

    for (const [i, row] of enumerate(iterator, 1)) {
      const subject = this.getRowNode();

      yield* this.quadsForTableAndRow(graph, subject, i);
      yield* this.quadsForAttributes(row, subject, graph, options);
    }
  }

  *quadsForGeometry(
    data: GeometryData,
    subject: RDF.Quad_Subject,
    graph: RDF.Quad_Graph,
    options: FeatureTableContext & RDFOptions,
  ) {
    const geometry = data.geometry;
    const { srs } = options;

    // The underlying libraries (as of writing) do not support all
    // types of geometries. {geoJSONData} and {origData.geometry}
    // can therefore be empty.
    if (geometry === undefined || data.geometryError)
      return Warn(
        `Feature geometry type not supported in ${options.tableName} (_:${subject.value}) (skipped)`,
      );

    for (const modelName of options.geoSPARQLModels) {
      const geomCls = ModuleRegistry.get(Registry.Geometry, modelName);
      yield* geomCls.getQuads(
        geometry,
        subject,
        this.DF.blankNode(),
        graph,
        options,
        this.DF,
      );
    }
  }

  *quadsFromFeatureTable(
    iterator: IterableIterator<FeatureRow>,
    options: TableContext & FeatureTableContext & RDFOptions & RDFContext,
  ) {
    const graph = this.getTableNode(options.tableName, options.baseIRI);

    for (const [i, feature] of enumerate(iterator, 1)) {
      const subject = this.getRowNode();

      yield* this.quadsForTableAndRow(graph, subject, i);
      if (feature.values)
        yield* this.quadsForAttributes(feature.values, subject, graph, options);
      yield* this.quadsForGeometry(feature.geometry, subject, graph, options);
    }
  }

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

      yield* this.quadsFromFeatureTable(it, {
        ...ctx,
        tableName,
        baseIRI,
        includeBinaryValues: ctx.includeBinaryValues,
        srs: dao.srs, // table SRS
      });
    }
  }
}
