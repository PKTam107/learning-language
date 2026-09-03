"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Layers, RotateCcw, Trash2 } from "lucide-react";
import {
  TRASH_RETENTION_DAYS,
  emptyTrash,
  fetchTrash,
  purgeExpired,
  purgeTrashItem,
  restoreTrashItem,
  type TrashEntry,
} from "@/lib/db/trash";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Thùng rác: thẻ và bộ thẻ đã xóa, phục hồi được trong TRASH_RETENTION_DAYS ngày.
 * Mục quá hạn được dọn ngay khi mở trang (không cần cron).
 */
export function TrashList() {
  const [items, setItems] = useState<TrashEntry[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    await purgeExpired(); // dọn mục quá hạn trước khi hiển thị
    setItems(await fetchTrash());
  }, []);

  useEffect(() => {
    load().catch((e: unknown) => setError((e as Error).message));
  }, [load]);

  async function handleRestore(item: TrashEntry) {
    setBusyId(item.id);
    setError(null);
    setNotice(null);
    try {
      const result = await restoreTrashItem(item.id);
      setNotice(
        result.kind === "deck"
          ? `Đã phục hồi bộ thẻ “${result.label}” với ${result.restored} từ.` +
              (result.skipped > 0
                ? ` Bỏ qua ${result.skipped} từ đã có lại trong bộ.`
                : "")
          : `Đã phục hồi từ “${result.label}”.`
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handlePurge(item: TrashEntry) {
    const what =
      item.kind === "deck"
        ? `bộ thẻ “${item.label}” và ${item.card_count} từ bên trong`
        : `từ “${item.label}”`;
    if (!confirm(`Xóa hẳn ${what}? Thao tác này không thể hoàn tác.`)) return;
    setBusyId(item.id);
    setError(null);
    try {
      await purgeTrashItem(item.id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleEmpty() {
    if (
      !confirm(
        "Dọn sạch thùng rác? Toàn bộ thẻ và bộ thẻ trong đây sẽ mất vĩnh viễn."
      )
    )
      return;
    setError(null);
    try {
      await emptyTrash();
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (items === null) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Thẻ và bộ thẻ đã xóa được giữ {TRASH_RETENTION_DAYS} ngày, sau đó tự
          dọn hẳn.
        </p>
        {items.length > 0 && (
          <Button variant="secondary" size="sm" onClick={handleEmpty}>
            Dọn sạch
          </Button>
        )}
      </div>

      {notice && <Alert variant="success">{notice}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <Trash2 className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Thùng rác trống.
          </p>
          <Link
            href="/dashboard"
            className="mt-3 inline-flex items-center gap-1 text-sm text-brand hover:underline dark:text-indigo-400"
          >
            <ArrowLeft size={15} />
            Về trang chủ
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {item.kind === "deck" ? (
                    <Layers className="h-4 w-4" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                    {item.label}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {item.kind === "deck"
                      ? `Bộ thẻ · ${item.card_count} từ`
                      : `Từ · bộ “${item.deck_name ?? "không rõ"}”`}{" "}
                    · còn {item.daysLeft} ngày
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === item.id}
                  onClick={() => void handleRestore(item)}
                >
                  <RotateCcw className="h-4 w-4" />
                  Phục hồi
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busyId === item.id}
                  onClick={() => void handlePurge(item)}
                  className="!text-red-600 hover:!bg-red-50 dark:!text-red-400 dark:hover:!bg-red-500/10"
                >
                  Xóa hẳn
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
