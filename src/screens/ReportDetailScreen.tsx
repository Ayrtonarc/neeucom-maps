import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types';
import { categoryInfo } from '../components/CategoryInfo';

type RouteType = RouteProp<RootStackParamList, 'ReportDetail'>;

export default function ReportDetailScreen() {
  const route = useRoute<RouteType>();
  const { report } = route.params;
  const info = categoryInfo[report.category];

  const date = new Date(report.createdAt).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View
        style={[styles.badge, { backgroundColor: info.color }]}
        accessible
        accessibilityLabel={`Tipo de barrera: ${info.label}`}
        accessibilityRole="text"
      >
        <Text style={styles.badgeEmoji}>{info.emoji}</Text>
        <Text style={styles.badgeLabel}>{info.label}</Text>
      </View>

      {report.photoUrl ? (
        <Image
          source={{ uri: report.photoUrl }}
          style={styles.photo}
          accessibilityLabel={`Foto de la barrera: ${info.label}`}
          accessibilityRole="image"
        />
      ) : (
        <View
          style={styles.noPhoto}
          accessible
          accessibilityLabel="Sin foto disponible"
        >
          <Text style={styles.noPhotoText}>Sin foto</Text>
        </View>
      )}

      <View style={styles.card} accessible accessibilityLabel={`Descripción: ${report.description || 'Sin descripción'}`}>
        <Text style={styles.cardTitle}>Descripción</Text>
        <Text style={styles.cardBody}>{report.description || 'Sin descripción.'}</Text>
      </View>

      <View style={styles.card} accessible accessibilityLabel={`Ubicación GPS: latitud ${report.latitude.toFixed(5)}, longitud ${report.longitude.toFixed(5)}`}>
        <Text style={styles.cardTitle}>Ubicación</Text>
        <Text style={styles.cardBody}>
          {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
        </Text>
      </View>

      <View style={styles.card} accessible accessibilityLabel={`Fecha de reporte: ${date}`}>
        <Text style={styles.cardTitle}>Fecha de reporte</Text>
        <Text style={styles.cardBody}>{date}</Text>
      </View>

      <View
        style={[styles.statusBadge, { backgroundColor: report.verified ? '#611232' : '#EA4335' }]}
        accessible
        accessibilityLabel={report.verified ? 'Estado: verificado por la comunidad' : 'Estado: pendiente de verificación'}
        accessibilityRole="text"
      >
        <Text style={styles.statusText}>
          {report.verified ? '✅ Verificado por la comunidad' : '🕒 Pendiente de verificación'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeEmoji: { fontSize: 20 },
  badgeLabel: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  photo: { width: '100%', height: 220, borderRadius: 14, resizeMode: 'cover' },
  noPhoto: {
    width: '100%',
    height: 120,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: { color: '#888', fontSize: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    gap: 6,
  },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#611232', textTransform: 'uppercase' },
  cardBody: { fontSize: 14, color: '#333', lineHeight: 20 },
  statusBadge: {
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  statusText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
