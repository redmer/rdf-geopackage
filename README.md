# rdf-geopackage

[![Get latest version](https://img.shields.io/npm/v/%40rdmr-eu/rdf-geopackage)](https://www.npmjs.com/package/@rdmr-eu/rdf-geopackage)

Generate RDF out of a GeoPackage (for further processing)

## Usage

Install using NPM locally `npm install --global @rdmr-eu/rdf-geopackage` as a command line tool.

Check if it's installed correctly with `rdf-geopackage --help`.
That should return the following help info:

```man
Generate RDF from an OGC GeoPackage with rdf-geopackage

Options:
      --help                   Show help                               [boolean]
      --version                Show version number                     [boolean]
  -i, --input                  GeoPackage file                          [string]
  -o, --output                 Output quads file                        [string]
      --format                 Override output format (default: nquads)
            [choices: "nq", "nquads", "trig", "nt", "ntriples", "ttl", "turtle"]
      --bbox                   Limit features to bounding box           [string]
      --bbox-crs               Coordinate Reference System code         [string]
      --only-layers            Only output named feature layers and attribute ta
                               bles                                      [array]
      --include-binary-values  Output binary values                    [boolean]
      --base-iri               Base IRI                                 [string]
      --model                  Data meta model             [choices: "facade-x"]
      --geosparql              Output GeoSPARQL
  [array] [choices: "wkt", "geojson", "bbox", "centroid", "length-area"] [defaul
                                                                     t: ["wkt"]]
```

## Options

Basic input and output serializations can be set with the following options:

- `--input`: the path to the input GeoPackage file (required). With `-`, it reads the GeoPackage from stdin, e.g., piping a file with curl
- `--output`: path to the file output. By default, `rdf-geopackage` outputs _nquads_ to stdout. Its extension sets the serialization format, optionally with `.gz` to GZip the output. E.g., `--output myfile.ttl.gz`
- `--format`: set the output format explicitly. Provide a file extension with `.gz` to GZip the output.

Work with large GeoPackages by limiting the output features, output tables and binary values:

- `--bbox` limits the the output features to those in this area (default CRS: WGS84)
- `--bbox-crs` indicates the CRS for the aforementioned bounding box. Supply a EPSG code (web lookup with EPSG.io) or a projection WKT.
- `--only-layers` limits which feature layers (or attribute tables!) are output.
- `--include-binary-values` overrides the default of skipping binary values. These will be base64 encoded string values with a `^^xsd:base64Binary` data type. NULL values are never output.

Modify the model and types of the output triples or quads:

- `--base-iri`: set the relative base for the output RDF data. By default, this value is derived from the present working directory.
- `--model`: the GeoPackage tables are not natively RDF data, so a module is programmed to generating triples according to a data meta-model. Included modules:
  - **default**: [`facade-x`](#model-facade-x)
- `--geosparql`: modify which GeoSPARQL geometries, serializations and properties are output. Only the WKT literal is in layer native CRS, all other are calculated and/or projected.
  Multiple values (space separated) are allowed.
  Included feature predicates are listed in the table below.

| Option              | GeoSPARQL feature predicates              | Note                                                            |
| ------------------- | ----------------------------------------- | --------------------------------------------------------------- |
| `wkt` (**default**) | `geo:hasGeometry/geo:asWKT`               | Output the feature's geometry as a WKT string literal           |
| `geojson`           | `geo:hasGeometry/geo:asGeoJSON`           | Output the feature's geometry as a WGS84 GeoJSON string literal |
| `bbox`              | `geo:hasBoundingBox`                      | Output a feature's bounding box                                 |
| `centroid`          | `geo:hasCentroid`                         | Output a feature's centroid point                               |
| `length-area`       | `geo:hasMetricLength` `geo:hasMetricArea` | Output the length (in m) and area (in m²) of the feature        |
| _always on_         | `rdf:type geo:Feature`                    | Output the feature class                                        |

## RDF output

#### Model: Facade-X

Facade-X is a data meta-model from the SPARQL-Anything project, that can easily represent tabular data.
Facade-X uses RDF containers and blank nodes to represent tables and rows.
Column metadata is currently very limited ([GH-24]) and many values are not typed properly.

[GH-24]: https://github.com/redmer/rdf-geopackage/issues/24

#### Features, geometries and CRS’s

Features and their geometries are represented using [GeoSPARQL][geosparql].
Only rows from feature tables are a `geo:Feature`.

A feature has zero or more geometries predicated with `geo:hasDefaultGeometry`.
There might be no geometry if the underlying library does not support the geometry type.
There may be multiple geometries if the feature is from a layer not in EPSG:4326.

That's because a GeoJSON serialization (`geo:asGeoJSON`) is always (reprojected) in EPSG:4326.
A `geo:Geometry` can be in only one CRS, meaning that when the feature is not originally in EPSG:4326, other serializations should also be reprojected.
That is undesirable, so in these cases, `rdf-geopackage` generates a second `geo:Geometry` for the WKT serialization (`geo:asWKT`).

[geosparql]: https://www.ogc.org/standard/geosparql/

#### Example RDF output

Example data abridged [from NGA][example.gpkg]:
the table `media` is a feature table, `nga_properties` is an attribute table.

[example.gpkg]: https://github.com/ngageoint/GeoPackage/blob/master/docs/examples/java/example.gpkg

```turtle
prefix fx: <http://sparql.xyz/facade-x/ns/>
prefix geo: <http://www.opengis.net/ont/geosparql#>
prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
prefix xsd: <http://www.w3.org/2001/XMLSchema#>
prefix xyz: <http://sparql.xyz/facade-x/data/>

xyz:nga_properties {  # representing a table
xyz:nga_properties a fx:root ;  # representing a table
  rdf:_1 [  # the first row
    xyz:id 14;
    xyz:property "subject";
    xyz:value "Examples"
  ] .
}

xyz:media {
xyz:media a fx:root ;
  rdf:_1 [
    a geo:Feature ;  # a row from a feature table
    xyz:text "BIT Systems";
    xyz:date "2023-01-23";
    geo:hasDefaultGeometry [  # single geometry as CRS is EPSG:4326
      a geo:Geometry ;
      geo:asWKT "POINT (-104.801918 39.720014)"^^geo:wktLiteral ;
      geo:asGeoJSON "{\"coordinates\":[-104.801918,39.720014],\"type\":\"Point\"}"^^geo:geoJSONLiteral
    ]
  ] .
}
```

# Acknowledgements

This tool was developed for a project funded by the [_City Deal Openbare ruimte_][cdor],
executed by [Stichting Kennisplatform CROW][crow].

[crow]: https://crow.nl/
[cdor]: https://www.citydealopenbareruimte.nl/
