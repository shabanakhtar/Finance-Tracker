import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

type KeyboardAwareScrollViewProps = Omit<ScrollViewProps, 'keyboardDismissMode' | 'keyboardShouldPersistTaps'> & {
  children: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  keyboardDismissMode?: ScrollViewProps['keyboardDismissMode'];
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
  keyboardVerticalOffset?: number;
};

export function KeyboardAwareScrollView({
  children,
  containerStyle,
  keyboardDismissMode = 'interactive',
  keyboardShouldPersistTaps = 'handled',
  keyboardVerticalOffset = Platform.OS === 'ios' ? 12 : 0,
  style,
  ...scrollProps
}: KeyboardAwareScrollViewProps) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={[styles.keyboard, containerStyle]}>
      <ScrollView
        keyboardDismissMode={keyboardDismissMode}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={style}
        {...scrollProps}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
});
