import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { buildCsp, createNonce } from "@/lib/csp";

export async function middleware(request: NextRequest) {
  // Nonce sinh mới mỗi request — nếu dùng lại thì kẻ tấn công đoán được và CSP
  // mất tác dụng.
  const nonce = createNonce();
  return await updateSession(request, { nonce, csp: buildCsp(nonce) });
}

export const config = {
  matcher: [
    /**
     * Mọi route TRỪ static asset, image optimizer, và ba đường dưới đây.
     *
     * `api/`: middleware vốn đã coi `/api` là public (route handler tự kiểm
     * đăng nhập), nên `getUser()` ở đây chỉ là một round-trip tới Supabase Auth
     * bị bỏ đi — mỗi lời gọi API phải xác thực hai lần. Cookie gia hạn vẫn
     * được ghi: route handler dùng `lib/supabase/server.ts`, và `cookies().set`
     * chạy được trong route handler (khác Server Component).
     *
     * `sw.js`, `manifest.webmanifest`: file tĩnh của PWA, cũng đã là public.
     * Chúng tải ở mỗi lần mở app nên đây là đường nóng.
     *
     * Trang HTML thì KHÔNG được bỏ, kể cả `/login` và `/offline`: nonce cho CSP
     * sinh ở middleware, thiếu nó là script bootstrap giao diện tối bị chặn.
     */
    "/((?!api/|sw\\.js|manifest\\.webmanifest|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
