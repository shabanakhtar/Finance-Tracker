import { ReactNode, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Divider, TextInput } from 'react-native-paper';

import { useAuth } from '@/contexts/auth';
import { AppPalette } from '@/constants/theme';
import { useAppTheme } from '@/contexts/theme';

export function AuthGate({ children }: { children: ReactNode }) {
  const { initialized, loading, resetPassword, session, signIn, signUp } = useAuth();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [password, setPassword] = useState('');
  const [secureEntry, setSecureEntry] = useState(true);

  const submit = async () => {
    try {
      setError(null);
      setMessage(null);
      const cleanedEmail = email.trim().toLowerCase();
      if (!cleanedEmail || password.length < 6) {
        setError('Enter a valid email and a password with at least 6 characters.');
        return;
      }

      if (mode === 'login') {
        await signIn(cleanedEmail, password);
      } else {
        const result = await signUp(cleanedEmail, password);
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

  const sendPasswordReset = async () => {
    const cleanedEmail = email.trim().toLowerCase();
    if (!cleanedEmail) {
      setError('Enter your email first, then request a reset link.');
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

  if (!initialized) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.sky} size="large" />
        <Text style={styles.muted}>Checking your session...</Text>
      </View>
    );
  }

  if (session) {
    return <>{children}</>;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.brandMark}>
            <MaterialCommunityIcons color={colors.sky} name="wallet-outline" size={24} />
          </View>
          <Text style={styles.brand}>Finance Tracker</Text>
          <Text style={styles.title}>{mode === 'login' ? 'Welcome back' : 'Build your money picture'}</Text>
          <Text style={styles.subtitle}>Track income, spending, budgets, and AI insights in one private workspace.</Text>
        </View>

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
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              label="Email"
              mode="outlined"
              onChangeText={setEmail}
              placeholder="you@example.com"
              value={email}
            />
            <TextInput
              label="Password"
              mode="outlined"
              onChangeText={setPassword}
              right={
                <TextInput.Icon
                  icon={secureEntry ? 'eye-outline' : 'eye-off-outline'}
                  onPress={() => setSecureEntry((value) => !value)}
                />
              }
              secureTextEntry={secureEntry}
              value={password}
            />
            {message ? <Text style={styles.message}>{message}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button disabled={loading} labelStyle={styles.primaryLabel} loading={loading} mode="contained" onPress={submit} style={styles.primary}>
              {mode === 'login' ? 'Sign In' : 'Sign Up'}
            </Button>
            {mode === 'login' ? (
              <Button disabled={loading} mode="text" onPress={sendPasswordReset} textColor={colors.sky}>
                Forgot password?
              </Button>
            ) : null}
            <Divider />
            <View style={styles.trustRow}>
              <MaterialCommunityIcons color={colors.sky} name="shield-check-outline" size={18} />
              <Text style={styles.trustText}>Protected by Supabase Auth and per-user data rules.</Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
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
    padding: 20,
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
    fontSize: 12,
    lineHeight: 17,
  },
  });
}
