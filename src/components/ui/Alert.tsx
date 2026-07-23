import type { ReactNode } from "react";

/**
 * Hộp thông báo dùng chung, tách rõ 2 nhóm:
 * - Thông báo: `success` (thành công) / `info` (thông tin).
 * - Cảnh báo:  `warning` (lưu ý) / `error` (lỗi).
 */
export type AlertVariant = "success" | "info" | "warning" | "error";

interface AlertProps {
  variant?: AlertVariant;
  /** Tiêu đề ngắn; nếu bỏ trống sẽ dùng nhãn mặc định theo nhóm. */
  title?: string;
  children: ReactNode;
  className?: string;
}

const styles: Record<
  AlertVariant,
  { box: string; icon: string; heading: string; label: string; role: "status" | "alert" }
> = {
  success: {
    box: "border-green-200 bg-green-50 text-green-800",
    icon: "text-green-600",
    heading: "text-green-900",
    label: "Thông báo",
    role: "status",
  },
  info: {
    box: "border-brand-light bg-brand-light/60 text-brand-dark",
    icon: "text-brand",
    heading: "text-brand-dark",
    label: "Thông báo",
    role: "status",
  },
  warning: {
    box: "border-amber-200 bg-amber-50 text-amber-800",
    icon: "text-amber-600",
    heading: "text-amber-900",
    label: "Lưu ý",
    role: "alert",
  },
  error: {
    box: "border-red-200 bg-red-50 text-red-800",
    icon: "text-red-600",
    heading: "text-red-900",
    label: "Cảnh báo",
    role: "alert",
  },
};

function Icon({ variant, className }: { variant: AlertVariant; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 20 20",
    fill: "currentColor",
    "aria-hidden": true,
    width: 20,
    height: 20,
  } as const;

  if (variant === "success") {
    return (
      <svg {...common}>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.6 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (variant === "info") {
    return (
      <svg {...common}>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-4a1 1 0 100 2 1 1 0 000-2z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  // warning + error dùng chung tam giác cảnh báo
  return (
    <svg {...common}>
      <path
        fillRule="evenodd"
        d="M8.26 2.83a2 2 0 013.48 0l6.06 10.6A2 2 0 0116.06 16.5H3.94a2 2 0 01-1.74-3.07l6.06-10.6zM11 7a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 6.5a1.1 1.1 0 100 2.2 1.1 1.1 0 000-2.2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function Alert({ variant = "info", title, children, className = "" }: AlertProps) {
  const s = styles[variant];
  const heading = title ?? s.label;

  return (
    <div
      role={s.role}
      className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 text-sm ${s.box} ${className}`}
    >
      <Icon variant={variant} className={`mt-0.5 shrink-0 ${s.icon}`} />
      <div className="min-w-0 flex-1">
        <p className={`font-semibold leading-tight ${s.heading}`}>{heading}</p>
        <div className="mt-0.5 leading-snug">{children}</div>
      </div>
    </div>
  );
}
