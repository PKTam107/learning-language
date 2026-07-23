"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, ArrowLeftRight, Trash2 } from "lucide-react";
import type { Card, CardStatus, CardWithProgress, Deck, DraftCard } from "@/types";
import { createClient } from "@/lib/supabase/client";
import {
  fetchCardsWithProgress,
  deleteCard,
  updateCard,
  moveCard,
  cardToDraft,
  deleteCards,
  moveCards,
  resetProgress,
} from "@/lib/db/cards";
import { fetchDecks } from "@/lib/db/decks";
import { STATUS_META, STATUS_ORDER, computeStats, masteredPercent } from "@/lib/status";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { AudioButton } from "@/components/flashcard/AudioButton";
import { CardDetail } from "@/components/flashcard/CardDetail";
import { DraftEditor } from "@/components/flashcard/DraftEditor";
import { StatusBar } from "@/components/status/StatusBar";
import { StatusDot } from "@/components/status/StatusDot";
import { QuickCreator } from "@/components/QuickCreator";
import { ImportButton } from "@/components/deck/ImportButton";
import { ExportMenu } from "@/components/deck/ExportMenu";

const statusOf = (c: CardWithProgress): CardStatus => c.progress?.status ?? "new";

type Mode = "detail" | "edit" | "move";

export function DeckDetail({ deckId }: { deckId: string }) {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<CardWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CardStatus | "all">("all");

  // Modal đang mở cho 1 card cụ thể
  const [active, setActive] = useState<{ card: Card; mode: Mode } | null>(null);
  const [draft, setDraft] = useState<DraftCard | null>(null); // cho mode "edit"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cho mode "move"
  const [decks, setDecks] = useState<Deck[]>([]);
  const [moveTarget, setMoveTarget] = useState("");

  // Chọn nhiều thẻ (hành động hàng loạt)
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: deckData }, cardData] = await Promise.all([
      supabase.from("decks").select("*").eq("id", deckId).maybeSingle(),
      fetchCardsWithProgress(deckId),
    ]);
    setDeck(deckData as Deck | null);
    setCards(cardData);
    setLoading(false);
  }, [deckId]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => computeStats(cards), [cards]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (statusFilter !== "all" && statusOf(c) !== statusFilter) return false;
      if (!q) return true;
      return (
        c.term.toLowerCase().includes(q) ||
        (c.meaning_vi ?? "").toLowerCase().includes(q) ||
        (c.phonetic ?? "").toLowerCase().includes(q)
      );
    });
  }, [cards, query, statusFilter]);

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
      await updateCard(active.card.id, deckId, draft);
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

  // ----- Chọn nhiều thẻ -----
  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelected(new Set());
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === filtered.length
        ? new Set()
        : new Set(filtered.map((c) => c.id))
    );
  }

  const selectedIds = () => Array.from(selected);

  async function handleBulkDelete() {
    const ids = selectedIds();
    if (ids.length === 0) return;
    if (!confirm(`Xóa ${ids.length} từ đã chọn?`)) return;
    setBulkBusy(true);
    try {
      await deleteCards(ids);
      setSelected(new Set());
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkReset() {
    const ids = selectedIds();
    if (ids.length === 0) return;
    if (!confirm(`Reset tiến độ ${ids.length} từ về "chưa học"?`)) return;
    setBulkBusy(true);
    try {
      await resetProgress(ids);
      setSelected(new Set());
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBulkBusy(false);
    }
  }

  async function openBulkMove() {
    if (selected.size === 0) return;
    setError(null);
    setBulkMoveOpen(true);
    try {
      const all = await fetchDecks();
      setDecks(all);
      const firstOther = all.find((d) => d.id !== deckId);
      setMoveTarget(firstOther?.id ?? "");
    } catch {
      setDecks([]);
    }
  }

  async function handleBulkMove() {
    const ids = selectedIds();
    if (ids.length === 0 || !moveTarget) return;
    setBulkBusy(true);
    setError(null);
    try {
      const { moved, skipped } = await moveCards(ids, moveTarget);
      setBulkMoveOpen(false);
      setSelected(new Set());
      await load();
      if (skipped > 0) {
        alert(
          `Đã chuyển ${moved} từ. Bỏ qua ${skipped} từ vì đã tồn tại (trùng) ở bộ thẻ đích.`
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBulkBusy(false);
    }
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
          <p className="mt-1 text-sm text-slate-400">
            {cards.length} từ
            {cards.length > 0 && ` · ${masteredPercent(stats)}% đã thuộc`}
            {stats.due > 0 && (
              <span className="text-amber-600"> · {stats.due} cần ôn</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportButton deckId={deck.id} onImported={load} />
          {cards.length > 0 && (
            <>
              <ExportMenu cards={cards} baseName={deck.name} />
              <Button variant="ghost" onClick={toggleSelectMode}>
                {selectMode ? "Xong" : "Chọn"}
              </Button>
              <Link href={`/study/${deck.id}`}>
                <Button size="lg">Học ngay</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Thanh trạng thái + tìm kiếm + lọc — chỉ hiện khi có card */}
      {cards.length > 0 && (
        <>
          <StatusBar stats={stats} className="mb-4" />

          <div className="mb-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo từ, nghĩa hoặc phiên âm..."
            />
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <FilterChip
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            >
              Tất cả {cards.length}
            </FilterChip>
            {STATUS_ORDER.map((s) => (
              <FilterChip
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
                disabled={stats.byStatus[s] === 0}
              >
                <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
                {STATUS_META[s].label} {stats.byStatus[s]}
              </FilterChip>
            ))}
          </div>
        </>
      )}

      {selectMode && cards.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand/30 bg-brand-light/50 px-3 py-2">
          <button
            onClick={toggleSelectAll}
            className="text-sm font-medium text-brand-dark hover:underline"
          >
            {selected.size === filtered.length && filtered.length > 0
              ? "Bỏ chọn tất cả"
              : "Chọn tất cả"}
          </button>
          <span className="text-sm text-slate-500">Đã chọn {selected.size}</span>
          <div className="ml-auto flex gap-2">
            <Button
              variant="ghost"
              onClick={openBulkMove}
              disabled={selected.size === 0 || bulkBusy}
            >
              Chuyển
            </Button>
            <Button
              variant="ghost"
              onClick={handleBulkReset}
              disabled={selected.size === 0 || bulkBusy}
            >
              Reset tiến độ
            </Button>
            <Button
              variant="danger"
              onClick={handleBulkDelete}
              disabled={selected.size === 0 || bulkBusy}
            >
              {bulkBusy && <Spinner />}
              Xóa
            </Button>
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-slate-500">
          Chưa có từ nào. Bấm nút <strong>+</strong> góc dưới phải để thêm.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-slate-500">
          Không có từ nào khớp bộ lọc hiện tại.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {filtered.map((card) => (
            <li
              key={card.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
            >
              {selectMode && (
                <input
                  type="checkbox"
                  checked={selected.has(card.id)}
                  onChange={() => toggleSelect(card.id)}
                  className="h-4 w-4 shrink-0 accent-brand"
                  aria-label={`Chọn ${card.term}`}
                />
              )}
              <button
                onClick={() =>
                  selectMode ? toggleSelect(card.id) : openDetail(card)
                }
                className="min-w-0 flex-1 text-left"
                aria-label={`Xem chi tiết ${card.term}`}
              >
                <div className="flex items-center gap-2">
                  <StatusDot status={statusOf(card)} />
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

              {!selectMode && (
                <div className="flex shrink-0 items-center gap-0.5">
                  <AudioButton url={card.audio_us} label="US" />
                  <IconBtn label="Sửa từ" onClick={() => openEdit(card)}>
                    <Pencil size={16} />
                  </IconBtn>
                  <IconBtn label="Chuyển bộ thẻ" onClick={() => openMove(card)}>
                    <ArrowLeftRight size={16} />
                  </IconBtn>
                  <IconBtn
                    label="Xóa từ"
                    onClick={() => handleDelete(card)}
                    danger
                  >
                    <Trash2 size={16} />
                  </IconBtn>
                </div>
              )}
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

      <Modal
        open={bulkMoveOpen}
        onClose={() => setBulkMoveOpen(false)}
        title="Chuyển nhiều thẻ"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Chuyển <strong>{selected.size}</strong> từ đã chọn sang bộ thẻ:
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
          <p className="text-xs text-slate-400">
            Những từ đã tồn tại (trùng) ở bộ thẻ đích sẽ được bỏ qua.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setBulkMoveOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleBulkMove}
              disabled={bulkBusy || !moveTarget || otherDecks.length === 0}
            >
              {bulkBusy && <Spinner />}
              Chuyển
            </Button>
          </div>
        </div>
      </Modal>

      <QuickCreator defaultDeckId={deckId} onSaved={load} />
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-40 ${
        active
          ? "border-brand bg-brand-light text-brand-dark"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
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
