import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cspHeaderName } from "@/lib/csp";
import { AUTH_COOKIE_OPTIONS } from "./cookie-options";

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
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  };

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeadersWith(request, security) },
  });

  // Callback phải đổi code trước; không refresh phiên cũ khi đang đăng nhập lại.
  if (request.nextUrl.pathname === "/auth/callback") {
    return withCsp(supabaseResponse);
  }

  const pendingCookies = new Map<string, CookieToSet>();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach((cookie) => pendingCookies.set(cookie.name, cookie));
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeadersWith(request, security) },
          });
          pendingCookies.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /**
   * Chuyển hướng mà KHÔNG bỏ rơi cookie vừa gia hạn.
   *
   * `getUser()` ở trên tự làm mới phiên khi access token hết hạn, và cookie mới
   * được ghi lên `supabaseResponse`. Response redirect là object khác, không tự
   * mang theo — trả về trần là trình duyệt giữ refresh token CŨ. Supabase chỉ
   * cho dùng lại token cũ trong khoảng reuse interval (mặc định 10 giây), nên
   * lần gia hạn kế tiếp bị từ chối: người dùng bị đá ra giữa buổi học.
   */
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    return withCsp(response);
  };

  const { pathname } = request.nextUrl;

  /**
   * Route công khai (không cần login). `/` KHÔNG công khai — cổng gốc tự điều
   * hướng theo trạng thái đăng nhập (xem src/app/page.tsx).
   *
   * `/api`, `/sw.js`, `/manifest.webmanifest` giờ đã bị `matcher` loại từ đầu
   * (xem src/middleware.ts) nên ba dòng đó không còn chạy tới. CỐ Ý giữ lại:
   * nếu sau này ai nới matcher mà quên chỗ này thì mọi lời gọi `/api` từ mobile
   * sẽ bị đá về `/login` — mobile xác thực bằng Bearer, không có cookie, nên
   * `getUser()` ở đây thấy null. Hỏng kiểu đó rất khó truy: client nhận HTML
   * chuyển hướng thay vì JSON.
   */
  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest" ||
    // Trang offline: lúc mất mạng thì không xác thực lại được.
    pathname === "/offline";

  if (!user && !isPublic) {
    return redirectTo("/login");
  }

  // Đã đăng nhập mà vào /login → đẩy về dashboard
  if (user && pathname === "/login") {
    return redirectTo("/dashboard");
  }

  return withCsp(supabaseResponse);
}
