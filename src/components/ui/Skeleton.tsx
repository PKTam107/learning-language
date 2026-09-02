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

/** Khung một thẻ (ô số, thẻ bộ từ...) — viền + nền giống thẻ thật. */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-7 w-14" />
    </div>
  );
}
