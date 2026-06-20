import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

const fallbackBaseUrl = Platform.select({
  android: 'http://10.0.2.2:8000',
  default: 'http://127.0.0.1:8000',
});

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? fallbackBaseUrl;

export type Summary = {
  income: number;
  expense: number;
  balance: number;
};

export type Transaction = {
  amount: number;
  category: string;
  type: 'income' | 'expense';
  date: string;
};

export type Dashboard = {
  summary: Summary;
  categories: Record<string, { income: number; expense: number }>;
  monthly: Record<string, { income: number; expense: number }>;
  top_categories: [string, number][];
  breakdown: Record<string, number>;
  recent_transactions: Transaction[];
  insights: string[];
  recurring: string[];
  warnings: string[];
  financial_score: number;
  transaction_count: number;
};

type ApiResponse<T> = {
  status: string;
  data: T;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  const body = await response.json();

  if (!response.ok || body.status === 'error') {
    throw new Error(body.detail?.message ?? body.message ?? 'Request failed');
  }

  return (body as ApiResponse<T>).data;
}

export function getDashboard() {
  return request<Dashboard>('/dashboard');
}

export function addTransaction(transaction: Transaction) {
  return request<{ message: string }>('/add-transaction', {
    method: 'POST',
    body: JSON.stringify(transaction),
  });
}
