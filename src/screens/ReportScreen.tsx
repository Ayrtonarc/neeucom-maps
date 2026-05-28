import React, { useState } from 'react';
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

import { createReport } from '../services/firebase';
import { categories } from '../components/CategoryInfo';
import type { ReportCategory, RootStackParamList } from '../types';

type RouteType = RouteProp<RootStackParamList, 'Report'>;

export default function ReportScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();

  const prefillLat = route.params?.latitude ?? 32.5049;
  const prefillLng = route.params?.longitude ?? -117.0038;

  const [category, setCategory] = useState<ReportCategory>('banqueta_rota');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickPhoto = () => {
    Alert.alert('Agregar foto', 'Elige una opción', [
      {
        text: 'Cámara',
        onPress: () =>
          launchCamera({ mediaType: 'photo', quality: 0.7 }, res => {
            if (res.assets?.[0]?.uri) setPhotoUri(res.assets[0].uri!);
          }),
      },
      {
        text: 'Galería',
        onPress: () =>
          launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, res => {
            if (res.assets?.[0]?.uri) setPhotoUri(res.assets[0].uri!);
          }),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
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
        latitude: prefillLat,
        longitude: prefillLng,
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
        />
        <Text style={styles.charCount}>{description.length}/300</Text>

        <Text style={styles.sectionTitle}>Foto (opcional)</Text>
        <Pressable style={styles.photoButton} onPress={pickPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <>
              <Text style={styles.photoIcon}>📷</Text>
              <Text style={styles.photoHint}>Toca para agregar foto</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.locationNote}>
          📍 Ubicación: {prefillLat.toFixed(5)}, {prefillLng.toFixed(5)}
        </Text>

        <Pressable
          style={[styles.submitButton, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
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
    color: '#1A73E8',
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
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
  photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  locationNote: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#e8f0fe',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#1A73E8',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    elevation: 3,
  },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
