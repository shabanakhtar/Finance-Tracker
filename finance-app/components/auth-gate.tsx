import * as SecureStore from 'expo-secure-store';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Divider, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth';
import { useCurrency } from '@/contexts/currency';
import { AppPalette } from '@/constants/theme';
import { useAppTheme } from '@/contexts/theme';
import {
  AnimatedScreen,
  CurrencyToggle,
  FormField,
  PasswordChecklist,
  SuccessBanner,
  ThemeToggle,
  TypingText,
  validateEmail,
  validateName,
  validatePassword,
} from '@/components/ux';

type AuthField = 'email' | 'firstName' | 'lastName' | 'password';
const ONBOARDING_PREFERENCES_KEY = 'finance-tracker-onboarding-preferences';

async function readOnboardingPreferencesDone() {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(ONBOARDING_PREFERENCES_KEY) === 'done';
  }

  return (await SecureStore.getItemAsync(ONBOARDING_PREFERENCES_KEY)) === 'done';
}

async function storeOnboardingPreferencesDone() {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(ONBOARDING_PREFERENCES_KEY, 'done');
    return;
  }

  await SecureStore.setItemAsync(ONBOARDING_PREFERENCES_KEY, 'done');
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { initialized, loading, resetPassword, session, signIn, signInWithGoogle, signUp, updateProfile } = useAuth();
  const { colors, mode: themeMode, setMode: setThemeMode } = useAppTheme();
  const { currency, setCurrency } = useCurrency();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compactScreen = height < 720;
  const styles = useMemo(() => createStyles(colors, compactScreen, insets.top), [colors, compactScreen, insets.top]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [authStep, setAuthStep] = useState<'welcome' | 'form'>('welcome');
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [preferencesDone, setPreferencesDone] = useState(false);
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
    () => (mode === 'login' ? (password ? { isValid: true } : { isValid: false, message: 'Password is required.' }) : validatePassword(password)),
    [mode, password],
  );
  const firstNameValidation = useMemo(() => validateName(firstName, 'First name'), [firstName]);
  const lastNameValidation = useMemo(() => validateName(lastName, 'Last name'), [lastName]);
  const formIsValid =
    emailValidation.isValid &&
    passwordValidation.isValid &&
    (mode === 'login' || (firstNameValidation.isValid && lastNameValidation.isValid));
  const profileIsValid = firstNameValidation.isValid && lastNameValidation.isValid;

  useEffect(() => {
    let active = true;
    readOnboardingPreferencesDone()
      .then((done) => {
        if (!active) return;
        setPreferencesDone(done);
      })
      .finally(() => {
        if (active) setPreferencesReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const markTouched = (field: AuthField) => setTouched((current) => ({ ...current, [field]: true }));
  const shouldShow = (field: AuthField) => submitted || touched[field];
  const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : 'height';
  const resetInteractionState = () => {
    setError(null);
    setMessage(null);
    setSubmitted(false);
    setFocusedField(null);
    setTouched({
      email: false,
      firstName: false,
      lastName: false,
      password: false,
    });
  };

  const switchMode = (nextMode: 'login' | 'signup') => {
    if (nextMode === mode) return;
    resetInteractionState();
    setMode(nextMode);
  };
  const beginAuth = (nextMode: 'login' | 'signup') => {
    resetInteractionState();
    setMode(nextMode);
    setAuthStep('form');
  };
  const returnToWelcome = () => {
    resetInteractionState();
    setAuthStep('welcome');
  };
  const completePreferences = async () => {
    await storeOnboardingPreferencesDone();
    setPreferencesDone(true);
  };

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

  if (!initialized || (!session && !preferencesReady)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.sky} size="large" />
        <Text style={styles.muted}>{initialized ? 'Preparing your preferences...' : 'Checking your session...'}</Text>
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
            <AnimatedScreen delay={80}>
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
                    placeholder="Shabaan"
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
                    placeholder="Akhtar"
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
            </AnimatedScreen>
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }
    return <>{children}</>;
  }

  if (!preferencesDone) {
    return (
      <KeyboardAvoidingView behavior={keyboardBehavior} style={styles.screen}>
        <ScrollView contentContainerStyle={[styles.container, styles.welcomeContainer]} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled">
          <View style={styles.welcomeHero}>
            <StepIndicator current={1} total={2} />
            <AnimatedScreen delay={40} style={styles.brandRow}>
              <View style={styles.brandMark}>
                <MaterialCommunityIcons color={colors.sky} name="wallet-outline" size={24} />
              </View>
              <View style={styles.brandTextWrap}>
                <Text style={styles.brand}>Finance Tracker</Text>
                <Text style={styles.brandCaption}>Private money clarity</Text>
              </View>
            </AnimatedScreen>
            <AnimatedScreen delay={120}>
              <Text style={styles.title}>Set your defaults</Text>
            </AnimatedScreen>
            <AnimatedScreen delay={220}>
              <Text style={styles.subtitle}>Choose how the app should look and show money. You can change this anytime in Settings.</Text>
            </AnimatedScreen>
          </View>

          <AnimatedScreen delay={320}>
            <Card style={styles.welcomeCard}>
              <Card.Content style={styles.preferenceContent}>
                <View style={styles.preferenceBlock}>
                  <View style={styles.preferenceHeader}>
                    <MaterialCommunityIcons color={colors.emerald} name="cash-multiple" size={22} />
                    <View style={styles.preferenceText}>
                      <Text style={styles.preferenceTitle}>Default currency</Text>
                      <Text style={styles.preferenceHint}>This is display-only for now. Multi-currency conversion comes later.</Text>
                    </View>
                  </View>
                  <CurrencyToggle onValueChange={setCurrency} value={currency} />
                </View>

                <View style={styles.preferenceBlock}>
                  <View style={styles.preferenceHeader}>
                    <MaterialCommunityIcons color={colors.violet} name="theme-light-dark" size={22} />
                    <View style={styles.preferenceText}>
                      <Text style={styles.preferenceTitle}>Theme</Text>
                      <Text style={styles.preferenceHint}>Pick the mode that feels easiest to read.</Text>
                    </View>
                  </View>
                  <ThemeToggle onValueChange={setThemeMode} value={themeMode} />
                </View>

                <Button mode="contained" onPress={completePreferences} style={styles.primary}>
                  Continue
                </Button>
              </Card.Content>
            </Card>
          </AnimatedScreen>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (authStep === 'welcome') {
    return (
      <KeyboardAvoidingView behavior={keyboardBehavior} style={styles.screen}>
        <ScrollView contentContainerStyle={[styles.container, styles.welcomeContainer]} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled">
          <View style={styles.welcomeHero}>
            <StepIndicator current={2} total={2} />
            <AnimatedScreen delay={40} style={styles.brandRow}>
              <View style={styles.brandMark}>
                <MaterialCommunityIcons color={colors.sky} name="wallet-outline" size={24} />
              </View>
              <View style={styles.brandTextWrap}>
                <Text style={styles.brand}>Finance Tracker</Text>
                <Text style={styles.brandCaption}>Private money clarity</Text>
              </View>
            </AnimatedScreen>
            <AnimatedScreen delay={120}>
              <TypingText speed={42} style={styles.helloTitle} text="Hello." />
            </AnimatedScreen>
            <AnimatedScreen delay={280}>
              <Text style={styles.welcomeTitle}>Ready to check in on your money?</Text>
            </AnimatedScreen>
            <AnimatedScreen delay={360}>
              <Text style={styles.welcomeSubtitle}>
              Sign in to continue your snapshot, or create a private workspace and build your first view in a few taps.
              </Text>
            </AnimatedScreen>
            <AuthMotionPreview />
          </View>

          <AnimatedScreen delay={520}>
            <Card style={styles.welcomeCard}>
              <Card.Content style={styles.welcomeActions}>
                <Button labelStyle={styles.primaryLabel} mode="contained" onPress={() => beginAuth('login')} style={styles.primary}>
                  Sign In
                </Button>
                <Button mode="outlined" onPress={() => beginAuth('signup')} style={styles.googleButton}>
                  Create Account
                </Button>
                <View style={styles.trustRow}>
                  <MaterialCommunityIcons color={colors.sky} name="shield-check-outline" size={18} />
                  <Text style={styles.trustText}>Your data stays private and secure.</Text>
                </View>
              </Card.Content>
            </Card>
          </AnimatedScreen>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={keyboardBehavior} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled">
        <AnimatedScreen style={styles.header}>
          <Button compact icon="chevron-left" mode="text" onPress={returnToWelcome} style={styles.backButton} textColor={colors.muted}>
            Back
          </Button>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <MaterialCommunityIcons color={colors.sky} name="wallet-outline" size={24} />
            </View>
            <View style={styles.brandTextWrap}>
              <Text style={styles.brand}>Finance Tracker</Text>
              <Text style={styles.brandCaption}>Private money clarity</Text>
            </View>
          </View>
          <Text style={styles.title}>{mode === 'login' ? 'Welcome back' : 'Build your first money picture'}</Text>
          <Text style={styles.subtitle}>
            {mode === 'login'
              ? 'Pick up where you left off with your balance, budgets, receipts, and AI insights.'
              : 'Start with income, a first expense, and simple budgets. The app turns small entries into a clear snapshot.'}
          </Text>
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
                onPress={() => switchMode('login')}
                style={mode === 'login' ? styles.modeActive : styles.modeButton}>
                Sign in
              </Button>
              <Button
                compact
                labelStyle={mode === 'signup' ? styles.activeLabel : undefined}
                mode={mode === 'signup' ? 'contained' : 'text'}
                onPress={() => switchMode('signup')}
                style={mode === 'signup' ? styles.modeActive : styles.modeButton}>
                Create
              </Button>
            </View>
            <AuthModeHint mode={mode} />
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
              placeholder="Your password"
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
            {mode === 'signup' && (focusedField === 'password' || password.length > 0) ? <PasswordChecklist password={password} /> : null}
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
                  placeholder="Shabaan"
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
                  placeholder="Akhtar"
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
              <Text style={styles.trustText}>Private and secure sign-in.</Text>
            </View>
          </Card.Content>
        </Card>
        </AnimatedScreen>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AuthModeHint({ mode }: { mode: 'login' | 'signup' }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.modeHint}>
      <MaterialCommunityIcons
        color={mode === 'login' ? colors.sky : colors.emerald}
        name={mode === 'login' ? 'lock-open-variant-outline' : 'map-marker-path'}
        size={18}
      />
      <Text style={styles.modeHintText}>
        {mode === 'login'
          ? 'Your saved dashboard, offline queue, and AI limits load after sign-in.'
          : 'Create your private workspace, then the setup flow helps you add the first useful numbers.'}
      </Text>
    </View>
  );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.stepRow}>
      <Text style={styles.stepText}>
        Step {current} of {total}
      </Text>
      <View style={styles.stepDots}>
        {Array.from({ length: total }).map((_, index) => (
          <View key={index} style={[styles.stepDot, index + 1 <= current ? styles.stepDotActive : null]} />
        ))}
      </View>
    </View>
  );
}

function AuthMotionPreview() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const items = [
    { detail: 'Track money in', icon: 'cash-plus', label: 'Income', tone: colors.emerald },
    { detail: 'Spot spending', icon: 'receipt-text-outline', label: 'Spend', tone: colors.coral },
    { detail: 'See patterns', icon: 'chart-line', label: 'Score', tone: colors.violet },
  ] as const;

  return (
    <View style={styles.motionPreview}>
      {items.map((item, index) => (
        <AnimatedScreen delay={120 + index * 70} key={item.label} style={styles.motionTile}>
          <View style={[styles.motionIcon, { backgroundColor: `${item.tone}22` }]}>
            <MaterialCommunityIcons color={item.tone} name={item.icon} size={18} />
          </View>
          <View style={styles.motionTileCopy}>
            <Text style={styles.motionTileText}>{item.label}</Text>
            <Text style={styles.motionTileDetail}>{item.detail}</Text>
          </View>
        </AnimatedScreen>
      ))}
    </View>
  );
}

function createStyles(colors: AppPalette, compactScreen = false, topInset = 0) {
  return StyleSheet.create({
  activeLabel: {
    color: '#ffffff',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: compactScreen ? 2 : 4,
    marginLeft: -8,
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
    padding: compactScreen ? 16 : 20,
    paddingBottom: compactScreen ? 20 : 34,
    paddingTop: Math.max(compactScreen ? 20 : 34, topInset + 12),
  },
  brand: {
    color: colors.sky,
    fontSize: 15,
    fontWeight: '800',
  },
  brandCaption: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.skySoft,
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  brandTextWrap: {
    flex: 1,
  },
  header: {
    gap: compactScreen ? 6 : 8,
    marginBottom: compactScreen ? 14 : 20,
  },
  googleButton: {
    borderColor: colors.border,
    borderRadius: 8,
  },
  helloTitle: {
    color: colors.ink,
    fontSize: compactScreen ? 58 : 72,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: compactScreen ? 64 : 78,
    marginTop: compactScreen ? 14 : 22,
  },
  title: {
    color: colors.ink,
    fontSize: compactScreen ? 28 : 32,
    fontWeight: '800',
    lineHeight: compactScreen ? 34 : 39,
  },
  subtitle: {
    color: colors.muted,
    fontSize: compactScreen ? 14 : 15,
    lineHeight: compactScreen ? 20 : 22,
  },
  stepDot: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  stepDotActive: {
    backgroundColor: colors.sky,
    width: 18,
  },
  stepDots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  stepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
  },
  cardContent: {
    gap: compactScreen ? 11 : 14,
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
  modeHint: {
    alignItems: 'flex-start',
    backgroundColor: colors.skySoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: compactScreen ? 9 : 11,
  },
  modeHintText: {
    color: colors.ink,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
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
    marginTop: compactScreen ? 6 : 10,
  },
  motionIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  motionTile: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 7,
    minHeight: compactScreen ? 76 : 82,
    padding: compactScreen ? 9 : 10,
  },
  motionTileCopy: {
    gap: 1,
  },
  motionTileDetail: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  motionTileText: {
    color: colors.ink,
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
  preferenceBlock: {
    gap: compactScreen ? 9 : 11,
  },
  preferenceContent: {
    gap: compactScreen ? 16 : 18,
  },
  preferenceHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  preferenceHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  preferenceText: {
    flex: 1,
    gap: 2,
  },
  preferenceTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
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
  welcomeActions: {
    gap: compactScreen ? 10 : 12,
  },
  welcomeCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
  },
  welcomeContainer: {
    gap: compactScreen ? 14 : 18,
  },
  welcomeHero: {
    gap: compactScreen ? 8 : 10,
  },
  welcomeSubtitle: {
    color: colors.muted,
    fontSize: compactScreen ? 15 : 16,
    lineHeight: compactScreen ? 22 : 24,
  },
  welcomeTitle: {
    color: colors.ink,
    fontSize: compactScreen ? 24 : 28,
    fontWeight: '800',
    lineHeight: compactScreen ? 30 : 34,
  },
  });
}
