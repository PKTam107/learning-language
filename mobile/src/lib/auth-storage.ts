import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { createEncryptedAuthStorage } from "./encrypted-auth-storage";

const options: SecureStore.SecureStoreOptions = {
  keychainService: "linguacards.auth",
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  // No biometric prompt on automatic token refresh.
  requireAuthentication: false,
};

// Expo web has no OS vault. Keep its encryption keys in memory only;
// a reload requires login instead of persisting an unprotected key/token.
const webKeys = new Map<string, string>();
const vault = Platform.OS === "web" ? {
  async getItem(key: string) { return webKeys.get(key) ?? null; },
  async setItem(key: string, value: string) { webKeys.set(key, value); },
  async removeItem(key: string) { webKeys.delete(key); },
} : {
  getItem: (key: string) => SecureStore.getItemAsync(key, options),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value, options),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key, options),
};

export const authStorage = createEncryptedAuthStorage(AsyncStorage, vault, Crypto.getRandomBytes);
