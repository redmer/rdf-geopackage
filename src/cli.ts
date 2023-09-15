#!/usr/bin/env node

import { StreamWriter } from "n3";
import { createWriteStream, existsSync } from "node:fs";
import * as path from "node:path";
import { PassThrough, pipeline as streampipeline } from "node:stream";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { createGzip } from "node:zlib";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  WGS84_CODE,
  getWGS84Converter,
  suppliedBoundingBox,
} from "./bounding-box.js";
import { Bye } from "./cli-error.js";
import { GeoPackageParser } from "./geopackage.js";
import { EXTENSION_MIMETYPES, mimetypeForExtension } from "./mimetypes.js";
import { FX, GEO, RDFNS, XSD, XYZ } from "./prefixes.js";

const pipeline = promisify(streampipeline);

async function cli() {
  const argv = await yargs(hideBin(process.argv))
    .usage(`Generate RDF from an OGC GeoPackage with $0`)
    .option("input", { alias: "i", type: "string", desc: "GeoPackage file" })
    .demandOption("input")
    .option("output", { alias: "o", type: "string", desc: "Output quads file" })
    .normalize(["input", "output"])
    .option("bounding-box", {
      type: "string",
      desc: "Limit features to bounding box",
    })
    .option("bounding-box-crs", {
      type: "string",
      desc: `Coordinate Reference System code`,
    })
    .option("only-layers", {
      type: "string",
      array: true,
      desc: "Only output named feature layers and attribute tables",
    })
    .option("base-iri", { type: "string", desc: "Base IRI" })
    .option("format", {
      desc: "Override output format (default: nquads)",
    })
    .option("include-binary-values", {
      type: "boolean",
      desc: "Output binary values",
    })
    .choices("format", Object.keys(EXTENSION_MIMETYPES))
    .option("model", {
      desc: "Data meta model",
    })
    .choices("model", ["facade-x"])
    .parse();

  if (!existsSync(argv.input)) Bye(`File '${argv.input}' not found`);

  // If there's a bounding box CRS defined, first check if we can parse it.
  // This is less expensive than converting quads etc.
  const converter = argv.boundingBoxCrs
    ? await getWGS84Converter(argv.boundingBoxCrs)
    : WGS84_CODE;
  const boundingBox = argv.boundingBox
    ? suppliedBoundingBox(argv.boundingBox, converter)
    : undefined;

  // If there's a target file, open a write stream and determine the mimetype off of it.
  // Else, output to stdout with format override or n-quads
  const target = argv.output
    ? createWriteStream(argv.output, { encoding: "utf-8" })
    : process.stdout;
  const mimetype: string = argv.format
    ? mimetypeForExtension(argv.format) ?? argv.format
    : mimetypeForExtension(path.extname(argv.output)) ??
      mimetypeForExtension("nq");
  const wantsGzip: boolean = argv.output?.endsWith(".gz");

  const parser = new GeoPackageParser(argv.input, {
    boundingBox: boundingBox,
    allowedLayers: argv.onlyLayers,
    baseIRI: argv.baseIri ?? pathToFileURL(argv.input).href,
    includeBinaryValues: argv.includeBinaryValues,
  });
  const writer = new StreamWriter({
    format: mimetype,
    prefixes: {
      fx: FX(""),
      geo: GEO(""),
      rdf: RDFNS(""),
      xsd: XSD(""),
      xyz: XYZ(""),
    },
  });

  // `Error parsing geometry`: the GeoPackage may output errors to console.log.
  console.log = function () {};

  try {
    pipeline(
      parser,
      writer,
      wantsGzip ? createGzip() : new PassThrough(),
      target,
    );
  } catch (err) {
    Bye(err);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) void cli();
