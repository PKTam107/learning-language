"use client";

import { useEffect } from "react";

/**
 * Đăng ký service worker (xem `public/sw.js`) để app cài được ra màn hình chính
 * và mở được khi mất mạng. Chỉ chạy ở production: bản dev thay đổi liên tục nên
 * để service worker cache lại chỉ tổ phục vụ code cũ.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

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
