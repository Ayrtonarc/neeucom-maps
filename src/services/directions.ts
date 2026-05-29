import { GOOGLE_MAPS_API_KEY } from '../config/secrets';

export interface RouteResult {
  points: Array<{ latitude: number; longitude: number }>;
  distanceText: string;  // "1.2 km"
  durationText: string;  // "15 mins"
  summary: string;       // nombre de la calle principal
}

/** Decodifica el polyline codificado de Google Maps */
function decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
  const coords: Array<{ latitude: number; longitude: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let val = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      val |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += val & 1 ? ~(val >> 1) : val >> 1;

    shift = 0;
    val = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      val |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += val & 1 ? ~(val >> 1) : val >> 1;

    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return coords;
}

/**
 * Calcula ruta a pie entre dos puntos usando Google Directions API.
 * Usa modo WALKING para favorecer banquetas y pasos peatonales.
 */
export async function getWalkingRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
): Promise<RouteResult> {
  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${origin.latitude},${origin.longitude}` +
    `&destination=${destination.latitude},${destination.longitude}` +
    `&mode=walking` +
    `&language=es` +
    `&avoid=highways` +
    `&key=${GOOGLE_MAPS_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Directions API HTTP ${res.status}`);
  }

  const json = await res.json();

  if (json.status !== 'OK') {
    throw new Error(`Directions API: ${json.status} — ${json.error_message ?? ''}`);
  }

  const route = json.routes[0];
  const leg = route.legs[0];

  return {
    points: decodePolyline(route.overview_polyline.points),
    distanceText: leg.distance.text,
    durationText: leg.duration.text,
    summary: route.summary || leg.start_address,
  };
}
