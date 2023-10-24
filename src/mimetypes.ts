// Some types have been commented out: these are not supported by N3.StreamWriter.
export const EXTENSION_MIMETYPES = {
  // json: "application/ld+json",
  // jsonld: "application/ld+json",
  // n3: "text/n3",
  nq: "application/n-quads",
  nquads: "application/n-quads",
  trig: "application/trig",
  nt: "application/n-triples",
  ntriples: "application/n-triples",
  // owl: "application/rdf+xml",
  // rdf: "application/rdf+xml",
  // rdfxml: "application/rdf+xml",
  // trigs: "application/x-trigstar",
  ttl: "text/turtle",
  // ttls: "text/x-turtlestar",
  turtle: "text/turtle",
} as const;

export type MimetypeExtensions = keyof typeof EXTENSION_MIMETYPES;
export type MimetypeValues = (typeof EXTENSION_MIMETYPES)[MimetypeExtensions];

/** Get mimetype for extension. Skip a .gz suffix. */
export function mimetypeForExtension(path: string) {
  const ext = path.replace(".gz", "").split(".").at(-1);
  return EXTENSION_MIMETYPES[ext];
}

export function supportsGraphs(mimetype: MimetypeValues): boolean {
  return mimetype == "application/n-quads" || mimetype == "application/trig";
}
