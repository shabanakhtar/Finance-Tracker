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

export type InsightCard = {
  kind: string;
  severity: 'info' | 'medium' | 'high' | 'positive';
  title: string;
  detail: string;
  action: string;
};

export type Dashboard = {
  summary: Summary;
  categories: Record<string, { income: number; expense: number }>;
  monthly: Record<string, { income: number; expense: number }>;
  top_categories: [string, number][];
  breakdown: Record<string, number>;
  recent_transactions: Transaction[];
  insights: string[];
  insight_cards: InsightCard[];
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
  limit?: AiLimitStatus;
};

export type AiLimitStatus = {
  feature: string;
  limit: number;
  period: string;
  remaining: number;
  used: number;
};

export type AiLimits = {
  chat: AiLimitStatus;
  market: AiLimitStatus;
  receipt: AiLimitStatus;
};

export type ApiErrorKind = 'network' | 'timeout' | 'auth' | 'rate_limit' | 'backend' | 'parse' | 'unknown';

export class AppApiError extends Error {
  kind: ApiErrorKind;
  limit?: AiLimitStatus;
  retryable: boolean;
  status?: number;

  constructor(message: string, options: { kind?: ApiErrorKind; limit?: AiLimitStatus; retryable?: boolean; status?: number } = {}) {
    super(message);
    this.name = 'AppApiError';
    this.kind = options.kind ?? 'unknown';
    this.limit = options.limit;
    this.retryable = options.retryable ?? false;
    this.status = options.status;
  }
}

function classifyStatus(status: number): ApiErrorKind {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'backend';
  return 'unknown';
}

function extractApiError(body: unknown, fallback: string) {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const detail = record.detail;
    if (detail && typeof detail === 'object') {
      const detailRecord = detail as Record<string, unknown>;
      if (typeof detailRecord.message === 'string') return detailRecord.message;
    }
    if (typeof record.message === 'string') return record.message;
    if (typeof detail === 'string') return detail;
  }
  return fallback;
}

function extractLimit(body: unknown): AiLimitStatus | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const record = body as Record<string, unknown>;
  const detail = record.detail;
  const source = detail && typeof detail === 'object' ? detail as Record<string, unknown> : record;
  const limit = source.limit;
  if (!limit || typeof limit !== 'object') return undefined;
  const next = limit as Record<string, unknown>;
  if (
    typeof next.feature === 'string' &&
    typeof next.limit === 'number' &&
    typeof next.period === 'string' &&
    typeof next.remaining === 'number' &&
    typeof next.used === 'number'
  ) {
    return {
      feature: next.feature,
      limit: next.limit,
      period: next.period,
      remaining: next.remaining,
      used: next.used,
    };
  }
  return undefined;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
      signal: controller.signal,
      ...options,
    });
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError';
    throw new AppApiError(
      isAbort
        ? 'The backend is taking too long to respond. You can retry, or keep entering transactions offline.'
        : 'Could not reach the backend. Check your internet connection or try again in a moment.',
      { kind: isAbort ? 'timeout' : 'network', retryable: true },
    );
  } finally {
    clearTimeout(timeout);
  }

  const rawBody = await response.text();
  let body: unknown = null;
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      const preview = rawBody.replace(/\s+/g, ' ').slice(0, 120);
      throw new AppApiError(
        response.ok
          ? 'Backend returned an unreadable response. Please try again.'
          : `Backend returned ${response.status}. ${preview || 'Please try again.'}`,
        { kind: 'parse', retryable: true, status: response.status },
      );
    }
  }

  if (!response.ok || (body && typeof body === 'object' && (body as { status?: string }).status === 'error')) {
    const kind = classifyStatus(response.status);
    throw new AppApiError(extractApiError(body, `Request failed with status ${response.status}.`), {
      kind,
      limit: extractLimit(body),
      retryable: kind === 'network' || kind === 'timeout' || kind === 'backend' || kind === 'rate_limit',
      status: response.status,
    });
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

export function getAiLimits() {
  return request<AiLimits>('/ai-limits');
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
