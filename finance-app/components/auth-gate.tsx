import { ReactNode, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Divider, TextInput } from 'react-native-paper';

import { useAuth } from '@/contexts/auth';
import { AppPalette } from '@/constants/theme';
import { useAppTheme } from '@/contexts/theme';
import {
  AnimatedScreen,
  FormField,
  PasswordChecklist,
  SuccessBanner,
  validateEmail,
  validateName,
  validatePassword,
} from '@/components/ux';

type AuthField = 'email' | 'firstName' | 'lastName' | 'password';

export function AuthGate({ children }: { children: ReactNode }) {
  const { initialized, loading, resetPassword, session, signIn, signInWithGoogle, signUp, updateProfile } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [password, setPassword] = useState('');
  const [secureEntry, setSecureEntry] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [focusedField, setFocusedField] = useState<AuthField | null>(null);
  const [touched, setTouched] = useState<Record<AuthField, boolean>>({
    email: false,
    firstName: false,
    lastName: false,
    password: false,
  });

  const metadata = session?.user.user_metadata ?? {};
  const displayName = metadata.full_name ?? metadata.name ?? metadata.first_name;
  const needsProfile = Boolean(session) && typeof displayName !== 'string';
  const emailValidation = useMemo(() => validateEmail(email), [email]);
  const passwordValidation = useMemo(
    () => (mode === 'login' ? { isValid: Boolean(password), message: 'Password is required.' } : validatePassword(password)),
    [mode, password],
  );
  const firstNameValidation = useMemo(() => validateName(firstName, 'First name'), [firstName]);
  const lastNameValidation = useMemo(() => validateName(lastName, 'Last name'), [lastName]);
  const formIsValid =
    emailValidation.isValid &&
    passwordValidation.isValid &&
    (mode === 'login' || (firstNameValidation.isValid && lastNameValidation.isValid));
  const profileIsValid = firstNameValidation.isValid && lastNameValidation.isValid;

  const markTouched = (field: AuthField) => setTouched((current) => ({ ...current, [field]: true }));
  const shouldShow = (field: AuthField) => submitted || touched[field];
  const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : 'height';

  const submit = async () => {
    try {
      setSubmitted(true);
      setError(null);
      setMessage(null);
      const cleanedEmail = email.trim().toLowerCase();
      if (!formIsValid) {
        setError('Fix the highlighted fields before continuing.');
        return;
      }

      if (mode === 'login') {
        await signIn(cleanedEmail, password);
      } else {
        if (!firstName.trim() || !lastName.trim()) {
          setError('Enter your first and last name so the app can greet you properly.');
          return;
        }
        const result = await signUp(cleanedEmail, password, {
          firstName,
          lastName,
        });
        if (result.needsConfirmation) {
          setMessage('Account created. Check your email to confirm it, then sign in.');
          setMode('login');
          setPassword('');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    }
  };

  const submitProfile = async () => {
    setSubmitted(true);
    if (!profileIsValid) {
      setError('Fix the highlighted fields before continuing.');
      return;
    }

    try {
      setError(null);
      setMessage(null);
      await updateProfile({ firstName, lastName });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    }
  };

  const sendPasswordReset = async () => {
    const cleanedEmail = email.trim().toLowerCase();
    markTouched('email');
    if (!emailValidation.isValid) {
      setError('Enter a valid email first, then request a reset link.');
      return;
    }

    try {
      setError(null);
      setMessage(null);
      await resetPassword(cleanedEmail);
      setMessage('Password reset email sent. Check your inbox.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.');
    }
  };

  const submitGoogle = async () => {
    try {
      setError(null);
      setMessage(null);
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    }
  };

  if (!initialized) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.sky} size="large" />
        <Text style={styles.muted}>Checking your session...</Text>
      </View>
    );
  }

  if (session) {
    if (needsProfile) {
      return (
        <KeyboardAvoidingView behavior={keyboardBehavior} style={styles.screen}>
          <ScrollView contentContainerStyle={styles.container} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled">
            <AnimatedScreen style={styles.header}>
              <View style={styles.brandMark}>
                <MaterialCommunityIcons color={colors.sky} name="account-heart-outline" size={24} />
              </View>
              <Text style={styles.brand}>Finance Tracker</Text>
              <Text style={styles.title}>What should we call you?</Text>
              <Text style={styles.subtitle}>Your dashboard will use your name instead of showing account details.</Text>
            </AnimatedScreen>
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.nameRow}>
                  <FormField
                    error={firstNameValidation.message}
                    label="First name"
                    onBlur={() => {
                      markTouched('firstName');
                      setFocusedField(null);
                    }}
                    onChangeText={setFirstName}
                    onFocus={() => setFocusedField('firstName')}
                    required
                    style={styles.nameInput}
                    touched={shouldShow('firstName')}
                    value={firstName}
                  />
                  <FormField
                    error={lastNameValidation.message}
                    label="Last name"
                    onBlur={() => {
                      markTouched('lastName');
                      setFocusedField(null);
                    }}
                    onChangeText={setLastName}
                    onFocus={() => setFocusedField('lastName')}
                    required
                    style={styles.nameInput}
                    touched={shouldShow('lastName')}
                    value={lastName}
                  />
                </View>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Button disabled={loading || !profileIsValid} loading={loading} mode="contained" onPress={submitProfile} style={styles.primary}>
                  Continue
                </Button>
              </Card.Content>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }
    return <>{children}</>;
  }

  return (
    <KeyboardAvoidingView behavior={keyboardBehavior} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled">
        <AnimatedScreen style={styles.header}>
          <View style={styles.brandMark}>
            <MaterialCommunityIcons color={colors.sky} name="wallet-outline" size={24} />
          </View>
          <Text style={styles.brand}>Finance Tracker</Text>
          <Text style={styles.title}>{mode === 'login' ? 'Welcome back' : 'Build your money picture'}</Text>
          <Text style={styles.subtitle}>Track income, spending, budgets, and AI insights in one private workspace.</Text>
          <AuthMotionPreview />
        </AnimatedScreen>

        <AnimatedScreen delay={80}>
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.modeSwitch}>
              <Button
                compact
                labelStyle={mode === 'login' ? styles.activeLabel : undefined}
                mode={mode === 'login' ? 'contained' : 'text'}
                onPress={() => setMode('login')}
                style={mode === 'login' ? styles.modeActive : styles.modeButton}>
                Sign in
              </Button>
              <Button
                compact
                labelStyle={mode === 'signup' ? styles.activeLabel : undefined}
                mode={mode === 'signup' ? 'contained' : 'text'}
                onPress={() => setMode('signup')}
                style={mode === 'signup' ? styles.modeActive : styles.modeButton}>
                Create
              </Button>
            </View>
            <FormField
              autoCapitalize="none"
              error={emailValidation.message}
              keyboardType="email-address"
              label="Email"
              onBlur={() => {
                markTouched('email');
                setFocusedField(null);
              }}
              onChangeText={setEmail}
              onFocus={() => setFocusedField('email')}
              placeholder="you@example.com"
              required
              touched={shouldShow('email')}
              value={email}
            />
            <FormField
              error={passwordValidation.message}
              label="Password"
              onBlur={() => {
                markTouched('password');
                setFocusedField(null);
              }}
              onChangeText={setPassword}
              onFocus={() => setFocusedField('password')}
              required
              right={
                <TextInput.Icon
                  icon={secureEntry ? 'eye-outline' : 'eye-off-outline'}
                  onPress={() => setSecureEntry((value) => !value)}
                />
              }
              secureTextEntry={secureEntry}
              touched={shouldShow('password')}
              value={password}
            />
            {mode === 'signup' && focusedField === 'password' ? <PasswordChecklist password={password} /> : null}
            {mode === 'signup' ? (
              <View style={styles.nameRow}>
                <FormField
                  error={firstNameValidation.message}
                  label="First name"
                  onBlur={() => {
                    markTouched('firstName');
                    setFocusedField(null);
                  }}
                  onChangeText={setFirstName}
                  onFocus={() => setFocusedField('firstName')}
                  required
                  style={styles.nameInput}
                  touched={shouldShow('firstName')}
                  value={firstName}
                />
                <FormField
                  error={lastNameValidation.message}
                  label="Last name"
                  onBlur={() => {
                    markTouched('lastName');
                    setFocusedField(null);
                  }}
                  onChangeText={setLastName}
                  onFocus={() => setFocusedField('lastName')}
                  required
                  style={styles.nameInput}
                  touched={shouldShow('lastName')}
                  value={lastName}
                />
              </View>
            ) : null}
            {message ? <SuccessBanner message={message} title="Check your inbox" /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button disabled={loading || !formIsValid} labelStyle={styles.primaryLabel} loading={loading} mode="contained" onPress={submit} style={styles.primary}>
              {mode === 'login' ? 'Sign In' : 'Sign Up'}
            </Button>
            {mode === 'login' ? (
              <Button disabled={loading} mode="text" onPress={sendPasswordReset} textColor={colors.sky}>
                Forgot password?
              </Button>
            ) : null}
            <Divider />
            <Button disabled={loading} icon="google" mode="outlined" onPress={submitGoogle} style={styles.googleButton}>
              Continue with Google
            </Button>
            <View style={styles.trustRow}>
              <MaterialCommunityIcons color={colors.sky} name="shield-check-outline" size={18} />
              <Text style={styles.trustText}>Private sign-in by Supabase.</Text>
            </View>
          </Card.Content>
        </Card>
        </AnimatedScreen>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AuthMotionPreview() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const items = [
    { icon: 'cash-plus', label: 'Income', tone: colors.emerald },
    { icon: 'receipt-text-outline', label: 'Spend', tone: colors.coral },
    { icon: 'chart-line', label: 'Score', tone: colors.violet },
  ] as const;

  return (
    <View style={styles.motionPreview}>
      {items.map((item, index) => (
        <AnimatedScreen delay={120 + index * 70} key={item.label} style={styles.motionTile}>
          <MaterialCommunityIcons color={item.tone} name={item.icon} size={18} />
          <Text style={styles.motionTileText}>{item.label}</Text>
        </AnimatedScreen>
      ))}
    </View>
  );
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
  activeLabel: {
    color: '#ffffff',
  },
  centered: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: '100%',
    padding: 20,
    paddingBottom: 34,
    paddingTop: 34,
  },
  brand: {
    color: colors.sky,
    fontSize: 15,
    fontWeight: '800',
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.skySoft,
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  header: {
    gap: 8,
    marginBottom: 20,
  },
  googleButton: {
    borderColor: colors.border,
    borderRadius: 8,
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  cardContent: {
    gap: 14,
  },
  error: {
    color: colors.coral,
    fontSize: 13,
  },
  message: {
    color: colors.emerald,
    fontSize: 13,
  },
  modeActive: {
    backgroundColor: colors.sky,
    borderRadius: 8,
    flex: 1,
  },
  modeButton: {
    borderRadius: 8,
    flex: 1,
  },
  modeSwitch: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 4,
  },
  nameInput: {
    flex: 1,
    minWidth: 148,
  },
  nameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  motionPreview: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  motionTile: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 10,
  },
  motionTileText: {
    color: colors.ink,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '900',
  },
  muted: {
    color: colors.muted,
  },
  primary: {
    backgroundColor: colors.sky,
    borderRadius: 8,
  },
  primaryLabel: {
    color: '#ffffff',
    fontWeight: '800',
  },
  trustRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  trustText: {
    color: colors.muted,
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
  },
  });
}
