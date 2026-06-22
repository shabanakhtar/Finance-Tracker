import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, SegmentedButtons, TextInput } from 'react-native-paper';

import { AppPalette } from '@/constants/theme';
import { useAppTheme } from '@/contexts/theme';
import { MarketSearchAnswer, ReceiptScanResult, addTransaction, scanReceipt, searchMarket } from '@/services/api';

const today = new Date().toISOString().slice(0, 10);
const categories = ['food', 'transport', 'rent', 'salary', 'shopping', 'utilities'];
const money = new Intl.NumberFormat('en-PK', {
  maximumFractionDigits: 0,
  style: 'currency',
  currency: 'PKR',
});

export default function AddTransactionScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(today);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptScanResult | null>(null);
  const [receiptAlternatives, setReceiptAlternatives] = useState<Record<string, MarketSearchAnswer>>({});
  const [checkingItem, setCheckingItem] = useState<string | null>(null);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);

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
      setLastSaved(`${type === 'income' ? 'Income' : 'Expense'} saved: ${category.trim()} - ${money.format(parsedAmount)}`);
      setAmount('');
      setCategory('');
      setDate(today);
      setReceipt(null);
      setReceiptAlternatives({});
      setType('expense');
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Backend request failed.');
    } finally {
      setSaving(false);
    }
  };

  const applyReceipt = (result: ReceiptScanResult) => {
    if (result.amount > 0) setAmount(String(Math.round(result.amount)));
    if (result.category) setCategory(result.category);
    if (/^\d{4}-\d{2}-\d{2}$/.test(result.date)) setDate(result.date);
    setType('expense');
    setReceipt(result);
    setReceiptAlternatives({});
    setLastSaved(null);
  };

  const checkAlternatives = async (itemName: string, itemPrice?: number) => {
    if (!itemPrice || itemPrice <= 0) {
      Alert.alert('Price needed', 'AI needs an item price to compare cheaper options.');
      return;
    }

    try {
      setCheckingItem(itemName);
      const result = await searchMarket({
        product_name: itemName,
        current_price: itemPrice,
        category: category.trim() || receipt?.category || undefined,
        location: 'Pakistan',
      });
      setReceiptAlternatives((current) => ({
        ...current,
        [itemName]: result,
      }));
    } catch (err) {
      Alert.alert('Could not check alternatives', err instanceof Error ? err.message : 'Market search failed.');
    } finally {
      setCheckingItem(null);
    }
  };

  const scanFromAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64) {
      Alert.alert('Could not read image', 'Try another photo or lower image quality.');
      return;
    }

    try {
      setScanning(true);
      const result = await scanReceipt({
        image_base64: asset.base64,
        mime_type: asset.mimeType ?? 'image/jpeg',
      });
      applyReceipt(result);
    } catch (err) {
      Alert.alert('Receipt scan failed', err instanceof Error ? err.message : 'AI could not read this receipt.');
    } finally {
      setScanning(false);
    }
  };

  const pickReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to pick a receipt.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      base64: true,
      mediaTypes: ['images'],
      quality: 0.75,
    });

    if (!result.canceled && result.assets[0]) {
      await scanFromAsset(result.assets[0]);
    }
  };

  const takeReceiptPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow camera access to scan a receipt.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      base64: true,
      mediaTypes: ['images'],
      quality: 0.75,
    });

    if (!result.canceled && result.assets[0]) {
      await scanFromAsset(result.assets[0]);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons color={colors.sky} name="plus-box-outline" size={24} />
          </View>
          <Text style={styles.title}>Add transaction</Text>
          <Text style={styles.subtitle}>Capture income or spending in a few taps.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.tipBox}>
            <MaterialCommunityIcons color={colors.violet} name="lightning-bolt-outline" size={18} />
            <Text style={styles.tipText}>Scan a receipt, review what AI found, then save only when it looks right.</Text>
          </View>

          <View style={styles.scanActions}>
            <Button
              disabled={saving || scanning}
              icon="camera-outline"
              loading={scanning}
              mode="contained-tonal"
              onPress={takeReceiptPhoto}
              style={styles.scanButton}>
              Scan
            </Button>
            <Button
              disabled={saving || scanning}
              icon="image-outline"
              mode="outlined"
              onPress={pickReceipt}
              style={styles.scanButton}>
              Pick Photo
            </Button>
          </View>

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
              <MaterialCommunityIcons color={colors.emerald} name="check-circle-outline" size={20} />
              <Text style={styles.successText}>{lastSaved}</Text>
            </View>
          ) : null}

          {receipt ? (
            <View style={styles.receiptPreview}>
              <View style={styles.receiptHeader}>
                <MaterialCommunityIcons color={colors.sky} name="receipt-text-check-outline" size={20} />
                <View style={styles.receiptHeaderText}>
                  <Text style={styles.label}>Receipt preview</Text>
                  <Text style={styles.receiptMeta}>
                    {receipt.merchant} - {(receipt.confidence * 100).toFixed(0)}% confidence
                  </Text>
                </View>
              </View>
              {receipt.items.length ? (
                <View style={styles.itemList}>
                  {receipt.items.slice(0, 4).map((item, index) => (
                    <View key={`${item.name}-${index}`} style={styles.receiptItem}>
                      <View style={styles.receiptItemText}>
                        <Text style={styles.receiptMeta}>
                          {item.name}
                          {item.price ? ` - ${money.format(item.price)}` : ''}
                        </Text>
                      </View>
                      {item.price ? (
                        <Button
                          compact
                          disabled={checkingItem === item.name}
                          loading={checkingItem === item.name}
                          mode="text"
                          onPress={() => checkAlternatives(item.name, item.price)}
                          textColor={colors.sky}>
                          Check
                        </Button>
                      ) : null}
                      {receiptAlternatives[item.name] ? (
                        <View style={styles.altPreview}>
                          <Text style={styles.altVerdict}>{receiptAlternatives[item.name].verdict}</Text>
                          {receiptAlternatives[item.name].alternatives.slice(0, 2).map((alt) => (
                            <Text key={alt.url} style={styles.receiptMeta}>
                              {alt.name} - {money.format(alt.price)}
                              {alt.savings ? `, save ${money.format(alt.savings)}` : ''}
                            </Text>
                          ))}
                          {!receiptAlternatives[item.name].alternatives.length ? (
                            <Text style={styles.receiptMeta}>No clearly cheaper verified option found.</Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.receiptMeta}>No clear line items found. Check the total before saving.</Text>
              )}
              {receipt.notes ? <Text style={styles.receiptMeta}>{receipt.notes}</Text> : null}
            </View>
          ) : null}

          <Button
            disabled={saving || scanning}
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

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  altPreview: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 10,
    width: '100%',
  },
  altVerdict: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.surface2,
    borderRadius: 8,
  },
  chipSelected: {
    backgroundColor: colors.skySoft,
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
    backgroundColor: colors.skySoft,
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  input: {
    backgroundColor: colors.surface,
  },
  itemList: {
    gap: 4,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  receiptHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  receiptHeaderText: {
    flex: 1,
  },
  receiptMeta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  receiptItem: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  receiptItemText: {
    flex: 1,
    minWidth: 160,
  },
  receiptPreview: {
    backgroundColor: colors.skySoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  scanActions: {
    flexDirection: 'row',
    gap: 10,
  },
  scanButton: {
    borderRadius: 8,
    flex: 1,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  segmented: {
    marginBottom: 2,
  },
  submit: {
    backgroundColor: colors.sky,
    borderRadius: 8,
    marginTop: 2,
  },
  submitContent: {
    height: 52,
  },
  tipBox: {
    alignItems: 'center',
    backgroundColor: colors.violetSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  tipText: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  successBox: {
    alignItems: 'center',
    backgroundColor: colors.emeraldSoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  successText: {
    color: colors.emeraldDark,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: '900',
  },
  });
}
