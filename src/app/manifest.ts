import type { MetadataRoute } from "next";
import { THEME_COLOR } from "@/lib/theme";

/**
 * Manifest PWA — cho phép cài LinguaCards ra màn hình chính và chạy toàn màn
 * hình như app thật. Next phục vụ file này tại `/manifest.webmanifest` và tự
 * chèn thẻ <link rel="manifest">.
 *
 * Icon do `scripts/generate-icons.mjs` sinh ra trong `public/`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LinguaCards — Học từ vựng qua Flashcard",
    short_name: "LinguaCards",
    description:
      "Tạo flashcard tự động, học và ôn tập từ vựng tiếng Anh theo lịch nhớ.",
    lang: "vi",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: THEME_COLOR.light,
    theme_color: "#4f46e5",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        // Android xén icon theo hình dạng của launcher — bản này đã chừa vùng an toàn.
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Bộ thẻ", short_name: "Bộ thẻ", url: "/decks" },
      { name: "Tiến độ học", short_name: "Tiến độ", url: "/progress" },
    ],
  };
}
