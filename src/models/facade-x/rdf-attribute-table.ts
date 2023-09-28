import type { DBValue } from "@ngageoint/geopackage/dist/lib/db/dbAdapter.js";
import { enumerate } from "../../py-enumerate.js";
import {
  QuadsFromTableOptions,
  getRowNode,
  getTableNode,
  quadsForAttributes,
  quadsForTableAndRow,
} from "./rdf-table-common.js";

/** Generate RDF quads from a GeoPackage attribute table */
export function* quadsFromAttributeTable(
  iterator: IterableIterator<Record<string, DBValue>>,
  options: QuadsFromTableOptions,
) {
  const graph = getTableNode(options.tableName);

  for (const [i, row] of enumerate(iterator)) {
    const subject = getRowNode(
      `${options.tableName}_${row[options.tableIDColumns[0]] ?? i}`,
      options.baseIRI,
    );

    yield* quadsForTableAndRow(graph, subject, i);
    yield* quadsForAttributes(row, subject, graph, options);
  }
}
