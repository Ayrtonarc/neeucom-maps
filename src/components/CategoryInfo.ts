import type { ReportCategory } from '../types';

export const categoryInfo: Record<
  ReportCategory,
  { label: string; emoji: string; color: string }
> = {
  banqueta_rota: { label: 'Banqueta rota', emoji: '🚧', color: '#F9A825' },
  sin_rampa:     { label: 'Sin rampa',     emoji: '♿', color: '#E53935' },
  obstaculo:     { label: 'Obstáculo',     emoji: '⛔', color: '#FB8C00' },
  semaforo_sin_sonido: { label: 'Semáforo sin sonido', emoji: '🔇', color: '#8E24AA' },
  otro:          { label: 'Otro',          emoji: '📌', color: '#546E7A' },
};

export const categories = Object.entries(categoryInfo).map(([value, info]) => ({
  value: value as ReportCategory,
  ...info,
}));
