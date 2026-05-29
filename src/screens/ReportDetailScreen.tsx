import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types';
import { categoryInfo } from '../components/CategoryInfo';
import { voteOnReport } from '../services/firebase';
import { getUserVote, saveUserVote } from '../services/offlineCache';

type RouteType = RouteProp<RootStackParamList, 'ReportDetail'>;

export default function ReportDetailScreen() {
  const route = useRoute<RouteType>();
  const { report } = route.params;
  const info = categoryInfo[report.category];

  const [upvotes, setUpvotes] = useState(report.upvotes ?? 0);
  const [downvotes, setDownvotes] = useState(report.downvotes ?? 0);
  const [verified, setVerified] = useState(report.verified);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [voting, setVoting] = useState(false);
  const isMounted = React.useRef(true);

  useEffect(() => {
    isMounted.current = true;
    getUserVote(report.id).then(v => {
      if (isMounted.current) setUserVote(v);
    });
    return () => { isMounted.current = false; };
  }, [report.id]);

  const handleVote = async (vote: 'up' | 'down') => {
    if (userVote) {
      Alert.alert('Ya votaste', 'Solo puedes votar una vez por reporte.');
      return;
    }
    // Guardar el voto localmente de inmediato (fire-and-forget) para evitar
    // carrera con getUserVote si el usuario vuelve a abrir el reporte rápido
    saveUserVote(report.id, vote);
    setVoting(true);
    try {
      const result = await voteOnReport(report.id, vote);
      if (!isMounted.current) return; // componente desmontado, no actualizar estado
      setUpvotes(result.upvotes);
      setDownvotes(result.downvotes);
      setVerified(result.verified);
      setUserVote(vote);
      if (result.verified && !report.verified) {
        Alert.alert('✅ ¡Verificado!', 'Este reporte alcanzó 3 votos y ha sido verificado por la comunidad.');
      }
    } catch {
      if (isMounted.current) {
        Alert.alert('Error', 'No se pudo registrar tu voto. Revisa tu conexión.');
      }
    } finally {
      if (isMounted.current) setVoting(false);
    }
  };

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
        style={[styles.statusBadge, { backgroundColor: verified ? '#611232' : '#EA4335' }]}
        accessible
        accessibilityLabel={verified ? 'Estado: verificado por la comunidad' : 'Estado: pendiente de verificación'}
        accessibilityRole="text"
      >
        <Text style={styles.statusText}>
          {verified ? '✅ Verificado por la comunidad' : '🕒 Pendiente de verificación'}
        </Text>
      </View>

      {/* Votación comunitaria */}
      <View style={styles.voteCard}>
        <Text style={styles.voteTitle}>Verificación comunitaria</Text>
        <Text style={styles.voteSubtitle}>
          {userVote
            ? 'Ya votaste en este reporte.'
            : '¿Esta barrera sigue activa? Ayúda a la comunidad votando.'}
        </Text>
        <View style={styles.voteRow}>
          <Pressable
            style={[
              styles.voteBtn,
              styles.voteBtnUp,
              userVote === 'up' && styles.voteBtnActive,
              voting && { opacity: 0.6 },
            ]}
            onPress={() => handleVote('up')}
            disabled={voting || !!userVote}
            accessibilityRole="button"
            accessibilityLabel={`Votar que sigue activa. ${upvotes} votos`}
            accessibilityState={{ disabled: voting || !!userVote }}
          >
            {voting && userVote === null
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Text style={styles.voteBtnEmoji}>👍</Text>
                  <Text style={styles.voteBtnText}>Sigue activa</Text>
                  <Text style={styles.voteBtnCount}>{upvotes}</Text>
                </>
            }
          </Pressable>

          <Pressable
            style={[
              styles.voteBtn,
              styles.voteBtnDown,
              userVote === 'down' && styles.voteBtnActive,
              voting && { opacity: 0.6 },
            ]}
            onPress={() => handleVote('down')}
            disabled={voting || !!userVote}
            accessibilityRole="button"
            accessibilityLabel={`Votar que ya se resolvió. ${downvotes} votos`}
            accessibilityState={{ disabled: voting || !!userVote }}
          >
            <Text style={styles.voteBtnEmoji}>👎</Text>
            <Text style={styles.voteBtnText}>Ya se resolvió</Text>
            <Text style={styles.voteBtnCount}>{downvotes}</Text>
          </Pressable>
        </View>
        {upvotes < 3 && (
          <Text style={styles.voteHint}>
            {3 - upvotes} voto{3 - upvotes !== 1 ? 's' : ''} más para verificarse automáticamente
          </Text>
        )}
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
  voteCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    gap: 10,
  },
  voteTitle: { fontSize: 12, fontWeight: '700', color: '#611232', textTransform: 'uppercase' },
  voteSubtitle: { fontSize: 13, color: '#555' },
  voteRow: { flexDirection: 'row', gap: 10 },
  voteBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
    borderWidth: 2,
  },
  voteBtnUp: { borderColor: '#388E3C', backgroundColor: '#F1F8E9' },
  voteBtnDown: { borderColor: '#D32F2F', backgroundColor: '#FFEBEE' },
  voteBtnActive: { opacity: 0.55 },
  voteBtnEmoji: { fontSize: 20 },
  voteBtnText: { fontSize: 11, fontWeight: '600', color: '#333' },
  voteBtnCount: { fontSize: 18, fontWeight: '800', color: '#222' },
  voteHint: { fontSize: 11, color: '#888', textAlign: 'center' },
});
