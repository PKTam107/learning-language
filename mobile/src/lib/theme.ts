/**
 * Bảng màu đồng bộ với web app (Tailwind brand + slate), có cả nền sáng và tối.
 *
 * Màu KHÔNG còn là hằng số module như trước: component lấy màu qua
 * `useThemeColors()` / `useStyles()` (xem contexts/ThemeContext.tsx) để đổi được
 * theo lựa chọn của người dùng.
 */

/** Bộ ba màu của một mảng nhấn (badge, banner, ô ghi chú...). */
export interface Tint {
  bg: string;
  fg: string;
  border: string;
}

export type TintName =
  | "emerald"
  | "green"
  | "sky"
  | "indigo"
  | "teal"
  | "amber"
  | "orange"
  | "rose"
  | "red"
  | "purple";

export interface ThemeColors {
  brand: string;
  brandDark: string;
  /** Nền nhạt của brand — dùng cho panel/nhấn nhẹ. */
  brandLight: string;

  /** Nền màn hình. */
  bg: string;
  /** Nền thẻ / panel nổi trên `bg`. */
  card: string;
  /** Nền lõm hơn `card` (ô nhập liệu, vùng chìm). */
  sunken: string;
  border: string;

  text: string;
  textMuted: string;
  textSubtle: string;

  danger: string;
  success: string;

  /** Màu trạng thái "Chưa học" — phải theo nền (xem statusColor ở lib/status.ts). */
  statusNew: string;

  /**
   * Các mảng nhấn dùng cho badge/banner/ghi chú. Nền sáng dùng pastel + chữ
   * đậm; nền tối phải đảo lại (nền rất tối + chữ nhạt), vì đặt pastel lên nền
   * tối vừa chói vừa mất tương phản chữ.
   */
  tints: Record<TintName, Tint>;

  /**
   * Thang 5 mức của heatmap học tập (0 = không học → 4 = ôn nhiều nhất).
   * Nền tối phải ĐẢO chiều: đậm dần trên nền tối là chìm dần, ngược ý nghĩa.
   */
  heatmap: readonly string[];
}

const LIGHT_TINTS: Record<TintName, Tint> = {
  emerald: { bg: "#ecfdf5", fg: "#047857", border: "#a7f3d0" },
  green: { bg: "#dcfce7", fg: "#15803d", border: "#bbf7d0" },
  sky: { bg: "#f0f9ff", fg: "#0369a1", border: "#bae6fd" },
  indigo: { bg: "#eef2ff", fg: "#4338ca", border: "#c7d2fe" },
  teal: { bg: "#ccfbf1", fg: "#0f766e", border: "#99f6e4" },
  amber: { bg: "#fffbeb", fg: "#b45309", border: "#fde68a" },
  orange: { bg: "#fff7ed", fg: "#c2410c", border: "#fed7aa" },
  rose: { bg: "#ffe4e6", fg: "#be123c", border: "#fecdd3" },
  red: { bg: "#fef2f2", fg: "#b91c1c", border: "#fecaca" },
  purple: { bg: "#faf5ff", fg: "#7e22ce", border: "#e9d5ff" },
};

const DARK_TINTS: Record<TintName, Tint> = {
  emerald: { bg: "#022c22", fg: "#6ee7b7", border: "#065f46" },
  green: { bg: "#052e16", fg: "#86efac", border: "#166534" },
  sky: { bg: "#082f49", fg: "#7dd3fc", border: "#075985" },
  indigo: { bg: "#1e1b4b", fg: "#a5b4fc", border: "#3730a3" },
  teal: { bg: "#042f2e", fg: "#5eead4", border: "#115e59" },
  amber: { bg: "#451a03", fg: "#fcd34d", border: "#78350f" },
  orange: { bg: "#431407", fg: "#fdba74", border: "#7c2d12" },
  rose: { bg: "#4c0519", fg: "#fda4af", border: "#9f1239" },
  red: { bg: "#450a0a", fg: "#fca5a5", border: "#7f1d1d" },
  purple: { bg: "#3b0764", fg: "#d8b4fe", border: "#6b21a8" },
};

export const lightColors: ThemeColors = {
  brand: "#4f46e5",
  brandDark: "#4338ca",
  brandLight: "#eef2ff",

  bg: "#f8fafc", // slate-50
  card: "#ffffff",
  sunken: "#f1f5f9", // slate-100
  border: "#e2e8f0", // slate-200

  text: "#0f172a", // slate-900
  textMuted: "#64748b", // slate-500
  textSubtle: "#94a3b8", // slate-400

  danger: "#dc2626", // red-600
  success: "#16a34a", // green-600

  statusNew: "#cbd5e1", // slate-300

  tints: LIGHT_TINTS,
  heatmap: ["#f1f5f9", "#c7d2fe", "#a5b4fc", "#6366f1", "#4338ca"],
};

/**
 * Nền tối. Giữ đúng vai trò của từng màu bên bản sáng, chỉ đảo thang độ sáng:
 * `bg` chìm nhất, `card` nổi lên trên nó, `sunken` lại chìm xuống dưới card.
 * Brand sáng lên một bậc vì indigo-600 trên nền tối đọc rất nặng.
 */
export const darkColors: ThemeColors = {
  brand: "#6366f1", // indigo-500
  brandDark: "#a5b4fc", // indigo-300 — "đậm" ở nền sáng thì phải "sáng" ở nền tối
  brandLight: "#1e1b4b", // indigo-950

  bg: "#020617", // slate-950
  card: "#0f172a", // slate-900
  sunken: "#020617", // slate-950
  border: "#1e293b", // slate-800

  text: "#f1f5f9", // slate-100
  textMuted: "#94a3b8", // slate-400
  textSubtle: "#64748b", // slate-500

  danger: "#f87171", // red-400
  success: "#4ade80", // green-400

  statusNew: "#475569", // slate-600

  tints: DARK_TINTS,
  // Sáng dần thay vì đậm dần — xem ghi chú ở khai báo `heatmap`.
  heatmap: ["#1e293b", "#1e1b4b", "#3730a3", "#6366f1", "#a5b4fc"],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = {
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;
