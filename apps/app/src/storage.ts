import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { KeyValueStorage } from '@hiaok/core';

const KEY = 'hiaok-web.session';

/**
 * Where the session (server URL, token, language) is kept. Web: localStorage. iOS / Android: the keychain /
 * keystore through expo-secure-store — async, so the value is read once up front and written through afterwards,
 * which lets the (synchronous) session port stay unchanged.
 */
export async function openStorage(): Promise<KeyValueStorage | undefined> {
  if (Platform.OS === 'web') return undefined; // core falls back to localStorage (or memory when blocked)
  const cache = new Map<string, string>();
  try {
    const saved = await SecureStore.getItemAsync(KEY);
    if (saved) cache.set(KEY, saved);
  } catch {
    /* unreadable keychain entry: start signed out */
  }
  return {
    getItem: (k) => cache.get(k) ?? null,
    setItem: (k, v) => { cache.set(k, v); void SecureStore.setItemAsync(k, v).catch(() => undefined); },
    removeItem: (k) => { cache.delete(k); void SecureStore.deleteItemAsync(k).catch(() => undefined); },
  };
}
