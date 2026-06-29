import AsyncStorage from '@react-native-async-storage/async-storage';

export const SETUP_DISMISSED_KEY = 'finance:first-snapshot-setup-dismissed';

export async function getSetupDismissed() {
  return (await AsyncStorage.getItem(SETUP_DISMISSED_KEY)) === 'true';
}

export async function setSetupDismissed(dismissed: boolean) {
  if (dismissed) {
    await AsyncStorage.setItem(SETUP_DISMISSED_KEY, 'true');
    return;
  }

  await AsyncStorage.removeItem(SETUP_DISMISSED_KEY);
}
