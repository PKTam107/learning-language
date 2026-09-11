"use client";

import { useEffect, useRef, useState } from "react";
import type { Deck, DraftCard } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { DraftEditor } from "@/components/flashcard/DraftEditor";
import { fetchDecks } from "@/lib/db/decks";
import { saveCard } from "@/lib/db/cards";
import { apiFetch } from "@/lib/api";

interface QuickCreatorProps {
  /** Deck mặc định để lưu (vd khi mở từ trang chi tiết deck). */
  defaultDeckId?: string;
  /** Callback sau khi lưu thành công. */
  onSaved?: () => void;
  /**
   * Từ điền sẵn vào ô nhập, và tra luôn khi modal mở (dùng cho luồng "chia sẻ
   * từ ngoài app vào" — xem `/share`).
   */
  initialWord?: string;
  /** Mở modal ngay khi mount, không chờ bấm nút "+". */
  autoOpen?: boolean;
}

/** FAB "+" cố định + modal tạo thẻ nhanh: gõ từ → tra → sửa → lưu. */
export function QuickCreator({
  defaultDeckId,
  onSaved,
  initialWord,
  autoOpen,
}: QuickCreatorProps) {
  const [open, setOpen] = useState(!!autoOpen);
  const [word, setWord] = useState(initialWord ?? "");
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftCard | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckId, setDeckId] = useState(defaultDeckId ?? "");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Chỉ tra tự động MỘT lần cho `initialWord` — không thì mỗi render là một
   *  lượt tra, ăn hết hạn mức 30 lượt/phút trong vài giây. */
  const autoLookedRef = useRef(false);

  useEffect(() => {
    if (open) {
      fetchDecks()
        .then((d) => {
          setDecks(d);
          if (!deckId && d.length) setDeckId(defaultDeckId ?? d[0].id);
        })
        .catch(() => {});
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, defaultDeckId, deckId]);

  // Từ được chia sẻ từ ngoài vào: tra ngay, người dùng chỉ còn việc bấm Lưu.
  useEffect(() => {
    if (!open || autoLookedRef.current) return;
    if (!initialWord?.trim()) return;
    autoLookedRef.current = true;
    void handleLookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialWord]);

  async function handleLookup() {
    if (!word.trim()) return;
    setLooking(true);
    setError(null);
    setDraft(null);
    try {
      const res = await apiFetch("/api/lookup", {
        word,
        source: "en",
        target: "vi",
      });
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        throw new Error(info?.message ?? "Tra từ thất bại");
      }
      const data: DraftCard = await res.json();
      // Luôn dùng payload server (đã gồm meaningVi dịch sẵn cho cụm từ notFound).
      setDraft(data);
      if (data.notFound) {
        setError(
          data.meaningVi
            ? "Không có trong từ điển (cụm từ) — đã dịch sẵn nghĩa, bạn có thể chỉnh lại."
            : "Không tìm thấy từ trong từ điển — bạn có thể nhập nghĩa thủ công."
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLooking(false);
    }
  }

  async function handleSave() {
    if (!draft || !deckId) return;
    setSaving(true);
    setError(null);
    try {
      await saveCard(deckId, draft);
      // reset để gõ từ tiếp theo (giữ modal mở cho flow nhanh)
      setWord("");
      setDraft(null);
      inputRef.current?.focus();
      onSaved?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setOpen(false);
    setWord("");
    setDraft(null);
    setError(null);
  }

  return (
    <>
      {/* FAB cố định góc dưới phải. Không còn thanh tab đáy nên về sát đáy,
          chỉ chừa safe-area cho vạch home của iPhone. */}
      <button
        onClick={() => setOpen(true)}
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        className="fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-3xl text-white shadow-lg shadow-brand/30 transition-transform hover:bg-brand-dark active:scale-95 md:right-8"
        aria-label="Thêm từ mới"
      >
        +
      </button>

      <Modal open={open} onClose={reset} title="Thêm từ mới" wide>
        <div className="space-y-4">
          {/* Chọn deck */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Lưu vào bộ thẻ
            </label>
            {decks.length === 0 ? (
              <Alert variant="warning">
                Bạn chưa có bộ thẻ nào. Hãy tạo một bộ thẻ trước.
              </Alert>
            ) : (
              <select
                value={deckId}
                onChange={(e) => setDeckId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base dark:border-slate-700 sm:text-sm"
              >
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Ô nhập từ */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup();
            }}
            className="flex gap-2"
          >
            <Input
              ref={inputRef}
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="Gõ từ tiếng Anh rồi nhấn Enter..."
            />
            <Button type="submit" disabled={looking || !word.trim()}>
              {looking ? <Spinner /> : "Tra từ"}
            </Button>
          </form>

          {error && <Alert variant="warning">{error}</Alert>}

          {draft && (
            <>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <DraftEditor draft={draft} onChange={setDraft} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDraft(null)}>
                  Hủy
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !deckId}
                >
                  {saving && <Spinner />}
                  Lưu vào bộ thẻ
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
