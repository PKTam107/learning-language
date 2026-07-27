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
 * Lên lịch nhắc học hằng ngày lúc `hour` giờ (lặp lại mỗi ngày).
 * Xóa lịch cũ trước khi đặt lịch mới. Trả về false nếu chưa được cấp quyền.
 */
export async function scheduleDailyReminder(hour: number): Promise<boolean> {
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
      minute: 0,
      channelId: Platform.OS === "android" ? ANDROID_CHANNEL : undefined,
    },
  });
  return true;
}

/** Hủy toàn bộ lịch nhắc học. */
export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
