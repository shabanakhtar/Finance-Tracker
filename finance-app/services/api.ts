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
  id?: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  date: string;
  notes?: string;
};

export type Budget = {
  id?: string;
  category: string;
  limit_amount: number;
};

export type BudgetStatus = Budget & {
  spent: number;
  remaining: number;
  progress: number;
  is_over: boolean;
};

export type Opportunity = {
  kind: 'recurring' | 'anomaly' | 'value';
  title: string;
  detail: string;
  impact: string;
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
  opportunities: Opportunity[];
  budgets: Budget[];
  budget_status: BudgetStatus[];
  warnings: string[];
  financial_score: number;
  transaction_count: number;
};

export type AiAnswer = {
  response: string;
};

export type MarketSource = {
  title: string;
  url: string;
};

export type MarketSearchAnswer = {
  response: string;
  verdict: string;
  alternatives: MarketAlternative[];
  warnings: string[];
  sources: MarketSource[];
};

export type MarketAlternative = {
  name: string;
  store: string;
  price: number;
  url: string;
  savings?: number | null;
  savings_percent?: number | null;
  confidence: 'low' | 'medium' | 'high';
  reason: string;
};

export type ReceiptItem = {
  name: string;
  price?: number | null;
};

export type ReceiptScanResult = {
  amount: number;
  category: string;
  date: string;
  merchant: string;
  items: ReceiptItem[];
  confidence: number;
  notes: string;
};

export type CsvExportResult = {
  filename: string;
  csv: string;
  count: number;
};

export type CsvImportRow = {
  row: number;
  date: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  notes?: string;
};

export type CsvImportError = CsvImportRow & {
  errors: string[];
};

export type CsvImportPreview = {
  valid_rows: CsvImportRow[];
  errors: CsvImportError[];
  valid_count: number;
  error_count: number;
  preview: CsvImportRow[];
  imported?: number;
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

export function updateTransaction(transaction: Required<Pick<Transaction, 'id'>> & Transaction) {
  return request<{ message: string }>(`/transactions/${transaction.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      amount: transaction.amount,
      category: transaction.category,
      type: transaction.type,
      date: transaction.date,
      notes: transaction.notes,
    }),
  });
}

export function deleteTransaction(id: string) {
  return request<{ message: string }>(`/transactions/${id}`, {
    method: 'DELETE',
  });
}

export function saveBudget(budget: Budget) {
  return request<{ message: string }>('/budgets', {
    method: 'POST',
    body: JSON.stringify(budget),
  });
}

export function deleteBudget(category: string) {
  return request<{ message: string }>(`/budgets/${encodeURIComponent(category)}`, {
    method: 'DELETE',
  });
}

export function askAi(question: string) {
  return request<AiAnswer>('/ask-ai', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
}

export function searchMarket(payload: { product_name: string; current_price?: number; category?: string; location?: string }) {
  return request<MarketSearchAnswer>('/market-search', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function scanReceipt(payload: { image_base64: string; mime_type: string }) {
  return request<ReceiptScanResult>('/scan-receipt', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function exportTransactionsCsv() {
  return request<CsvExportResult>('/transactions/export');
}

export function previewTransactionsCsv(csvText: string) {
  return request<CsvImportPreview>('/transactions/import/preview', {
    method: 'POST',
    body: JSON.stringify({ csv_text: csvText }),
  });
}

export function importTransactionsCsv(csvText: string) {
  return request<CsvImportPreview>('/transactions/import', {
    method: 'POST',
    body: JSON.stringify({ csv_text: csvText, commit: true }),
  });
}
