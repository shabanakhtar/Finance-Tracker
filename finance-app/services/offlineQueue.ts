import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import { Transaction, addTransaction } from '@/services/api';

const QUEUE_KEY = 'finance.offline.transactions.v1';

export type QueuedTransaction = Transaction & {
  localId: string;
  queuedAt: string;
};

export function isLikelyNetworkError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('timeout') ||
    message.includes('backend unavailable')
  );
}

export async function isOnline() {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

export async function getQueuedTransactions() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedTransaction[]) : [];
  } catch {
    await AsyncStorage.removeItem(QUEUE_KEY);
    return [];
  }
}

async function saveQueue(items: QueuedTransaction[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function queueTransaction(transaction: Transaction) {
  const current = await getQueuedTransactions();
  const item: QueuedTransaction = {
    ...transaction,
    localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    queuedAt: new Date().toISOString(),
  };
  await saveQueue([...current, item]);
  return item;
}

export async function syncQueuedTransactions() {
  if (!(await isOnline())) {
    return { synced: 0, remaining: await getQueuedTransactions(), online: false };
  }

  const queue = await getQueuedTransactions();
  const remaining: QueuedTransaction[] = [];
  let synced = 0;

  for (let index = 0; index < queue.length; index += 1) {
    const item = queue[index];
    try {
      await addTransaction({
        amount: item.amount,
        category: item.category,
        date: item.date,
        notes: item.notes,
        type: item.type,
      });
      synced += 1;
    } catch (error) {
      remaining.push(item, ...queue.slice(index + 1));
      if (!isLikelyNetworkError(error)) {
        continue;
      }
      break;
    }
  }

  await saveQueue(remaining);
  return { synced, remaining, online: true };
}
