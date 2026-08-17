import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Ngoại tuyến",
};

/**
 * Trang dự phòng khi mất mạng — service worker lưu sẵn trang này lúc cài đặt
 * và trả về khi không tải được trang thật (xem `public/sw.js`).
 *
 * Cố ý không dùng Navbar hay bất kỳ dữ liệu nào từ Supabase: lúc hiển thị thì
 * đằng nào cũng không gọi mạng được.
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <WifiOff className="h-8 w-8" />
      </span>
      <h1 className="mt-5 text-xl font-bold">Bạn đang ngoại tuyến</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
        LinguaCards cần mạng để tải bộ thẻ và lưu tiến độ học. Kiểm tra lại kết
        nối rồi thử lại nhé.
      </p>
      <a
        href="/dashboard"
        className="mt-6 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
      >
        Thử lại
      </a>
    </main>
  );
}
