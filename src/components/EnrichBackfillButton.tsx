"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  fetchUnenriched,
  runBackfill,
  type UnenrichedCard,
} from "@/lib/db/enrich-backfill";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

interface Props {
  /** Giới hạn theo 1 bộ thẻ; bỏ trống = toàn tài khoản. */
  deckId?: string;
  /** Gọi sau khi làm giàu xong (để cha refresh danh sách/hiển thị badge mới). */
  onDone?: () => void;
  /** true = hiển thị dạng banner (dùng ở dashboard); mặc định nút gọn. */
  banner?: boolean;
}

/**
 * Nút "Làm giàu N thẻ" — bổ sung CEFR/word family/collocations cho các thẻ cũ
 * (enriched_at IS NULL). Tự ẩn khi không còn thẻ nào cần làm giàu.
 * Vì từ tạo mới đã tự làm giàu, đây là công cụ chuyển đổi một lần cho thẻ cũ.
 */
export function EnrichBackfillButton({ deckId, onDone, banner }: Props) {
  const [pending, setPending] = useState<UnenrichedCard[] | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const refresh = useCallback(() => {
    fetchUnenriched(deckId).then(setPending);
  }, [deckId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = useCallback(async () => {
    if (!pending || pending.length === 0) return;
    setRunning(true);
    setProgress(0);
    try {
      await runBackfill(pending, (d) => setProgress(d));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setRunning(false);
      refresh();
      onDone?.();
    }
  }, [pending, refresh, onDone]);

  // Chưa nạp xong, hoặc không còn thẻ cần làm giàu → không hiển thị gì.
  if (!pending || pending.length === 0) return null;

  const label = running
    ? `Đang làm giàu ${progress}/${pending.length}...`
    : `Làm giàu ${pending.length} thẻ`;

  const btn = (
    <Button
      variant={banner ? "primary" : "secondary"}
      onClick={run}
      disabled={running}
      title="Bổ sung CEFR, họ từ, collocations cho các thẻ chưa có"
    >
      {running ? <Spinner /> : <Sparkles size={16} />}
      {label}
    </Button>
  );

  if (!banner) return btn;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 shrink-0 text-indigo-500" />
        <p className="text-sm text-indigo-900">
          <strong>{pending.length} thẻ cũ</strong> chưa có CEFR / họ từ /
          collocations. Bổ sung để bằng các thẻ tạo mới.
        </p>
      </div>
      {btn}
    </div>
  );
}
