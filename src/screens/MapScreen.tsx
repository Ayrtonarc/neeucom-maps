import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Callout, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Geolocation from '@react-native-community/geolocation';
import NetInfo from '@react-native-community/netinfo';

import { TIJUANA_INITIAL_REGION } from '../config';
import { subscribeToReports, syncPendingReports } from '../services/firebase';
import { saveReportsCache, loadReportsCache } from '../services/offlineCache';
import { fetchImssHospitals, type ImssFacility } from '../services/places';
import { getWalkingRoute, getTransitRoute, type RouteResult, type TransitRouteResult } from '../services/directions';
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
  const [selectedImss, setSelectedImss] = useState<ImssFacility | null>(null);
  const [walkingRoute, setWalkingRoute] = useState<RouteResult | null>(null);
  const [transitRoute, setTransitRoute] = useState<TransitRouteResult | null>(null);
  const [transitError, setTransitError] = useState<string | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingTransit, setLoadingTransit] = useState(false);

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

  const handleImssPress = (facility: ImssFacility) => {
    setSelectedImss(facility);
    setWalkingRoute(null);
    setTransitRoute(null);
    setTransitError(null);
    mapRef.current?.animateToRegion(
      { latitude: facility.lat, longitude: facility.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      500,
    );
  };

  const handleCalculateRoute = async () => {
    if (!userLocation) {
      Alert.alert('Sin ubicación', 'Esperando señal GPS. Asegúrate de tener la ubicación activada.');
      return;
    }
    if (!selectedImss) return;
    setLoadingRoute(true);
    try {
      const route = await getWalkingRoute(
        userLocation,
        { latitude: selectedImss.lat, longitude: selectedImss.lng },
      );
      setWalkingRoute(route);
      // Ajustar cámara para mostrar toda la ruta
      const allPoints = [userLocation, { latitude: selectedImss.lat, longitude: selectedImss.lng }];
      mapRef.current?.fitToCoordinates(allPoints, {
        edgePadding: { top: 80, right: 40, bottom: 260, left: 40 },
        animated: true,
      });
    } catch (err: any) {
      Alert.alert('Error al calcular ruta', err.message);
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleCalculateTransit = async () => {
    if (!userLocation) {
      Alert.alert('Sin ubicación', 'Esperando señal GPS. Asegúrate de tener la ubicación activada.');
      return;
    }
    if (!selectedImss) return;
    setLoadingTransit(true);
    setTransitError(null);
    try {
      const route = await getTransitRoute(
        userLocation,
        { latitude: selectedImss.lat, longitude: selectedImss.lng },
      );
      setTransitRoute(route);
      const allPoints = [userLocation, { latitude: selectedImss.lat, longitude: selectedImss.lng }];
      mapRef.current?.fitToCoordinates(allPoints, {
        edgePadding: { top: 80, right: 40, bottom: 300, left: 40 },
        animated: true,
      });
    } catch (err: any) {
      setTransitError(err.message ?? 'No se encontraron rutas de transporte.');
    } finally {
      setLoadingTransit(false);
    }
  };

  const handleOpenInMaps = (mode: 'walking' | 'transit' = 'walking') => {
    if (!selectedImss) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedImss.lat},${selectedImss.lng}&travelmode=${mode}`;
    Linking.openURL(url);
  };

  const handleCloseRoute = () => {
    setSelectedImss(null);
    setWalkingRoute(null);
    setTransitRoute(null);
    setTransitError(null);
  };

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

        {showImss && imssFacilities.map(facility => (
          <Marker
            key={facility.place_id}
            coordinate={{ latitude: facility.lat, longitude: facility.lng }}
            pinColor={selectedImss?.place_id === facility.place_id ? '#FF6F00' : '#0277BD'}
            onPress={() => handleImssPress(facility)}
            accessibilityLabel={`Hospital IMSS: ${facility.name}. Toca para ver ruta accesible.`}
          />
        ))}

        {walkingRoute && (
          <Polyline
            coordinates={walkingRoute.points}
            strokeColor="#611232"
            strokeWidth={5}
            lineDashPattern={[10, 6]}
            geodesic
          />
        )}
        {transitRoute && (
          <Polyline
            coordinates={transitRoute.points}
            strokeColor="#1565C0"
            strokeWidth={5}
            geodesic
          />
        )}
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

      {/* Tarjeta de hospital IMSS seleccionado */}
      {selectedImss && (
        <View style={styles.routeCard}>
          {/* Header: nombre + badges + cerrar */}
          <View style={styles.routeCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.routeCardTitle} numberOfLines={2}>{selectedImss.name}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                <View style={styles.a11yBadgesRow}>
                  {selectedImss.wheelchairEntrance && (
                    <View style={styles.a11yBadge}><Text style={styles.a11yBadgeText}>♿ Entrada</Text></View>
                  )}
                  {selectedImss.wheelchairParking && (
                    <View style={styles.a11yBadge}><Text style={styles.a11yBadgeText}>🅿️ Estacionamiento</Text></View>
                  )}
                  {selectedImss.wheelchairRestroom && (
                    <View style={styles.a11yBadge}><Text style={styles.a11yBadgeText}>🚻 Baño</Text></View>
                  )}
                  {!selectedImss.wheelchairEntrance && !selectedImss.wheelchairParking && !selectedImss.wheelchairRestroom && (
                    <View style={[styles.a11yBadge, { backgroundColor: '#eee' }]}>
                      <Text style={[styles.a11yBadgeText, { color: '#888' }]}>Sin datos de accesibilidad</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
            <Pressable onPress={handleCloseRoute} style={styles.closeBtnRoute} accessibilityLabel="Cerrar">
              <Text style={{ fontSize: 18, color: '#555' }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            style={styles.routeCardScroll}
          >
            {/* ─── Sección A PIE ─── */}
            <View style={styles.routeSection}>
              <View style={styles.routeSectionHeader}>
                <View style={[styles.routeModeDot, { backgroundColor: '#611232' }]} />
                <Text style={styles.routeSectionLabel}>A PIE</Text>
                {walkingRoute && !loadingRoute && (
                  <Pressable onPress={handleCalculateRoute} style={styles.recalcBtn} accessibilityLabel="Recalcular ruta a pie">
                    <Text style={styles.recalcBtnText}>↺ Recalcular</Text>
                  </Pressable>
                )}
              </View>

              {walkingRoute ? (
                <View style={styles.routeResultBox}>
                  <Text style={styles.routeResultMain}>🚶 {walkingRoute.durationText}</Text>
                  <Text style={styles.routeResultSub}>{walkingRoute.distanceText} · evita carreteras</Text>
                  <Pressable onPress={() => handleOpenInMaps('walking')} accessibilityLabel="Abrir ruta a pie en Google Maps">
                    <Text style={styles.openMapsLink}>Abrir en Google Maps ↗</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={[styles.routeBtn, { backgroundColor: '#611232' }, loadingRoute && { opacity: 0.7 }]}
                  onPress={handleCalculateRoute}
                  disabled={loadingRoute}
                  accessibilityLabel="Calcular ruta accesible a pie"
                  accessibilityState={{ busy: loadingRoute }}
                >
                  {loadingRoute
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.routeBtnText}>♿ Calcular ruta accesible</Text>
                  }
                </Pressable>
              )}
            </View>

            <View style={styles.sectionDivider} />

            {/* ─── Sección CAMIÓN ─── */}
            <View style={styles.routeSection}>
              <View style={styles.routeSectionHeader}>
                <View style={[styles.routeModeDot, { backgroundColor: '#1565C0' }]} />
                <Text style={styles.routeSectionLabel}>CAMIÓN</Text>
                {transitRoute && !loadingTransit && (
                  <Pressable onPress={handleCalculateTransit} style={styles.recalcBtn} accessibilityLabel="Recalcular ruta en camión">
                    <Text style={styles.recalcBtnText}>↺ Recalcular</Text>
                  </Pressable>
                )}
              </View>

              {transitRoute ? (
                <View>
                  <View style={styles.routeResultBox}>
                    <Text style={styles.routeResultMain}>🚌 {transitRoute.durationText}</Text>
                    <Text style={styles.routeResultSub}>
                      {transitRoute.distanceText}
                      {transitRoute.departureTime ? ` · Sale: ${transitRoute.departureTime}` : ''}
                    </Text>
                    <Pressable onPress={() => handleOpenInMaps('transit')} accessibilityLabel="Abrir ruta en transporte en Google Maps">
                      <Text style={styles.openMapsLink}>Abrir en Google Maps ↗</Text>
                    </Pressable>
                  </View>
                  {/* Pasos */}
                  {transitRoute.steps.map((step, i) => (
                    <View key={i} style={styles.transitStepRow}>
                      <Text style={styles.transitStepIcon}>{step.vehicleIcon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.transitStepText} numberOfLines={2}>
                          {step.travelMode === 'TRANSIT'
                            ? `${step.lineName}${step.headsign ? ` → ${step.headsign}` : ''}`
                            : step.instruction}
                        </Text>
                        <Text style={styles.transitStepSub}>
                          {step.numStops > 0
                            ? `${step.numStops} paradas · ${step.durationText}`
                            : `${step.durationText} · ${step.distanceText}`}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : transitError ? (
                <View style={styles.transitErrorBox}>
                  <Text style={styles.transitErrorText}>⚠️ {transitError}</Text>
                  <View style={styles.transitErrorActions}>
                    <Pressable
                      onPress={handleCalculateTransit}
                      style={styles.recalcBtn}
                      accessibilityLabel="Reintentar ruta en camión"
                    >
                      <Text style={styles.recalcBtnText}>↺ Reintentar</Text>
                    </Pressable>
                    <Pressable onPress={() => handleOpenInMaps('transit')} accessibilityLabel="Ver transporte en Google Maps">
                      <Text style={styles.openMapsLink}>Ver en Google Maps ↗</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={[styles.routeBtn, { backgroundColor: '#1565C0' }, loadingTransit && { opacity: 0.7 }]}
                  onPress={handleCalculateTransit}
                  disabled={loadingTransit}
                  accessibilityLabel="Calcular ruta en camión"
                  accessibilityState={{ busy: loadingTransit }}
                >
                  {loadingTransit
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.routeBtnText}>🚌 Cómo llegar en camión</Text>
                  }
                </Pressable>
              )}
            </View>

            {/* Footer: cerrar — removed; use ✕ in header */}
          </ScrollView>
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
        {walkingRoute && (
          <View style={styles.legendRow}>
            <View style={styles.legendDash} />
            <Text style={styles.legendLabel}>Ruta a pie</Text>
          </View>
        )}
        {transitRoute && (
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: '#1565C0' }]} />
            <Text style={styles.legendLabel}>Ruta camión</Text>
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
  // ─── Tarjeta de ruta ──────────────────────────────────────────────────────
  routeCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 28,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    gap: 10,
  },
  routeCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  routeCardTitle: { fontSize: 15, fontWeight: '700', color: '#222', flexShrink: 1 },
  a11yBadgesRow: { flexDirection: 'row', gap: 6 },
  a11yBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  a11yBadgeText: { fontSize: 11, color: '#2E7D32', fontWeight: '600' },
  closeBtnRoute: { padding: 4 },
  routeCardScroll: { maxHeight: 280 },
  routeSection: { paddingVertical: 8 },
  routeSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  routeSectionLabel: { fontSize: 11, fontWeight: '800', color: '#555', letterSpacing: 0.8, flex: 1 },
  routeModeDot: { width: 10, height: 10, borderRadius: 5 },
  recalcBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#bbb' },
  recalcBtnText: { fontSize: 11, color: '#555' },
  routeResultBox: { gap: 2, marginBottom: 4 },
  routeResultMain: { fontSize: 16, fontWeight: '700', color: '#222' },
  routeResultSub: { fontSize: 12, color: '#777' },
  openMapsLink: { fontSize: 12, color: '#1565C0', fontWeight: '700', marginTop: 4 },
  routeBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  routeBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sectionDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 4 },
  transitErrorBox: { backgroundColor: '#FFF3E0', borderRadius: 10, padding: 10, gap: 8 },
  transitErrorText: { fontSize: 12, color: '#E65100' },
  transitErrorActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  transitStepRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  transitStepIcon: { fontSize: 17, marginRight: 8, width: 24 },
  transitStepText: { fontSize: 13, color: '#333', fontWeight: '500' },
  transitStepSub: { fontSize: 11, color: '#888', marginTop: 1 },
  legendDash: { width: 16, height: 4, backgroundColor: '#611232', borderRadius: 2, opacity: 0.7 },
});
