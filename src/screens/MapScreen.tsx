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
import type { BarrierReport, RootStackParamList } from '../types';
import { categoryInfo } from '../components/CategoryInfo';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function MapScreen() {
  const navigation = useNavigation<Nav>();
  const [reports, setReports] = useState<BarrierReport[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const unsub = subscribeToReports(data => {
      setReports(data);
      setLoading(false);
    });
    return unsub;
  }, []);

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
            pinColor={report.verified ? '#1A73E8' : '#EA4335'}
            accessibilityLabel={`Barrera: ${categoryInfo[report.category]?.label ?? report.category}. ${report.verified ? 'Verificada' : 'Sin verificar'}. ${report.description}`}
            onCalloutPress={() =>
              navigation.navigate('ReportDetail', { report })
            }
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
          <ActivityIndicator size="large" color="#1A73E8" />
          <Text style={styles.loadingText}>Cargando mapa…</Text>
        </View>
      )}

      {/* Botón flotante para reportar */}
      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('Report', undefined)}
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
        accessibilityLabel="Leyenda: punto rojo es sin verificar, punto azul es verificado. Mantén presionado el mapa para reportar una barrera."
        importantForAccessibility="yes"
      >
        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: '#EA4335' }]} />
          <Text style={styles.legendLabel}>Sin verificar</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: '#1A73E8' }]} />
          <Text style={styles.legendLabel}>Verificado</Text>
        </View>
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
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 20,
    backgroundColor: '#1A73E8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 6,
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
