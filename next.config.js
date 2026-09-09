/**
 * Header bảo mật tĩnh, áp cho MỌI response.
 * Content-Security-Policy KHÔNG nằm ở đây: nó cần nonce mới mỗi request nên
 * phải sinh trong middleware — xem src/lib/csp.ts và docs/12-bao-mat.md §3.
 */
const securityHeaders = [
  // Không cho nhúng trang vào iframe của site khác (chống clickjacking:
  // phủ iframe trong suốt lên nút Xóa bộ thẻ / Gỡ thiết bị).
  { key: "X-Frame-Options", value: "DENY" },
  // Trình duyệt không được tự đoán kiểu file khác với Content-Type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Sang site khác chỉ gửi origin, không gửi đường dẫn (URL có thể chứa id thẻ/bộ thẻ).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Chỉ đi HTTPS. Cần vì cookie phiên không httpOnly (client phải đọc token):
  // một lần lỡ mở http:// là token đi dạng thô. Trình duyệt bỏ qua header này
  // trên http nên dev localhost không ảnh hưởng.
  // Lưu ý: includeSubDomains ép cả subdomain — bỏ nó ra nếu có subdomain nào
  // còn chạy http. Không preload để còn rút lại được mà không phải chờ Chrome.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  // App không dùng camera/mic/vị trí — tắt hẳn để script lạ cũng không xin được.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
