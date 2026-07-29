import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

export interface AppSettings {
  /** Tự phát âm khi lật thẻ trong lúc học. */
  autoSpeak: boolean;
  /** Bật nhắc học hằng ngày (local notification). */
  reminderEnabled: boolean;
  /** Giờ nhắc học (0..23). */
  reminderHour: number;
  /** Phút nhắc học (0..59). */
  reminderMinute: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoSpeak: true,
  reminderEnabled: false,
  reminderHour: 20,
  reminderMinute: 0,
};

const KEY = "linguacards.settings.v1";

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Bỏ qua lỗi ghi (thiết bị hết chỗ / storage lỗi) — không chặn app.
  }
}

/** Hook đọc/ghi cài đặt. `ready` = true khi đã nạp xong từ AsyncStorage. */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    loadSettings().then((s) => {
      if (!alive) return;
      setSettings(s);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void saveSettings(next);
      return next;
    });
  }, []);

  return { settings, ready, update };
}
