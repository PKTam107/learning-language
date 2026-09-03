"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_NEW_PER_DAY, NEW_PER_DAY_OPTIONS } from "@/lib/queue";
import { fetchRemoteSettings, saveRemoteSettings } from "@/lib/db/settings";

export interface AppSettings {
  /** Tự phát âm khi lật thẻ / lộ đáp án trong lúc học. */
  autoSpeak: boolean;
  /** Bật nhắc học hằng ngày (banner trong app). */
  reminderEnabled: boolean;
  /** Giờ nhắc học (0..23). */
  reminderHour: number;
  /** Phút nhắc học (0..59). */
  reminderMinute: number;
  /** Hạn mức từ mới mỗi ngày (0 = không giới hạn) — xem `lib/queue.ts`. */
  newPerDay: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoSpeak: true,
  reminderEnabled: false,
  reminderHour: 20,
  reminderMinute: 0,
  newPerDay: DEFAULT_NEW_PER_DAY,
};

const KEY = "linguacards.settings.v1";

const int = (v: unknown, fallback: number, min: number, max: number): number => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return n;
};

/**
 * Lọc dữ liệu lạ về đúng miền giá trị. Cài đặt đến từ hai nguồn không kiểm soát
 * được (localStorage của thiết bị + jsonb trên tài khoản, có thể do bản app
 * khác ghi), nên không tin trực tiếp.
 */
export function sanitizeSettings(raw: unknown): Partial<AppSettings> {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: Partial<AppSettings> = {};
  if (typeof r.autoSpeak === "boolean") out.autoSpeak = r.autoSpeak;
  if (typeof r.reminderEnabled === "boolean")
    out.reminderEnabled = r.reminderEnabled;
  if (r.reminderHour !== undefined)
    out.reminderHour = int(r.reminderHour, DEFAULT_SETTINGS.reminderHour, 0, 23);
  if (r.reminderMinute !== undefined)
    out.reminderMinute = int(
      r.reminderMinute,
      DEFAULT_SETTINGS.reminderMinute,
      0,
      59
    );
  if (r.newPerDay !== undefined) {
    const n = int(r.newPerDay, DEFAULT_NEW_PER_DAY, 0, 500);
    // Chỉ nhận các mức có trong Cài đặt để UI không hiện giá trị lạ.
    out.newPerDay = NEW_PER_DAY_OPTIONS.includes(n) ? n : DEFAULT_NEW_PER_DAY;
  }
  return out;
}

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...sanitizeSettings(JSON.parse(raw)) };
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
 * Hook đọc/ghi cài đặt. Thứ tự nạp:
 *   1. localStorage của thiết bị → hiện ngay, không nháy trạng thái mặc định.
 *   2. `profiles.settings` của tài khoản → nguồn sự thật, ghi đè lại bước 1.
 *
 * Ghi thì ghi cả hai nơi (tài khoản ghi ngầm, lỗi mạng không chặn UI).
 * `ready` = true sau bước 1, vì bước 2 có thể không bao giờ về (offline).
 */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  /** Bản mới nhất, để `update` gộp patch mà không phụ thuộc thứ tự setState. */
  const latest = useRef<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const local = loadSettings();
    latest.current = local;
    setSettings(local);
    setReady(true);

    let alive = true;
    void fetchRemoteSettings().then((remote) => {
      if (!alive || !remote) return;
      const merged = { ...local, ...sanitizeSettings(remote) };
      latest.current = merged;
      setSettings(merged);
      saveSettings(merged);
    });
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setSettings(next);
    saveSettings(next);
    void saveRemoteSettings(next as unknown as Record<string, unknown>);
  }, []);

  return { settings, ready, update };
}
