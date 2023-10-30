# rdf-geopackage

[![Get latest version](https://img.shields.io/npm/v/%40rdmr-eu/rdf-geopackage)](https://www.npmjs.com/package/@rdmr-eu/rdf-geopackage)

Generate RDF out of a GeoPackage (for further processing)

## Usage

Install using NPM locally `npm install --global @rdmr-eu/rdf-geopackage` as a command line tool.

Check if it's installed correctly with `rdf-geopackage --help`.
That should return the following help info.

```man
Generate RDF from an OGC GeoPackage with rdf-geopackage

Options:
      --help                   Show help                               [boolean]
      --version                Show version number                     [boolean]
  -i, --input                  GeoPackage file                          [string]
  -o, --output                 Output quads file                        [string]
      --format                 Override output format (default: nquads)
            [choices: "nq", "nquads", "trig", "nt", "ntriples", "ttl", "turtle"]
      --bounding-box           Limit features to bounding box           [string]
      --bounding-box-crs       Coordinate Reference System code         [string]
      --only-layers            Only output named feature layers and attribute ta
                               bles                                      [array]
      --include-binary-values  Output binary values                    [boolean]
      --base-iri               Base IRI                                 [string]
      --model                  Data meta model             [choices: "facade-x"]
```

## Options

Basic input and output serializations can be set with the following options:

- `--input`: the path to the input GeoPackage file (required). With `-`, it reads the GeoPackage from stdin, e.g., piping a file with curl
- `--output`: path to the file output. By default, `rdf-geopackage` outputs _nquads_ to stdout. Its extension sets the serialization format, optionally with `.gz` to GZip the output. E.g., `--output myfile.ttl.gz`
- `--format`: set the output format explicitly. Provide a file extension with `.gz` to GZip the output.

Work with large GeoPackages by limiting the output features, output tables and binary values:

- `--bounding-box` limits the the output features to those in this area (default CRS: WGS84)
- `--bounding-box-crs` indicates the CRS for the aforementioned bounding box. Supply a EPSG code (web lookup with EPSG.io) or a projection WKT.
- `--only-layers` limits which feature layers (or attribute tables!) are output.
- `--include-binary-values` overrides the default of skipping binary values. These will be base64 encoded string values with a `^^xsd:base64Binary` data type. NULL values are never output.

Modify the model and types of the output triples or quads:

- `--base-iri`: set the relative base for the output RDF data. By default, this value is derived from the present working directory.
- `--model`: the GeoPackage tables are not natively RDF data, so a module is programmed to generating triples according to a data meta-model.
  - default: [`facade-x`](#model-facade-x)

## Model: Facade-X

Facade-X is a data meta-model from the SPARQL-Anything project, that can represent tabular data easily.
Facade-X uses RDF containers and blank nodes to represent tables and rows.

Column metadata is very limited and many values are not typed properly.
Example data abridged [from NGA][example.gpkg]:
the table `media` is a feature table, `nga_properties` is an attribute table.

```trig
xyz:media {
xyz:media a fx:root ;
  rdf:_1 [
    a geo:Feature ;
    xyz:text "BIT Systems";
    xyz:date "2023-01-23";
    geo:hasDefaultGeometry [
      a geo:Geometry ;
      geo:asWKT "POINT (-104.801918 39.720014)"^^geo:wktLiteral
    ]
  ] .
}

xyz:nga_properties {
xyz:nga_properties a fx:root ;
  rdf:_1 [
    xyz:id 14;
    xyz:property "subject";
    xyz:value "Examples"
  ] .
}
```

# Features, geometries and CRS’s

Features and their geometries are represented using [GeoSPARQL][geosparql].
Only rows from feature tables are a `geo:Feature`.

A feature has zero or more geometries predicated with `geo:hasDefaultGeometry`.
There might be no geometry if the underlying library does not support the geometry type.
There may be multiple geometries if the feature is from a layer not in EPSG:4326.

That's because a GeoJSON serialization (`geo:asGeoJSON`) is always (reprojected) in EPSG:4326.
A `geo:Geometry` can be in only one CRS, meaning that when the feature is not originally in EPSG:4326, other serializations should also be reprojected.
That is undesirable, so in these cases, `rdf-geopackage` generates a second `geo:Geometry` for the WKT serialization (`geo:asWKT`).

[geosparql]: https://www.ogc.org/standard/geosparql/
[example.gpkg]: https://github.com/ngageoint/GeoPackage/blob/master/docs/examples/java/example.gpkg

# Acknowledgements

This tool was developed for a project funded by the [_City Deal Openbare ruimte_][cdor],
executed by [Stichting Kennisplatform CROW][crow].

[crow]: https://crow.nl/
[cdor]: https://www.citydealopenbareruimte.nl/
