#!/usr/bin/env node

import { StreamWriter } from "n3";
import { createWriteStream } from "node:fs";
import { pathToFileURL } from "node:url";
import streamifyArray from "streamify-array";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  WGS84_CODE,
  getWGS84Converter,
  suppliedBoundingBox,
} from "./bounding-box.js";
import { quadsFromGeoPackage } from "./rdf-geopackage.js";

async function cli() {
  const argv = await yargs(hideBin(process.argv))
    .option("input", { alias: "i", type: "string", desc: "GeoPackage file" })
    .demandOption("input")
    .option("output", { alias: "o", type: "string", desc: "Output quads file" })
    .normalize(["input", "output"])
    .option("bounding-box", {
      type: "string",
      desc: "Output features from this bounding box",
    })
    .option("bounding-box-crs", {
      type: "string",
      desc: `Supply a CRS code (default: ${WGS84_CODE})`,
      default: WGS84_CODE,
    })
    .option("only-layers", { type: "array" })
    .parse();

  // If there's a bounding box CRS defined, first check if we can parse it.
  // This is less expensive than converting quads etc.
  const converter = argv.boundingBoxCrs
    ? await getWGS84Converter(argv.boundingBoxCrs)
    : WGS84_CODE;
  const boundingBox = argv.boundingBox
    ? suppliedBoundingBox(argv.boundingBox, converter)
    : undefined;

  const target = argv.output
    ? createWriteStream(argv.output, { encoding: "utf-8" })
    : process.stdout;
  const mimetype = "application/n-quads";

  const quadStream = streamifyArray(
    await quadsFromGeoPackage(argv.input, boundingBox),
  );
  const writer = new StreamWriter({ mimetype });

  quadStream
    .pipe(writer)
    .pipe(target)
    .on("error", (error) => console.error(error));
}

void cli();

if (import.meta.url === pathToFileURL(process.argv[1]).href) void cli();
