import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";

const DEVICE_ID_KEY = "lc-device-id";

let cachedId: string | null = null;

/**
 * Id ổn định cho máy này, sinh một lần rồi giữ trong AsyncStorage — đăng nhập
 * lại vẫn là "cùng một thiết bị" thay vì đẻ dòng mới, và hạn mức rate limit
 * theo thiết bị bám đúng máy. Gỡ app = coi như máy mới.
 */
export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) {
      cachedId = existing;
      return existing;
    }
  } catch {
    /* đọc lỗi → sinh id mới bên dưới */
  }
  const id = Crypto.randomUUID();
  cachedId = id;
  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  } catch {
    /* không lưu được → id chỉ sống trong phiên chạy này */
  }
  return id;
}

/** Mô tả máy để hiện trong danh sách thiết bị: "Pixel 7 · Android". */
export function describeDevice(): {
  name: string;
  platform: "ios" | "android";
  appVersion?: string;
} {
  const os = Platform.OS === "ios" ? "iOS" : "Android";
  const name = Constants.deviceName ? `${Constants.deviceName} · ${os}` : os;
  return {
    name,
    // App chỉ build cho iOS/Android; các platform khác của RN không dùng tới.
    platform: Platform.OS === "ios" ? "ios" : "android",
    appVersion: Constants.expoConfig?.version ?? undefined,
  };
}

/** Header nhận diện thiết bị, kèm mọi request tới API của web app. */
export async function deviceHeaders(): Promise<Record<string, string>> {
  return { "x-device-id": await getDeviceId() };
}
