import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), from: vi.fn(), fetchAllRows: vi.fn(), update: vi.fn(), eq: vi.fn(),
  select: vi.fn(), single: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getUser: mocks.getUser }, from: mocks.from } }));
vi.mock("@/lib/paginate", () => ({ fetchAllRows: mocks.fetchAllRows }));
vi.mock("@/lib/policy", () => ({ resolvePolicy: vi.fn() }));
vi.mock("@/lib/trash", () => ({ trashCards: vi.fn() }));
// The native module uses mobile aliases, while this test runner uses web aliases.
// Load it at runtime with the native dependencies mocked above; mobile tsc checks its types.
const mobileCardsModule = "../mobile/src/lib/cards";
const { cardToDraft, updateCard } = await import(mobileCardsModule) as {
  cardToDraft: (card: Card) => import("../mobile/src/types").DraftCard;
  updateCard: (id: string, deckId: string, draft: import("../mobile/src/types").DraftCard) => Promise<void>;
};
import type { Card } from "../mobile/src/types";

const card = {
  id: "card-1", deck_id: "deck-1", term: "apple", meaning_vi: "quả táo", note: "mẹo nhớ",
  phonetic: "/apple/", phonetic_uk: "/uk/", phonetic_us: "/us/", audio_us: "us.mp3", audio_uk: "uk.mp3",
  part_of_speech: "noun", definitions: [{ partOfSpeech: "noun", definition: "a fruit" }],
  examples: [{ text: "An apple." }], cefr_level: "A1", word_family: ["apples"], collocations: ["apple pie"],
  source_language: "en", target_language: "vi",
  image: { id: 1, url: "https://images.pexels.com/photos/1/photo.jpeg", pageUrl: "https://www.pexels.com/photo/1/", photographer: "Author", alt: "Apple" },
} as Card;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  mocks.fetchAllRows.mockResolvedValue([]);
  const query = { update: mocks.update, eq: mocks.eq, select: mocks.select, single: mocks.single };
  for (const fn of [mocks.from, mocks.update, mocks.eq, mocks.select]) fn.mockReturnValue(query);
  mocks.single.mockResolvedValue({ data: { id: card.id }, error: null });
});

describe("editing saved cards on mobile", () => {
  it("preserves existing dictionary content and persists the selected image without changing progress", async () => {
    const draft = cardToDraft(card);
    expect(draft).toMatchObject({ meaningVi: card.meaning_vi, phoneticUk: card.phonetic_uk, audioUs: card.audio_us, image: card.image });
    await updateCard(card.id, card.deck_id, { ...draft, term: " apple tree ", meaningVi: "cây táo" });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ term: "apple tree", meaning_vi: "cây táo", image: card.image, definitions: card.definitions, examples: card.examples, word_family: card.word_family }));
    expect(mocks.from).toHaveBeenCalledWith("cards");
    expect(mocks.from).not.toHaveBeenCalledWith("card_progress");
    expect(mocks.eq.mock.calls).toEqual([["id", card.id], ["user_id", "user-1"], ["deck_id", card.deck_id]]);
  });
  it("adds an image to a previously imageless card", async () => {
    const draft = cardToDraft({ ...card, image: null });
    expect(draft.image).toBeNull();
    await updateCard(card.id, card.deck_id, { ...draft, image: card.image });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ image: card.image }));
  });
  it("requires authentication before updating", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(updateCard(card.id, card.deck_id, cardToDraft(card))).rejects.toThrow("Chưa đăng nhập");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("can remove a saved image", async () => {
    await updateCard(card.id, card.deck_id, { ...cardToDraft(card), image: null });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ image: null }));
  });
  it("rejects empty terms and duplicates before updating", async () => {
    await expect(updateCard(card.id, card.deck_id, { ...cardToDraft(card), term: "  " })).rejects.toThrow("Từ không được để trống");
    mocks.fetchAllRows.mockResolvedValue([{ id: "other", term: " APPLE " }]);
    await expect(updateCard(card.id, card.deck_id, cardToDraft(card))).rejects.toThrow("đã có");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("reports save failures so the editor can retain the draft", async () => {
    mocks.single.mockResolvedValue({ error: { message: "offline" } });
    await expect(updateCard(card.id, card.deck_id, cardToDraft(card))).rejects.toMatchObject({ message: "offline" });
  });
});
