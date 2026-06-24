import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

type AuthContextValue = {
  initialized: boolean;
  loading: boolean;
  resetPassword: (email: string) => Promise<void>;
  session: Session | null;
  signInWithGoogle: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, profile: UserProfileInput) => Promise<{ needsConfirmation: boolean }>;
  updateProfile: (profile: UserProfileInput) => Promise<void>;
};

export type UserProfileInput = {
  firstName: string;
  lastName: string;
};

function getAuthParams(url: string) {
  const fragment = url.split('#')[1] ?? '';
  const query = url.split('?')[1]?.split('#')[0] ?? '';
  return new URLSearchParams(fragment || query);
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitialized(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setInitialized(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      initialized,
      loading,
      resetPassword: async (email) => {
        setLoading(true);
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email);
          if (error) throw error;
        } finally {
          setLoading(false);
        }
      },
      session,
      signIn: async (email, password) => {
        setLoading(true);
        try {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
        } finally {
          setLoading(false);
        }
      },
      signInWithGoogle: async () => {
        setLoading(true);
        try {
          const redirectTo = Linking.createURL('auth/callback');
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo,
              skipBrowserRedirect: true,
            },
          });
          if (error) throw error;
          if (!data.url) throw new Error('Google sign-in did not return a login URL.');

          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
          if (result.type !== 'success') return;

          const params = getAuthParams(result.url);
          const code = params.get('code');
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const errorDescription = params.get('error_description');

          if (errorDescription) throw new Error(errorDescription);

          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
            return;
          }

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) throw sessionError;
            return;
          }

          throw new Error('Google sign-in did not return a session.');
        } finally {
          setLoading(false);
        }
      },
      signOut: async () => {
        setLoading(true);
        try {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
        } finally {
          setLoading(false);
        }
      },
      signUp: async (email, password, profile) => {
        setLoading(true);
        try {
          const firstName = profile.firstName.trim();
          const lastName = profile.lastName.trim();
          const fullName = [firstName, lastName].filter(Boolean).join(' ');
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                first_name: firstName,
                last_name: lastName,
                full_name: fullName,
              },
            },
          });
          if (error) throw error;
          return { needsConfirmation: !data.session };
        } finally {
          setLoading(false);
        }
      },
      updateProfile: async (profile) => {
        setLoading(true);
        try {
          const firstName = profile.firstName.trim();
          const lastName = profile.lastName.trim();
          const fullName = [firstName, lastName].filter(Boolean).join(' ');
          const { error } = await supabase.auth.updateUser({
            data: {
              first_name: firstName,
              last_name: lastName,
              full_name: fullName,
            },
          });
          if (error) throw error;
          const { data } = await supabase.auth.getSession();
          setSession(data.session);
        } finally {
          setLoading(false);
        }
      },
    }),
    [initialized, loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
