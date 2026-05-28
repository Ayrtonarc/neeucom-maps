import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Geolocation from '@react-native-community/geolocation';

import { TIJUANA_INITIAL_REGION } from '../config';
import { subscribeToReports } from '../services/firebase';
import { fetchImssHospitals, type ImssFacility } from '../services/places';
import type { BarrierReport, RootStackParamList } from '../types';
import { categoryInfo } from '../components/CategoryInfo';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function MapScreen() {
  const navigation = useNavigation<Nav>();
  const [reports, setReports] = useState<BarrierReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [imssFacilities, setImssFacilities] = useState<ImssFacility[]>([]);
  const [showImss, setShowImss] = useState(false);
  const [loadingImss, setLoadingImss] = useState(false);
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedReport, setSelectedReport] = useState<BarrierReport | null>(null);

  // Rastrear ubicación del usuario para el botón FAB
  useEffect(() => {
    const watchId = Geolocation.watchPosition(
      pos => setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 30000, distanceFilter: 10 },
    );
    return () => Geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    const unsub = subscribeToReports(data => {
      setReports(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const toggleImssLayer = async () => {
    if (!showImss && imssFacilities.length === 0) {
      setLoadingImss(true);
      try {
        const facilities = await fetchImssHospitals();
        setImssFacilities(facilities);
      } catch (err: any) {
        Alert.alert('Error', `No se pudieron cargar los hospitales IMSS: ${err.message}`);
      } finally {
        setLoadingImss(false);
      }
    }
    setShowImss(prev => !prev);
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
        onPress={() => setSelectedReport(null)}
      >
        {reports.map(report => {
          const info = categoryInfo[report.category];
          return (
            <Marker
              key={report.id}
              coordinate={{ latitude: report.latitude, longitude: report.longitude }}
              pinColor={report.verified ? '#611232' : '#EA4335'}
              accessibilityLabel={`Barrera: ${info?.label ?? report.category}. ${report.verified ? 'Verificada' : 'Sin verificar'}. ${report.description}`}
              onPress={() => setSelectedReport(report)}
            />
          );
        })}

        {showImss && imssFacilities.map(facility => {
          const a11y = [
            facility.wheelchairEntrance && '♿ Entrada accesible',
            facility.wheelchairParking  && '🅿️ Estacionamiento accesible',
            facility.wheelchairRestroom && '🚻 Baño accesible',
          ].filter(Boolean);
          const desc = a11y.length > 0
            ? a11y.join(' · ')
            : facility.address;
          return (
            <Marker
              key={facility.place_id}
              coordinate={{ latitude: facility.lat, longitude: facility.lng }}
              title={facility.name}
              description={desc}
              pinColor="#0277BD"
              accessibilityLabel={`Hospital IMSS: ${facility.name}. ${desc}`}
            />
          );
        })}
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

      {/* Botón toggle capa IMSS */}
      <Pressable
        style={[styles.imssToggle, showImss && styles.imssToggleActive]}
        onPress={toggleImssLayer}
        disabled={loadingImss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={showImss ? 'Ocultar hospitales IMSS' : 'Mostrar hospitales IMSS'}
        accessibilityState={{ busy: loadingImss }}
      >
        {loadingImss
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={styles.imssToggleText}>{showImss ? '🏥 IMSS ✓' : '🏥 IMSS'}</Text>
        }
      </Pressable>

      {/* Botón flotante para reportar */}
      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('Report', userLocation ?? undefined)}
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
        accessibilityLabel="Leyenda del mapa: rojo sin verificar, guinda verificado, azul hospital IMSS. Mantén presionado para reportar."
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
        {showImss && (
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: '#0277BD' }]} />
            <Text style={styles.legendLabel}>Hospital IMSS</Text>
          </View>
        )}
        <Text style={styles.legendHint}>Mantén presionado para reportar</Text>
      </View>

      {/* Tarjeta flotante — reemplaza Callout nativo para soportar imágenes en Android */}
      {selectedReport ? (() => {
        const info = categoryInfo[selectedReport.category];
        return (
          <View style={styles.floatingCard} pointerEvents="box-none">
            {selectedReport.photoUrl ? (
              <Image
                source={{ uri: selectedReport.photoUrl }}
                style={styles.floatingThumb}
                resizeMode="cover"
              />
            ) : null}
            <View style={styles.floatingBody}>
              <Text style={styles.floatingTitle} numberOfLines={1}>
                {info?.emoji} {info?.label ?? selectedReport.category}
              </Text>
              <Text style={styles.floatingDesc} numberOfLines={2}>
                {selectedReport.description || 'Sin descripción'}
              </Text>
              <Text style={styles.floatingStatus}>
                {selectedReport.verified ? '✔️ Verificado' : '🕔 Sin verificar'}
              </Text>
            </View>
            <View style={styles.floatingActions}>
              <Pressable
                style={styles.floatingBtn}
                onPress={() => {
                  setSelectedReport(null);
                  navigation.navigate('ReportDetail', { report: selectedReport });
                }}
                accessibilityRole="button"
                accessibilityLabel="Ver detalle del reporte"
              >
                <Text style={styles.floatingBtnText}>Ver detalle →</Text>
              </Pressable>
              <Pressable
                style={styles.floatingClose}
                onPress={() => setSelectedReport(null)}
                accessibilityRole="button"
                accessibilityLabel="Cerrar tarjeta"
              >
                <Text style={styles.floatingCloseText}>✕</Text>
              </Pressable>
            </View>
          </View>
        );
      })() : null}
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
  imssToggle: {
    position: 'absolute',
    bottom: 104,
    right: 20,
    backgroundColor: '#0277BD',
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
  imssToggleActive: {
    backgroundColor: '#01579B',
  },
  imssToggleText: { color: '#fff', fontWeight: '700', fontSize: 13 },
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
  floatingCard: {
    position: 'absolute',
    bottom: 110,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  floatingThumb: {
    width: '100%',
    height: 160,
  },
  floatingBody: {
    padding: 12,
    gap: 4,
  },
  floatingTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  floatingDesc: { fontSize: 13, color: '#555', lineHeight: 18 },
  floatingStatus: { fontSize: 12, color: '#888', marginTop: 2 },
  floatingActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  floatingBtn: {
    backgroundColor: '#611232',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  floatingBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  floatingClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingCloseText: { fontSize: 16, color: '#555' },
});
