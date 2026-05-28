import { GOOGLE_MAPS_API_KEY } from '../config/secrets';

// Places API (New) — v1
const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

// Campos que queremos recibir (FieldMask)
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.formattedAddress',
  'places.accessibilityOptions',
].join(',');

export type ImssFacility = {
  place_id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  wheelchairEntrance?: boolean;
  wheelchairParking?: boolean;
  wheelchairRestroom?: boolean;
};

export async function fetchImssHospitals(): Promise<ImssFacility[]> {
  const body = {
    textQuery: 'Hospital IMSS Tijuana Baja California',
    languageCode: 'es',
    locationBias: {
      circle: {
        center: { latitude: 32.5049, longitude: -117.0038 },
        radius: 30000.0,
      },
    },
  };

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Places API (new): ${response.status} — ${errText}`);
  }

  const json = await response.json();
  const places = json.places ?? [];

  return places.map((p: any) => ({
    place_id: p.id,
    name: p.displayName?.text ?? 'Hospital IMSS',
    lat: p.location.latitude,
    lng: p.location.longitude,
    address: p.formattedAddress ?? '',
    wheelchairEntrance: p.accessibilityOptions?.wheelchairAccessibleEntrance,
    wheelchairParking: p.accessibilityOptions?.wheelchairAccessibleParking,
    wheelchairRestroom: p.accessibilityOptions?.wheelchairAccessibleRestroom,
  }));
}
