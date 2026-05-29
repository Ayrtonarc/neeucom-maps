import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
  increment,
  getDoc,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FIREBASE_CONFIG } from '../config';
import type { BarrierReport, ReportCategory } from '../types';

// Inicializar Firebase una sola vez
const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];
export const db = getFirestore(app);
export const storage = getStorage(app);

const REPORTS_COLLECTION = 'reports';

/** Sube imagen a Cloud Storage y devuelve la URL pública */
export async function uploadReportPhoto(
  localUri: string,
  reportId: string,
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const storageRef = ref(storage, `reports/${reportId}.jpg`);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

/** Crea un nuevo reporte en Firestore */
export async function createReport(data: {
  category: ReportCategory;
  description: string;
  latitude: number;
  longitude: number;
  photoLocalUri?: string;
}): Promise<string> {
  // Primero crear el doc para obtener el id
  const docRef = await addDoc(collection(db, REPORTS_COLLECTION), {
    category: data.category,
    description: data.description,
    latitude: data.latitude,
    longitude: data.longitude,
    photoUrl: null,
    createdAt: Date.now(),
    verified: false,
  });

  // Si hay foto, subir y actualizar
  if (data.photoLocalUri) {
    try {
      const { updateDoc, doc } = await import('firebase/firestore');
      const photoUrl = await uploadReportPhoto(data.photoLocalUri, docRef.id);
      await updateDoc(doc(db, REPORTS_COLLECTION, docRef.id), { photoUrl });
    } catch (_) {
      // La foto falla sin romper el reporte
    }
  }

  return docRef.id;
}

/** Vota sobre un reporte. Auto-verifica si llega a 3 votos positivos. */
export async function voteOnReport(
  reportId: string,
  vote: 'up' | 'down',
): Promise<{ upvotes: number; downvotes: number; verified: boolean }> {
  const ref = doc(db, REPORTS_COLLECTION, reportId);
  await updateDoc(ref, {
    [vote === 'up' ? 'upvotes' : 'downvotes']: increment(1),
  });

  const snap = await getDoc(ref);
  const data = snap.data() ?? {};
  const upvotes = data.upvotes ?? 0;
  const downvotes = data.downvotes ?? 0;
  const verified = data.verified ?? false;

  // Auto-verificar si alcanza 3 votos positivos
  if (upvotes >= 3 && !verified) {
    await updateDoc(ref, { verified: true });
    return { upvotes, downvotes, verified: true };
  }

  return { upvotes, downvotes, verified };
}

/** Sube los reportes pendientes guardados offline */
export async function syncPendingReports(): Promise<number> {
  const { loadPendingQueue, removePendingReport } = await import('./offlineCache');
  const queue = await loadPendingQueue();
  let synced = 0;
  for (const pending of queue) {
    try {
      await createReport({
        category: pending.category,
        description: pending.description,
        latitude: pending.latitude,
        longitude: pending.longitude,
        photoLocalUri: pending.photoLocalUri,
      });
      await removePendingReport(pending.id);
      synced++;
    } catch {
      // Si falla uno, continúa con el siguiente
    }
  }
  return synced;
}

/** Suscripción en tiempo real a los últimos 100 reportes */
export function subscribeToReports(
  callback: (reports: BarrierReport[]) => void,
): () => void {
  const q = query(
    collection(db, REPORTS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(100),
  );

  return onSnapshot(q, snapshot => {
    const reports: BarrierReport[] = snapshot.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<BarrierReport, 'id'>),
    }));
    callback(reports);
  });
}
