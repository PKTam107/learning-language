/**
 * Content-Security-Policy — hàng rào cuối nếu có XSS.
 *
 * Vì sao đáng làm ở app này: cookie phiên của @supabase/ssr KHÔNG httpOnly
 * (client trình duyệt phải đọc được token), nên một đoạn script lạ chạy được
 * là lấy được phiên đăng nhập. CSP chặn đúng bước đó.
 *
 * Cách chặn: mỗi request sinh một `nonce` ngẫu nhiên; chỉ <script> mang đúng
 * nonce đó mới được chạy. Script kẻ tấn công chèn vào không đoán được nonce.
 * Cố ý KHÔNG dùng 'unsafe-inline' cho script — có nó thì CSP gần như vô nghĩa
 * trước XSS.
 */

/** Origin của Supabase (client gọi thẳng REST + Auth). Chỉ lấy origin, bỏ path. */
function supabaseOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

export function buildCsp(nonce: string): string {
  const dev = process.env.NODE_ENV === "development";

  const directives = [
    ["default-src", "'self'"],

    // 'strict-dynamic': script đã được nonce tin thì script do nó tạo ra cũng
    // được tin. Bắt buộc phải có vì Next tải chunk bằng JS — không liệt kê
    // trước từng file được. Dev server của Next dùng eval nên phải nới thêm.
    ["script-src", `'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`],

    // CSS vẫn phải để 'unsafe-inline': Next và next/font chèn <style> lúc
    // hydrate. Rủi ro thấp hơn script rất nhiều (không chạy được mã).
    ["style-src", "'self' 'unsafe-inline'"],

    ["img-src", "'self' data: blob:"],

    // next/font tải Inter về lúc build và phục vụ từ /_next/static → không cần
    // mở fonts.gstatic.com.
    ["font-src", "'self'"],

    // File phát âm: DictionaryAPI, và URL bất kỳ người dùng tự nhập khi import
    // thẻ. Giới hạn ở https chứ không khoá theo host, nếu không là gãy audio
    // của thẻ import.
    ["media-src", "'self' https:"],

    // Client gọi thẳng Supabase (REST, Auth, và wss nếu sau này dùng Realtime).
    [
      "connect-src",
      ["'self'", supabaseOrigin(), dev ? "ws: wss:" : ""].filter(Boolean).join(" "),
    ],

    // Không cho ai nhúng app vào iframe (trùng ý với X-Frame-Options, nhưng
    // frame-ancestors mới là chuẩn hiện hành).
    ["frame-ancestors", "'none'"],
    ["frame-src", "'none'"],
    ["object-src", "'none'"],

    // Chặn <base href> bị chèn để đổi gốc của mọi URL tương đối.
    ["base-uri", "'self'"],
    ["form-action", "'self'"],

    ["worker-src", "'self'"], // service worker của PWA
    ["manifest-src", "'self'"],
  ];

  // Dev chạy trên http nên không ép nâng cấp — ép là gãy tài nguyên localhost.
  if (!dev) directives.push(["upgrade-insecure-requests", ""]);

  return directives
    .map(([name, value]) => (value ? `${name} ${value}` : name))
    .join("; ");
}

/**
 * Bật chế độ chỉ-báo-cáo bằng biến môi trường `CSP_REPORT_ONLY=1`: trình duyệt
 * ghi vi phạm ra console nhưng KHÔNG chặn. Dùng khi muốn quan sát vài ngày
 * trước lúc siết thật. Lưu ý biến này được nhúng lúc build nên đổi xong phải
 * deploy lại.
 */
export function cspHeaderName(): string {
  return process.env.CSP_REPORT_ONLY === "1"
    ? "content-security-policy-report-only"
    : "content-security-policy";
}

/** Nonce ngẫu nhiên 128 bit, mã hoá base64 — sinh mới cho mỗi request. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
