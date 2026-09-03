import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_NEW_PER_DAY, NEW_PER_DAY_OPTIONS } from "@/lib/queue";

export interface AppSettings {
  /** Tự phát âm khi lật thẻ trong lúc học. */
  autoSpeak: boolean;
  /** Bật nhắc học hằng ngày (local notification). */
  reminderEnabled: boolean;
  /** Giờ nhắc học (0..23). */
  reminderHour: number;
  /** Phút nhắc học (0..59). */
  reminderMinute: number;
  /** Hạn mức từ mới mỗi ngày (0 = không giới hạn) — xem lib/queue.ts. */
  newPerDay: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoSpeak: true,
  reminderEnabled: false,
  reminderHour: 20,
  reminderMinute: 0,
  newPerDay: DEFAULT_NEW_PER_DAY,
};

const int = (v: unknown, fallback: number, min: number, max: number): number => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return n;
};

/**
 * Lọc dữ liệu lạ về đúng miền giá trị — cài đặt đến từ AsyncStorage của thiết bị
 * và từ jsonb trên tài khoản (có thể do bản app khác ghi) nên không tin trực tiếp.
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
    out.newPerDay = NEW_PER_DAY_OPTIONS.includes(n) ? n : DEFAULT_NEW_PER_DAY;
  }
  return out;
}

/**
 * Cài đặt trên tài khoản (`profiles.settings`, migration 0009) — để đổi thiết bị
 * không mất. Giao diện sáng/tối vẫn cố tình để theo thiết bị.
 */
async function fetchRemoteSettings(): Promise<Record<string, unknown> | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("settings")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  return (data.settings as Record<string, unknown> | null) ?? null;
}

async function saveRemoteSettings(settings: AppSettings): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, settings }, { onConflict: "id" });
  if (error) console.warn("saveRemoteSettings:", error.message);
}

const KEY = "linguacards.settings.v1";

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...sanitizeSettings(JSON.parse(raw)) };
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

/**
 * Hook đọc/ghi cài đặt. Thứ tự nạp: AsyncStorage của thiết bị (hiện ngay) →
 * `profiles.settings` của tài khoản (nguồn sự thật, ghi đè lại).
 * `ready` = true sau bước đầu, vì bước sau có thể không bao giờ về (offline).
 */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  /** Bản mới nhất, để `update` gộp patch mà không phụ thuộc thứ tự setState. */
  const latest = useRef<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let alive = true;
    loadSettings().then(async (local) => {
      if (!alive) return;
      latest.current = local;
      setSettings(local);
      setReady(true);

      const remote = await fetchRemoteSettings();
      if (!alive || !remote) return;
      const merged = { ...local, ...sanitizeSettings(remote) };
      latest.current = merged;
      setSettings(merged);
      void saveSettings(merged);
    });
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setSettings(next);
    void saveSettings(next);
    void saveRemoteSettings(next);
  }, []);

  return { settings, ready, update };
}
