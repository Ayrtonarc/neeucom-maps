import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../types';

import MapScreen from '../screens/MapScreen';
import ReportScreen from '../screens/ReportScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import StatsScreen from '../screens/StatsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = { Mapa: '🗺️', Reportar: '📍' };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
      {icons[label] ?? '●'}
    </Text>
  );
}

function HamburgerButton() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <TouchableOpacity
      onPress={() => nav.navigate('Stats')}
      style={{ paddingHorizontal: 14, paddingVertical: 8 }}
      accessibilityLabel="Abrir estadísticas"
    >
      <Text style={{ fontSize: 20, color: '#fff' }}>☰</Text>
    </TouchableOpacity>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: '#611232',
        tabBarInactiveTintColor: '#888',
        headerStyle: { backgroundColor: '#611232' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarStyle: { paddingBottom: 6, height: 60 },
      })}
    >
      <Tab.Screen
        name="Mapa"
        component={MapScreen}
        options={{ title: 'Tijuana Sin Barreras', headerRight: () => <HamburgerButton /> }}
      />
      <Tab.Screen
        name="Reportar"
        component={ReportScreen}
        options={{ title: 'Reportar Barrera' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="Report"
          component={ReportScreen}
          options={{
            title: 'Nueva Barrera',
            headerStyle: { backgroundColor: '#611232' },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen
          name="Stats"
          component={StatsScreen}
          options={{
            title: 'Estadísticas',
            presentation: 'modal',
            headerStyle: { backgroundColor: '#611232' },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen
          name="ReportDetail"
          component={ReportDetailScreen}
          options={{
            title: 'Detalle del Reporte',
            headerStyle: { backgroundColor: '#611232' },
            headerTintColor: '#fff',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
