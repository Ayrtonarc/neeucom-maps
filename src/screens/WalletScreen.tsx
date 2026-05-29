import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  addReward,
  getBalance,
  getHistory,
  getOrCreateAddress,
  spendTokens,
  type WalletTransaction,
} from '../services/wallet';

const PASAJE_COST = 5;

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// QR simulado — cuadrícula de bloques
function FakeQR({ code }: { code: string }) {
  return (
    <View style={styles.qrWrapper}>
      {/* esquinas */}
      <View style={[styles.qrCorner, { top: 0, left: 0 }]} />
      <View style={[styles.qrCorner, { top: 0, right: 0 }]} />
      <View style={[styles.qrCorner, { bottom: 0, left: 0 }]} />
      <View style={[styles.qrCorner, { bottom: 0, right: 0 }]} />
      {/* código */}
      <Text style={styles.qrCode}>{code}</Text>
      <Text style={styles.qrLabel}>Muestra este código al operador</Text>
    </View>
  );
}

export default function WalletScreen() {
  const [balance, setBalance] = useState<number | null>(null);
  const [history, setHistory] = useState<WalletTransaction[]>([]);
  const [address, setAddress] = useState('');
  const [qrModal, setQrModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const load = useCallback(async () => {
    const [bal, hist, addr] = await Promise.all([
      getBalance(),
      getHistory(),
      getOrCreateAddress(),
    ]);
    setBalance(bal);
    setHistory(hist);
    setAddress(addr);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Demo: botón para simular ganar tokens
  const handleSimulateEarn = async () => {
    await addReward('Reporte de prueba (demo)', 10);
    load();
  };

  const handleRedeem = async () => {
    if (balance === null || balance < PASAJE_COST) {
      Alert.alert(
        'Saldo insuficiente',
        `Necesitas al menos ${PASAJE_COST} NIUKOM para canjear un pasaje. Sigue reportando barreras para ganar más.`,
      );
      return;
    }
    setRedeeming(true);
    const ok = await spendTokens('Pasaje de camión canjeado', PASAJE_COST);
    setRedeeming(false);
    if (!ok) { Alert.alert('Error', 'No se pudo procesar el canje.'); return; }
    const code = `NIUKOM-${Date.now().toString(36).toUpperCase().slice(-8)}`;
    setQrCode(code);
    setQrModal(true);
    load();
  };

  const pasajes = balance !== null ? Math.floor(balance / PASAJE_COST) : 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>

      {/* ── Dirección simulada ── */}
      <View style={styles.addressRow}>
        <Text style={styles.addressIcon}>🔑</Text>
        <Text style={styles.addressText} numberOfLines={1}>
          {address ? shortAddr(address) : '…'}
        </Text>
        <View style={styles.networkBadge}>
          <Text style={styles.networkBadgeText}>Polygon (simulado)</Text>
        </View>
      </View>

      {/* ── Tarjeta de balance ── */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceCoin}>🪙</Text>
        {balance === null
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.balanceAmount}>{balance}</Text>
        }
        <Text style={styles.balanceLabel}>NIUKOM</Text>
        <Text style={styles.balanceSub}>
          {pasajes > 0
            ? `≈ ${pasajes} pasaje${pasajes !== 1 ? 's' : ''} de camión`
            : `Necesitas ${PASAJE_COST} NIUKOM para tu primer pasaje`}
        </Text>
      </View>

      {/* ── Acciones ── */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.redeemBtn, (balance ?? 0) < PASAJE_COST && styles.redeemBtnDisabled]}
          onPress={handleRedeem}
          disabled={redeeming || (balance ?? 0) < PASAJE_COST}
          accessibilityLabel={`Canjear un pasaje por ${PASAJE_COST} NIUKOM`}
          accessibilityRole="button"
        >
          {redeeming
            ? <ActivityIndicator color="#fff" />
            : <>
                <Text style={styles.redeemIcon}>🚌</Text>
                <Text style={styles.redeemText}>Canjear pasaje</Text>
                <Text style={styles.redeemCost}>{PASAJE_COST} NIUKOM</Text>
              </>
          }
        </Pressable>

        {/* Botón demo para simular ganancia */}
        <Pressable style={styles.demoBtn} onPress={handleSimulateEarn} accessibilityLabel="Simular ganar tokens (demo)">
          <Text style={styles.demoBtnText}>＋ Simular reporte (+10 NIUKOM)</Text>
        </Pressable>
      </View>

      {/* ── Cómo ganar ── */}
      <View style={styles.howCard}>
        <Text style={styles.howTitle}>¿Cómo ganas NIUKOM?</Text>
        <View style={styles.howRow}>
          <Text style={styles.howIcon}>📍</Text>
          <Text style={styles.howText}>Reportar una barrera</Text>
          <Text style={styles.howAmount}>+10</Text>
        </View>
        <View style={styles.howRow}>
          <Text style={styles.howIcon}>👍</Text>
          <Text style={styles.howText}>Votar en 3 reportes</Text>
          <Text style={styles.howAmount}>+5</Text>
        </View>
        <View style={styles.howRow}>
          <Text style={styles.howIcon}>✅</Text>
          <Text style={styles.howText}>Reporte verificado por la comunidad</Text>
          <Text style={styles.howAmount}>+15</Text>
        </View>
      </View>

      {/* ── Historial ── */}
      <Text style={styles.histTitle}>Historial</Text>
      {history.length === 0
        ? <Text style={styles.histEmpty}>Aún no tienes transacciones. ¡Reporta tu primera barrera!</Text>
        : history.map(tx => (
            <View key={tx.id} style={styles.txRow}>
              <Text style={styles.txIcon}>{tx.amount > 0 ? '⬆️' : '⬇️'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.txDesc}>{tx.description}</Text>
                <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
              </View>
              <Text style={[styles.txAmount, tx.amount > 0 ? styles.txPos : styles.txNeg]}>
                {tx.amount > 0 ? '+' : ''}{tx.amount} NK
              </Text>
            </View>
          ))
      }

      {/* ── Modal QR ── */}
      <Modal visible={qrModal} transparent animationType="fade" onRequestClose={() => setQrModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🎫 Pasaje generado</Text>
            <Text style={styles.modalSub}>Válido por 2 horas en cualquier ruta de Tijuana</Text>
            <FakeQR code={qrCode} />
            <Text style={styles.modalCostNote}>Se descontaron {PASAJE_COST} NIUKOM de tu saldo</Text>
            <Pressable style={styles.modalClose} onPress={() => setQrModal(false)}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const MAROON = '#611232';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },

  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addressIcon: { fontSize: 16 },
  addressText: { fontSize: 13, color: '#555', flex: 1, fontFamily: 'monospace' },
  networkBadge: { backgroundColor: '#E3F2FD', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  networkBadgeText: { fontSize: 10, color: '#1565C0', fontWeight: '700' },

  balanceCard: {
    backgroundColor: MAROON,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceCoin: { fontSize: 36, marginBottom: 4 },
  balanceAmount: { fontSize: 56, fontWeight: '900', color: '#fff', lineHeight: 64 },
  balanceLabel: { fontSize: 18, color: 'rgba(255,255,255,0.85)', fontWeight: '700', letterSpacing: 2 },
  balanceSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 6, textAlign: 'center' },

  actions: { gap: 10 },
  redeemBtn: {
    backgroundColor: '#1565C0',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  redeemBtnDisabled: { opacity: 0.4 },
  redeemIcon: { fontSize: 22 },
  redeemText: { fontSize: 16, color: '#fff', fontWeight: '700' },
  redeemCost: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },

  demoBtn: {
    borderWidth: 1.5,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  demoBtnText: { fontSize: 13, color: '#888', fontWeight: '600' },

  howCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10 },
  howTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 2 },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  howIcon: { fontSize: 18, width: 28 },
  howText: { fontSize: 13, color: '#555', flex: 1 },
  howAmount: { fontSize: 14, fontWeight: '700', color: '#388E3C' },

  histTitle: { fontSize: 14, fontWeight: '700', color: '#333' },
  histEmpty: { fontSize: 13, color: '#aaa', textAlign: 'center', paddingVertical: 20 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  txIcon: { fontSize: 20 },
  txDesc: { fontSize: 13, color: '#333', fontWeight: '500' },
  txDate: { fontSize: 11, color: '#aaa', marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800' },
  txPos: { color: '#388E3C' },
  txNeg: { color: '#D32F2F' },

  // Modal QR
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', alignItems: 'center', gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#333' },
  modalSub: { fontSize: 13, color: '#888', textAlign: 'center' },
  modalCostNote: { fontSize: 12, color: '#aaa' },
  modalClose: { backgroundColor: MAROON, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32, marginTop: 4 },
  modalCloseText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // QR simulado
  qrWrapper: {
    width: 180,
    height: 180,
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
  },
  qrCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#333',
    borderWidth: 4,
    borderRadius: 3,
    margin: 8,
  },
  qrCode: { fontSize: 15, fontFamily: 'monospace', fontWeight: '700', color: '#222', letterSpacing: 1 },
  qrLabel: { fontSize: 10, color: '#888', textAlign: 'center', paddingHorizontal: 16 },
});
