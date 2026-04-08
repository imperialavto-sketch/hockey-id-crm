/**
 * Coach session persistence: SecureStore on native, AsyncStorage on web (SecureStore is a no-op on web).
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'coach_auth_token';
const USER_KEY = 'coach_auth_user';
const ASYNC_PREFIX = '@hockey_coach_session:';

async function preferSecureStore(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function coachSessionSave(token: string, userJson: string): Promise<void> {
  if (await preferSecureStore()) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, userJson);
    await AsyncStorage.multiRemove([ASYNC_PREFIX + TOKEN_KEY, ASYNC_PREFIX + USER_KEY]);
    return;
  }
  await AsyncStorage.setItem(ASYNC_PREFIX + TOKEN_KEY, token);
  await AsyncStorage.setItem(ASYNC_PREFIX + USER_KEY, userJson);
}

export async function coachSessionLoad(): Promise<{ token: string; userJson: string } | null> {
  if (await preferSecureStore()) {
    const [t, u] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);
    if (t && u) return { token: t, userJson: u };
  }
  const [t2, u2] = await Promise.all([
    AsyncStorage.getItem(ASYNC_PREFIX + TOKEN_KEY),
    AsyncStorage.getItem(ASYNC_PREFIX + USER_KEY),
  ]);
  if (t2 && u2) return { token: t2, userJson: u2 };
  return null;
}

export async function coachSessionClear(): Promise<void> {
  await AsyncStorage.multiRemove([ASYNC_PREFIX + TOKEN_KEY, ASYNC_PREFIX + USER_KEY]);
  if (Platform.OS !== 'web') {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      /* missing key / simulator edge cases */
    }
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch {
      /* */
    }
  }
}
