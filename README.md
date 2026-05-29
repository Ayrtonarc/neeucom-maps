# NiukomMaps 🗺️

App móvil de reporte participativo de barreras de accesibilidad urbana en Tijuana, desarrollada para el hackathon **Tijuana Sin Barreras**.

> **Niukom** proviene del kumeyaay, lengua originaria de la región de Tijuana/San Diego, y significa "camino".

---

## ¿Qué hace?

NiukomMaps permite a cualquier persona reportar obstáculos urbanos (banquetas rotas, rampas obstruidas, semáforos sin sonido, etc.) directamente desde su teléfono. Los reportes aparecen en tiempo real en un mapa compartido para que toda la comunidad pueda verlos, votarlos y consultarlos sin conexión.

### Funcionalidades

| Función | Descripción |
|---------|-------------|
| 🗺️ Mapa en tiempo real | Marcadores por categoría actualizados vía Firestore (rojo = sin verificar, azul = verificado) |
| 📍 Reporte con GPS | Ubica la barrera automáticamente o con long-press en el mapa |
| 📸 Foto + IA | Sube una foto y Gemini 2.5 Flash clasifica automáticamente el tipo de barrera |
| 👍👎 Votación comunitaria | Los usuarios pueden votar si una barrera sigue activa o ya se resolvió; votos guardados localmente para evitar duplicados |
| ♿ Hospitales IMSS accesibles | Capa de hospitales IMSS en Tijuana con datos de accesibilidad (rampa, baño, estacionamiento) |
| 🚶 Ruta a pie | Calcula y dibuja la ruta caminando más corta hasta el hospital seleccionado |
| 🚌 Ruta en camión | Calcula y dibuja la ruta en transporte público (camión) con pasos detallados y horarios |
| 📊 Estadísticas de impacto | Total de reportes, distribución por categoría y top 3 zonas con más barreras (reverse geocoding) |
| 📵 Modo offline | Caché local con AsyncStorage; reportes creados sin conexión se sincronizan automáticamente al recuperarla |
| 📍 Banner GPS | Detecta si el GPS falla y muestra aviso con instrucción para el usuario |
| ♿ Accesibilidad TalkBack | Toda la app está etiquetada para lectores de pantalla (TalkBack en Android) |

### Categorías de barreras

- Banqueta rota / obstruida
- Rampa en mal estado o ausente
- Semáforo sin señal sonora
- Estacionamiento indebido en zona accesible
- Otro obstáculo

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | React Native 0.85.3 (TypeScript, New Architecture) |
| Mapas | react-native-maps v1.27.2 con Google Maps API + Directions API |
| Base de datos | Firebase Firestore (tiempo real) |
| Almacenamiento | Firebase Storage (fotos) |
| Visión IA | Google Gemini 2.5 Flash (`@google/generative-ai`) |
| Navegación | React Navigation — bottom tabs + native stack + modal |
| Cámara | react-native-image-picker v8 |
| Geolocalización | @react-native-community/geolocation |
| Conectividad | @react-native-community/netinfo |
| Caché offline | @react-native-async-storage/async-storage |

---

## Requisitos previos

- **Node.js** >= 22
- **Java JDK** 17
- **Android Studio** con Android SDK (API 33+)
- Emulador Android o dispositivo físico conectado
- Cuentas con claves API (ver sección Configuración)

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/Ayrtonarc/neeucom-maps.git
cd neeucom-maps

# 2. Instalar dependencias JS
npm install

# 3. Configurar claves secretas (ver sección siguiente)
```

---

## Configuración de claves API

Este proyecto usa claves externas que **no están en el repositorio** por seguridad. Necesitas crearlas manualmente.

### 1. Claves JS (Gemini + Firebase)

Crea el archivo `src/config/secrets.ts` (ya está en `.gitignore`):

```ts
// src/config/secrets.ts
export const GEMINI_API_KEY = 'TU_GEMINI_API_KEY';
export const GOOGLE_MAPS_API_KEY = 'TU_GOOGLE_MAPS_API_KEY';

export const FIREBASE_CONFIG = {
  apiKey: 'TU_FIREBASE_API_KEY',
  authDomain: 'TU_PROYECTO.firebaseapp.com',
  projectId: 'TU_PROYECTO',
  storageBucket: 'TU_PROYECTO.firebasestorage.app',
  messagingSenderId: 'TU_SENDER_ID',
  appId: 'TU_APP_ID',
};
```

Usa `src/config/secrets.example.ts` como referencia.

### 2. Clave de mapas para Android (build nativo)

Añade tu clave en `android/local.properties` (ya está en `.gitignore`):

```properties
sdk.dir=/Users/TU_USUARIO/Library/Android/sdk
GOOGLE_MAPS_API_KEY=TU_GOOGLE_MAPS_API_KEY
```

### 3. Google Services (Firebase nativo)

Descarga `google-services.json` desde Firebase Console y colócalo en:
```
android/app/google-services.json
```

---

## Ejecutar la app

```bash
# Variables de entorno recomendadas (agregar a ~/.zshrc)
export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/platform-tools:$PATH"

# Iniciar emulador (AVD llamado Small_Phone)
~/Library/Android/sdk/emulator/emulator -avd Small_Phone

# En otra terminal: iniciar Metro
npx react-native start

# En otra terminal: compilar e instalar en Android
npx react-native run-android

# Dispositivo físico específico
npx react-native run-android --deviceId TU_DEVICE_ID
```

---

## Estructura del proyecto

```
src/
├── config/
│   ├── index.ts                # Re-exporta claves + constantes (región inicial Tijuana)
│   ├── secrets.ts              # 🔒 GITIGNORED — claves API reales
│   └── secrets.example.ts      # Plantilla pública de secrets.ts
├── navigation/
│   └── AppNavigator.tsx        # Bottom tabs (Mapa / Reportar) + stack + hamburger → Stats
├── screens/
│   ├── MapScreen.tsx           # Mapa principal, marcadores, capa IMSS, rutas, GPS
│   ├── ReportScreen.tsx        # Formulario de reporte (GPS + Gemini + cola offline)
│   ├── ReportDetailScreen.tsx  # Detalle de reporte + votación comunitaria
│   └── StatsScreen.tsx         # Estadísticas: totales, por categoría, top zonas
├── services/
│   ├── firebase.ts             # Firestore + Storage (upload, create, subscribe, vote)
│   ├── gemini.ts               # Clasificación automática de fotos con Gemini Vision
│   ├── directions.ts           # Google Directions API (walking + transit routes)
│   └── offlineCache.ts         # AsyncStorage: caché de reportes, cola offline, votos
└── types/
    └── index.ts                # Tipos TypeScript compartidos (BarrierReport, ImssFacility…)
```

---

## Accesibilidad

La app implementa soporte completo para **TalkBack** (lector de pantalla de Android):

- Todos los botones tienen `accessibilityRole`, `accessibilityLabel` y `accessibilityHint`
- Los chips de categoría usan `role="radio"` con estado `selected`
- Los marcadores del mapa son accesibles con descripción de categoría y estado de verificación
- La ubicación GPS usa `accessibilityLiveRegion="polite"` para anunciarse al cambiar
- El botón de foto indica `busy: true` mientras Gemini analiza la imagen
- Los botones de voto reflejan `accessibilityState.disabled` tras votar

Para activar TalkBack en el emulador: **Configuración → Accesibilidad → TalkBack → Activar**

---

## Firebase — Reglas de Firestore

Para desarrollo/demo, las reglas permiten acceso libre:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ Cambiar a reglas con autenticación antes de producción.

---

## Depuración

```bash
# Ver logs del dispositivo
adb logcat | grep -i niukom

# Reiniciar Metro con caché limpio
npx react-native start --reset-cache

# Limpiar build de Android
cd android && ./gradlew clean && cd ..

# Verificar que la app está corriendo
adb shell pidof com.niukommaps

# Listar dispositivos conectados
adb devices
```

---

## Hackathon

Este proyecto fue creado para el hackathon **Tijuana Sin Barreras**, enfocado en soluciones tecnológicas para mejorar la accesibilidad urbana en Tijuana, Baja California.

**Repositorio:** [github.com/Ayrtonarc/neeucom-maps](https://github.com/Ayrtonarc/neeucom-maps)


App móvil de reporte participativo de barreras de accesibilidad urbana en Tijuana, desarrollada para el hackathon **Tijuana Sin Barreras**.

> **Niukom** proviene del kumeyaay, lengua originaria de la región de Tijuana/San Diego, y significa "camino".

---

## ¿Qué hace?

NiukomMaps permite a cualquier persona reportar obstáculos urbanos (banquetas rotas, rampas obstruidas, semáforos sin sonido, etc.) directamente desde su teléfono. Los reportes aparecen en tiempo real en un mapa compartido para que toda la comunidad pueda verlos.

### Funcionalidades principales

| Función | Descripción |
|---------|-------------|
| 🗺️ Mapa en tiempo real | Visualiza reportes activos con marcadores por categoría (rojo = sin verificar, azul = verificado) |
| 📍 Reporte con GPS | Ubica la barrera automáticamente con coordenadas GPS reales |
| 📸 Foto + IA | Sube una foto y Gemini Vision 1.5 Flash clasifica automáticamente el tipo de barrera |
| ♿ Accesibilidad TalkBack | Toda la app está etiquetada para lectores de pantalla (TalkBack en Android) |
| ☁️ Firebase en la nube | Los reportes se sincronizan en tiempo real vía Firestore + Storage |

### Categorías de barreras

- Banqueta rota / obstruida
- Rampa en mal estado o ausente
- Semáforo sin señal sonora
- Estacionamiento indebido en zona accesible
- Otro obstáculo

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | React Native 0.85.3 (TypeScript, New Architecture) |
| Mapas | react-native-maps con Google Maps API |
| Base de datos | Firebase Firestore (tiempo real) |
| Almacenamiento | Firebase Storage (fotos) |
| Visión IA | Google Gemini 1.5 Flash (`@google/generative-ai`) |
| Navegación | React Navigation (bottom tabs + native stack) |
| Cámara | react-native-image-picker v8 |
| Geolocalización | @react-native-community/geolocation |

---

## Requisitos previos

- **Node.js** >= 22
- **Java JDK** 17
- **Android Studio** con Android SDK (API 33+)
- Emulador Android o dispositivo físico conectado
- Cuentas con claves API (ver sección Configuración)

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/Ayrtonarc/neeucom-maps.git
cd neeucom-maps

# 2. Instalar dependencias JS
npm install

# 3. Configurar claves secretas (ver sección siguiente)
```

---

## Configuración de claves API

Este proyecto usa claves externas que **no están en el repositorio** por seguridad. Necesitas crearlas manualmente.

### 1. Claves JS (Gemini + Firebase)

Crea el archivo `src/config/secrets.ts` (ya está en `.gitignore`):

```ts
// src/config/secrets.ts
export const GEMINI_API_KEY = 'TU_GEMINI_API_KEY';
export const GOOGLE_MAPS_API_KEY = 'TU_GOOGLE_MAPS_API_KEY';

export const FIREBASE_CONFIG = {
  apiKey: 'TU_FIREBASE_API_KEY',
  authDomain: 'TU_PROYECTO.firebaseapp.com',
  projectId: 'TU_PROYECTO',
  storageBucket: 'TU_PROYECTO.firebasestorage.app',
  messagingSenderId: 'TU_SENDER_ID',
  appId: 'TU_APP_ID',
};
```

Usa `src/config/secrets.example.ts` como referencia.

### 2. Clave de mapas para Android (build nativo)

Añade tu clave en `android/local.properties` (ya está en `.gitignore`):

```properties
sdk.dir=/Users/TU_USUARIO/Library/Android/sdk
GOOGLE_MAPS_API_KEY=TU_GOOGLE_MAPS_API_KEY
```

### 3. Google Services (Firebase nativo)

Descarga `google-services.json` desde Firebase Console y colócalo en:
```
android/app/google-services.json
```

---

## Ejecutar la app

```bash
# Variables de entorno recomendadas (agregar a ~/.zshrc)
export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/platform-tools:$PATH"

# Iniciar emulador (AVD llamado Small_Phone)
~/Library/Android/sdk/emulator/emulator -avd Small_Phone

# En otra terminal: iniciar Metro
npx react-native start

# En otra terminal: compilar e instalar en Android
npx react-native run-android
```

---

## Estructura del proyecto

```
src/
├── config/
│   ├── index.ts            # Re-exporta claves + constantes (región inicial Tijuana)
│   ├── secrets.ts          # 🔒 GITIGNORED — claves API reales
│   └── secrets.example.ts  # Plantilla pública de secrets.ts
├── navigation/
│   └── AppNavigator.tsx    # Bottom tabs (Mapa / Reportar) + stack
├── screens/
│   ├── MapScreen.tsx       # Mapa principal con marcadores en tiempo real
│   ├── ReportScreen.tsx    # Formulario de reporte (GPS + Gemini)
│   └── ReportDetailScreen.tsx  # Vista de detalle de un reporte
├── services/
│   ├── firebase.ts         # Firestore + Storage (upload, create, subscribe)
│   └── gemini.ts           # Clasificación automática de fotos con Gemini Vision
└── types/
    └── index.ts            # Tipos TypeScript compartidos (Report, ReportCategory…)
```

---

## Accesibilidad

La app implementa soporte completo para **TalkBack** (lector de pantalla de Android):

- Todos los botones tienen `accessibilityRole`, `accessibilityLabel` y `accessibilityHint`
- Los chips de categoría usan `role="radio"` con estado `selected`
- Los marcadores del mapa son accesibles con descripción de categoría y estado de verificación
- La ubicación GPS usa `accessibilityLiveRegion="polite"` para anunciarse al cambiar
- El botón de foto indica `busy: true` mientras Gemini analiza la imagen

Para activar TalkBack en el emulador: **Configuración → Accesibilidad → TalkBack → Activar**

---

## Firebase — Reglas de Firestore

Para desarrollo/demo, las reglas permiten acceso libre:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ Cambiar a reglas con autenticación antes de producción.

---

## Depuración

```bash
# Ver logs del emulador
adb logcat | grep -i niukom

# Reiniciar Metro con caché limpio
npx react-native start --reset-cache

# Limpiar build de Android
cd android && ./gradlew clean && cd ..

# Verificar que la app está corriendo
adb shell pidof com.niukommaps
```

---

## Hackathon

Este proyecto fue creado para el hackathon **Tijuana Sin Barreras**, enfocado en soluciones tecnológicas para mejorar la accesibilidad urbana en Tijuana, Baja California.

**Repositorio:** [github.com/Ayrtonarc/neeucom-maps](https://github.com/Ayrtonarc/neeucom-maps)
