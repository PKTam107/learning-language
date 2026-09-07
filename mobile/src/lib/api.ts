import { supabase } from "@/lib/supabase";
import { describeDevice, deviceHeaders, getDeviceId } from "@/lib/device";
import type { DraftCard } from "@/types";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

/** Gọi API route của web app kèm Bearer token của session hiện tại. */
async function apiFetch(path: string, body: unknown): Promise<Response> {
  if (!API_BASE) {
    throw new Error(
      "Thiếu EXPO_PUBLIC_API_BASE_URL — điền URL web app trong mobile/.env."
    );
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Chưa đăng nhập");

  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      // Cho server biết máy nào đang gọi: rate limit đếm riêng theo thiết bị
      // và danh sách "thiết bị đăng nhập" mới có dữ liệu.
      ...(await deviceHeaders()),
    },
    body: JSON.stringify(body),
  });
}

// Ping lại sau 1 giờ — đủ để "hoạt động gần đây" chính xác theo giờ mà không
// thêm request mỗi lần mở màn hình.
const PING_EVERY_MS = 60 * 60 * 1000;
let lastPingAt = 0;
// Nhớ cả tài khoản: đăng nhập tài khoản khác trên cùng máy phải ping lại ngay,
// nếu không danh sách thiết bị của tài khoản mới sẽ thiếu chính máy này.
let lastPingUser: string | null = null;

/**
 * Báo cho server biết máy này vừa hoạt động. Gọi sau khi đăng nhập và mỗi lần
 * mở app. Lỗi thì im lặng — tính năng phụ, không được cản việc học.
 */
export async function pingDevice(): Promise<void> {
  if (!API_BASE) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const sameUser = lastPingUser === session.user.id;
  if (sameUser && Date.now() - lastPingAt < PING_EVERY_MS) return;
  lastPingAt = Date.now();
  lastPingUser = session.user.id;

  try {
    const info = describeDevice();
    await apiFetch("/api/devices", {
      deviceId: await getDeviceId(),
      name: info.name,
      platform: info.platform,
      appVersion: info.appVersion,
    });
  } catch {
    lastPingAt = 0; // thất bại (vd mất mạng) → cho phép thử lại lần sau
  }
}

/** Tra cứu 1 từ → DraftCard (gọi /api/lookup của web). */
export async function lookupWord(
  word: string,
  source = "en",
  target = "vi"
): Promise<DraftCard> {
  const res = await apiFetch("/api/lookup", { word, source, target });
  if (res.status === 401) throw new Error("Phiên đăng nhập hết hạn");
  if (!res.ok) throw new Error("Tra từ thất bại");
  return (await res.json()) as DraftCard;
}

export interface WordEnrichment {
  cefrLevel?: string;
  wordFamily?: string[];
  collocations?: string[];
}

/** Làm giàu một lô từ (gọi /api/enrich của web) → { [word]: enrichment }. */
export async function enrichWords(
  words: string[]
): Promise<Record<string, WordEnrichment>> {
  const res = await apiFetch("/api/enrich", { words });
  if (res.status === 401) throw new Error("Phiên đăng nhập hết hạn");
  if (!res.ok) {
    const info = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(info?.message ?? "Làm giàu thất bại");
  }
  return (await res.json()) as Record<string, WordEnrichment>;
}
