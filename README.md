# rdf-geopackage

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
      --bounding-box           Limit features to bounding box           [string]
      --bounding-box-crs       Coordinate Reference System code         [string]
      --only-layers            Only output named feature layers and attribute ta
                               bles                                      [array]
      --base-iri               Base IRI                                 [string]
      --format                 Override output format (default: nquads)
            [choices: "nq", "nquads", "trig", "nt", "ntriples", "ttl", "turtle"]
      --include-binary-values  Output binary values                    [boolean]
      --model                  Data meta model             [choices: "facade-x"]
```

## Options

Limit **large GeoPackages** with `--bounding-box`.
Supply a space separated list of coordinates as a string to limit the Features returned.
Provide the bounding box as WGS84 (GeoJSON default) or supply a CRS code (lookup via EPSG.io) or Projection WKT with `--bounding-box-crs`.

You can also **limit** which feature **layers** (or attribute tables) are output with `--only-layers`.
**NULL values** are never output and **binary values** are skipped, unless `--include-binary-values` is provided.
Binary values are Base64-encoded string values with a `xsd:base64Binary` datatype.

By default, **output** is directed to stdout as N-Quads. Provide `--output` to save the triples or quads to a file.
The **serialization format** is recognized from the file extension but can be overriden with `--format`.
Add `.gz` after the extension (e.g. `mydata.ttls.gz`) to **GZip** the output.

Provide the path to the **input file** with `--input`.
You may also pipe in a file to rdf-geopackage.

The generated quads follow a **data meta-model**, supplied by `--model` and by default `facade-x` with GeoSPARQL.
Override the **base IRI** with `--base-iri` to let subject-URLs not be derived from the present working directory.

## Model: Facade-X

Facade-X is a data meta-model from the SPARQL-Anything project, that can represent tabular data easily.
The built-in data meta-model `facade-x` extends the tabular representation with [GeoSPARQL][geosparql] for geographical information from feature tables.
Facade-X uses RDF containers and blank nodes to represent tables and rows.
Features are `geo:Feature`s with a `geo:hasDefaultGeometry` that refers to a `geo:Geometry`.
That Geometry in turn has a `geo:asGeoJSON` and `geo:asWKT` representations of their geometry in WGS84 (GeoJSON-default).

Column metadata is very limited and most values are not typed properly.
Example data abridged [from NGA][example.gpkg]:
the table `media`is a feature table, `nga_properties` is an attribute table.

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

[geosparql]: https://www.ogc.org/standard/geosparql/
[example.gpkg]: https://github.com/ngageoint/GeoPackage/blob/master/docs/examples/java/example.gpkg
