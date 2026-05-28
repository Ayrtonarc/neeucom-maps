// Bounding box de Tijuana (sur, oeste, norte, este)
const BBOX = '32.45,-117.12,32.72,-116.80';

const QUERY = `
[out:json][timeout:25];
(
  node["kerb"="lowered"](${BBOX});
  node["ramp:wheelchair"="yes"](${BBOX});
  node["highway"="crossing"]["wheelchair"="yes"](${BBOX});
);
out body;
`;

export type OsmRamp = {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
};

export async function fetchOsmRamps(): Promise<OsmRamp[]> {
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(QUERY)}`,
  });
  if (!response.ok) {
    throw new Error(`Overpass error: ${response.status}`);
  }
  const json = await response.json();
  return (json.elements ?? []) as OsmRamp[];
}
