import type { DBValue } from "@ngageoint/geopackage/dist/lib/db/dbAdapter.js";
import type * as RDF from "@rdfjs/types";
import { DataFactory } from "rdf-data-factory";
import { FX, RDFNS, XSD, XYZ } from "./prefixes.js";

const DF = new DataFactory();

/** Generate an RDF Literal from a value */
export function valueToTerm(value: DBValue): RDF.Quad_Object {
  if (value == null) return undefined;
  if (typeof value == "string") return DF.literal(value, XSD("string"));
  if (typeof value == "boolean")
    return DF.literal(String(value), XSD("boolean"));
  if (typeof value === "number")
    return Math.floor(value) == Math.ceil(value)
      ? DF.literal(String(value), XSD("integer"))
      : DF.literal(String(value), XSD("float"));

  return DF.literal(value.toString("base64"), XSD("base64Binary"));
}

/** Generate the RDF NamedNode for the attribute or feature table */
export function getTableNode(tableName: string, base?: string): RDF.NamedNode {
  const baseURL = base ?? XYZ("").value;
  const tableURL = new URL(encodeURIComponent(tableName), baseURL);
  return DF.namedNode(tableURL.href);
}

/** Generate the RDF NamedNode for the row / feature */
export function getRowNode(rowIdValue: string, base?: string): RDF.NamedNode {
  try {
    return DF.namedNode(new URL(rowIdValue).href);
  } catch (error) {
    const baseURL = base ?? XYZ("").value;
    const rowURL = new URL(encodeURIComponent(rowIdValue), baseURL);
    return DF.namedNode(rowURL.href);
  }
}

/** Generate Facade-X quads that represent the table its rows */
export function* quadsForTableAndRow(
  tableAndGraph: RDF.NamedNode,
  row: RDF.NamedNode,
  i: number,
) {
  yield DF.quad(tableAndGraph, RDFNS("type"), FX("root"), tableAndGraph);
  yield DF.quad(tableAndGraph, RDFNS(`_${i}`), row, tableAndGraph);
}

/** Iterate properties and generate Facade-X quads */
export function* quadsForAttributes(
  entry: Record<string, any>,
  subject: RDF.Quad_Subject,
  graph: RDF.Quad_Graph,
) {
  for (const [k, v] of Object.entries(entry))
    if (v !== null)
      yield DF.quad(subject, XYZ(encodeURI(k)), valueToTerm(v), graph);
}
