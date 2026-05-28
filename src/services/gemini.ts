import { GoogleGenerativeAI } from '@google/generative-ai';
import RNFS from 'react-native-fs';
import { GEMINI_API_KEY } from '../config/secrets';
import type { ReportCategory } from '../types';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const CATEGORY_PROMPT = `Eres un asistente de accesibilidad urbana para Tijuana, México.
Analiza esta imagen de una calle, banqueta o espacio público.
Identifica el principal problema de accesibilidad y clasifícalo en UNA de estas categorías:

- banqueta_rota: banqueta dañada, rota, con hoyos, hundida o en mal estado
- sin_rampa: falta rampa para silla de ruedas en esquina o acceso
- obstaculo: objeto bloqueando el paso (poste, carro, basura, escombro, etc.)
- semaforo_sin_sonido: semáforo sin señal sonora para invidentes
- otro: cualquier otro problema de accesibilidad

Responde ÚNICAMENTE con el nombre exacto de la categoría, sin explicación ni puntuación.`;

const VALID_CATEGORIES: ReportCategory[] = [
  'banqueta_rota',
  'sin_rampa',
  'obstaculo',
  'semaforo_sin_sonido',
  'otro',
];

export async function classifyBarrierPhoto(
  photoUri: string,
): Promise<ReportCategory | null> {
  try {
    const base64 = await RNFS.readFile(photoUri, 'base64');
    const mimeType = photoUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent([
      CATEGORY_PROMPT,
      { inlineData: { data: base64, mimeType } },
    ]);

    const raw = result.response.text().trim().toLowerCase();
    const matched = VALID_CATEGORIES.find(c => raw.includes(c));
    return matched ?? 'otro';
  } catch {
    return null;
  }
}
