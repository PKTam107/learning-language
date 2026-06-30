/** Bảng màu đồng bộ với web app (Tailwind brand + slate). */
export const colors = {
  brand: "#4f46e5",
  brandDark: "#4338ca",
  brandLight: "#eef2ff",

  bg: "#f8fafc", // slate-50
  card: "#ffffff",
  border: "#e2e8f0", // slate-200

  text: "#0f172a", // slate-900
  textMuted: "#64748b", // slate-500
  textSubtle: "#94a3b8", // slate-400

  danger: "#dc2626", // red-600
  success: "#16a34a", // green-600
} as const;

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
