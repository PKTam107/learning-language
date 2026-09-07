"use client";

import { useEffect } from "react";
import { useSession } from "@/hooks/useSession";
import { getDeviceId } from "@/lib/device";

const LAST_PING_KEY = "lc-device-ping";
// Ping lại sau 1 giờ: đủ để "hoạt động gần đây" chính xác theo giờ mà không
// thêm request vào mỗi lần chuyển trang.
const PING_EVERY_MS = 60 * 60 * 1000;

/**
 * Ghi kèm user id chứ không chỉ mốc thời gian: đăng nhập tài khoản khác trên
 * cùng máy phải ping ngay, nếu không danh sách thiết bị của tài khoản mới sẽ
 * thiếu chính máy này cho tới khi hết giờ nghỉ.
 */
function shouldPing(userId: string): boolean {
  try {
    const [lastUser, lastAt] = (
      localStorage.getItem(LAST_PING_KEY) ?? ""
    ).split(":");
    if (lastUser !== userId) return true;
    const at = Number(lastAt);
    return !Number.isFinite(at) || Date.now() - at > PING_EVERY_MS;
  } catch {
    return true;
  }
}

/**
 * Báo cho server biết máy này vừa hoạt động, sau khi đã đăng nhập.
 * Đặt ở layout gốc nên chạy trên mọi trang; tự giới hạn nhịp bằng localStorage.
 * Lỗi thì im lặng — đây là tính năng phụ, không được cản việc học.
 */
export function DevicePing() {
  const { user } = useSession();

  useEffect(() => {
    if (!user) return;
    const deviceId = getDeviceId();
    if (!deviceId || !shouldPing(user.id)) return;

    // Đánh dấu trước khi gọi: hai tab mở cùng lúc chỉ ping một lần.
    try {
      localStorage.setItem(LAST_PING_KEY, `${user.id}:${Date.now()}`);
    } catch {
      /* storage bị chặn → cùng lắm ping mỗi lần tải trang */
    }

    fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-device-id": deviceId },
      body: JSON.stringify({ deviceId, platform: "web" }),
    }).catch(() => {});
  }, [user]);

  return null;
}
