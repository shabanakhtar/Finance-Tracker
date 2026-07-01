import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

const CURRENCY_STORAGE_KEY = 'finance-tracker-currency';

export type AppCurrency = 'PKR' | 'USD';

type CurrencyMeta = {
  code: AppCurrency;
  label: string;
  locale: string;
  symbol: string;
};

export const currencyOptions: CurrencyMeta[] = [
  { code: 'PKR', label: 'Pakistani Rupee', locale: 'en-PK', symbol: 'Rs' },
  { code: 'USD', label: 'US Dollar', locale: 'en-US', symbol: '$' },
];

type CurrencyContextValue = {
  currency: AppCurrency;
  currencyLabel: string;
  currencySymbol: string;
  formatMoney: (amount: number) => string;
  setCurrency: (currency: AppCurrency) => Promise<void>;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function isAppCurrency(value: string | null): value is AppCurrency {
  return value === 'PKR' || value === 'USD';
}

async function readStoredCurrency(): Promise<AppCurrency | null> {
  if (Platform.OS === 'web') {
    const value = globalThis.localStorage?.getItem(CURRENCY_STORAGE_KEY) ?? null;
    return isAppCurrency(value) ? value : null;
  }

  const value = await SecureStore.getItemAsync(CURRENCY_STORAGE_KEY);
  return isAppCurrency(value) ? value : null;
}

async function storeCurrency(currency: AppCurrency) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(CURRENCY_STORAGE_KEY, currency);
    return;
  }

  await SecureStore.setItemAsync(CURRENCY_STORAGE_KEY, currency);
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<AppCurrency>('PKR');

  useEffect(() => {
    readStoredCurrency().then((stored) => {
      if (stored) setCurrencyState(stored);
    });
  }, []);

  const meta = currencyOptions.find((option) => option.code === currency) ?? currencyOptions[0];
  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(meta.locale, {
        currency,
        maximumFractionDigits: 0,
        style: 'currency',
      }),
    [currency, meta.locale],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      currencyLabel: meta.label,
      currencySymbol: meta.symbol,
      formatMoney: (amount) => formatter.format(amount),
      setCurrency: async (nextCurrency) => {
        setCurrencyState(nextCurrency);
        await storeCurrency(nextCurrency);
      },
    }),
    [currency, formatter, meta.label, meta.symbol],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const value = useContext(CurrencyContext);
  if (!value) {
    throw new Error('useCurrency must be used inside CurrencyProvider');
  }
  return value;
}
