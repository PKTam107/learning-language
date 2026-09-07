/**
 * Đặt tên thiết bị từ User-Agent — đủ để người dùng nhận ra máy nào trong danh
 * sách ("Chrome · Windows"), không cần thư viện detect đầy đủ.
 * Client mobile tự gửi tên máy thật nên hàm này chủ yếu phục vụ web.
 */
export function describeUserAgent(ua: string | null): {
  name: string;
  platform: string;
} {
  if (!ua) return { name: "Thiết bị lạ", platform: "web" };

  const browser =
    // Thứ tự quan trọng: Edge/Opera/Chrome đều tự nhận là "Chrome" trong UA.
    /Edg\//.test(ua) ? "Edge" :
    /OPR\/|Opera/.test(ua) ? "Opera" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Safari\//.test(ua) ? "Safari" :
    "Trình duyệt";

  const os =
    /Windows/.test(ua) ? "Windows" :
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad|iPod/.test(ua) ? "iOS" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Linux/.test(ua) ? "Linux" :
    "";

  return {
    name: os ? `${browser} · ${os}` : browser,
    platform: "web",
  };
}

/**
 * IP thật của client sau proxy (Vercel đặt x-forwarded-for). Lấy phần tử đầu —
 * các hop sau là proxy chứ không phải người dùng.
 */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim() || null;
  return request.headers.get("x-real-ip");
}

/** Device id client gửi kèm; bỏ qua giá trị rác để không phình bộ đếm. */
export function requestDeviceId(request: Request): string | null {
  const id = request.headers.get("x-device-id")?.trim();
  if (!id || id.length < 8 || id.length > 64) return null;
  return id;
}
