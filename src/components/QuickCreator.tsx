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

interface QuickCreatorProps {
  /** Deck mặc định để lưu (vd khi mở từ trang chi tiết deck). */
  defaultDeckId?: string;
  /** Callback sau khi lưu thành công. */
  onSaved?: () => void;
}

/** FAB "+" cố định + modal tạo thẻ nhanh: gõ từ → tra → sửa → lưu. */
export function QuickCreator({ defaultDeckId, onSaved }: QuickCreatorProps) {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftCard | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckId, setDeckId] = useState(defaultDeckId ?? "");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  async function handleLookup() {
    if (!word.trim()) return;
    setLooking(true);
    setError(null);
    setDraft(null);
    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, source: "en", target: "vi" }),
      });
      if (!res.ok) throw new Error("Tra từ thất bại");
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
      {/* FAB cố định góc dưới phải */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-3xl text-white shadow-lg hover:bg-brand-dark"
        aria-label="Thêm từ mới"
      >
        +
      </button>

      <Modal open={open} onClose={reset} title="Thêm từ mới" wide>
        <div className="space-y-4">
          {/* Chọn deck */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
              <div className="border-t border-slate-100 pt-4">
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
