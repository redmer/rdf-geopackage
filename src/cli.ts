#!/usr/bin/env node

import { StreamWriter } from "n3";
import { createWriteStream, existsSync } from "node:fs";
import * as path from "node:path";
import { PassThrough, pipeline as streampipeline } from "node:stream";
import { buffer } from "node:stream/consumers";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { createGzip } from "node:zlib";
import { DataFactory } from "rdf-data-factory";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  WGS84_CODE,
  getWGS84Converter,
  suppliedBoundingBox,
} from "./bounding-box.js";
import { Bye } from "./cli-error.js";
import { GeoPackageParser } from "./geopackage.js";
import {
  EXTENSION_MIMETYPES,
  mimetypeForExtension,
  supportsGraphs,
  type MimetypeValues,
} from "./mimetypes.js";
import { ModuleRegistry, Registry } from "./models/models-registry.js";
import { FX, GEO, RDFNS, SF, XSD, XYZ } from "./prefixes.js";
import { MergeGraphsStream } from "./rdf-stream-override.js";

const pipeline = promisify(streampipeline);

async function cli() {
  const options = yargs(hideBin(process.argv))
    .usage(`Generate RDF from an OGC GeoPackage with $0`)
    .option("input", {
      alias: "i",
      type: "string",
      desc: "GeoPackage file",
      nargs: 1,
    })
    .option("output", { alias: "o", type: "string", desc: "Output quads file" })
    .normalize(["input", "output"])
    .option("format", {
      desc: "Override output format (default: nquads)",
    })
    .choices("format", Object.keys(EXTENSION_MIMETYPES))
    .option("bbox", {
      type: "string",
      desc: "Limit features to bounding box",
    })
    .option("bbox-crs", {
      type: "string",
      desc: `Coordinate Reference System code`,
    })
    .option("only-layers", {
      type: "string",
      array: true,
      desc: "Only output named feature layers and attribute tables",
    })
    .option("include-binary-values", {
      type: "boolean",
      desc: "Output binary values (xsd:base64Binary)",
    })
    .option("base-iri", { type: "string", desc: "Base IRI" })
    .option("model", {
      desc: "Data meta model",
    })
    .choices("model", ModuleRegistry.knownModels(Registry.Generic))
    .option("geosparql", {
      desc: "Output GeoSPARQL (default: wkt)",
      type: "string",
      array: true,
    })
    .choices("geosparql", ModuleRegistry.knownModels(Registry.Geometry))
    .strict();
  const argv = await options.parse();

  // Check the input: either an existing filepath or none and then stdin is not a TTY
  if (argv.input && argv.input != "-" && !existsSync(argv.input))
    Bye(`File '${argv.input}' not found`);
  if ((!argv.input || argv.input == "-") && process.stdin.isTTY)
    Bye(
      `Missing required input GeoPackage file: provide a file path or pipe in via stdin.\n\nUsage:`,
      await options.getHelp(),
    );

  // Get the input filepath or buffer and determine the best baseIRI
  const input = argv.input != "-" ? argv.input : await buffer(process.stdin);
  const baseIRI =
    argv.baseIri ?? pathToFileURL(argv.input ?? process.env.PWD).href + "#";

  // If there's a bounding box CRS defined, first check if we can parse it.
  // This is less expensive than converting quads etc.
  // TODO: Can we remove this reference to WGS84?
  const bboxConverter = argv.bboxCrs
    ? await getWGS84Converter(argv.bboxCrs)
    : await getWGS84Converter(WGS84_CODE);
  const boundingBox = argv.bbox
    ? suppliedBoundingBox(argv.bbox, bboxConverter)
    : undefined;

  // If there's a target file, open a write stream and determine the mimetype off of it.
  // Else, output to stdout with format override or n-quads
  const target = argv.output
    ? createWriteStream(argv.output, { encoding: "utf-8" })
    : process.stdout;
  const mimetype: MimetypeValues = argv.format // Try explicit --format
    ? mimetypeForExtension(argv.format) ?? argv.format
    : argv.output // If no --format, fallback to output path extension
      ? mimetypeForExtension(path.extname(argv.output))
      : mimetypeForExtension("nq"); // If no valid extension, fallback to nquads.

  const inTriples = !supportsGraphs(mimetype);
  const wantsGzip: boolean =
    argv.output?.endsWith(".gz") ?? argv.format?.endsWith(".gz") ?? false;
  const model: string =
    argv.model ?? ModuleRegistry.knownModels(Registry.Generic)[0];
  const geoSPARQLModels: string[] = Array.isArray(argv.geosparql)
    ? argv.geosparql
    : ["wkt"];
  const DF = new DataFactory();

  const parser = new GeoPackageParser(input, {
    model,
    boundingBox,
    allowedLayers: argv.onlyLayers,
    baseIRI,
    includeBinaryValues: Boolean(argv.includeBinaryValues),
    geoSPARQLModels,
    factory: DF,
  });

  const writer = new StreamWriter({
    format: mimetype,
    prefixes: {
      fx: FX(""),
      geo: GEO(""),
      rdf: RDFNS(""),
      sf: SF(""),
      xsd: XSD(""),
      xyz: XYZ(""),
    },
  });

  // `Error parsing geometry`: the GeoPackage may output errors to console.log.
  // This line disables console.log by hackily overriding it.
  console.log = function () {};
  console.error = function () {};

  try {
    pipeline(
      parser,
      inTriples
        ? new MergeGraphsStream({ intoGraph: DF.defaultGraph() })
        : new PassThrough({ objectMode: true }),
      writer,
      wantsGzip ? createGzip() : new PassThrough({ objectMode: true }),
      target,
    );
  } catch (err) {
    Bye(err);
  }
}

void cli();
