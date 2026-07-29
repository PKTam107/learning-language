"use client";

import { useCallback, useEffect, useState } from "react";

export interface AppSettings {
  /** Tự phát âm khi lật thẻ / lộ đáp án trong lúc học. */
  autoSpeak: boolean;
  /** Bật nhắc học hằng ngày (banner trong app). */
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

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage đầy / bị chặn — bỏ qua, không chặn app.
  }
}

/**
 * Hook đọc/ghi cài đặt (localStorage). `ready` = true sau khi đã nạp ở client —
 * dùng để tránh nháy trạng thái mặc định trước khi đọc xong (SSR → hydrate).
 */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setReady(true);
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  return { settings, ready, update };
}
