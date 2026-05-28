// Todas las claves reales están en src/config/secrets.ts (gitignoreado)
// Copia secrets.example.ts → secrets.ts y rellena los valores
export { FIREBASE_CONFIG, GOOGLE_MAPS_API_KEY, GEMINI_API_KEY } from './secrets';

// Coordenadas iniciales: IMSS Tijuana (referencia)
export const TIJUANA_INITIAL_REGION = {
  latitude: 32.5049,
  longitude: -117.0038,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

