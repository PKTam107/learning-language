import { Layers, Link2 } from "lucide-react";

/** Màu badge theo cấp CEFR (dễ → khó: xanh → cam → tím). */
const CEFR_STYLE: Record<string, string> = {
  A1: "bg-emerald-100 text-emerald-700",
  A2: "bg-green-100 text-green-700",
  B1: "bg-amber-100 text-amber-700",
  B2: "bg-orange-100 text-orange-700",
  C1: "bg-rose-100 text-rose-700",
  C2: "bg-purple-100 text-purple-700",
};

/** Badge cấp độ CEFR (A1..C2). Ẩn nếu không có. */
export function CefrBadge({ level }: { level?: string | null }) {
  if (!level) return null;
  const style = CEFR_STYLE[level] ?? "bg-slate-100 text-slate-600";
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
          <p className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            <Layers className="h-3.5 w-3.5" /> Họ từ
          </p>
          <div className="flex flex-wrap gap-1.5">
            {wordFamily!.map((w) => (
              <span
                key={w}
                className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-sm text-indigo-700"
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasColloc && (
        <div>
          <p className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
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
