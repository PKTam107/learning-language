"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchLearningCards, type LearningCard } from "@/lib/db/learning";
import { cardToDraft, updateCard } from "@/lib/db/cards";
import { fetchDecks } from "@/lib/db/decks";
import { analyzeHealth, HEALTH_LABELS, type HealthIssue } from "@/lib/learning-insights";
import { DraftEditor } from "@/components/flashcard/DraftEditor";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Deck, DraftCard } from "@/types";
export function CardHealth() {
  const [cards, setCards] = useState<LearningCard[] | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [filter, setFilter] = useState<HealthIssue | "">("");
  const [deckId, setDeckId] = useState("");
  const [limit, setLimit] = useState(50);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<LearningCard | null>(null);
  const [draft, setDraft] = useState<DraftCard | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    let alive = true; setError("");
    Promise.all([fetchLearningCards(), fetchDecks()]).then(([rows, list]) => { if (alive) { setCards(rows); setDecks(list); } }).catch(() => { if (alive) setError("Chưa kiểm tra được kho thẻ. Hãy thử lại."); });
    return () => { alive = false; };
  }, [reload]);
  const issues = useMemo(() => analyzeHealth(cards ?? []), [cards]);
  const filtered = issues.filter((item) => (!filter || item.issues.includes(filter)) && (!deckId || item.card.deck_id === deckId));
  async function save() {
    if (!editing || !draft || saving) return;
    setSaving(true); setSaveError("");
    try {
      await updateCard(editing.id, editing.deck_id, draft);
      // Reload before closing so a failed refresh doesn't silently leave stale results.
      setCards(await fetchLearningCards()); setEditing(null); setDraft(null);
    } catch { setSaveError("Chưa hoàn tất lưu và tải lại. Hãy kiểm tra kết nối rồi thử lại."); }
    finally { setSaving(false); }
  }
  return <div className="space-y-5"><h1 className="text-2xl font-bold">Sức khỏe kho thẻ</h1><p className="text-sm text-slate-500">Tìm và sửa thẻ thiếu dữ liệu. Trùng từ giữa các bộ chỉ là gợi ý kiểm tra; bạn có thể chủ động giữ cả hai.</p>
    {error && <p role="alert">{error} <button onClick={() => setReload(reload + 1)} className="underline">Thử lại</button></p>}
    {!cards && !error && <p role="status">Đang kiểm tra…</p>}
    {cards && <><p>{issues.length}/{cards.length} thẻ cần xem lại.</p><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Vấn đề<select value={filter} onChange={(e) => { setFilter(e.target.value as HealthIssue | ""); setLimit(50); }} className="mt-1 block w-full rounded-lg border bg-transparent p-2 dark:bg-slate-900"><option value="">Tất cả ({issues.length})</option>{Object.entries(HEALTH_LABELS).map(([key, label]) => <option key={key} value={key}>{label} ({issues.filter((item) => item.issues.includes(key as HealthIssue)).length})</option>)}</select></label><label className="text-sm">Bộ thẻ<select value={deckId} onChange={(e) => { setDeckId(e.target.value); setLimit(50); }} className="mt-1 block w-full rounded-lg border bg-transparent p-2 dark:bg-slate-900"><option value="">Tất cả bộ thẻ</option>{decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.name}</option>)}</select></label></div>
    {!filtered.length && <p className="rounded-xl border p-4 dark:border-slate-800">{cards.length ? "Không có thẻ cần xem lại trong bộ lọc này." : "Kho chưa có thẻ. Thêm từ vào bộ thẻ để bắt đầu."}</p>}
    <ul className="space-y-3">{filtered.slice(0, limit).map(({ card, issues }) => <li key={card.id} className="space-y-2 rounded-xl border p-4 dark:border-slate-800"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold">{card.term}</p><Link href={`/decks/${card.deck_id}`} className="text-sm text-brand underline">{decks.find((deck) => deck.id === card.deck_id)?.name ?? "Mở bộ thẻ"}</Link></div><Button variant="secondary" onClick={() => { setEditing(card); setDraft(cardToDraft(card)); setSaveError(""); }}>Sửa</Button></div><div className="flex flex-wrap gap-2">{issues.map((issue) => <span key={issue} className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">{HEALTH_LABELS[issue]}</span>)}</div>{issues.includes("leech") && <p className="text-sm text-slate-500">Thử rút gọn nghĩa, thêm câu ví dụ và ghi chú riêng. Sửa nội dung giữ nguyên tiến độ ôn.</p>}</li>)}</ul>
    {filtered.length > limit && <Button variant="secondary" onClick={() => setLimit(limit + 50)}>Xem thêm ({filtered.length - limit})</Button>}</>}
    <Modal open={!!editing} onClose={() => { if (!saving) { setEditing(null); setDraft(null); } }} title="Sửa thẻ" wide>{draft && <div className="space-y-4"><fieldset disabled={saving}><DraftEditor draft={draft} onChange={setDraft} /></fieldset>{saveError && <p role="alert" className="text-red-600">{saveError}</p>}<Button disabled={saving} onClick={() => void save()}>{saving ? "Đang lưu…" : "Lưu thay đổi"}</Button></div>}</Modal>
  </div>;
}
