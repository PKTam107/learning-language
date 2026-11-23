import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMining, type MiningServices } from "../src/hooks/useMining";
import type { Deck, DraftCard } from "../src/types";
const draft = (term: string): DraftCard => ({ term, meaningVi: "nghĩa", definitions: [], examples: [{ text: "Dictionary example." }], sourceLanguage: "en", targetLanguage: "vi" });
const decks = [{ id: "deck", source_language: "en", target_language: "vi" }, { id: "other", source_language: "en", target_language: "vi" }] as Deck[];
const services = { load: vi.fn<MiningServices["load"]>(), lookup: vi.fn<MiningServices["lookup"]>(), save: vi.fn<MiningServices["save"]>() };
let mining: ReturnType<typeof useMining>, renderer: ReactTestRenderer;
function Harness() { mining = useMining(services, "I read a book and drink coffee."); return null; }
beforeEach(async () => {
  vi.resetAllMocks(); services.load.mockResolvedValue({ decks, cards: [{ term: "read", deck_id: "deck", source_language: "en", target_language: "vi" }, { term: "book", deck_id: "other", source_language: "en", target_language: "vi" }] });
  services.lookup.mockImplementation(async (term) => draft(term)); services.save.mockResolvedValue(undefined);
  await act(async () => { renderer = create(createElement(Harness)); });
});
afterEach(() => { act(() => renderer.unmount()); });
describe("word mining workflow", () => {
  it("loads only metadata automatically, marks existing terms, and looks up only explicitly selected words", async () => {
    expect(services.lookup).not.toHaveBeenCalled(); expect(mining.known.has("book")).toBe(true);
    act(() => { mining.toggle("read"); mining.toggle("book"); mining.toggle("coffee"); });
    expect(mining.selected).toEqual(["book", "coffee"]);
    await act(async () => { await mining.lookup(); });
    expect(services.lookup.mock.calls).toEqual([["book"], ["coffee"]]);
    expect(mining.drafts.book.examples[0].text).toBe("I read a book and drink coffee.");
    expect(mining.drafts.book.examples[1].text).toBe("Dictionary example.");
  });
  it("stops after a lookup failure, keeps selection and supports retry without redoing successful lookups", async () => {
    act(() => { mining.toggle("book"); mining.toggle("coffee"); mining.toggle("drink"); });
    services.lookup.mockResolvedValueOnce(draft("book")).mockRejectedValueOnce(new Error("quota"));
    await act(async () => { await mining.lookup(); });
    expect(services.lookup).toHaveBeenCalledTimes(2); expect(mining.selected).toHaveLength(3);
    expect(mining.drafts.coffee.meaningVi).toBeUndefined(); expect(mining.error).toContain("hạn mức");
    await act(async () => { await mining.lookup(); });
    expect(services.lookup.mock.calls.map(([term]) => term)).toEqual(["book", "coffee", "coffee", "drink"]);
  });
  it("keeps unsaved drafts on partial save failure and never re-saves successful cards", async () => {
    act(() => { mining.toggle("book"); mining.toggle("coffee"); });
    await act(async () => { await mining.lookup(); });
    services.save.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("offline"));
    await act(async () => { await mining.save(); });
    expect(mining.inDeck.has("book")).toBe(true); expect(mining.selected).toEqual(["coffee"]);
    expect(mining.drafts.coffee).toBeDefined(); expect(mining.message).toContain("1 thẻ");
    await act(async () => { await mining.save(); });
    expect(services.save.mock.calls.map(([, value]) => value.term)).toEqual(["book", "coffee", "coffee"]);
    expect(mining.selected).toEqual([]);
  });
  it("allows deselecting a word that exists in a newly selected destination deck", () => {
    act(() => { mining.toggle("book"); });
    act(() => mining.setDeckId("other"));
    expect(mining.inDeck.has("book")).toBe(true);
    act(() => mining.toggle("book")); expect(mining.selected).toEqual([]);
    act(() => mining.toggle("book")); expect(mining.selected).toEqual([]);
  });
  it("blocks duplicate actions while a batch is pending and allows manual correction after quota failure", async () => {
    let resolve!: (draft: DraftCard) => void;
    services.lookup.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    act(() => { mining.toggle("book"); });
    let pending!: Promise<void>;
    act(() => { pending = mining.lookup(); void mining.lookup(); });
    expect(services.lookup).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(draft("book")); await pending; });
    act(() => { mining.toggle("coffee"); });
    services.lookup.mockRejectedValueOnce(new Error("quota"));
    await act(async () => { await mining.lookup(); });
    act(() => mining.setDrafts((items) => ({ ...items, coffee: { ...items.coffee, meaningVi: "cà phê" } })));
    expect(mining.savable).toContain("coffee");
  });
});
