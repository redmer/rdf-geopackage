import type { DBValue } from "@ngageoint/geopackage/dist/lib/db/dbAdapter.js";
import type * as RDF from "@rdfjs/types";
import { toRdf } from "rdf-literal";
import { RDFContext, RDFOptions, TableContext } from "../../interfaces.js";
import { FX, RDFNS, XSD, XYZ } from "../../prefixes.js";

/** Generate an RDF Literal from a value */
export function valueToTerm(
  value: DBValue,
  includeBinaryValue: boolean,
  factory: RDF.DataFactory,
): RDF.Quad_Object {
  if (value == null) return undefined;

  if (value instanceof Buffer)
    if (includeBinaryValue)
      return factory.literal(value.toString("base64"), XSD("base64Binary"));
    else return undefined;

  return toRdf(value);
}

/** Generate the RDF NamedNode for the attribute or feature table */
export function getTableNode(
  tableName: string,
  factory: RDF.DataFactory,
  base?: string,
): RDF.NamedNode {
  const baseURL = base ?? XYZ("").value;
  const tableURL = new URL(encodeURIComponent(tableName), baseURL);
  return factory.namedNode(tableURL.href);
}

/** Generate the RDF Node for the row / feature */
export function getRowNode(
  rowIdValue: string,
  factory: RDF.DataFactory,
  base?: string,
) {
  return factory.blankNode();
}

/** Generate Facade-X quads that represent the table its rows */
export function* quadsForTableAndRow(
  tableAndGraph: RDF.Quad_Subject & RDF.Quad_Graph,
  row: RDF.Quad_Subject,
  i: number,
  factory: RDF.DataFactory,
) {
  const { quad } = factory;

  yield quad(tableAndGraph, RDFNS("type"), FX("root"), tableAndGraph);
  yield quad(tableAndGraph, RDFNS(`_${i}`), row, tableAndGraph);
}

/** Iterate properties and generate Facade-X quads */
export function* quadsForAttributes(
  entry: Record<string, any>,
  subject: RDF.Quad_Subject,
  graph: RDF.Quad_Graph,
  options: RDFOptions & TableContext & RDFContext,
) {
  const { quad } = options.factory;
  for (const [k, v] of Object.entries(entry)) {
    const value = valueToTerm(v, options.includeBinaryValues, options.factory);
    if (value) yield quad(subject, XYZ(encodeURI(k)), value, graph);
  }
}
