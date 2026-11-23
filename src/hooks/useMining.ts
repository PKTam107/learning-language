import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Deck, DraftCard } from "@/types";
import { mineWords, MINING_BATCH, MINING_MAX_TEXT, termKey } from "@/lib/mining";
export interface MiningServices {
  load(): Promise<{ decks: Deck[]; cards: { term: string; deck_id: string; source_language: string; target_language: string }[] }>;
  lookup(term: string): Promise<DraftCard>;
  save(deckId: string, draft: DraftCard): Promise<unknown>;
}
export function useMining(services: MiningServices, initialText = "") {
  const [text, setText] = useState(initialText.slice(0, MINING_MAX_TEXT));
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Awaited<ReturnType<MiningServices["load"]>>["cards"]>([]);
  const [deckId, setDeckId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftCard>>({});
  const [failed, setFailed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const active = useRef(true), locked = useRef(false);
  const load = useCallback(async () => {
    setReady(false); setError("");
    try {
      const result = await services.load();
      if (!active.current) return;
      const eligible = result.decks.filter((deck) => deck.source_language === "en" && deck.target_language === "vi");
      setDecks(eligible); setCards(result.cards.filter((card) => card.source_language === "en" && card.target_language === "vi"));
      setDeckId((value) => eligible.some((deck) => deck.id === value) ? value : eligible[0]?.id ?? ""); setReady(true);
    } catch { if (active.current) setError("Chưa tải được kho từ. Kiểm tra kết nối rồi thử lại."); }
  }, [services]);
  useEffect(() => { active.current = true; void load(); return () => { active.current = false; }; }, [load]);
  const words = useMemo(() => mineWords(text), [text]);
  const known = useMemo(() => new Set(cards.map((card) => termKey(card.term))), [cards]);
  const inDeck = useMemo(() => new Set(cards.filter((card) => card.deck_id === deckId).map((card) => termKey(card.term))), [cards, deckId]);
  function toggle(term: string) {
    if (busy) return;
    setSelected((list) => list.includes(term) ? list.filter((item) => item !== term) : !inDeck.has(term) && list.length < MINING_BATCH ? [...list, term] : list);
  }
  function changeText(value: string) { if (!busy) { setText(value.slice(0, MINING_MAX_TEXT)); setSelected([]); setDrafts({}); setFailed([]); setMessage(""); } }
  async function lookup() {
    if (locked.current || !ready) return;
    locked.current = true; setBusy(true); setError(""); setMessage("");
    try {
      for (const term of selected) {
        if (inDeck.has(term) || (drafts[term] && !failed.includes(term))) continue;
        const context = words.find((word) => word.term === term)?.context ?? "";
        try {
          const draft = await services.lookup(term);
          if (!active.current) return;
          setDrafts((items) => ({ ...items, [term]: { ...draft, examples: context ? [{ text: context }, ...draft.examples.filter((ex) => ex.text.trim() !== context)] : draft.examples } }));
          setFailed((list) => list.filter((item) => item !== term));
        } catch {
          if (!active.current) return;
          setDrafts((items) => ({ ...items, [term]: items[term] ?? { term, sourceLanguage: "en", targetLanguage: "vi", definitions: [], examples: context ? [{ text: context }] : [] } }));
          setFailed((list) => [...new Set([...list, term])]);
          setError("Chưa tra được từ hoặc đã hết hạn mức. Danh sách vẫn được giữ ở đây; bạn có thể nhập nghĩa thủ công hoặc bấm tra lại sau.");
          break; // Stop at the first failure; don't burn the remaining quota.
        }
      }
    } finally { locked.current = false; if (active.current) setBusy(false); }
  }
  const savable = selected.filter((term) => !inDeck.has(term) && drafts[term]?.meaningVi?.trim());
  async function save() {
    if (locked.current || !deckId || !savable.length) return;
    locked.current = true; setBusy(true); setError(""); setMessage("");
    let count = 0;
    try {
      for (const term of savable) {
        try {
          await services.save(deckId, drafts[term]);
          if (!active.current) return;
          count++;
          setCards((list) => [...list, { term: drafts[term].term, deck_id: deckId, source_language: "en", target_language: "vi" }]);
          setSelected((list) => list.filter((item) => item !== term));
        } catch { if (active.current) setError("Chưa lưu được thẻ tiếp theo (có thể từ đã tồn tại). Các thẻ chưa lưu vẫn được giữ để thử lại."); break; }
      }
      if (active.current && count) setMessage(`Đã lưu ${count} thẻ cùng ngữ cảnh gốc.`);
    } finally { locked.current = false; if (active.current) setBusy(false); }
  }
  return { text, changeText, decks, deckId, setDeckId, words, known, inDeck, selected, toggle, drafts, setDrafts, busy, ready, error, message, load, lookup, save, savable };
}
