import { GeoPackage } from "@ngageoint/geopackage";
import { CLIContext, RDFContext, RDFOptions } from "../../interfaces";

export interface DataMetaModel {
  id: string;
}

export class FacadeXWithGeoSparql implements DataMetaModel {
  get id() {
    return "facade-x";
  }

  *quads({
    from: geopackage,
    options,
  }: {
    from: GeoPackage;
    options: CLIContext & RDFContext & RDFOptions;
  }) {}
}
