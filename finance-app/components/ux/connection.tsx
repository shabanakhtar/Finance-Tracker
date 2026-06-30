import NetInfo from '@react-native-community/netinfo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppPalette, spacing } from '@/constants/theme';
import { useAppTheme } from '@/contexts/theme';

export function useConnectionStatus() {
  const [isChecking, setIsChecking] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsChecking(false);
      setIsOffline(!(state.isConnected === true && state.isInternetReachable !== false));
    });

    NetInfo.fetch()
      .then((state) => {
        setIsChecking(false);
        setIsOffline(!(state.isConnected === true && state.isInternetReachable !== false));
      })
      .catch(() => {
        setIsChecking(false);
      });

    return unsubscribe;
  }, []);

  return { isChecking, isOffline };
}

export function ConnectionNotice({
  message = 'You appear to be offline. New transactions can still be saved on this device and synced later.',
}: {
  message?: string;
}) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.notice}>
      <MaterialCommunityIcons color={colors.amber} name="wifi-off" size={18} />
      <Text style={styles.noticeText}>{message}</Text>
    </View>
  );
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    notice: {
      alignItems: 'flex-start',
      backgroundColor: colors.warningSoft,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.md,
    },
    noticeText: {
      color: colors.ink,
      flex: 1,
      fontSize: 13,
      fontWeight: '800',
      lineHeight: 18,
    },
  });
}
