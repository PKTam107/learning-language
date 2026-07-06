import type { CardStatus } from "@/types";
import { STATUS_META } from "@/lib/status";

/** Chấm màu nhỏ thể hiện trạng thái học của 1 thẻ. */
export function StatusDot({
  status,
  className = "",
}: {
  status: CardStatus;
  className?: string;
}) {
  const m = STATUS_META[status];
  return (
    <span
      title={m.label}
      aria-label={m.label}
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${m.dot} ${className}`}
    />
  );
}
