"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Deck, DeckStats } from "@/types";
import { fetchDecksWithStats, deleteDeck } from "@/lib/db/decks";
import { exportAccountBackup } from "@/lib/export";
import { STATUS_ORDER, emptyByStatus } from "@/lib/status";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { StatusBar } from "@/components/status/StatusBar";
import { Save, Sparkles, Search, CalendarCheck } from "lucide-react";
import { DeckCard } from "./DeckCard";
import { DeckForm } from "./DeckForm";

interface DecksManagerProps {
  /** Hiển thị thanh thống kê phía trên (dùng ở dashboard). */
  showStats?: boolean;
}

export function DecksManager({ showStats }: DecksManagerProps) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deck | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);

  async function handleBackup() {
    setBackupBusy(true);
    try {
      await exportAccountBackup();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBackupBusy(false);
    }
  }

  const load = useCallback(async () => {
    try {
      setDecks(await fetchDecksWithStats());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(deck: Deck) {
    if (
      !confirm(
        `Xóa bộ thẻ "${deck.name}"? Toàn bộ ${deck.card_count ?? 0} từ trong bộ sẽ bị xóa.`
      )
    )
      return;
    await deleteDeck(deck.id);
    load();
  }

  const agg = useMemo<DeckStats>(() => {
    const byStatus = emptyByStatus();
    let total = 0;
    let due = 0;
    for (const d of decks) {
      if (!d.stats) continue;
      total += d.stats.total;
      due += d.stats.due;
      for (const s of STATUS_ORDER) byStatus[s] += d.stats.byStatus[s];
    }
    return { total, byStatus, due };
  }, [decks]);

  if (loading) {
    // Giữ đúng bố cục trang thật (ô số + lưới thẻ) để nội dung không nhảy khi
    // dữ liệu về.
    return (
      <div>
        {showStats && (
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <Skeleton className="h-2.5 w-full rounded-full" />
              <Skeleton className="mt-3 h-3 w-2/3" />
            </div>
          </div>
        )}
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="mt-2 h-3 w-3/4" />
              <Skeleton className="mt-5 h-2 w-full rounded-full" />
              <Skeleton className="mt-3 h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {showStats && (
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Bộ thẻ" value={decks.length} />
            <Stat label="Tổng số từ" value={agg.total} />
            <Stat label="Đã thuộc" value={agg.byStatus.easy} />
            <Stat label="Ôn hôm nay" value={agg.due} accent={agg.due > 0} />
          </div>
          {agg.total > 0 && (
            <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <StatusBar stats={agg} />
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Bộ từ vựng của bạn</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleBackup}
            disabled={backupBusy}
            title="Tải toàn bộ dữ liệu (bộ thẻ, từ, tiến độ) ra file JSON"
          >
            {backupBusy && <Spinner />}
            <Save size={16} />
            {/* Màn hẹp chỉ để "Sao lưu" cho vừa hàng với nút tạo bộ thẻ. */}
            <span className="sm:hidden">Sao lưu</span>
            <span className="hidden sm:inline">Sao lưu tài khoản</span>
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            + Tạo bộ thẻ
          </Button>
        </div>
      </div>

      {decks.length === 0 ? (
        /* Màn hình đầu tiên của người mới: nói rõ 3 bước sẽ xảy ra và đặt sẵn
           một nút bấm, thay vì chỉ báo "chưa có gì". */
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand-dark dark:bg-indigo-500/15 dark:text-indigo-300">
            <Sparkles className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Bắt đầu bộ từ vựng đầu tiên</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Gõ một từ tiếng Anh, LinguaCards tự dựng thẻ đầy đủ: phiên âm, nghĩa
            tiếng Việt, ví dụ và phát âm.
          </p>

          <ul className="mx-auto mt-6 grid max-w-lg gap-3 text-left sm:grid-cols-3">
            <Step
              icon={<Save size={16} />}
              title="1. Tạo bộ thẻ"
              text="Đặt tên theo mục tiêu, ví dụ “TOEIC 900”."
            />
            <Step
              icon={<Search size={16} />}
              title="2. Tra từ"
              text="Bấm nút + rồi gõ từ — thẻ tự điền sẵn."
            />
            <Step
              icon={<CalendarCheck size={16} />}
              title="3. Ôn mỗi ngày"
              text="App tự hẹn lịch ôn để bạn nhớ lâu."
            />
          </ul>

          <Button
            size="lg"
            className="mt-7"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            + Tạo bộ thẻ đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onEdit={(d) => {
                setEditing(d);
                setFormOpen(true);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <DeckForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        deck={editing}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          accent ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Step({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <li className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <span className="text-brand dark:text-indigo-400">{icon}</span>
        {title}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{text}</p>
    </li>
  );
}
