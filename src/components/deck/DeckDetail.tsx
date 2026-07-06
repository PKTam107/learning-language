"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Card, Deck, DraftCard } from "@/types";
import { createClient } from "@/lib/supabase/client";
import {
  fetchCards,
  deleteCard,
  updateCard,
  moveCard,
  cardToDraft,
} from "@/lib/db/cards";
import { fetchDecks } from "@/lib/db/decks";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { AudioButton } from "@/components/flashcard/AudioButton";
import { CardDetail } from "@/components/flashcard/CardDetail";
import { DraftEditor } from "@/components/flashcard/DraftEditor";
import { QuickCreator } from "@/components/QuickCreator";

type Mode = "detail" | "edit" | "move";

export function DeckDetail({ deckId }: { deckId: string }) {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Modal đang mở cho 1 card cụ thể
  const [active, setActive] = useState<{ card: Card; mode: Mode } | null>(null);
  const [draft, setDraft] = useState<DraftCard | null>(null); // cho mode "edit"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cho mode "move"
  const [decks, setDecks] = useState<Deck[]>([]);
  const [moveTarget, setMoveTarget] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: deckData }, cardData] = await Promise.all([
      supabase.from("decks").select("*").eq("id", deckId).maybeSingle(),
      fetchCards(deckId),
    ]);
    setDeck(deckData as Deck | null);
    setCards(cardData);
    setLoading(false);
  }, [deckId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        c.term.toLowerCase().includes(q) ||
        (c.meaning_vi ?? "").toLowerCase().includes(q) ||
        (c.phonetic ?? "").toLowerCase().includes(q)
    );
  }, [cards, query]);

  function close() {
    setActive(null);
    setDraft(null);
    setError(null);
  }

  function openDetail(card: Card) {
    setActive({ card, mode: "detail" });
  }

  function openEdit(card: Card) {
    setDraft(cardToDraft(card));
    setError(null);
    setActive({ card, mode: "edit" });
  }

  async function openMove(card: Card) {
    setError(null);
    setActive({ card, mode: "move" });
    try {
      const all = await fetchDecks();
      setDecks(all);
      const firstOther = all.find((d) => d.id !== deckId);
      setMoveTarget(firstOther?.id ?? "");
    } catch {
      setDecks([]);
    }
  }

  async function handleEditSave() {
    if (!active || !draft) return;
    setBusy(true);
    setError(null);
    try {
      await updateCard(active.card.id, draft);
      close();
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleMove() {
    if (!active || !moveTarget) return;
    setBusy(true);
    setError(null);
    try {
      await moveCard(active.card.id, moveTarget);
      close();
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(card: Card) {
    if (!confirm(`Xóa từ "${card.term}"?`)) return;
    await deleteCard(card.id);
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!deck) {
    return (
      <p className="py-20 text-center text-slate-500">Không tìm thấy bộ thẻ.</p>
    );
  }

  const otherDecks = decks.filter((d) => d.id !== deckId);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{deck.name}</h1>
          {deck.description && (
            <p className="text-sm text-slate-500">{deck.description}</p>
          )}
          <p className="mt-1 text-sm text-slate-400">{cards.length} từ</p>
        </div>
        {cards.length > 0 && (
          <Link href={`/study/${deck.id}`}>
            <Button size="lg">Học ngay</Button>
          </Link>
        )}
      </div>

      {/* Ô tìm kiếm — chỉ hiện khi có card */}
      {cards.length > 0 && (
        <div className="mb-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo từ, nghĩa hoặc phiên âm..."
          />
        </div>
      )}

      {cards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-slate-500">
          Chưa có từ nào. Bấm nút <strong>+</strong> góc dưới phải để thêm.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-slate-500">
          Không có từ nào khớp “{query}”.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {filtered.map((card) => (
            <li
              key={card.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
            >
              <button
                onClick={() => openDetail(card)}
                className="min-w-0 flex-1 text-left"
                aria-label={`Xem chi tiết ${card.term}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{card.term}</span>
                  {card.phonetic && (
                    <span className="text-sm text-slate-400">
                      {card.phonetic}
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-slate-600">
                  {card.part_of_speech && (
                    <span className="mr-1 text-slate-400">
                      ({card.part_of_speech})
                    </span>
                  )}
                  {card.meaning_vi || "—"}
                </p>
              </button>

              <div className="flex shrink-0 items-center gap-0.5">
                <AudioButton url={card.audio_us} label="US" />
                <IconBtn label="Sửa từ" onClick={() => openEdit(card)}>
                  ✏️
                </IconBtn>
                <IconBtn label="Chuyển bộ thẻ" onClick={() => openMove(card)}>
                  ↔️
                </IconBtn>
                <IconBtn
                  label="Xóa từ"
                  onClick={() => handleDelete(card)}
                  danger
                >
                  🗑️
                </IconBtn>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ----- Modals ----- */}
      <Modal
        open={active?.mode === "detail"}
        onClose={close}
        title="Chi tiết từ"
        wide
      >
        {active && <CardDetail card={active.card} />}
      </Modal>

      <Modal open={active?.mode === "edit"} onClose={close} title="Sửa từ" wide>
        {draft && (
          <div className="space-y-4">
            <DraftEditor draft={draft} onChange={setDraft} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close}>
                Hủy
              </Button>
              <Button onClick={handleEditSave} disabled={busy}>
                {busy && <Spinner />}
                Lưu thay đổi
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={active?.mode === "move"} onClose={close} title="Chuyển bộ thẻ">
        {active && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Chuyển “<strong>{active.card.term}</strong>” sang bộ thẻ:
            </p>
            {otherDecks.length === 0 ? (
              <p className="text-sm text-amber-600">
                Bạn chưa có bộ thẻ nào khác để chuyển tới.
              </p>
            ) : (
              <select
                value={moveTarget}
                onChange={(e) => setMoveTarget(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {otherDecks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close}>
                Hủy
              </Button>
              <Button
                onClick={handleMove}
                disabled={busy || !moveTarget || otherDecks.length === 0}
              >
                {busy && <Spinner />}
                Chuyển
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <QuickCreator defaultDeckId={deckId} onSaved={load} />
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded p-1.5 text-slate-400 hover:bg-slate-100 ${
        danger ? "hover:bg-red-50 hover:text-red-600" : "hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}
