export const EXTENSION_MIMETYPES = {
  json: "application/ld+json",
  jsonld: "application/ld+json",
  n3: "text/n3",
  nq: "application/n-quads",
  nquads: "application/n-quads",
  nt: "application/n-triples",
  ntriples: "application/n-triples",
  owl: "application/rdf+xml",
  rdf: "application/rdf+xml",
  rdfxml: "application/rdf+xml",
  trig: "application/trig",
  trigs: "application/x-trigstar",
  ttl: "text/turtle",
  ttls: "text/x-turtlestar",
  turtle: "text/turtle",
};

/** Get mimetype for extension. Hard to keep up-to-date with source (N3StreamWriter) */
export function mimetypeForExtension(extension: string) {
  const ext = extension.replace(".gz", "");
  return EXTENSION_MIMETYPES[ext] ?? EXTENSION_MIMETYPES[ext?.substring(1)];
}
