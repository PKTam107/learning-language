"use client";

import { deviceHeaders } from "@/lib/device";

/**
 * Gọi route handler của app kèm header nhận diện thiết bị.
 * Dùng thay `fetch` trần cho mọi lời gọi /api/* từ web, để rate limit theo
 * thiết bị và danh sách thiết bị đăng nhập có dữ liệu.
 */
export function apiFetch(path: string, body: unknown): Promise<Response> {
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...deviceHeaders() },
    body: JSON.stringify(body),
  });
}
