import { ReactNode, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, TextInput } from 'react-native-paper';

import { useAuth } from '@/contexts/auth';

export function AuthGate({ children }: { children: ReactNode }) {
  const { initialized, loading, session, signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [password, setPassword] = useState('');

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

  if (!initialized) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0f766e" size="large" />
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
          <Text style={styles.eyebrow}>AI Finance Tracker</Text>
          <Text style={styles.title}>{mode === 'login' ? 'Welcome back' : 'Create account'}</Text>
          <Text style={styles.subtitle}>Sign in to keep your income, expenses, and AI insights private.</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
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
              secureTextEntry
              value={password}
            />
            {message ? <Text style={styles.message}>{message}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button disabled={loading} loading={loading} mode="contained" onPress={submit} style={styles.primary}>
              {mode === 'login' ? 'Sign In' : 'Sign Up'}
            </Button>
            <Button
              disabled={loading}
              mode="text"
              onPress={() => {
                setError(null);
                setMessage(null);
                setMode(mode === 'login' ? 'signup' : 'login');
              }}
            >
              {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    backgroundColor: '#f5faf7',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
  screen: {
    backgroundColor: '#f5faf7',
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    gap: 6,
    marginBottom: 20,
  },
  eyebrow: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: '#101827',
    fontSize: 34,
    fontWeight: '800',
  },
  subtitle: {
    color: '#667085',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  cardContent: {
    gap: 14,
  },
  error: {
    color: '#b42318',
    fontSize: 13,
  },
  message: {
    color: '#047857',
    fontSize: 13,
  },
  muted: {
    color: '#667085',
  },
  primary: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
  },
});
