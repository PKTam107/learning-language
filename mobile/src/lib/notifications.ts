import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchDecksWithStats } from "@/lib/decks";

const SETTINGS_KEY = "reminder-settings-v1";
const ANDROID_CHANNEL = "reminders";
const WEEKDAYS_MON_FRI = [2, 3, 4, 5, 6]; // 1=CN … 7=T7 → T2–T6

export interface ReminderSettings {
  enabled: boolean;
  /** Các mốc giờ nhắc trong ngày, dạng "HH:MM" (nhiều lần/ngày). */
  times: string[];
  /** Có nhắc vào cuối tuần (T7/CN) không. */
  includeWeekends: boolean;
}

export const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  times: ["20:00"],
  includeWeekends: true,
};

// ---------- Lưu / đọc cấu hình (AsyncStorage) ----------

export async function loadReminderSettings(): Promise<ReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveReminderSettings(s: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// ---------- Quyền + handler ----------

/** Hiển thị banner cả khi app đang mở. Gọi 1 lần ở root layout. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Đảm bảo có quyền + kênh Android. Trả về true nếu được phép. */
export async function ensurePermissions(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: "Nhắc ôn từ",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

// ---------- Tính số từ cần ôn ----------

/** Tổng số từ đến hạn ôn trên tất cả bộ thẻ (tái dùng fetchDecksWithStats). */
export async function computeDueCount(): Promise<number> {
  const decks = await fetchDecksWithStats();
  return decks.reduce((sum, d) => sum + (d.stats?.due ?? 0), 0);
}

// ---------- Lên lịch ----------

function parseTime(t: string): { hour: number; minute: number } | null {
  const [h, m] = t.split(":").map((x) => Number(x));
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { hour: h, minute: m };
}

/**
 * Huỷ toàn bộ lịch cũ và đặt lại theo cấu hình hiện tại.
 * Nội dung thông báo là tĩnh (đặc thù local notification) → dùng số từ cần ôn
 * TẠI THỜI ĐIỂM gọi hàm này (mỗi lần mở app / học xong sẽ gọi để cập nhật).
 */
export async function refreshReminders(): Promise<void> {
  const settings = await loadReminderSettings();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.enabled || settings.times.length === 0) return;

  if (!(await ensurePermissions())) return;

  const due = await computeDueCount().catch(() => 0);
  const body =
    due > 0
      ? `Bạn có ${due} từ cần ôn. Review ngay?`
      : "Đến giờ ôn từ rồi! Mở LinguaCards để học nhé.";
  const content: Notifications.NotificationContentInput = {
    title: "LinguaCards 🎴",
    body,
    data: { type: "review" },
  };

  for (const t of settings.times) {
    const parsed = parseTime(t);
    if (!parsed) continue;
    const { hour, minute } = parsed;

    if (settings.includeWeekends) {
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: ANDROID_CHANNEL,
        },
      });
    } else {
      // Không cuối tuần → đặt riêng từng ngày T2–T6.
      for (const weekday of WEEKDAYS_MON_FRI) {
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour,
            minute,
            channelId: ANDROID_CHANNEL,
          },
        });
      }
    }
  }
}
