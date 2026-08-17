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
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
