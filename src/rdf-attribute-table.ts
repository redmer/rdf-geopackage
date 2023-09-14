import type { DBValue } from "@ngageoint/geopackage/dist/lib/db/dbAdapter.js";
import { enumerate } from "./py-enumerate.js";
import {
  getRowNode,
  getTableNode,
  quadsForAttributes,
  quadsForTableAndRow,
} from "./rdf-table-common.js";

/** Generate RDF quads from a GeoPackage attribute table */
export function* quadsFromAttributeTable(
  iterator: IterableIterator<Record<string, DBValue>>,
  idColumns: string[],
  tableName: string,
  subjectBase?: string,
) {
  const graph = getTableNode(tableName);

  for (const [i, row] of enumerate(iterator)) {
    const subject = getRowNode(
      String(row[idColumns[0]] ?? `${tableName}_${i}`),
      subjectBase,
    );
    yield* quadsForTableAndRow(graph, subject, i);

    yield* quadsForAttributes(row, subject, graph);
  }
}
