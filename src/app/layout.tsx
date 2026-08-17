import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { THEME_BOOTSTRAP, THEME_COLOR } from "@/lib/theme";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "LinguaCards — Học từ vựng qua Flashcard",
    template: "%s · LinguaCards",
  },
  description:
    "Tạo flashcard tự động, học và ôn tập từ vựng tiếng Anh hiệu quả.",
  applicationName: "LinguaCards",
  // Manifest do src/app/manifest.ts sinh ra — khai báo để cài được ra màn hình chính.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "LinguaCards",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Giá trị khởi điểm là nền sáng; script bootstrap bên dưới đổi sang màu nền
  // tối ngay khi trang tải nếu người dùng đang để giao diện tối.
  themeColor: THEME_COLOR.light,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans">
        {/* Phải chạy trước khi trang vẽ, nếu không nền tối sẽ nháy trắng một nhịp. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
