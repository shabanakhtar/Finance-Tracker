import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, SegmentedButtons, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPalette } from '@/constants/theme';
import { useAppTheme } from '@/contexts/theme';
import {
  CharacterCounter,
  FormField,
  KeyboardAwareScrollView,
  AppErrorState,
  SuccessBanner,
  triggerSuccess,
  triggerWarning,
  validateAmount,
  validateCategory,
  validateDate,
  validateMaxLength,
} from '@/components/ux';
import { AppApiError, MarketSearchAnswer, ReceiptScanResult, addTransaction, scanReceipt, searchMarket } from '@/services/api';
import { isLikelyNetworkError, queueTransaction } from '@/services/offlineQueue';

const today = new Date().toISOString().slice(0, 10);
const categories = ['food', 'groceries', 'transport', 'rent', 'salary', 'shopping', 'utilities', 'grooming', 'health', 'education', 'other'];
const money = new Intl.NumberFormat('en-PK', {
  maximumFractionDigits: 0,
  style: 'currency',
  currency: 'PKR',
});
type AddField = 'amount' | 'category' | 'date' | 'notes';
const NOTES_LIMIT = 500;

export default function AddTransactionScreen() {
  const params = useLocalSearchParams<{ category?: string; type?: 'income' | 'expense' }>();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(params.category ?? '');
  const [date, setDate] = useState(today);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<ReceiptScanResult | null>(null);
  const [receiptAlternatives, setReceiptAlternatives] = useState<Record<string, MarketSearchAnswer>>({});
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [checkingItem, setCheckingItem] = useState<string | null>(null);
  const [type, setType] = useState<'income' | 'expense'>(params.type === 'income' ? 'income' : 'expense');
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<AddField, boolean>>({
    amount: false,
    category: false,
    date: false,
    notes: false,
  });

  const amountValidation = useMemo(() => validateAmount(amount), [amount]);
  const categoryValidation = useMemo(() => validateCategory(category), [category]);
  const dateValidation = useMemo(() => validateDate(date), [date]);
  const notesValidation = useMemo(() => validateMaxLength(notes, NOTES_LIMIT, 'Notes'), [notes]);
  const formIsValid = amountValidation.isValid && categoryValidation.isValid && dateValidation.isValid && notesValidation.isValid;
  const markTouched = (field: AddField) => setTouched((current) => ({ ...current, [field]: true }));
  const shouldShow = (field: AddField) => submitted || touched[field];

  const resetForm = () => {
    setAmount('');
    setCategory('');
    setDate(today);
    setNotes('');
    setReceipt(null);
    setReceiptError(null);
    setReceiptAlternatives({});
    setType('expense');
    setSubmitted(false);
    setTouched({
      amount: false,
      category: false,
      date: false,
      notes: false,
    });
  };

  const submit = async () => {
    setSubmitted(true);
    const parsedAmount = Number(amount);

    if (!formIsValid) {
      triggerWarning();
      return;
    }

    try {
      setSaving(true);
      const transaction = {
        amount: parsedAmount,
        category: category.trim(),
        type,
        date,
        notes: notes.trim(),
      };
      await addTransaction(transaction);
      triggerSuccess();
      setLastSaved(`${type === 'income' ? 'Income' : 'Expense'} saved: ${category.trim()} - ${money.format(parsedAmount)}`);
      resetForm();
    } catch (err) {
      if (isLikelyNetworkError(err)) {
        await queueTransaction({
          amount: parsedAmount,
          category: category.trim(),
          type,
          date,
          notes: notes.trim(),
        });
        triggerSuccess();
        setLastSaved(`Saved offline: ${category.trim()} - ${money.format(parsedAmount)}. It will sync when the API is reachable.`);
        resetForm();
        return;
      }
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
    setReceiptError(null);
    setLastSaved(null);
  };

  const checkAlternatives = async (itemName: string, itemPrice?: number | null) => {
    if (!itemPrice || itemPrice <= 0) {
      setReceiptError('This receipt item needs a clear price before AI can compare cheaper options.');
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
      setReceiptError(err instanceof Error ? err.message : 'Market search failed.');
    } finally {
      setCheckingItem(null);
    }
  };

  const scanFromAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64) {
      setReceiptError('Could not read this image. Try another photo or lower image quality.');
      return;
    }

    try {
      setReceiptError(null);
      setScanning(true);
      const result = await scanReceipt({
        image_base64: asset.base64,
        mime_type: asset.mimeType ?? 'image/jpeg',
      });
      applyReceipt(result);
    } catch (err) {
      if (err instanceof AppApiError && err.kind === 'rate_limit') {
        const suffix = err.limit ? ` (${err.limit.used}/${err.limit.limit} used today)` : '';
        setReceiptError(`You have used today's receipt scan limit${suffix}. You can still enter this transaction manually.`);
      } else {
        setReceiptError(err instanceof Error ? err.message : 'AI could not read this receipt.');
      }
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
    <KeyboardAwareScrollView containerStyle={styles.screen} contentContainerStyle={styles.container}>
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

          <FormField
            error={amountValidation.message}
            keyboardType="decimal-pad"
            label="Amount"
            onBlur={() => markTouched('amount')}
            onChangeText={setAmount}
            placeholder="5000"
            required
            left={<TextInput.Icon icon="cash" />}
            style={styles.input}
            touched={shouldShow('amount')}
            value={amount}
          />

          <FormField
            autoCapitalize="none"
            error={categoryValidation.message}
            label="Category"
            onBlur={() => markTouched('category')}
            onChangeText={setCategory}
            placeholder="food, salary, rent"
            required
            left={<TextInput.Icon icon="tag-outline" />}
            style={styles.input}
            touched={shouldShow('category')}
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

          <FormField
            error={dateValidation.message}
            keyboardType="numbers-and-punctuation"
            label="Date"
            onBlur={() => markTouched('date')}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            required
            left={<TextInput.Icon icon="calendar-month-outline" />}
            style={styles.input}
            touched={shouldShow('date')}
            value={date}
          />

          <FormField
            counter={<CharacterCounter max={NOTES_LIMIT} value={notes} />}
            error={notesValidation.message}
            helper="Optional context, merchant, or reason."
            label="Notes"
            multiline
            numberOfLines={2}
            onBlur={() => markTouched('notes')}
            onChangeText={setNotes}
            placeholder="optional context, merchant, or reason"
            left={<TextInput.Icon icon="note-text-outline" />}
            style={styles.input}
            touched={shouldShow('notes')}
            value={notes}
          />

          {lastSaved ? <SuccessBanner message={lastSaved} title="Transaction saved" /> : null}
          {receiptError ? (
            <AppErrorState
              message={receiptError}
              title="Receipt or market check needs attention"
            />
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
                          {receiptAlternatives[item.name].alternatives.slice(0, 2).map((alt) => (
                            <Button
                              compact
                              icon="open-in-new"
                              key={`${alt.url}-source`}
                              mode="text"
                              onPress={() => Linking.openURL(alt.url)}
                              textColor={colors.sky}>
                              Open {alt.store}
                            </Button>
                          ))}
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
    </KeyboardAwareScrollView>
  );
}

function createStyles(colors: AppPalette, bottomInset = 0) {
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
    paddingBottom: Math.max(132, bottomInset + 120),
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
