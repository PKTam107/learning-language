"use client";

import { useEffect } from "react";

/**
 * Đăng ký service worker (xem `public/sw.js`) để app cài được ra màn hình chính
 * và mở được khi mất mạng. Chỉ chạy ở production: bản dev thay đổi liên tục nên
 * để service worker cache lại chỉ tổ phục vụ code cũ.
 *
 * Ở dev thì không chỉ bỏ qua mà phải GỠ hẳn. Service worker sống theo origin
 * chứ không theo lần chạy: chỉ cần một lần `npm run build && npm start` trên
 * localhost:3000 là nó cài vĩnh viễn cho cổng đó, rồi khi quay lại `npm run dev`
 * cùng cổng nó vẫn còn và `cacheFirst` trả về CSS của bản build cũ. HTML mới
 * mang class `__variable_<hash>` mới, CSS cũ chỉ định nghĩa hash cũ, thế là
 * `--font-sans` rỗng và cả trang tụt về Times New Roman.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void (async () => {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
          // Gỡ đăng ký thôi chưa đủ: Cache Storage vẫn còn nguyên và sẽ được
          // dùng lại ngay khi bản production kế tiếp cài lại service worker.
          const keys = await caches.keys();
          await Promise.all(
            keys.filter((k) => k.startsWith("linguacards-")).map((k) => caches.delete(k))
          );
        } catch {
          // Trình duyệt chặn Cache Storage / SW — dev vẫn chạy bình thường.
        }
      })();
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Trình duyệt chặn (chế độ riêng tư, không phải HTTPS...) — app vẫn chạy
        // bình thường, chỉ là không cài được ra màn hình chính.
      });
    };

    // Đợi tải xong mới đăng ký để không giành băng thông với lần vẽ đầu.
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
