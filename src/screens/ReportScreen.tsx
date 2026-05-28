import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';

import { createReport } from '../services/firebase';
import { classifyBarrierPhoto } from '../services/gemini';
import { categories } from '../components/CategoryInfo';
import type { ReportCategory, RootStackParamList } from '../types';

type RouteType = RouteProp<RootStackParamList, 'Report'>;

export default function ReportScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();

  const prefillLat = route.params?.latitude;
  const prefillLng = route.params?.longitude;

  const [category, setCategory] = useState<ReportCategory>('banqueta_rota');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [latitude, setLatitude] = useState<number>(prefillLat ?? 32.5049);
  const [longitude, setLongitude] = useState<number>(prefillLng ?? -117.0038);
  const [locating, setLocating] = useState(!prefillLat);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    // Si el usuario ya eligió un punto en el mapa, usarlo directamente
    if (prefillLat && prefillLng) {
      setLatitude(prefillLat);
      setLongitude(prefillLng);
      return;
    }
    // watchPosition es más confiable que getCurrentPosition en Android físico
    const watchId = Geolocation.watchPosition(
      pos => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocating(false);
        Geolocation.clearWatch(watchId);
      },
      err => {
        setLocating(false);
        Alert.alert(
          '⚠️ No se pudo obtener tu ubicación',
          `Error GPS: ${err.message}.\n\nPuedes volver al mapa, mantener presionado el punto exacto y se abrirá el formulario con esa ubicación.`,
          [{ text: 'Entendido' }],
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000, distanceFilter: 0 },
    );
    return () => Geolocation.clearWatch(watchId);
  }, [prefillLat, prefillLng]);

  const pickPhoto = () => {
    Alert.alert('Agregar foto', 'Elige una opción', [
      {
        text: 'Cámara',
        onPress: () =>
          launchCamera({ mediaType: 'photo', quality: 0.7 }, res => {
            if (res.assets?.[0]?.uri) handlePhotoSelected(res.assets[0].uri!);
          }),
      },
      {
        text: 'Galería',
        onPress: () =>
          launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, res => {
            if (res.assets?.[0]?.uri) handlePhotoSelected(res.assets[0].uri!);
          }),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handlePhotoSelected = async (uri: string) => {
    setPhotoUri(uri);
    setAnalyzing(true);
    try {
      const suggested = await classifyBarrierPhoto(uri);
      if (suggested && suggested !== category) {
        Alert.alert(
          '🤖 Gemini sugiere',
          `Parece una barrera de tipo "${categories.find(c => c.value === suggested)?.label}". ¿Deseas usar esta categoría?`,
          [
            { text: 'Sí, usar', onPress: () => setCategory(suggested) },
            { text: 'No, mantener', style: 'cancel' },
          ],
        );
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Descripción requerida', 'Por favor describe brevemente el problema.');
      return;
    }
    setSubmitting(true);
    try {
      await createReport({
        category,
        description: description.trim(),
        latitude,
        longitude,
        photoLocalUri: photoUri ?? undefined,
      });
      Alert.alert('¡Gracias!', 'Reporte enviado con éxito. Ayudas a mejorar Tijuana.', [
        { text: 'Ver en mapa', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', 'No se pudo enviar el reporte. Revisa tu conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Tipo de barrera</Text>
        <View style={styles.categoryGrid}>
          {categories.map(cat => (
            <Pressable
              key={cat.value}
              style={[
                styles.categoryChip,
                category === cat.value && { backgroundColor: cat.color, borderColor: cat.color },
              ]}
              onPress={() => setCategory(cat.value)}
              accessibilityRole="radio"
              accessibilityLabel={`${cat.label}`}
              accessibilityHint={`Seleccionar tipo de barrera: ${cat.label}`}
              accessibilityState={{ selected: category === cat.value }}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text
                style={[
                  styles.categoryLabel,
                  category === cat.value && { color: '#fff' },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Descripción</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: La banqueta está completamente destruida y no se puede pasar con silla de ruedas."
          placeholderTextColor="#aaa"
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
          maxLength={300}
          accessibilityLabel="Descripción de la barrera"
          accessibilityHint="Describe brevemente el problema de accesibilidad. Máximo 300 caracteres"
        />
        <Text style={styles.charCount}>{description.length}/300</Text>

        <Text style={styles.sectionTitle}>Foto (opcional)</Text>
        <Pressable
          style={styles.photoButton}
          onPress={pickPhoto}
          disabled={analyzing}
          accessibilityRole="button"
          accessibilityLabel={photoUri ? 'Cambiar foto' : 'Agregar foto'}
          accessibilityHint={analyzing ? 'Gemini está analizando la imagen' : 'Abre cámara o galería. Gemini clasificará la barrera automáticamente'}
          accessibilityState={{ disabled: analyzing, busy: analyzing }}
        >
          {photoUri ? (
            <>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              {analyzing && (
                <View style={styles.analyzingOverlay}>
                  <ActivityIndicator color="#fff" size="large" />
                  <Text style={styles.analyzingText}>Analizando con Gemini...</Text>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={styles.photoIcon}>📷</Text>
              <Text style={styles.photoHint}>Toca para agregar foto</Text>
              <Text style={styles.photoHint2}>Gemini clasificará automáticamente</Text>
            </>
          )}
        </Pressable>

        <Text
          style={styles.locationNote}
          accessibilityLabel={locating ? 'Obteniendo ubicación GPS' : `Ubicación: latitud ${latitude.toFixed(5)}, longitud ${longitude.toFixed(5)}`}
          accessibilityLiveRegion="polite"
        >
          {locating
            ? '📍 Obteniendo ubicación GPS... (puede tardar unos segundos)'
            : `📍 ${prefillLat ? 'Punto del mapa' : 'GPS'}: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
        </Text>

        <Pressable
          style={[styles.submitButton, (submitting || locating) && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting || locating}
          accessibilityRole="button"
          accessibilityLabel={locating ? 'Esperando GPS...' : 'Enviar reporte'}
          accessibilityHint="Guarda el reporte en el mapa para que otros usuarios lo vean"
          accessibilityState={{ disabled: submitting || locating, busy: submitting }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : locating ? (
            <Text style={styles.submitText}>📍 Obteniendo GPS...</Text>
          ) : (
            <Text style={styles.submitText}>Enviar reporte</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  content: { padding: 20, paddingBottom: 40, gap: 8 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#611232',
    marginTop: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  categoryEmoji: { fontSize: 16 },
  categoryLabel: { fontSize: 13, color: '#444', fontWeight: '500' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    fontSize: 14,
    color: '#222',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  charCount: { fontSize: 11, color: '#aaa', textAlign: 'right' },
  photoButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoIcon: { fontSize: 36, marginBottom: 6 },
  photoHint: { fontSize: 13, color: '#aaa' },
  photoHint2: { fontSize: 11, color: '#bbb', marginTop: 2 },
  photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  analyzingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  analyzingText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  locationNote: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f9e8ed',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#611232',
    borderRadius: 12,
    paddingVertical: 16,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    elevation: 3,
  },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
