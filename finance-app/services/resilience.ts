import AsyncStorage from '@react-native-async-storage/async-storage';

import { Dashboard } from '@/services/api';

const DASHBOARD_CACHE_KEY = 'finance.dashboard.cache.v1';

export type DashboardCache = {
  cachedAt: string;
  dashboard: Dashboard;
};

export async function cacheDashboard(dashboard: Dashboard) {
  const item: DashboardCache = {
    cachedAt: new Date().toISOString(),
    dashboard,
  };
  await AsyncStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(item));
  return item;
}

export async function getCachedDashboard() {
  const raw = await AsyncStorage.getItem(DASHBOARD_CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as DashboardCache;
    if (!parsed?.dashboard || !parsed.cachedAt) return null;
    return parsed;
  } catch {
    await AsyncStorage.removeItem(DASHBOARD_CACHE_KEY);
    return null;
  }
}

export function formatCachedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  return date.toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}
