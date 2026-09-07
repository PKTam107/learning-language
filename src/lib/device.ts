"use client";

const DEVICE_ID_KEY = "lc-device-id";

/**
 * Id ổn định cho máy này, sinh một lần rồi giữ trong localStorage — nhờ vậy
 * đăng nhập lại vẫn là "cùng một thiết bị" thay vì đẻ thêm dòng mới, và hạn
 * mức theo thiết bị bám đúng máy.
 *
 * Xóa dữ liệu trình duyệt = coi như máy mới; đó là đánh đổi chấp nhận được cho
 * một id không cần fingerprint người dùng.
 */
export function getDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id =
      // randomUUID chỉ có ở secure context; fallback đủ ngẫu nhiên cho mục đích
      // phân biệt máy (không dùng cho bảo mật).
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return null; // chế độ riêng tư / chặn storage → bỏ qua, chỉ mất tracking
  }
}

/** Header kèm mọi request API để server biết máy nào đang gọi. */
export function deviceHeaders(): Record<string, string> {
  const id = getDeviceId();
  return id ? { "x-device-id": id } : {};
}
