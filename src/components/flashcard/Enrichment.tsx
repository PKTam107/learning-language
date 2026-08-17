import { Layers, Link2 } from "lucide-react";

/** Màu badge theo cấp CEFR (dễ → khó: xanh → cam → tím). */
const CEFR_STYLE: Record<string, string> = {
  A1: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  A2: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300",
  B1: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300",
  B2: "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300",
  C1: "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300",
  C2: "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300",
};

/** Badge cấp độ CEFR (A1..C2). Ẩn nếu không có. */
export function CefrBadge({ level }: { level?: string | null }) {
  if (!level) return null;
  const style = CEFR_STYLE[level] ?? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-bold ${style}`}
      title={`Cấp độ CEFR: ${level}`}
    >
      {level}
    </span>
  );
}

/** Khối hiển thị họ từ (word family) + collocations. Ẩn phần nào rỗng. */
export function EnrichmentSections({
  wordFamily,
  collocations,
}: {
  wordFamily?: string[] | null;
  collocations?: string[] | null;
}) {
  const hasFamily = !!wordFamily && wordFamily.length > 0;
  const hasColloc = !!collocations && collocations.length > 0;
  if (!hasFamily && !hasColloc) return null;

  return (
    <div className="space-y-3">
      {hasFamily && (
        <div>
          <p className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <Layers className="h-3.5 w-3.5" /> Họ từ
          </p>
          <div className="flex flex-wrap gap-1.5">
            {wordFamily!.map((w) => (
              <span
                key={w}
                className="rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-0.5 text-sm text-indigo-700 dark:text-indigo-300"
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasColloc && (
        <div>
          <p className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <Link2 className="h-3.5 w-3.5" /> Kết hợp từ
          </p>
          <div className="flex flex-wrap gap-1.5">
            {collocations!.map((c) => (
              <span
                key={c}
                className="rounded-full bg-teal-50 px-2.5 py-0.5 text-sm text-teal-700"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
