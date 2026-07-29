import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const ANDROID_CHANNEL = "daily-reminder";

/**
 * Cấu hình cách hiển thị notification khi app đang mở (foreground).
 * Gọi 1 lần khi app khởi động.
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Xin quyền gửi notification. Trả về true nếu được cấp. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/**
 * Lên lịch nhắc học hằng ngày lúc `hour:minute` (lặp lại mỗi ngày).
 * Xóa lịch cũ trước khi đặt lịch mới. Trả về false nếu chưa được cấp quyền.
 */
export async function scheduleDailyReminder(
  hour: number,
  minute = 0
): Promise<boolean> {
  const ok = await ensureNotificationPermission();
  if (!ok) return false;

  await Notifications.cancelAllScheduledNotificationsAsync();

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: "Nhắc học hằng ngày",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🎴 Đến giờ ôn từ rồi!",
      body: "Mở LinguaCards ôn vài từ để giữ chuỗi ngày học nhé.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: Platform.OS === "android" ? ANDROID_CHANNEL : undefined,
    },
  });
  return true;
}

/** Hủy toàn bộ lịch nhắc học. */
export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** "20:05" từ (20, 5). */
export function formatHm(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Nhãn buổi trong ngày cho giờ nhắc — dùng cho phần mô tả. */
export function partOfDay(hour: number): string {
  if (hour < 5) return "khuya";
  if (hour < 11) return "sáng";
  if (hour < 13) return "trưa";
  if (hour < 18) return "chiều";
  return "tối";
}

/**
 * Còn bao lâu tới lần nhắc kế tiếp. `tomorrow` = true nếu giờ nhắc hôm nay đã
 * qua (lần nhắc sẽ là ngày mai).
 */
export function nextReminderIn(
  hour: number,
  minute: number,
  now: Date = new Date()
): { tomorrow: boolean; minutes: number } {
  const target = hour * 60 + minute;
  const current = now.getHours() * 60 + now.getMinutes();
  const diff = target - current;
  return diff > 0
    ? { tomorrow: false, minutes: diff }
    : { tomorrow: true, minutes: diff + 24 * 60 };
}

/** "còn 3 giờ 12 phút" / "còn 45 phút". */
export function formatCountdown(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `còn ${m} phút`;
  if (m === 0) return `còn ${h} giờ`;
  return `còn ${h} giờ ${m} phút`;
}
