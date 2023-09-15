# rdf-geopackage

Generate RDF out of a GeoPackage (for further processing)

## Usage

Install using NPM locally `npm -g @rdmr-eu/rdf-geopackage` as a command line tool.

Check if it's installed correctly with `rdf-geopackage --help`.
That should return the following help info.

```man
Generate RDF from an OGC GeoPackage with cli.js

Options:
      --help                   Show help                               [boolean]
      --version                Show version number                     [boolean]
  -i, --input                  GeoPackage file               [string] [required]
  -o, --output                 Output quads file                        [string]
      --bounding-box           Limit features to bounding box           [string]
      --bounding-box-crs       Coordinate Reference System code
                                                 [string] [default: "EPSG:4326"]
      --only-layers            Only output named feature layers and attribute ta
                               bles                                      [array]
      --base-iri               Base IRI                                 [string]
      --format                 Override output format
  [choices: "json", "jsonld", "n3", "nq", "nquads", "nt", "ntriples", "owl", "rd
     f", "rdfxml", "trig", "trigs", "ttl", "ttls", "turtle"] [default: "nquads"]
      --include-binary-values  Output binary values   [boolean] [default: false]
      --model                  Data meta model
                                     [choices: "facade-x"] [default: "facade-x"]
```

## Options

Limit **large GeoPackages** with `--bounding-box`. Supply a space separated list of coordinates to limit the Features returned. Provide the bounding box as WGS84 (GeoJSON default) or supply a CRS code (accesses EPSG.io) or Projection WKT with `--bounding-box-crs`.

You can also limit which feature layers (or attribute tables) are output with `--only-layers`.

By default, **output** is directed to stdout as N-Quads. Provide `--output` to redirect the quads to specified file. The serialization format is recognized from the file extension but can be overriden with `--format`. Add `.gz` after the extension (e.g. `mydata.ttls.gz`) to GZip the output.

The generated quads follow a model, supplied by `--model` and by default `facade-x` with GeoSPARQL. Override the base IRI with `--base-iri` to let subject-URLs not be derived from the present working directory.

## Model: Facade-X

`rdf-geopackage` uses a model that, like the SPARQL-Anything Facade-X meta-model, can represent almost all non-geographical information.

[GeoSPARQL][geosparql] is used to represent `geo:Feature`s with a `geo:hasDefaultGeometry` that refers to a `geo:Geometry`. That Geomtry in turn has a `geo:asGeoJSON` and `geo:asWKT` representations of their geometry in WGS84 (GeoJSON-default).

[geosparql]: https://www.ogc.org/standard/geosparql/
