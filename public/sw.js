/**
 * Service worker của LinguaCards.
 *
 * Chiến lược cố ý giữ hẹp:
 * - Tài nguyên tĩnh (`/_next/static`, icon, font): cache-first — chúng có hash
 *   trong tên nên không bao giờ cũ.
 * - Điều hướng trang: **luôn đi mạng**, mất mạng mới rơi về trang /offline.
 *   Không cache HTML vì mỗi trang chứa dữ liệu riêng của tài khoản đang đăng
 *   nhập — cache lại sẽ rò sang người dùng khác trên máy dùng chung.
 * - `/api/*`, Supabase, từ điển, file audio: không đụng tới.
 *
 * Đổi VERSION khi sửa file này để cache cũ bị dọn ở lần activate kế tiếp.
 */
const VERSION = "v1";
const STATIC_CACHE = `linguacards-static-${VERSION}`;
const OFFLINE_URL = "/offline";

/** Đuôi file coi là tài nguyên tĩnh (ngoài /_next/static). */
const STATIC_ASSET = /\.(?:css|js|woff2?|png|jpg|jpeg|gif|svg|webp|ico)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll([OFFLINE_URL, "/icon-192.png"]);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("linguacards-") && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  // Chỉ lưu phản hồi thành công cùng origin; `opaque` (cross-origin) không đọc
  // được trạng thái nên lưu vào dễ đóng băng luôn một lỗi.
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase / từ điển / audio
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/auth/")) return;

  if (url.pathname.startsWith("/_next/static/") || STATIC_ASSET.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const offline = await caches.match(OFFLINE_URL);
          return (
            offline ??
            new Response("Bạn đang ngoại tuyến.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })()
    );
  }
});
