import * as Haptics from 'expo-haptics';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, PressableProps, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppPalette, radii } from '@/constants/theme';
import { useAppTheme } from '@/contexts/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => subscription.remove();
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
  const opacity = useSharedValue(reduced ? 1 : 0);
  const translateY = useSharedValue(reduced ? 0 : 14);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: reduced ? 0 : 240 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: reduced ? 0 : 240 }));
  }, [delay, opacity, reduced, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
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
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...props}
      onPress={onPress}
      onPressIn={(event) => {
        scale.value = withTiming(reduced ? 1 : 0.97, { duration: 90 });
        props.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        props.onPressOut?.(event);
      }}
      style={[animatedStyle, style]}>
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
  const width = useSharedValue(reduced ? progress : 0);
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    width.value = withTiming(Math.max(0, Math.min(progress, 1)), { duration: reduced ? 0 : 420 });
  }, [progress, reduced, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={[styles.progressTrack, trackColor ? { backgroundColor: trackColor } : null]}>
      <Animated.View style={[styles.progressFill, { backgroundColor: color }, animatedStyle]} />
    </View>
  );
}

export function SuccessPulse({ label, visible }: { label?: string; visible: boolean }) {
  const { colors } = useAppTheme();
  const reduced = usePrefersReducedMotion();
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (!visible) {
      opacity.value = withTiming(0, { duration: reduced ? 0 : 120 });
      return;
    }
    opacity.value = withTiming(1, { duration: reduced ? 0 : 160 });
    scale.value = reduced ? 1 : withSequence(withSpring(1.08, { damping: 9, stiffness: 260 }), withSpring(1));
  }, [opacity, reduced, scale, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.successPulse, animatedStyle]}>
      <Text style={styles.successPulseIcon}>✓</Text>
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
      fontSize: 16,
      fontWeight: '900',
    },
    successPulseText: {
      color: colors.emeraldDark,
      fontSize: 13,
      fontWeight: '800',
    },
  });
}
