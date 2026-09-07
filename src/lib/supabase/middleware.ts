import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cspHeaderName } from "@/lib/csp";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

interface SecurityContext {
  nonce: string;
  csp: string;
}

/**
 * Header của REQUEST gửi xuống app: thêm nonce cho layout đọc, và chính chuỗi
 * CSP — Next đọc header này để tự gắn nonce vào các <script> nó sinh ra
 * (dữ liệu hydrate, chunk). Thiếu nó là toàn bộ script của Next bị CSP chặn.
 *
 * Phải dựng lại sau mỗi lần đổi cookie: `request.cookies.set` ghi vào header
 * `cookie`, nếu dùng bản Headers chụp từ trước thì phiên vừa gia hạn bị mất.
 */
function requestHeadersWith(request: NextRequest, security: SecurityContext) {
  const headers = new Headers(request.headers);
  headers.set("x-nonce", security.nonce);
  headers.set("content-security-policy", security.csp);
  return headers;
}

/**
 * Refresh session cookie mỗi request và bảo vệ các route cần đăng nhập.
 * Được gọi từ middleware.ts ở gốc dự án.
 */
export async function updateSession(
  request: NextRequest,
  security: SecurityContext
) {
  const cspHeader = cspHeaderName();

  /** Gắn CSP lên response trả về — kể cả response chuyển hướng. */
  const withCsp = <T extends NextResponse>(response: T): T => {
    response.headers.set(cspHeader, security.csp);
    return response;
  };

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeadersWith(request, security) },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeadersWith(request, security) },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Route công khai (không cần login). `/` KHÔNG công khai — cổng gốc tự
  // điều hướng theo trạng thái đăng nhập (xem src/app/page.tsx).
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") || // API tự kiểm tra auth riêng
    // Hạ tầng PWA: service worker và manifest phải tải được kể cả khi chưa đăng
    // nhập, nếu không trình duyệt sẽ nhận về trang /login và bỏ qua cài đặt app.
    // Trang offline cũng vậy — lúc mất mạng thì không xác thực lại được.
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/offline";

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return withCsp(NextResponse.redirect(url));
  }

  // Đã đăng nhập mà vào /login → đẩy về dashboard
  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return withCsp(NextResponse.redirect(url));
  }

  return withCsp(supabaseResponse);
}
