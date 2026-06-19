import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, SegmentedButtons, TextInput } from 'react-native-paper';

import { addTransaction } from '@/services/api';

const today = new Date().toISOString().slice(0, 10);

export default function AddTransactionScreen() {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(today);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const parsedAmount = Number(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Check amount', 'Enter an amount greater than zero.');
      return;
    }

    if (!category.trim()) {
      Alert.alert('Check category', 'Enter a category like food, salary, rent, or transport.');
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
      setAmount('');
      setCategory('');
      setDate(today);
      setType('expense');
      Alert.alert('Saved', 'Transaction added successfully.');
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Backend request failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Quick Entry</Text>
          <Text style={styles.title}>Add Transaction</Text>
          <Text style={styles.subtitle}>Log income and spending without leaving the app.</Text>
        </View>

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
          style={styles.input}
          value={amount}
        />
        <TextInput
          autoCapitalize="none"
          label="Category"
          mode="outlined"
          onChangeText={setCategory}
          placeholder="food, salary, rent"
          style={styles.input}
          value={category}
        />
        <TextInput
          keyboardType="numbers-and-punctuation"
          label="Date"
          mode="outlined"
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          style={styles.input}
          value={date}
        />

        <Button
          disabled={saving}
          loading={saving}
          mode="contained"
          onPress={submit}
          style={styles.submit}
          contentStyle={styles.submitContent}>
          Save Transaction
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f5faf7',
    flex: 1,
  },
  container: {
    gap: 14,
    padding: 20,
    paddingTop: 32,
  },
  header: {
    gap: 4,
    marginBottom: 8,
  },
  eyebrow: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: '#101827',
    fontSize: 32,
    fontWeight: '800',
  },
  subtitle: {
    color: '#667085',
    fontSize: 14,
  },
  segmented: {
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#ffffff',
  },
  submit: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    marginTop: 8,
  },
  submitContent: {
    height: 52,
  },
});
