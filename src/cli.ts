#!/usr/bin/env node

import { StreamWriter } from "n3";
import { createWriteStream } from "node:fs";
import { Writable } from "node:stream";
import { pathToFileURL } from "node:url";
import streamifyArray from "streamify-array";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { quadsFromGeoPackage } from "./rdf-geopackage.js";

/** Generate the RDF quads from the GeoPackage and direct to out */
export async function run(filepath: string, mimetype: string, out: Writable) {
  const quadStream = streamifyArray(await quadsFromGeoPackage(filepath));
  const writer = new StreamWriter({ mimetype });

  quadStream
    .pipe(writer)
    .pipe(out)
    .on("error", (error) => console.error(error));
}

async function cli() {
  const argv = await yargs(hideBin(process.argv))
    .option("input", { alias: "i", type: "string", desc: "GeoPackage file" })
    .demandOption("input")
    .option("output", { alias: "o", type: "string", desc: "Output quads file" })
    .normalize(["input", "output"])
    .parse();

  const target = argv.output
    ? createWriteStream(argv.output, { encoding: "utf-8" })
    : process.stdout;
  const mimetype = "application/n-quads";

  await run(argv.input, mimetype, target);
}

void cli();

if (import.meta.url === pathToFileURL(process.argv[1]).href) void cli();
