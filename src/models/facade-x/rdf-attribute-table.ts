import type { DBValue } from "@ngageoint/geopackage/dist/lib/db/dbAdapter.js";
import { RDFContext, RDFOptions, TableContext } from "../../interfaces.js";
import { enumerate } from "../../py-enumerate.js";
import {
  getRowNode,
  getTableNode,
  quadsForAttributes,
  quadsForTableAndRow,
} from "./rdf-table-common.js";

/** Generate RDF quads from a GeoPackage attribute table */
export function* quadsFromAttributeTable(
  iterator: IterableIterator<Record<string, DBValue>>,
  options: TableContext & RDFOptions & RDFContext,
) {
  const graph = getTableNode(options.tableName, options.factory);

  for (const [i, row] of enumerate(iterator, 1)) {
    const subject = getRowNode(
      `${options.tableName}_${row[options.tableIDColumns[0]] ?? i}`,
      options.factory,
      options.baseIRI,
    );

    yield* quadsForTableAndRow(graph, subject, i, options.factory);
    yield* quadsForAttributes(row, subject, graph, options);
  }
}
