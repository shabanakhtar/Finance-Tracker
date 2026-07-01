import { ReactNode, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Divider, TextInput } from 'react-native-paper';

import { useAuth } from '@/contexts/auth';
import { useCurrency } from '@/contexts/currency';
import { AppPalette } from '@/constants/theme';
import { useAppTheme } from '@/contexts/theme';
import {
  AnimatedScreen,
  FormField,
  PasswordChecklist,
  SuccessBanner,
  TypingText,
  validateEmail,
  validateName,
  validatePassword,
} from '@/components/ux';

type AuthField = 'email' | 'firstName' | 'lastName' | 'password';

export function AuthGate({ children }: { children: ReactNode }) {
  const { initialized, loading, resetPassword, session, signIn, signInWithGoogle, signUp, updateProfile } = useAuth();
  const { colors } = useAppTheme();
  const { height } = useWindowDimensions();
  const compactScreen = height < 720;
  const styles = useMemo(() => createStyles(colors, compactScreen), [colors, compactScreen]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [authStep, setAuthStep] = useState<'welcome' | 'form'>('welcome');
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
            </AnimatedScreen>
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }
    return <>{children}</>;
  }

  if (authStep === 'welcome') {
    return (
      <KeyboardAvoidingView behavior={keyboardBehavior} style={styles.screen}>
        <ScrollView contentContainerStyle={[styles.container, styles.welcomeContainer]} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled">
          <View style={styles.welcomeHero}>
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
                  <Text style={styles.trustText}>Your data stays tied to your private Supabase account.</Text>
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

function AuthMotionPreview() {
  const { formatMoney } = useCurrency();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const items = [
    { detail: `+${formatMoney(85000)}`, icon: 'cash-plus', label: 'Income', tone: colors.emerald },
    { detail: 'Food -18%', icon: 'receipt-text-outline', label: 'Spend', tone: colors.coral },
    { detail: '74/100', icon: 'chart-line', label: 'Score', tone: colors.violet },
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

function createStyles(colors: AppPalette, compactScreen = false) {
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
    paddingTop: compactScreen ? 20 : 34,
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
