import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { loadReportsCache } from '../services/offlineCache';
import { subscribeToReports } from '../services/firebase';
import { GOOGLE_MAPS_API_KEY } from '../config';
import type { BarrierReport, ReportCategory } from '../types';

const BRAND = '#611232';

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  banqueta_rota: 'Banqueta rota',
  sin_rampa: 'Sin rampa',
  obstaculo: 'Obstáculo',
  semaforo_sin_sonido: 'Semáforo sin sonido',
  otro: 'Otro',
};

const CATEGORY_ICONS: Record<ReportCategory, string> = {
  banqueta_rota: '🧱',
  sin_rampa: '♿',
  obstaculo: '🚧',
  semaforo_sin_sonido: '🚦',
  otro: '📌',
};

// Cluster por cuadrícula ~1.1 km (2 decimales de latitud/longitud)
function clusterKey(lat: number, lng: number) {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=es&result_type=sublocality|neighborhood&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    const result = json.results?.[0];
    if (!result) return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    // Buscar sublocality o neighborhood en address_components
    const component = result.address_components?.find(
      (c: { types: string[] }) =>
        c.types.includes('sublocality') ||
        c.types.includes('sublocality_level_1') ||
        c.types.includes('neighborhood'),
    );
    return component?.long_name ?? result.formatted_address?.split(',')[0] ?? 'Centro';
  } catch {
    return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  }
}

function computeStats(reports: BarrierReport[]) {
  const byCategory: Record<string, number> = {};
  const byCluster: Record<string, { count: number; sumLat: number; sumLng: number }> = {};
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  let thisWeek = 0;
  let verified = 0;

  for (const r of reports) {
    // Categoría
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;

    // Cluster geográfico
    const key = clusterKey(r.latitude, r.longitude);
    if (!byCluster[key]) byCluster[key] = { count: 0, sumLat: 0, sumLng: 0 };
    byCluster[key].count++;
    byCluster[key].sumLat += r.latitude;
    byCluster[key].sumLng += r.longitude;

    // Esta semana
    if (r.createdAt >= weekAgo) thisWeek++;

    // Verificados
    if (r.verified) verified++;
  }

  return { byCategory, byCluster, thisWeek, verified };
}

export default function StatsScreen() {
  const [reports, setReports] = useState<BarrierReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topZones, setTopZones] = useState<{ name: string; count: number }[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);

  const loadReports = useCallback((data: BarrierReport[]) => {
    setReports(data);
    setLoading(false);
    setRefreshing(false);
    loadTopZones(data);
  }, []);

  useEffect(() => {
    // Cargar caché mientras llega Firestore
    loadReportsCache().then(cached => {
      if (cached.length > 0) setReports(cached);
    });

    const unsub = subscribeToReports(data => loadReports(data));
    return () => unsub();
  }, [loadReports]);

  async function loadTopZones(data: BarrierReport[]) {
    if (data.length === 0) return;
    setZonesLoading(true);
    const { byCluster } = computeStats(data);

    // Top 3 clústeres
    const sorted = Object.entries(byCluster)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3);

    const zones = await Promise.all(
      sorted.map(async ([, info]) => {
        const centLat = info.sumLat / info.count;
        const centLng = info.sumLng / info.count;
        const name = await reverseGeocode(centLat, centLng);
        return { name, count: info.count };
      }),
    );
    setTopZones(zones);
    setZonesLoading(false);
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTopZones(reports);
  }, [reports]);

  const { byCategory, thisWeek, verified } = computeStats(reports);
  const total = reports.length;
  const maxCat = Math.max(...Object.values(byCategory), 1);

  const sortedCategories = (Object.keys(CATEGORY_LABELS) as ReportCategory[]).sort(
    (a, b) => (byCategory[b] ?? 0) - (byCategory[a] ?? 0),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
    >
      {/* Encabezado */}
      <Text style={styles.title}>Impacto en la ciudad</Text>
      <Text style={styles.subtitle}>Tijuana Sin Barreras · datos en tiempo real</Text>

      {/* Tarjetas resumen */}
      <View style={styles.cardRow}>
        <StatCard value={total} label="Reportes" icon="📋" />
        <StatCard value={thisWeek} label="Esta semana" icon="🗓️" />
        <StatCard value={verified} label="Verificados" icon="✅" />
      </View>

      {/* Por categoría */}
      <SectionHeader>Por categoría</SectionHeader>
      <View style={styles.section}>
        {sortedCategories.map(cat => {
          const count = byCategory[cat] ?? 0;
          const pct = count / maxCat;
          return (
            <View key={cat} style={styles.barRow}>
              <Text style={styles.barIcon}>{CATEGORY_ICONS[cat]}</Text>
              <View style={styles.barLabelCol}>
                <Text style={styles.barLabel}>{CATEGORY_LABELS[cat]}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` }]} />
                </View>
              </View>
              <Text style={styles.barCount}>{count}</Text>
            </View>
          );
        })}
      </View>

      {/* Zonas con más barreras */}
      <SectionHeader>Zonas con más barreras</SectionHeader>
      <View style={styles.section}>
        {zonesLoading ? (
          <ActivityIndicator color={BRAND} style={{ marginVertical: 12 }} />
        ) : topZones.length === 0 ? (
          <Text style={styles.empty}>Sin datos suficientes</Text>
        ) : (
          topZones.map((z, i) => (
            <View key={z.name + i} style={styles.zoneRow}>
              <Text style={styles.zoneMedal}>{['🥇', '🥈', '🥉'][i]}</Text>
              <Text style={styles.zoneName} numberOfLines={1}>{z.name}</Text>
              <Text style={styles.zoneCount}>{z.count} {z.count === 1 ? 'barrera' : 'barreras'}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({ value, label, icon }: { value: number; label: string; icon: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardIcon}>{icon}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionHeader}>{children}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: BRAND, marginBottom: 2 },
  subtitle: { fontSize: 12, color: '#888', marginBottom: 20 },

  cardRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardIcon: { fontSize: 24, marginBottom: 4 },
  cardValue: { fontSize: 28, fontWeight: '800', color: BRAND },
  cardLabel: { fontSize: 11, color: '#666', marginTop: 2, textAlign: 'center' },

  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  barIcon: { fontSize: 18, width: 28 },
  barLabelCol: { flex: 1, marginHorizontal: 8 },
  barLabel: { fontSize: 13, color: '#333', marginBottom: 4 },
  barTrack: { height: 8, backgroundColor: '#f0e6ea', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: BRAND, borderRadius: 4 },
  barCount: { fontSize: 14, fontWeight: '700', color: BRAND, width: 28, textAlign: 'right' },

  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  zoneMedal: { fontSize: 22, marginRight: 10 },
  zoneName: { flex: 1, fontSize: 14, color: '#333', fontWeight: '500' },
  zoneCount: { fontSize: 13, color: BRAND, fontWeight: '600' },

  empty: { color: '#aaa', textAlign: 'center', paddingVertical: 12 },
});
