import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Chip, SegmentedButtons } from 'react-native-paper';

import { AppPalette, spacing } from '@/constants/theme';
import {
  CharacterCounter,
  FormField,
  SuccessBanner,
  validateAmount,
  validateCategory,
  validateDate,
  validateMaxLength,
} from '@/components/ux';
import { useAppTheme } from '@/contexts/theme';
import { addTransaction } from '@/services/api';
import { isLikelyNetworkError, queueTransaction } from '@/services/offlineQueue';

const today = new Date().toISOString().slice(0, 10);
const amountPresets = [250, 500, 1000, 2500, 5000, 10000];
const quickCategories = [
  { category: 'food', icon: 'food-outline', label: 'Food', type: 'expense' },
  { category: 'transport', icon: 'bus', label: 'Ride', type: 'expense' },
  { category: 'shopping', icon: 'shopping-outline', label: 'Shop', type: 'expense' },
  { category: 'groceries', icon: 'cart-outline', label: 'Groceries', type: 'expense' },
  { category: 'salary', icon: 'cash-plus', label: 'Income', type: 'income' },
] as const;

const money = new Intl.NumberFormat('en-PK', {
  currency: 'PKR',
  maximumFractionDigits: 0,
  style: 'currency',
});
type QuickAddField = 'amount' | 'category' | 'date' | 'notes';
const NOTES_LIMIT = 500;

export default function QuickAddScreen() {
  const params = useLocalSearchParams<{ amount?: string; category?: string; type?: 'income' | 'expense' }>();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [amount, setAmount] = useState(params.amount ?? '');
  const [category, setCategory] = useState(params.category ?? 'food');
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<QuickAddField, boolean>>({
    amount: false,
    category: false,
    date: false,
    notes: false,
  });
  const [type, setType] = useState<'income' | 'expense'>(params.type === 'income' ? 'income' : 'expense');

  const selectedCategory = quickCategories.find((item) => item.category === category);
  const parsedAmount = Number(amount);
  const amountValidation = useMemo(() => validateAmount(amount), [amount]);
  const categoryValidation = useMemo(() => validateCategory(category), [category]);
  const dateValidation = useMemo(() => validateDate(date), [date]);
  const notesValidation = useMemo(() => validateMaxLength(notes, NOTES_LIMIT, 'Notes'), [notes]);
  const formIsValid = amountValidation.isValid && categoryValidation.isValid && dateValidation.isValid && notesValidation.isValid;
  const markTouched = (field: QuickAddField) => setTouched((current) => ({ ...current, [field]: true }));
  const shouldShow = (field: QuickAddField) => submitted || touched[field];

  const resetForNext = () => {
    setAmount('');
    setNotes('');
    setDate(today);
    setSubmitted(false);
    setTouched({
      amount: false,
      category: false,
      date: false,
      notes: false,
    });
    if (type === 'income') {
      setType('expense');
      setCategory('food');
    }
  };

  const save = async (closeAfterSave: boolean) => {
    setSubmitted(true);
    setSaveMessage(null);
    if (!formIsValid) {
      return;
    }

    const transaction = {
      amount: parsedAmount,
      category: category.trim(),
      date,
      notes: notes.trim(),
      type,
    };

    try {
      setSaving(true);
      await addTransaction(transaction);
      if (closeAfterSave) {
        router.back();
      } else {
        resetForNext();
        setSaveMessage(`${category} ${money.format(parsedAmount)} was added.`);
      }
    } catch (error) {
      if (isLikelyNetworkError(error)) {
        await queueTransaction(transaction);
        if (closeAfterSave) {
          Alert.alert('Saved offline', 'This transaction will sync when the API is reachable.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        } else {
          resetForNext();
          setSaveMessage('Saved offline. This transaction will sync when the API is reachable.');
        }
        return;
      }
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Backend request failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <MaterialCommunityIcons color={colors.ink} name="close" size={22} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Quick add</Text>
            <Text style={styles.title}>Log it before you forget</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <MaterialCommunityIcons color={colors.sky} name={selectedCategory?.icon ?? 'cash-fast'} size={26} />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>{type === 'income' ? 'Income' : 'Expense'}</Text>
            <Text style={styles.summaryValue}>{parsedAmount > 0 ? money.format(parsedAmount) : 'Choose amount'}</Text>
            <Text style={styles.summaryMeta}>{category || 'category'} - {date}</Text>
          </View>
        </View>

        <SegmentedButtons
          buttons={[
            { icon: 'minus-circle-outline', label: 'Expense', value: 'expense' },
            { icon: 'plus-circle-outline', label: 'Income', value: 'income' },
          ]}
          onValueChange={(value) => setType(value as 'income' | 'expense')}
          value={type}
        />

        <View style={styles.panel}>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountGrid}>
            {amountPresets.map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() => setAmount(String(value))}
                style={[styles.amountButton, amount === String(value) ? styles.amountButtonActive : null]}>
                <Text style={[styles.amountButtonText, amount === String(value) ? styles.amountButtonTextActive : null]}>
                  {money.format(value)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <FormField
            error={amountValidation.message}
            keyboardType="decimal-pad"
            label="Custom amount"
            onBlur={() => markTouched('amount')}
            onChangeText={setAmount}
            required
            touched={shouldShow('amount')}
            value={amount}
          />
        </View>

        <View style={styles.panel}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryWrap}>
            {quickCategories.map((item) => (
              <Chip
                compact
                icon={item.icon}
                key={item.category}
                onPress={() => {
                  setCategory(item.category);
                  setType(item.type);
                }}
                selected={category === item.category}
                style={category === item.category ? styles.categorySelected : styles.category}>
                {item.label}
              </Chip>
            ))}
          </View>
          <FormField
            autoCapitalize="none"
            error={categoryValidation.message}
            label="Custom category"
            onBlur={() => markTouched('category')}
            onChangeText={setCategory}
            required
            touched={shouldShow('category')}
            value={category}
          />
        </View>

        <View style={styles.panel}>
          <FormField
            error={dateValidation.message}
            keyboardType="numbers-and-punctuation"
            label="Date"
            onBlur={() => markTouched('date')}
            onChangeText={setDate}
            required
            touched={shouldShow('date')}
            value={date}
          />
          <FormField
            counter={<CharacterCounter max={NOTES_LIMIT} value={notes} />}
            error={notesValidation.message}
            helper="Optional merchant or reason."
            label="Notes"
            multiline
            numberOfLines={2}
            onBlur={() => markTouched('notes')}
            onChangeText={setNotes}
            placeholder="optional merchant or reason"
            touched={shouldShow('notes')}
            value={notes}
          />
        </View>

        {saveMessage ? <SuccessBanner message={saveMessage} title="Transaction saved" /> : null}

        <View style={styles.actions}>
          <Button disabled={saving || !formIsValid} mode="outlined" onPress={() => save(false)} style={styles.secondaryButton}>
            Save another
          </Button>
          <Button disabled={saving || !formIsValid} loading={saving} mode="contained" onPress={() => save(true)} style={styles.primaryButton}>
            Save
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    amountButton: {
      alignItems: 'center',
      backgroundColor: colors.surface2,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      flexBasis: '31%',
      paddingVertical: 12,
    },
    amountButtonActive: {
      backgroundColor: colors.skySoft,
      borderColor: colors.sky,
    },
    amountButtonText: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: '800',
    },
    amountButtonTextActive: {
      color: colors.sky,
    },
    amountGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    category: {
      backgroundColor: colors.surface2,
      borderRadius: 8,
    },
    categorySelected: {
      backgroundColor: colors.skySoft,
      borderRadius: 8,
    },
    categoryWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    closeButton: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      height: 42,
      justifyContent: 'center',
      width: 42,
    },
    container: {
      gap: spacing.lg,
      padding: spacing.xl,
      paddingBottom: spacing.xxl,
    },
    eyebrow: {
      color: colors.sky,
      fontSize: 13,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
      paddingTop: spacing.md,
    },
    headerText: {
      flex: 1,
    },
    label: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: '900',
    },
    panel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      gap: spacing.md,
      padding: spacing.lg,
    },
    primaryButton: {
      backgroundColor: colors.sky,
      borderRadius: 8,
      flex: 1,
    },
    screen: {
      backgroundColor: colors.background,
      flex: 1,
    },
    secondaryButton: {
      borderRadius: 8,
      flex: 1,
    },
    summaryCard: {
      alignItems: 'center',
      backgroundColor: colors.balanceSurface,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.lg,
    },
    summaryIcon: {
      alignItems: 'center',
      backgroundColor: colors.balancePill,
      borderRadius: 8,
      height: 54,
      justifyContent: 'center',
      width: 54,
    },
    summaryLabel: {
      color: colors.balanceMuted,
      fontSize: 13,
      fontWeight: '800',
    },
    summaryMeta: {
      color: colors.balanceMuted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    summaryText: {
      flex: 1,
      gap: 3,
    },
    summaryValue: {
      color: colors.balanceText,
      fontSize: 28,
      fontWeight: '900',
    },
    title: {
      color: colors.ink,
      fontSize: 24,
      fontWeight: '900',
    },
  });
}
