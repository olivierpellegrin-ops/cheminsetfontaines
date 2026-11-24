/* Declarations minimales pour @mapbox/togeojson (paquet sans types officiels).
 * Utilise uniquement par le viewer GPX du back-office (gpx-preview.tsx). */
declare module "@mapbox/togeojson" {
  export interface GeoJSONGeometry {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  }
  export interface GeoJSONFeature {
    type: "Feature";
    geometry: GeoJSONGeometry | null;
    properties: Record<string, string | number | null> | null;
  }
  export interface GeoJSONFeatureCollection {
    type: "FeatureCollection";
    features: GeoJSONFeature[];
  }
  export function gpx(doc: Document): GeoJSONFeatureCollection;
}
