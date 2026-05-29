import AsyncStorage from '@react-native-async-storage/async-storage';

const BALANCE_KEY = '@niukom:wallet_balance';
const HISTORY_KEY = '@niukom:wallet_history';
const ADDRESS_KEY = '@niukom:wallet_address';

export interface WalletTransaction {
  id: string;
  amount: number;       // positivo = ganado, negativo = gastado
  description: string;
  createdAt: number;    // timestamp ms
}

// Genera una dirección simulada tipo Ethereum y la persiste
export async function getOrCreateAddress(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(ADDRESS_KEY);
    if (stored) return stored;
    const hex = Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
    const addr = `0x${hex}`;
    await AsyncStorage.setItem(ADDRESS_KEY, addr);
    return addr;
  } catch {
    return '0x0000000000000000000000000000000000000000';
  }
}

export async function getBalance(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(BALANCE_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

export async function getHistory(): Promise<WalletTransaction[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as WalletTransaction[]) : [];
  } catch {
    return [];
  }
}

async function appendHistory(tx: WalletTransaction): Promise<void> {
  const history = await getHistory();
  history.unshift(tx); // más reciente primero
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

export async function addReward(description: string, amount: number = 10): Promise<void> {
  try {
    const current = await getBalance();
    await AsyncStorage.setItem(BALANCE_KEY, String(current + amount));
    await appendHistory({
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      amount,
      description,
      createdAt: Date.now(),
    });
  } catch {}
}

// Devuelve false si no hay saldo suficiente
export async function spendTokens(description: string, amount: number): Promise<boolean> {
  try {
    const current = await getBalance();
    if (current < amount) return false;
    await AsyncStorage.setItem(BALANCE_KEY, String(current - amount));
    await appendHistory({
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      amount: -amount,
      description,
      createdAt: Date.now(),
    });
    return true;
  } catch {
    return false;
  }
}
