import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPalette, radii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/contexts/theme';
import { usePrefersReducedMotion } from '@/components/ux';

type ToastContextValue = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function FloatingToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const reduced = usePrefersReducedMotion();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(reduced ? 0 : -16)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        duration: reduced ? 0 : 180,
        easing: Easing.in(Easing.cubic),
        isInteraction: false,
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        duration: reduced ? 0 : 180,
        easing: Easing.in(Easing.cubic),
        isInteraction: false,
        toValue: reduced ? 0 : -16,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [opacity, reduced, translateY]);

  const showToast = useCallback(
    (nextMessage: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(nextMessage);
      setMounted(true);
      opacity.stopAnimation();
      translateY.stopAnimation();
      opacity.setValue(0);
      translateY.setValue(reduced ? 0 : -16);

      Animated.parallel([
        Animated.timing(opacity, {
          duration: reduced ? 0 : 180,
          easing: Easing.out(Easing.cubic),
          isInteraction: false,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          duration: reduced ? 0 : 220,
          easing: Easing.out(Easing.cubic),
          isInteraction: false,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();

      timer.current = setTimeout(hideToast, 2600);
    },
    [hideToast, opacity, reduced, translateY],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Portal>
        <View pointerEvents="none" style={styles.portalHost}>
          {mounted ? (
            <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons color={colors.emeraldDark} name="check" size={17} />
              </View>
              <Text numberOfLines={2} style={styles.toastText}>
                {message}
              </Text>
            </Animated.View>
          ) : null}
        </View>
      </Portal>
    </ToastContext.Provider>
  );
}

export function useFloatingToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useFloatingToast must be used inside FloatingToastProvider');
  }
  return context;
}

function createStyles(colors: AppPalette, topInset: number) {
  return StyleSheet.create({
    iconWrap: {
      alignItems: 'center',
      backgroundColor: colors.emeraldSoft,
      borderRadius: radii.pill,
      height: 28,
      justifyContent: 'center',
      width: 28,
    },
    portalHost: {
      alignItems: 'center',
      left: 0,
      paddingHorizontal: spacing.lg,
      position: 'absolute',
      right: 0,
      top: Math.max(14, topInset + 10),
      zIndex: 999,
    },
    toast: {
      alignItems: 'center',
      alignSelf: 'flex-end',
      backgroundColor: colors.surface,
      borderColor: colors.emerald,
      borderRadius: radii.card,
      borderWidth: 1,
      elevation: 8,
      flexDirection: 'row',
      gap: spacing.sm,
      maxWidth: 310,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      shadowColor: '#000000',
      shadowOffset: { height: 8, width: 0 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
    },
    toastText: {
      color: colors.ink,
      flexShrink: 1,
      fontSize: 13,
      fontWeight: '900',
      lineHeight: 18,
    },
  });
}
