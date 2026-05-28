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
      <View style={[styles.badge, { backgroundColor: info.color }]}>
        <Text style={styles.badgeEmoji}>{info.emoji}</Text>
        <Text style={styles.badgeLabel}>{info.label}</Text>
      </View>

      {report.photoUrl ? (
        <Image source={{ uri: report.photoUrl }} style={styles.photo} />
      ) : (
        <View style={styles.noPhoto}>
          <Text style={styles.noPhotoText}>Sin foto</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Descripción</Text>
        <Text style={styles.cardBody}>{report.description || 'Sin descripción.'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ubicación</Text>
        <Text style={styles.cardBody}>
          {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fecha de reporte</Text>
        <Text style={styles.cardBody}>{date}</Text>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: report.verified ? '#1A73E8' : '#EA4335' }]}>
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
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#1A73E8', textTransform: 'uppercase' },
  cardBody: { fontSize: 14, color: '#333', lineHeight: 20 },
  statusBadge: {
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  statusText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
