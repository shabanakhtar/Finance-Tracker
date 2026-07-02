import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ComponentProps, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SegmentedButtons, TextInput } from 'react-native-paper';

import { AppPalette, AppThemeMode, spacing } from '@/constants/theme';
import { AppCurrency, currencyOptions, useCurrency } from '@/contexts/currency';
import { useAppTheme } from '@/contexts/theme';

type PaperTextInputProps = ComponentProps<typeof TextInput>;
type FormFieldProps = Omit<PaperTextInputProps, 'activeOutlineColor' | 'error' | 'mode' | 'outlineColor'> & {
  counter?: ReactNode;
  error?: string;
  helper?: string;
  required?: boolean;
  touched?: boolean;
};

export type ValidationState = {
  isValid: boolean;
  message?: string;
};

export function FormField({
  counter,
  error,
  helper,
  required,
  touched,
  ...props
}: FormFieldProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const showError = Boolean(touched && error);

  return (
    <View style={styles.fieldWrap}>
      <TextInput
        activeOutlineColor={showError ? colors.coral : colors.sky}
        error={showError}
        mode="outlined"
        outlineColor={showError ? colors.coral : colors.border}
        {...props}
        label={`${props.label ?? ''}${required ? ' *' : ''}`}
      />
      <View style={styles.metaRow}>
        <View style={styles.helperWrap}>
          {showError ? (
            <View style={styles.inlineRow}>
              <MaterialCommunityIcons color={colors.coral} name="alert-circle-outline" size={14} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : helper ? (
            <Text style={styles.helperText}>{helper}</Text>
          ) : null}
        </View>
        {counter}
      </View>
    </View>
  );
}

export function CharacterCounter({ max, value }: { max: number; value: string }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const overLimit = value.length > max;

  return (
    <Text style={[styles.counterText, overLimit ? styles.counterOver : null]}>
      {value.length}/{max}
    </Text>
  );
}

export function LabeledCharacterCounter({ label, max, value }: { label: string; max: number; value: string }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const overLimit = value.length > max;

  return (
    <Text style={[styles.counterText, styles.labeledCounterText, overLimit ? styles.counterOver : null]}>
      {label} {value.length}/{max}
    </Text>
  );
}

export function MoneyField(props: Omit<FormFieldProps, 'keyboardType' | 'left'>) {
  const { currencySymbol } = useCurrency();

  return (
    <FormField
      keyboardType="decimal-pad"
      left={<TextInput.Affix text={currencySymbol} />}
      {...props}
    />
  );
}

export function CurrencyToggle({
  onValueChange,
  value,
}: {
  onValueChange: (currency: AppCurrency) => void;
  value: AppCurrency;
}) {
  return (
    <SegmentedButtons
      buttons={currencyOptions.map((option) => ({
        icon: option.code === 'PKR' ? 'cash' : 'currency-usd',
        label: option.code,
        value: option.code,
      }))}
      onValueChange={(nextValue) => onValueChange(nextValue as AppCurrency)}
      value={value}
    />
  );
}

export function ThemeToggle({
  onValueChange,
  value,
}: {
  onValueChange: (mode: AppThemeMode) => void;
  value: AppThemeMode;
}) {
  return (
    <SegmentedButtons
      buttons={[
        { icon: 'white-balance-sunny', label: 'Light', value: 'light' },
        { icon: 'weather-night', label: 'Dark', value: 'dark' },
        { icon: 'cellphone-cog', label: 'System', value: 'system' },
      ]}
      onValueChange={(nextValue) => onValueChange(nextValue as AppThemeMode)}
      value={value}
    />
  );
}

export function PasswordChecklist({ password }: { password: string }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const checks = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'Contains a letter', valid: /[A-Za-z]/.test(password) },
    { label: 'Contains a number', valid: /\d/.test(password) },
  ];

  return (
    <View style={styles.checklist}>
      {checks.map((check) => (
        <View key={check.label} style={styles.inlineRow}>
          <MaterialCommunityIcons
            color={check.valid ? colors.emerald : colors.muted2}
            name={check.valid ? 'checkbox-marked-circle-outline' : 'checkbox-blank-circle-outline'}
            size={15}
          />
          <Text style={[styles.checkText, check.valid ? styles.checkTextValid : null]}>{check.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function validateEmail(email: string): ValidationState {
  const cleaned = email.trim();
  if (!cleaned) return { isValid: false, message: 'Email is required.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
    return { isValid: false, message: 'Enter a valid email address.' };
  }
  return { isValid: true };
}

export function validatePassword(password: string): ValidationState {
  if (!password) return { isValid: false, message: 'Password is required.' };
  if (password.length < 8) return { isValid: false, message: 'Use at least 8 characters.' };
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return { isValid: false, message: 'Use at least one letter and one number.' };
  }
  return { isValid: true };
}

export function validateName(value: string, label: string): ValidationState {
  const cleaned = value.trim();
  if (!cleaned) return { isValid: false, message: `${label} is required.` };
  if (cleaned.length > 40) return { isValid: false, message: `${label} must be 40 characters or fewer.` };
  return { isValid: true };
}

export function validateAmount(value: string): ValidationState {
  const parsed = Number(value);
  if (!value.trim()) return { isValid: false, message: 'Amount is required.' };
  if (!Number.isFinite(parsed) || parsed <= 0) return { isValid: false, message: 'Enter an amount greater than zero.' };
  if (parsed > 999999999) return { isValid: false, message: 'Amount is too large.' };
  return { isValid: true };
}

export function validateCategory(value: string): ValidationState {
  const cleaned = value.trim();
  if (!cleaned) return { isValid: false, message: 'Category is required.' };
  if (cleaned.length > 40) return { isValid: false, message: 'Category must be 40 characters or fewer.' };
  return { isValid: true };
}

export function validateDate(value: string): ValidationState {
  if (!value.trim()) return { isValid: false, message: 'Date is required.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { isValid: false, message: 'Use YYYY-MM-DD format.' };
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return { isValid: false, message: 'Enter a real date.' };
  return { isValid: true };
}

export function validateMaxLength(value: string, max: number, label: string): ValidationState {
  if (value.length > max) return { isValid: false, message: `${label} must be ${max} characters or fewer.` };
  return { isValid: true };
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    checkText: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 17,
    },
    checkTextValid: {
      color: colors.emerald,
      fontWeight: '800',
    },
    checklist: {
      gap: spacing.xs,
      marginTop: -spacing.xs,
    },
    counterOver: {
      color: colors.coral,
      fontWeight: '900',
    },
    counterText: {
      color: colors.muted2,
      fontSize: 12,
      minWidth: 54,
      textAlign: 'right',
    },
    errorText: {
      color: colors.coral,
      flex: 1,
      fontSize: 12,
      lineHeight: 17,
    },
    fieldWrap: {
      gap: spacing.xs,
    },
    helperText: {
      color: colors.muted2,
      fontSize: 12,
      lineHeight: 17,
    },
    helperWrap: {
      flex: 1,
    },
    inlineRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
    },
    labeledCounterText: {
      minWidth: 92,
    },
    metaRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing.sm,
      minHeight: 18,
    },
  });
}
