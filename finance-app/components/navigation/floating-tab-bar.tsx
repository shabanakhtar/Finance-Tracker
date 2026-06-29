import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Href, router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, triggerSelection } from '@/components/ux';
import { AppPalette, radii } from '@/constants/theme';
import { useAppTheme } from '@/contexts/theme';

const routeIcons: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  ai: 'creation-outline',
  analysis: 'chart-timeline-variant',
  explore: 'plus',
  index: 'view-dashboard-variant-outline',
  settings: 'cog-outline',
};

const routeLabels: Record<string, string> = {
  ai: 'AI',
  analysis: 'Analysis',
  explore: 'Add',
  index: 'Home',
  settings: 'Settings',
};

export function FloatingTabBar({ descriptors, navigation, state }: BottomTabBarProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const bottomPadding = Math.max(insets.bottom, 12);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: bottomPadding }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const isQuickAdd = route.name === 'explore';
          const label = routeLabels[route.name] ?? descriptors[route.key].options.title ?? route.name;
          const icon = routeIcons[route.name] ?? 'circle-outline';

          const onPress = () => {
            triggerSelection();
            if (isQuickAdd) {
              router.push('/quick-add' as Href);
              return;
            }
            const event = navigation.emit({
              canPreventDefault: true,
              target: route.key,
              type: 'tabPress',
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          if (isQuickAdd) {
            return (
              <PressableScale
                accessibilityLabel="Quick add transaction"
                accessibilityRole="button"
                key={route.key}
                onPress={onPress}
                style={styles.centerSlot}>
                <View style={styles.centerButton}>
                  <MaterialCommunityIcons color="#ffffff" name={icon} size={30} />
                </View>
                <Text style={styles.centerLabel}>{label}</Text>
              </PressableScale>
            );
          }

          return (
            <PressableScale
              accessibilityRole="button"
              key={route.key}
              onPress={onPress}
              style={[styles.item, isFocused ? styles.itemActive : null]}>
              <MaterialCommunityIcons color={isFocused ? colors.sky : colors.muted2} name={icon} size={24} />
              <Text style={[styles.label, isFocused ? styles.labelActive : null]}>{label}</Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    bar: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 30,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 4,
      minHeight: 76,
      paddingHorizontal: 10,
      shadowColor: '#000000',
      shadowOffset: { height: 10, width: 0 },
      shadowOpacity: 0.16,
      shadowRadius: 18,
    },
    centerButton: {
      alignItems: 'center',
      backgroundColor: colors.sky,
      borderColor: colors.background,
      borderRadius: radii.pill,
      borderWidth: 4,
      height: 64,
      justifyContent: 'center',
      marginTop: -30,
      shadowColor: colors.sky,
      shadowOffset: { height: 8, width: 0 },
      shadowOpacity: 0.28,
      shadowRadius: 12,
      width: 64,
    },
    centerLabel: {
      color: colors.sky,
      fontSize: 11,
      fontWeight: '900',
      marginTop: 2,
    },
    centerSlot: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
    },
    item: {
      alignItems: 'center',
      borderRadius: 22,
      flex: 1,
      gap: 4,
      justifyContent: 'center',
      minHeight: 58,
      paddingHorizontal: 4,
    },
    itemActive: {
      backgroundColor: colors.skySoft,
    },
    label: {
      color: colors.muted2,
      fontSize: 11,
      fontWeight: '800',
    },
    labelActive: {
      color: colors.sky,
    },
    wrap: {
      bottom: 0,
      left: 0,
      paddingHorizontal: 16,
      position: 'absolute',
      right: 0,
    },
  });
}
