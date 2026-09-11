import type { Config } from "tailwindcss";

const config: Config = {
  // Dark mode bật bằng class `dark` trên <html> (đặt bởi script bootstrap ở layout),
  // nhờ vậy đọc được lựa chọn đã lưu trước khi trang vẽ lần đầu — không bị nháy sáng.
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4f46e5",
          dark: "#4338ca",
          light: "#eef2ff",
        },
      },
      fontFamily: {
        // Fallback phải nằm TRONG var(): nếu --font-sans không tồn tại (CSS của
        // next/font chưa nạp, hoặc service worker trả về bản cũ mang hash khác)
        // thì `var(--font-sans)` là invalid at computed-value time — trình duyệt
        // vứt cả khai báo, kể cả "system-ui, sans-serif" đứng sau, rồi rơi về
        // font khởi tạo là Times New Roman. Có fallback trong var() thì xấu nhất
        // cũng chỉ là font hệ thống.
        sans: ["var(--font-sans, ui-sans-serif)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
