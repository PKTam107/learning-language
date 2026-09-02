/**
 * Khối xám nhấp nháy giữ chỗ trong lúc chờ dữ liệu. Dùng thay spinner ở những
 * chỗ đã biết trước bố cục — mắt thấy khung trang ngay nên cảm giác nhanh hơn.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-800 ${className}`}
    />
  );
}
