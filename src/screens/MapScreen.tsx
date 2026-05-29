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
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Geolocation from '@react-native-community/geolocation';
import NetInfo from '@react-native-community/netinfo';

import { TIJUANA_INITIAL_REGION } from '../config';
import { subscribeToReports, syncPendingReports } from '../services/firebase';
import { saveReportsCache, loadReportsCache } from '../services/offlineCache';
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
  const [isOffline, setIsOffline] = useState(false);

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
      saveReportsCache(data); // guardar en caché para uso offline
    });
    return unsub;
  }, []);

  // Detectar conectividad
  useEffect(() => {
    // Carga inicial desde caché mientras se obtienen datos de red
    loadReportsCache().then(cached => {
      if (cached.length > 0) {
        setReports(cached);
        setLoading(false);
      }
    });

    const unsubNet = NetInfo.addEventListener(state => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(!online);
      if (online) {
        // Al recuperar conexión, sincronizar cola de reportes pendientes
        syncPendingReports().then(n => {
          if (n > 0) {
            Alert.alert('Sincronizado', `Se enviaron ${n} reporte${n > 1 ? 's' : ''} que estaban pendientes.`);
          }
        });
      }
    });
    return unsubNet;
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
      {isOffline && (
        <View style={styles.offlineBanner} accessibilityLiveRegion="polite">
          <Text style={styles.offlineBannerText}>
            📵 Sin conexión — mostrando datos en caché
          </Text>
        </View>
      )}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={TIJUANA_INITIAL_REGION}
        showsUserLocation
        showsMyLocationButton
        onLongPress={handleMapLongPress}
      >
        {reports.map(report => {
          const info = categoryInfo[report.category];
          return (
            <Marker
              key={report.id}
              coordinate={{ latitude: report.latitude, longitude: report.longitude }}
              pinColor={report.verified ? '#611232' : '#EA4335'}
              accessibilityLabel={`Barrera: ${info?.label ?? report.category}. ${report.verified ? 'Verificada' : 'Sin verificar'}. ${report.description}`}
            >
              <Callout onPress={() => navigation.navigate('ReportDetail', { report })}>
                <View style={styles.callout}>
                  {report.photoUrl ? (
                    <Image source={{ uri: report.photoUrl }} style={styles.calloutThumb} />
                  ) : null}
                  <Text style={styles.calloutTitle} numberOfLines={1}>
                    {info?.emoji} {info?.label ?? report.category}
                  </Text>
                  <Text style={styles.calloutDesc} numberOfLines={2}>
                    {report.description || 'Sin descripción'}
                  </Text>
                  <Text style={styles.calloutHint}>
                    {report.verified ? '✔️ Verificado' : '🕔 Sin verificar'} · Ver detalle →
                  </Text>
                </View>
              </Callout>
            </Marker>
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
  offlineBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
    backgroundColor: '#333',
    paddingVertical: 6,
    alignItems: 'center',
  },
  offlineBannerText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  callout: {
    width: 200,
    padding: 8,
    gap: 4,
  },
  calloutThumb: {
    width: '100%',
    height: 110,
    borderRadius: 8,
    marginBottom: 4,
    resizeMode: 'cover',
  },
  calloutTitle: { fontSize: 13, fontWeight: '700', color: '#222' },
  calloutDesc: { fontSize: 11, color: '#555', lineHeight: 15 },
  calloutHint: { fontSize: 10, color: '#611232', marginTop: 4, textAlign: 'right' },
});
