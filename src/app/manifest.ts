import type { MetadataRoute } from "next";
import { THEME_COLOR } from "@/lib/theme";

/**
 * Manifest PWA — cho phép cài LinguaCards ra màn hình chính và chạy toàn màn
 * hình như app thật. Next phục vụ file này tại `/manifest.webmanifest` và tự
 * chèn thẻ <link rel="manifest">.
 *
 * Icon do `scripts/generate-icons.mjs` sinh ra trong `public/`.
 */

/**
 * `share_target` đúng chuẩn Web App Manifest: `params` là **object** ánh xạ
 * tên tham số query (title/text/url). Kiểu của Next lại khai báo `params` là
 * mảng `{name, value}` — không khớp chuẩn, mà Next thì chỉ JSON.stringify
 * object này ra file, nên cast ở đúng một trường và giữ nguyên type-check cho
 * phần còn lại của manifest.
 */
const SHARE_TARGET = {
  action: "/share",
  method: "get",
  params: { title: "title", text: "text", url: "url" },
} as unknown as MetadataRoute.Manifest["share_target"];

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
    /**
     * Nhận nội dung từ thao tác **Chia sẻ** của hệ điều hành: bôi đen một từ ở
     * Chrome/Kindle/YouTube → Chia sẻ → LinguaCards → mở thẳng ô tạo thẻ đã tra
     * sẵn (xem `app/share/page.tsx`).
     *
     * Dùng `method: "get"` nên không cần route handler POST và không cần
     * multipart — mọi thứ nằm trong query string.
     *
     * Chỉ chạy khi app **đã được cài** ra màn hình chính; mở bằng tab trình
     * duyệt thường thì hệ điều hành không biết tới share target này.
     */
    share_target: SHARE_TARGET,
  };
}
