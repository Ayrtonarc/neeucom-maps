import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BarrierReport, ReportCategory } from '../types';

const REPORTS_KEY = '@niukom:reports_cache';
const QUEUE_KEY = '@niukom:pending_queue';

// ─── Caché de reportes ──────────────────────────────────────────────────────

export async function saveReportsCache(reports: BarrierReport[]): Promise<void> {
  try {
    await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  } catch {}
}

export async function loadReportsCache(): Promise<BarrierReport[]> {
  try {
    const raw = await AsyncStorage.getItem(REPORTS_KEY);
    return raw ? (JSON.parse(raw) as BarrierReport[]) : [];
  } catch {
    return [];
  }
}

// ─── Cola de reportes pendientes ────────────────────────────────────────────

export interface PendingReport {
  id: string; // local uuid temporal
  category: ReportCategory;
  description: string;
  latitude: number;
  longitude: number;
  photoLocalUri?: string;
  createdAt: number;
}

export async function enqueuePendingReport(report: Omit<PendingReport, 'id' | 'createdAt'>): Promise<void> {
  const queue = await loadPendingQueue();
  const entry: PendingReport = {
    ...report,
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
  };
  queue.push(entry);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function loadPendingQueue(): Promise<PendingReport[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingReport[]) : [];
  } catch {
    return [];
  }
}

export async function removePendingReport(id: string): Promise<void> {
  const queue = await loadPendingQueue();
  const filtered = queue.filter(r => r.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function clearPendingQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
