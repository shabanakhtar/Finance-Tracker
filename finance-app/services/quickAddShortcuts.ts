import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type QuickAddShortcutType = 'expense' | 'income';

export type QuickAddShortcut = {
  category: string;
  defaultAmount?: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  id: string;
  label: string;
  type: QuickAddShortcutType;
};

export type QuickAddShortcutDraft = {
  category: string;
  defaultAmount: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  id: string;
  label: string;
  type: QuickAddShortcutType;
};

export type QuickAddShortcutValidation = Partial<Record<'category' | 'defaultAmount' | 'label', string>>;

const STORAGE_KEY = 'finance:quick-add-shortcuts:v1';

export const quickAddIconOptions: Array<{ icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }> = [
  { icon: 'food-outline', label: 'Food' },
  { icon: 'bus', label: 'Ride' },
  { icon: 'shopping-outline', label: 'Shop' },
  { icon: 'cart-outline', label: 'Groceries' },
  { icon: 'cash-plus', label: 'Income' },
  { icon: 'home-city-outline', label: 'Rent' },
  { icon: 'flash-outline', label: 'Bills' },
  { icon: 'coffee-outline', label: 'Cafe' },
  { icon: 'medical-bag', label: 'Health' },
  { icon: 'dots-horizontal-circle-outline', label: 'Other' },
];

export const defaultQuickAddShortcuts: QuickAddShortcut[] = [
  { category: 'food', defaultAmount: 500, icon: 'food-outline', id: 'food', label: 'Food', type: 'expense' },
  { category: 'transport', defaultAmount: 300, icon: 'bus', id: 'ride', label: 'Ride', type: 'expense' },
  { category: 'shopping', icon: 'shopping-outline', id: 'shop', label: 'Shop', type: 'expense' },
  { category: 'salary', icon: 'cash-plus', id: 'income', label: 'Income', type: 'income' },
];

export function shortcutToDraft(shortcut: QuickAddShortcut): QuickAddShortcutDraft {
  return {
    ...shortcut,
    defaultAmount: shortcut.defaultAmount ? String(shortcut.defaultAmount) : '',
  };
}

export function validateQuickAddShortcut(draft: QuickAddShortcutDraft): QuickAddShortcutValidation {
  const errors: QuickAddShortcutValidation = {};
  const amount = Number(draft.defaultAmount);

  if (!draft.label.trim()) errors.label = 'Label is required.';
  if (draft.label.trim().length > 18) errors.label = 'Label must be 18 characters or fewer.';
  if (!draft.category.trim()) errors.category = 'Category is required.';
  if (draft.category.trim().length > 40) errors.category = 'Category must be 40 characters or fewer.';
  if (draft.defaultAmount.trim() && (!Number.isFinite(amount) || amount <= 0)) {
    errors.defaultAmount = 'Default amount must be greater than zero.';
  }
  if (amount > 999999999) errors.defaultAmount = 'Default amount is too large.';

  return errors;
}

export function draftToShortcut(draft: QuickAddShortcutDraft): QuickAddShortcut {
  const amount = Number(draft.defaultAmount);
  return {
    category: draft.category.trim().toLowerCase(),
    defaultAmount: draft.defaultAmount.trim() ? amount : undefined,
    icon: draft.icon,
    id: draft.id,
    label: draft.label.trim(),
    type: draft.type,
  };
}

export async function getQuickAddShortcuts() {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultQuickAddShortcuts;

  try {
    const parsed = JSON.parse(stored) as QuickAddShortcut[];
    const valid = parsed.filter(isValidShortcut).slice(0, 6);
    return valid.length ? valid : defaultQuickAddShortcuts;
  } catch {
    return defaultQuickAddShortcuts;
  }
}

export async function saveQuickAddShortcuts(shortcuts: QuickAddShortcut[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts.slice(0, 6)));
}

export async function resetQuickAddShortcuts() {
  await AsyncStorage.removeItem(STORAGE_KEY);
  return defaultQuickAddShortcuts;
}

function isValidShortcut(shortcut: QuickAddShortcut) {
  return (
    typeof shortcut?.id === 'string' &&
    typeof shortcut.label === 'string' &&
    typeof shortcut.category === 'string' &&
    (shortcut.type === 'expense' || shortcut.type === 'income') &&
    typeof shortcut.icon === 'string' &&
    (shortcut.defaultAmount === undefined || typeof shortcut.defaultAmount === 'number')
  );
}
