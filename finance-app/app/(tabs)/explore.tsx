import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, SegmentedButtons, TextInput } from 'react-native-paper';

import { palette } from '@/constants/theme';
import { addTransaction } from '@/services/api';

const today = new Date().toISOString().slice(0, 10);
const categories = ['food', 'transport', 'rent', 'salary', 'shopping', 'utilities'];

export default function AddTransactionScreen() {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(today);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const parsedAmount = Number(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Check amount', 'Enter an amount greater than zero.');
      return;
    }

    if (!category.trim()) {
      Alert.alert('Check category', 'Choose or enter a category like food, salary, rent, or transport.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Check date', 'Use YYYY-MM-DD format.');
      return;
    }

    try {
      setSaving(true);
      await addTransaction({
        amount: parsedAmount,
        category: category.trim(),
        type,
        date,
      });
      setLastSaved(`${type === 'income' ? 'Income' : 'Expense'} saved: ${category.trim()} · ${parsedAmount}`);
      setAmount('');
      setCategory('');
      setDate(today);
      setType('expense');
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Backend request failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons color={palette.emerald} name="plus-box-outline" size={24} />
          </View>
          <Text style={styles.title}>Add transaction</Text>
          <Text style={styles.subtitle}>Capture income or spending in a few taps.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Type</Text>
          <SegmentedButtons
            onValueChange={(value) => setType(value as 'income' | 'expense')}
            value={type}
            buttons={[
              { value: 'expense', label: 'Expense', icon: 'minus-circle-outline' },
              { value: 'income', label: 'Income', icon: 'plus-circle-outline' },
            ]}
            style={styles.segmented}
          />

          <TextInput
            keyboardType="decimal-pad"
            label="Amount"
            mode="outlined"
            onChangeText={setAmount}
            placeholder="5000"
            left={<TextInput.Icon icon="cash" />}
            style={styles.input}
            value={amount}
          />

          <TextInput
            autoCapitalize="none"
            label="Category"
            mode="outlined"
            onChangeText={setCategory}
            placeholder="food, salary, rent"
            left={<TextInput.Icon icon="tag-outline" />}
            style={styles.input}
            value={category}
          />

          <View style={styles.categoryWrap}>
            {categories.map((item) => (
              <Chip
                key={item}
                compact
                selected={category === item}
                onPress={() => setCategory(item)}
                style={[styles.chip, category === item ? styles.chipSelected : null]}>
                {item}
              </Chip>
            ))}
          </View>

          <TextInput
            keyboardType="numbers-and-punctuation"
            label="Date"
            mode="outlined"
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            left={<TextInput.Icon icon="calendar-month-outline" />}
            style={styles.input}
            value={date}
          />

          {lastSaved ? (
            <View style={styles.successBox}>
              <MaterialCommunityIcons color={palette.emerald} name="check-circle-outline" size={20} />
              <Text style={styles.successText}>{lastSaved}</Text>
            </View>
          ) : null}

          <Button
            disabled={saving}
            loading={saving}
            mode="contained"
            onPress={submit}
            style={styles.submit}
            contentStyle={styles.submitContent}>
            Save Transaction
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    gap: 14,
    padding: 16,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: palette.background,
    borderRadius: 8,
  },
  chipSelected: {
    backgroundColor: palette.emeraldSoft,
  },
  container: {
    gap: 16,
    padding: 20,
    paddingTop: 32,
  },
  header: {
    gap: 8,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: palette.emeraldSoft,
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  input: {
    backgroundColor: palette.surface,
  },
  label: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  screen: {
    backgroundColor: palette.background,
    flex: 1,
  },
  segmented: {
    marginBottom: 2,
  },
  submit: {
    backgroundColor: palette.emerald,
    borderRadius: 8,
    marginTop: 2,
  },
  submitContent: {
    height: 52,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  successBox: {
    alignItems: 'center',
    backgroundColor: palette.emeraldSoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  successText: {
    color: palette.emeraldDark,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    color: palette.ink,
    fontSize: 32,
    fontWeight: '900',
  },
});
