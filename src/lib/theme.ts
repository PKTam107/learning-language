/**
 * Giao diện Sáng / Tối — lưu theo thiết bị (localStorage), giống các cài đặt khác.
 *
 * Tách khỏi `settings.ts` vì lựa chọn này phải đọc được **trước khi trang vẽ**
 * (xem `THEME_BOOTSTRAP`), trong khi `AppSettings` chỉ nạp sau khi hydrate xong.
 */

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_KEY = "linguacards.theme.v1";

export const DEFAULT_THEME: ThemeChoice = "system";

/**
 * Màu `<meta name="theme-color">` theo từng nền — quyết định màu thanh trạng
 * thái trên Android / thanh địa chỉ Chrome, nên phải đổi cùng giao diện.
 * Khớp với nền body: slate-50 (sáng) và slate-950 (tối).
 */
export const THEME_COLOR = { light: "#f8fafc", dark: "#020617" } as const;

function isChoice(v: unknown): v is ThemeChoice {
  return v === "light" || v === "dark" || v === "system";
}

export function loadTheme(): ThemeChoice {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    return isChoice(raw) ? raw : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(choice: ThemeChoice): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Storage bị chặn (chế độ riêng tư) — vẫn đổi giao diện cho phiên hiện tại.
  }
}

/** Máy đang để giao diện tối? */
export function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Quy lựa chọn (có thể là "system") về màu thực tế đang dùng. */
export function resolveTheme(choice: ThemeChoice): "light" | "dark" {
  if (choice === "system") return systemPrefersDark() ? "dark" : "light";
  return choice;
}

/** Gắn/gỡ class `dark` trên <html> — Tailwind dựa vào đây để đổi màu. */
export function applyTheme(choice: ThemeChoice): void {
  if (typeof document === "undefined") return;
  const dark = resolveTheme(choice) === "dark";
  document.documentElement.classList.toggle("dark", dark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? THEME_COLOR.dark : THEME_COLOR.light);
}

/**
 * Script chạy đồng bộ ngay đầu <body>, trước khi trang vẽ: đọc lựa chọn đã lưu
 * rồi gắn class `dark`. Không có nó, người dùng để nền tối sẽ thấy một nháy
 * trắng mỗi lần tải trang (server không đọc được localStorage nên HTML dựng ra
 * luôn ở nền sáng).
 */
export const THEME_BOOTSTRAP = `(function(){try{var c=localStorage.getItem(${JSON.stringify(
  THEME_KEY
)});var d=c==="dark"||(c!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",d?${JSON.stringify(
  THEME_COLOR.dark
)}:${JSON.stringify(THEME_COLOR.light)});}catch(e){}})();`;
