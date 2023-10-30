import type { DBValue } from "@ngageoint/geopackage/dist/lib/db/dbAdapter.js";
import type * as RDF from "@rdfjs/types";
import { toRdf } from "rdf-literal";
import { XSD } from "../prefixes.js";

/** Generate an RDF Literal from a value */
export function valueToTerm(
  value: DBValue,
  includeBinaryValue: boolean,
  factory: RDF.DataFactory,
): RDF.Quad_Object | undefined {
  if (value == null) return undefined;

  if (value instanceof Uint8Array)
    if (includeBinaryValue)
      return factory.literal(value.toString("base64"), XSD("base64Binary"));
    else return undefined;

  return toRdf(value);
}
