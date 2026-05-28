export type ReportCategory =
  | 'banqueta_rota'
  | 'sin_rampa'
  | 'obstaculo'
  | 'semaforo_sin_sonido'
  | 'otro';

export interface BarrierReport {
  id: string;
  category: ReportCategory;
  description: string;
  photoUrl: string | null;
  latitude: number;
  longitude: number;
  createdAt: number; // timestamp ms
  verified: boolean;
}

export type RootStackParamList = {
  Tabs: undefined;
  Report: { latitude: number; longitude: number } | undefined;
  ReportDetail: { report: BarrierReport };
};

export type TabParamList = {
  Mapa: undefined;
  Reportar: undefined;
};

export type MobilityProfile = 'wheelchair' | 'elderly' | 'stroller' | 'default';
