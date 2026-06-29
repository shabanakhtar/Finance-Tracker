import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Dialog, Portal, Snackbar } from 'react-native-paper';

import { AppPalette, spacing } from '@/constants/theme';
import { useAppTheme } from '@/contexts/theme';
import { AnimatedScreen } from './motion';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export function DelayedLoader({
  label = 'Loading...',
  longLabel = 'Still working. This is taking longer than usual.',
  minDelayMs = 500,
  longDelayMs = 2500,
}: {
  label?: string;
  longLabel?: string;
  minDelayMs?: number;
  longDelayMs?: number;
}) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [visible, setVisible] = useState(false);
  const [longWait, setLongWait] = useState(false);

  useEffect(() => {
    const visibleTimer = setTimeout(() => setVisible(true), minDelayMs);
    const longTimer = setTimeout(() => setLongWait(true), longDelayMs);
    return () => {
      clearTimeout(visibleTimer);
      clearTimeout(longTimer);
    };
  }, [longDelayMs, minDelayMs]);

  if (!visible) return null;

  return (
    <View style={styles.loader}>
      <ActivityIndicator color={colors.sky} size="large" />
      <Text style={styles.loaderTitle}>{longWait ? longLabel : label}</Text>
    </View>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.skeletonCard}>
      <View style={[styles.skeletonLine, styles.skeletonTitle]} />
      {Array.from({ length: lines }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.skeletonLine,
            { width: `${Math.max(46, 90 - index * 14)}%` },
          ]}
        />
      ))}
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: spacing.md }}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} lines={index === 0 ? 3 : 2} />
      ))}
    </View>
  );
}

export function AppErrorState({
  actionLabel = 'Try again',
  details,
  message,
  onAction,
  title = 'Something went wrong',
}: {
  actionLabel?: string;
  details?: string;
  message: string;
  onAction?: () => void;
  title?: string;
}) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <Card style={styles.errorCard}>
      <Card.Content style={styles.stateContent}>
        <View style={styles.stateHeader}>
          <MaterialCommunityIcons color={colors.coral} name="alert-circle-outline" size={22} />
          <Text style={styles.errorTitle}>{title}</Text>
        </View>
        <Text style={styles.errorText}>{message}</Text>
        {details ? <Text style={styles.detailsText}>{details}</Text> : null}
        {onAction ? (
          <Button mode="contained" onPress={onAction} style={styles.errorButton}>
            {actionLabel}
          </Button>
        ) : null}
      </Card.Content>
    </Card>
  );
}

export function EmptyState({
  actionLabel,
  children,
  icon = 'information-outline',
  onAction,
  text,
  title,
}: {
  actionLabel?: string;
  children?: ReactNode;
  icon?: IconName;
  onAction?: () => void;
  text: string;
  title?: string;
}) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons color={colors.sky} name={icon} size={24} />
      </View>
      {title ? <Text style={styles.emptyTitle}>{title}</Text> : null}
      <Text style={styles.emptyText}>{text}</Text>
      {children}
      {actionLabel && onAction ? (
        <Button mode="contained-tonal" onPress={onAction} style={styles.emptyButton}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

export function SuccessBanner({
  icon = 'check-circle-outline',
  message,
  title = 'Success',
}: {
  icon?: IconName;
  message: string;
  title?: string;
}) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <AnimatedScreen style={styles.successBanner}>
      <MaterialCommunityIcons color={colors.emerald} name={icon} size={22} />
      <View style={styles.successTextWrap}>
        <Text style={styles.successTitle}>{title}</Text>
        <Text style={styles.successText}>{message}</Text>
      </View>
    </AnimatedScreen>
  );
}

export function SuccessToast({
  actionLabel,
  message,
  onAction,
  onDismiss,
  visible,
}: {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  onDismiss: () => void;
  visible: boolean;
}) {
  return (
    <Snackbar
      action={actionLabel && onAction ? { label: actionLabel, onPress: onAction } : undefined}
      duration={3500}
      onDismiss={onDismiss}
      visible={visible}>
      {message}
    </Snackbar>
  );
}

export function ConfirmDialog({
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  destructive = false,
  loading = false,
  message,
  onCancel,
  onConfirm,
  title,
  visible,
}: {
  cancelLabel?: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
}) {
  const { colors } = useAppTheme();

  return (
    <Portal>
      <Dialog onDismiss={loading ? undefined : onCancel} visible={visible}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button disabled={loading} onPress={onCancel}>
            {cancelLabel}
          </Button>
          <Button loading={loading} onPress={onConfirm} textColor={destructive ? colors.coral : colors.sky}>
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    detailsText: {
      color: colors.muted2,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 4,
    },
    emptyButton: {
      borderRadius: 8,
      marginTop: spacing.xs,
    },
    emptyIcon: {
      alignItems: 'center',
      backgroundColor: colors.skySoft,
      borderRadius: 8,
      height: 42,
      justifyContent: 'center',
      width: 42,
    },
    emptyState: {
      alignItems: 'center',
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 8,
      borderStyle: 'dashed',
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.lg,
    },
    emptyText: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },
    emptyTitle: {
      color: colors.ink,
      fontSize: 16,
      fontWeight: '900',
      textAlign: 'center',
    },
    errorButton: {
      alignSelf: 'flex-start',
      backgroundColor: colors.coral,
      borderRadius: 8,
      marginTop: spacing.sm,
    },
    errorCard: {
      backgroundColor: colors.coralSoft,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
    },
    errorText: {
      color: colors.ink,
      fontSize: 13,
      lineHeight: 19,
    },
    errorTitle: {
      color: colors.ink,
      fontSize: 17,
      fontWeight: '900',
    },
    loader: {
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.xl,
    },
    loaderTitle: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
    },
    skeletonCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      gap: spacing.md,
      padding: spacing.lg,
    },
    skeletonLine: {
      backgroundColor: colors.surface2,
      borderRadius: 999,
      height: 12,
    },
    skeletonTitle: {
      height: 18,
      width: '62%',
    },
    stateContent: {
      gap: spacing.sm,
    },
    stateHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    successBanner: {
      alignItems: 'flex-start',
      backgroundColor: colors.emeraldSoft,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.md,
    },
    successText: {
      color: colors.emeraldDark,
      fontSize: 13,
      lineHeight: 18,
    },
    successTextWrap: {
      flex: 1,
      gap: 2,
    },
    successTitle: {
      color: colors.emeraldDark,
      fontSize: 14,
      fontWeight: '900',
    },
  });
}
