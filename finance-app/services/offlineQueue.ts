import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import { Transaction, addTransaction } from '@/services/api';

const QUEUE_KEY = 'finance.offline.transactions.v1';
const SYNC_HISTORY_KEY = 'finance.offline.syncHistory.v1';

export type QueuedTransaction = Transaction & {
  localId: string;
  queuedAt: string;
};

export type SyncHistoryItem = {
  at: string;
  message: string;
  status: 'success' | 'partial' | 'offline' | 'failed';
};

export function isLikelyNetworkError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('timeout') ||
    message.includes('backend unavailable') ||
    message.includes('could not reach the backend') ||
    message.includes('taking too long')
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

export async function getSyncHistory() {
  const raw = await AsyncStorage.getItem(SYNC_HISTORY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SyncHistoryItem[]) : [];
  } catch {
    await AsyncStorage.removeItem(SYNC_HISTORY_KEY);
    return [];
  }
}

async function recordSyncHistory(item: SyncHistoryItem) {
  const current = await getSyncHistory();
  await AsyncStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify([item, ...current].slice(0, 8)));
}

export async function queueTransaction(transaction: Transaction) {
  const current = await getQueuedTransactions();
  const item: QueuedTransaction = {
    ...transaction,
    localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    queuedAt: new Date().toISOString(),
  };
  await saveQueue([...current, item]);
  await recordSyncHistory({
    at: item.queuedAt,
    message: `${transaction.type === 'income' ? 'Income' : 'Expense'} queued: ${transaction.category}.`,
    status: 'offline',
  });
  return item;
}

export async function syncQueuedTransactions() {
  if (!(await isOnline())) {
    const remaining = await getQueuedTransactions();
    await recordSyncHistory({
      at: new Date().toISOString(),
      message: `${remaining.length} transaction${remaining.length === 1 ? '' : 's'} still waiting for internet.`,
      status: 'offline',
    });
    return { synced: 0, remaining, online: false };
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
      break;
    }
  }

  await saveQueue(remaining);
  if (synced > 0 || remaining.length > 0) {
    const failed = synced === 0 && remaining.length > 0;
    await recordSyncHistory({
      at: new Date().toISOString(),
      message: failed
        ? 'Sync could not complete. Your queued transactions are still saved on this device.'
        : remaining.length
        ? `${synced} synced, ${remaining.length} still waiting.`
        : `${synced} offline transaction${synced === 1 ? '' : 's'} synced.`,
      status: failed ? 'failed' : remaining.length ? 'partial' : 'success',
    });
  }
  return { synced, remaining, online: true };
}
