import * as Haptics from 'expo-haptics';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { AppPalette, radii } from '@/constants/theme';
import { useAppTheme } from '@/contexts/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => subscription?.remove?.();
  }, []);

  return reduced;
}

export function triggerSelection() {
  Haptics.selectionAsync().catch(() => {});
}

export function triggerSuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function triggerWarning() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

export function AnimatedScreen({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = usePrefersReducedMotion();
  const opacity = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduced ? 0 : 14)).current;

  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }

    opacity.setValue(0);
    translateY.setValue(14);

    const animation = Animated.parallel([
      Animated.timing(opacity, {
        delay,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        isInteraction: false,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        delay,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        isInteraction: false,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [delay, opacity, reduced, translateY]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

export function AnimatedCard({
  children,
  index = 0,
  style,
}: {
  children: ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <AnimatedScreen delay={Math.min(index * 45, 220)} style={style}>
      {children}
    </AnimatedScreen>
  );
}

export function PressableScale({ children, onPress, style, ...props }: PressableProps & { style?: StyleProp<ViewStyle> }) {
  const reduced = usePrefersReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const disabled = Boolean(props.disabled);

  return (
    <AnimatedPressable
      {...props}
      onPress={onPress}
      onPressIn={(event) => {
        if (disabled) return;
        scale.stopAnimation();
        Animated.timing(scale, {
          duration: 90,
          easing: Easing.out(Easing.quad),
          toValue: reduced ? 1 : 0.97,
          useNativeDriver: true,
        }).start();
        props.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        if (disabled) return;
        scale.stopAnimation();
        Animated.spring(scale, {
          damping: 16,
          overshootClamping: true,
          stiffness: 260,
          toValue: 1,
          useNativeDriver: true,
        }).start();
        props.onPressOut?.(event);
      }}
      style={[{ opacity: disabled ? 0.62 : 1, transform: [{ scale }] }, style]}>
      {children}
    </AnimatedPressable>
  );
}

export function AnimatedProgressBar({
  color,
  progress,
  trackColor,
}: {
  color: string;
  progress: number;
  trackColor?: string;
}) {
  const { colors } = useAppTheme();
  const reduced = usePrefersReducedMotion();
  const width = useRef(new Animated.Value(reduced ? progress : 0)).current;
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const animation = Animated.timing(width, {
      duration: reduced ? 0 : 420,
      easing: Easing.out(Easing.cubic),
      isInteraction: false,
      toValue: Math.max(0, Math.min(progress, 1)),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduced, width]);

  const animatedWidth = width.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.progressTrack, trackColor ? { backgroundColor: trackColor } : null]}>
      <Animated.View style={[styles.progressFill, { backgroundColor: color, width: animatedWidth }]} />
    </View>
  );
}

export function SuccessPulse({ label, visible }: { label?: string; visible: boolean }) {
  const { colors } = useAppTheme();
  const reduced = usePrefersReducedMotion();
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (!visible) {
      const animation = Animated.timing(opacity, {
        duration: reduced ? 0 : 120,
        isInteraction: false,
        toValue: 0,
        useNativeDriver: true,
      });
      animation.start();
      return () => animation.stop();
    }

    opacity.setValue(0);
    scale.setValue(reduced ? 1 : 0.8);
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        duration: reduced ? 0 : 160,
        isInteraction: false,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(scale, {
          damping: 9,
          stiffness: 260,
          toValue: reduced ? 1 : 1.08,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          damping: 12,
          overshootClamping: true,
          stiffness: 220,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [opacity, reduced, scale, visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.successPulse, { opacity, transform: [{ scale }] }]}>
      <Text style={styles.successPulseIcon}>OK</Text>
      {label ? <Text style={styles.successPulseText}>{label}</Text> : null}
    </Animated.View>
  );
}

export function TypingText({
  speed = 10,
  style,
  text,
}: {
  speed?: number;
  style?: StyleProp<TextStyle>;
  text: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [visibleText, setVisibleText] = useState(reduced ? text : '');

  useEffect(() => {
    if (reduced) {
      setVisibleText(text);
      return;
    }
    setVisibleText('');
    let index = 0;
    const timer = setInterval(() => {
      index += 3;
      setVisibleText(text.slice(0, index));
      if (index >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [reduced, speed, text]);

  return <Text style={style}>{visibleText}</Text>;
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    progressFill: {
      borderRadius: radii.pill,
      height: '100%',
    },
    progressTrack: {
      backgroundColor: colors.surface2,
      borderRadius: radii.pill,
      height: 9,
      overflow: 'hidden',
      width: '100%',
    },
    successPulse: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: colors.emeraldSoft,
      borderColor: colors.emerald,
      borderRadius: radii.card,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    successPulseIcon: {
      color: colors.emerald,
      fontSize: 12,
      fontWeight: '900',
    },
    successPulseText: {
      color: colors.emeraldDark,
      fontSize: 13,
      fontWeight: '800',
    },
  });
}
