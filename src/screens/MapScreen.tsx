import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TIJUANA_INITIAL_REGION } from '../config';
import { subscribeToReports } from '../services/firebase';
import { fetchOsmRamps, type OsmRamp } from '../services/overpass';
import type { BarrierReport, RootStackParamList } from '../types';
import { categoryInfo } from '../components/CategoryInfo';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function MapScreen() {
  const navigation = useNavigation<Nav>();
  const [reports, setReports] = useState<BarrierReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [osmRamps, setOsmRamps] = useState<OsmRamp[]>([]);
  const [showOsm, setShowOsm] = useState(false);
  const [loadingOsm, setLoadingOsm] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const unsub = subscribeToReports(data => {
      setReports(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const toggleOsmLayer = async () => {
    if (!showOsm && osmRamps.length === 0) {
      setLoadingOsm(true);
      try {
        const ramps = await fetchOsmRamps();
        setOsmRamps(ramps);
      } catch {
        Alert.alert('Error', 'No se pudo cargar la capa de rampas OSM. Verifica tu conexión.');
      } finally {
        setLoadingOsm(false);
      }
    }
    setShowOsm(prev => !prev);
  };

  const handleMapLongPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    Alert.alert(
      '📍 Reportar barrera aquí',
      `¿Deseas reportar una barrera en esta ubicación?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reportar',
          onPress: () => navigation.navigate('Report', { latitude, longitude }),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={TIJUANA_INITIAL_REGION}
        showsUserLocation
        showsMyLocationButton
        onLongPress={handleMapLongPress}
      >
        {reports.map(report => (
          <Marker
            key={report.id}
            coordinate={{ latitude: report.latitude, longitude: report.longitude }}
            title={categoryInfo[report.category]?.label ?? report.category}
            description={report.description}
            pinColor={report.verified ? '#611232' : '#EA4335'}
            accessibilityLabel={`Barrera: ${categoryInfo[report.category]?.label ?? report.category}. ${report.verified ? 'Verificada' : 'Sin verificar'}. ${report.description}`}
            onCalloutPress={() =>
              navigation.navigate('ReportDetail', { report })
            }
          />
        ))}

        {showOsm && osmRamps.map(ramp => (
          <Marker
            key={`osm-${ramp.id}`}
            coordinate={{ latitude: ramp.lat, longitude: ramp.lon }}
            title="Rampa accesible (OSM)"
            description={ramp.tags?.kerb === 'lowered' ? 'Bordillo rebajado' : ramp.tags?.['ramp:wheelchair'] === 'yes' ? 'Rampa para silla de ruedas' : 'Cruce accesible'}
            pinColor="#2E7D32"
            accessibilityLabel={`Rampa existente de OpenStreetMap en esta ubicación`}
          />
        ))}
      </MapView>

      {loading && (
        <View
          style={styles.loadingOverlay}
          accessible
          accessibilityLabel="Cargando mapa de barreras"
          accessibilityLiveRegion="polite"
        >
          <ActivityIndicator size="large" color="#611232" />
          <Text style={styles.loadingText}>Cargando mapa…</Text>
        </View>
      )}

      {/* Botón toggle capa OSM */}
      <Pressable
        style={[styles.osmToggle, showOsm && styles.osmToggleActive]}
        onPress={toggleOsmLayer}
        disabled={loadingOsm}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={showOsm ? 'Ocultar rampas de OpenStreetMap' : 'Mostrar rampas de OpenStreetMap'}
        accessibilityState={{ busy: loadingOsm }}
      >
        {loadingOsm
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={styles.osmToggleText}>{showOsm ? '🟢 Rampas OSM ✓' : '🟢 Rampas OSM'}</Text>
        }
      </Pressable>

      {/* Botón flotante para reportar */}
      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('Report', undefined)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Reportar nueva barrera"
        accessibilityHint="Abre el formulario para reportar una barrera de accesibilidad"
      >
        <Text style={styles.fabText}>+ Reportar</Text>
      </Pressable>

      {/* Leyenda */}
      <View
        style={styles.legend}
        accessible
        accessibilityLabel="Leyenda del mapa: rojo sin verificar, guinda verificado, verde rampa OSM existente. Mantén presionado para reportar."
        importantForAccessibility="yes"
      >
        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: '#EA4335' }]} />
          <Text style={styles.legendLabel}>Sin verificar</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: '#611232' }]} />
          <Text style={styles.legendLabel}>Verificado</Text>
        </View>
        {showOsm && (
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: '#2E7D32' }]} />
            <Text style={styles.legendLabel}>Rampa OSM</Text>
          </View>
        )}
        <Text style={styles.legendHint}>Mantén presionado para reportar</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFill },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { color: '#333', fontSize: 15 },
  osmToggle: {
    position: 'absolute',
    bottom: 104,
    right: 20,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 48,
    borderRadius: 24,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  osmToggleActive: {
    backgroundColor: '#1B5E20',
  },
  osmToggleText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 20,
    backgroundColor: '#611232',
    paddingHorizontal: 24,
    paddingVertical: 14,
    minHeight: 56,
    minWidth: 48,
    borderRadius: 30,
    elevation: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  legend: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    padding: 10,
    gap: 4,
    elevation: 4,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, color: '#333' },
  legendHint: { fontSize: 10, color: '#888', marginTop: 4 },
});
