/**
 * Tính toán & định dạng giờ nhắc học (dùng chung cho trang Cài đặt và banner
 * nhắc ở dashboard). Toàn bộ là hàm thuần — an toàn cho cả server & client.
 */

/** "20:05" từ (20, 5). */
export function formatHm(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Tách "20:05" thành { hour, minute }; trả null nếu chuỗi không hợp lệ. */
export function parseHm(
  value: string
): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/** Nhãn buổi trong ngày cho giờ nhắc. */
export function partOfDay(hour: number): string {
  if (hour < 5) return "khuya";
  if (hour < 11) return "sáng";
  if (hour < 13) return "trưa";
  if (hour < 18) return "chiều";
  return "tối";
}

/** Phút thứ mấy trong ngày. */
export function minutesOfDay(hour: number, minute: number): number {
  return hour * 60 + minute;
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
  const diff =
    minutesOfDay(hour, minute) - minutesOfDay(now.getHours(), now.getMinutes());
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

/** Mốc giờ gợi ý — đồng bộ với app mobile. */
export const REMINDER_PRESETS: {
  label: string;
  hour: number;
  minute: number;
}[] = [
  { label: "Sáng sớm", hour: 6, minute: 30 },
  { label: "Buổi sáng", hour: 8, minute: 0 },
  { label: "Nghỉ trưa", hour: 12, minute: 30 },
  { label: "Buổi tối", hour: 20, minute: 0 },
  { label: "Trước ngủ", hour: 22, minute: 30 },
];
