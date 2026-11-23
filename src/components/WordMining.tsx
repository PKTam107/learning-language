"use client";
import { useState } from "react";
import { useMining, type MiningServices } from "@/hooks/useMining";
import { fetchDecks } from "@/lib/db/decks";
import { fetchLearningCards } from "@/lib/db/learning";
import { saveCard } from "@/lib/db/cards";
import { apiFetch } from "@/lib/api";
import { MINING_BATCH, MINING_MAX_TEXT } from "@/lib/mining";
import { DraftEditor } from "@/components/flashcard/DraftEditor";
import { Button } from "@/components/ui/Button";
const services: MiningServices = {
  async load() { const [decks, cards] = await Promise.all([fetchDecks(), fetchLearningCards()]); return { decks, cards }; },
  async lookup(word) { const response = await apiFetch("/api/lookup", { word, source: "en", target: "vi" }); if (!response.ok) throw new Error("lookup"); return response.json(); },
  save: saveCard,
};
export function WordMining({ initialText = "" }: { initialText?: string }) {
  const mining = useMining(services, initialText);
  const [level, setLevel] = useState("");
  const [onlyNew, setOnlyNew] = useState(true);
  const visible = mining.words.filter((word) => (!level || (word.level ?? "unknown") === level) && (!onlyNew || !mining.known.has(word.term)));
  return <div className="space-y-4"><h1 className="text-2xl font-bold">Thêm từ từ đoạn văn</h1><p className="text-sm text-slate-500">Dán đoạn tiếng Anh, chọn tối đa {MINING_BATCH} từ mỗi lượt. Không phân tích bằng AI; chỉ tra nghĩa khi bạn bấm tra. Danh sách giới hạn 200 từ khác nhau, khớp từ trong kho theo cách viết.</p>
    <label className="block text-sm">Đoạn văn<textarea rows={6} maxLength={MINING_MAX_TEXT} value={mining.text} disabled={mining.busy} onChange={(e) => mining.changeText(e.target.value)} className="mt-1 w-full rounded-lg border bg-transparent p-3 dark:border-slate-700" /></label>
    {mining.error && <p role="alert" className="text-amber-700 dark:text-amber-300">{mining.error} {!mining.ready && <button onClick={() => void mining.load()} className="underline">Thử tải lại</button>}</p>}
    {!mining.ready ? <p>Đang chờ tải kho từ…</p> : !mining.decks.length ? <p>Hãy tạo bộ thẻ EN → VI trước khi lưu từ.</p> : <>
    <Button variant="secondary" disabled={mining.busy} onClick={() => void mining.load()}>Cập nhật từ đã có trong kho</Button>
    <label className="block text-sm">Lưu vào bộ<select disabled={mining.busy} value={mining.deckId} onChange={(e) => mining.setDeckId(e.target.value)} className="ml-2 rounded border bg-transparent p-2 dark:bg-slate-900">{mining.decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.name}</option>)}</select></label>
    <div className="flex flex-wrap items-center gap-3"><label className="text-sm">Cấp độ <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded border bg-transparent p-2 dark:bg-slate-900"><option value="">Tất cả</option>{["A1", "A2", "B1", "B2", "C1", "C2"].map((value) => <option key={value}>{value}</option>)}<option value="unknown">Chưa rõ</option></select></label><label className="text-sm"><input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} /> Chỉ từ chưa có trong kho</label></div>
    <div className="flex max-h-72 flex-wrap gap-2 overflow-y-auto">{visible.map((word) => <label key={word.term} className="rounded-lg border p-2 text-sm dark:border-slate-700"><input type="checkbox" checked={mining.selected.includes(word.term)} disabled={mining.busy || (mining.inDeck.has(word.term) && !mining.selected.includes(word.term)) || (!mining.selected.includes(word.term) && mining.selected.length >= MINING_BATCH)} onChange={() => mining.toggle(word.term)} /> {word.term} · {word.level ?? "?"} · {word.count}×{mining.known.has(word.term) ? mining.inDeck.has(word.term) ? " · đã có trong bộ" : " · đã có ở bộ khác" : ""}</label>)}</div>
    {!!mining.text.trim() && !visible.length && <p className="text-sm text-slate-500">Không có từ phù hợp bộ lọc.</p>}
    <p className="text-sm">Đã chọn: {mining.selected.join(", ") || "chưa có"} ({mining.selected.length}/{MINING_BATCH})</p>
    <Button disabled={mining.busy || !mining.selected.length} onClick={() => void mining.lookup()}>{mining.busy ? "Đang xử lý…" : "Tra từ đã chọn / thử lại"}</Button>
    {mining.selected.map((term) => mining.drafts[term] && <details key={term} open className="rounded-xl border p-4 dark:border-slate-800"><summary className="cursor-pointer font-semibold">{term} — {mining.drafts[term].meaningVi || "Nhập nghĩa thủ công"}</summary><fieldset disabled={mining.busy} className="mt-4"><DraftEditor draft={mining.drafts[term]} onChange={(draft) => mining.setDrafts((items) => ({ ...items, [term]: draft }))} /></fieldset></details>)}
    <Button disabled={mining.busy || !mining.savable.length} onClick={() => void mining.save()}>Lưu {mining.savable.length} thẻ đã xem có nghĩa</Button>
    </>}
    {mining.message && <p role="status">{mining.message}</p>}<p className="text-xs text-slate-500">CEFR là mức tham khảo từ dữ liệu có sẵn. Nội dung đang soạn chỉ giữ trong màn hình này; rời trang sẽ mất các thẻ chưa lưu.</p>
  </div>;
}
