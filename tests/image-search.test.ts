import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useImageSearch } from "../src/hooks/useImageSearch";
import type { CardImage } from "../src/lib/card-image";
import type { ImageCursor, ImageSearchPage } from "../src/lib/image-search";

const image = (id: number): CardImage => ({ id, url: `https://images.pexels.com/photos/${id}/photo.jpeg`, pageUrl: `https://www.pexels.com/photo/${id}/`, photographer: "Photographer", alt: `Photo ${id}` });
const cursor: ImageCursor = { gsroffset: 12, continue: "gsroffset||" };
const page = (ids: number[], nextCursor: ImageCursor | null = null): ImageSearchPage => ({ images: ids.map(image), nextCursor });
const deferred = () => {
  let resolve!: (value: ImageSearchPage) => void;
  const promise = new Promise<ImageSearchPage>((done) => { resolve = done; });
  return { promise, resolve };
};

let picker: ReturnType<typeof useImageSearch>;
let renderer: ReactTestRenderer;
const fetchPage = vi.fn<(query: string, cursor: ImageCursor | null) => Promise<ImageSearchPage>>();
function Harness({ term = "apple" }: { term?: string }) {
  picker = useImageSearch(term, fetchPage);
  return null;
}

beforeEach(() => {
  fetchPage.mockReset();
  act(() => { renderer = create(createElement(Harness)); });
});
afterEach(() => { act(() => renderer.unmount()); });

describe("image search popup", () => {
  it("searches on open, appends pages without duplicates and stops at the last page", async () => {
    fetchPage.mockResolvedValueOnce(page([1, 2], cursor)).mockResolvedValueOnce(page([2, 3]));
    await act(async () => { picker.show(); });
    expect(picker.open).toBe(true);
    expect(fetchPage).toHaveBeenNthCalledWith(1, "apple", null);
    await act(async () => { await picker.search(picker.cursor); });
    expect(fetchPage).toHaveBeenNthCalledWith(2, "apple", cursor);
    expect(picker.images.map((photo) => photo.id)).toEqual([1, 2, 3]);
    expect(picker.cursor).toBeNull();
  });

  it("ignores late responses from a previous query", async () => {
    const old = deferred();
    fetchPage.mockReturnValueOnce(old.promise).mockResolvedValueOnce(page([2]));
    act(() => picker.show());
    act(() => picker.changeQuery("river bank"));
    await act(async () => { await picker.search(); });
    await act(async () => { old.resolve(page([1], cursor)); });
    expect(fetchPage).toHaveBeenLastCalledWith("river bank", null);
    expect(picker.images.map((photo) => photo.id)).toEqual([2]);
    expect(picker.cursor).toBeNull();
    expect(picker.busy).toBe(false);
  });

  it("keeps loaded images and the cursor when loading more fails, then allows retry", async () => {
    fetchPage.mockResolvedValueOnce(page([1], cursor)).mockRejectedValueOnce(new Error("Thử lại sau")).mockResolvedValueOnce(page([2]));
    await act(async () => { picker.show(); });
    await act(async () => { await picker.search(picker.cursor); });
    expect(picker.images.map((photo) => photo.id)).toEqual([1]);
    expect(picker.cursor).toEqual(cursor);
    expect(picker.message).toBe("Thử lại sau");
    await act(async () => { await picker.search(picker.cursor); });
    expect(picker.images.map((photo) => photo.id)).toEqual([1, 2]);
    expect(picker.message).toBe("");
  });

  it("blocks duplicate requests and ignores responses after closing the popup", async () => {
    const request = deferred();
    fetchPage.mockReturnValueOnce(request.promise).mockResolvedValueOnce(page([2]));
    act(() => { picker.show(); void picker.search(); });
    expect(fetchPage).toHaveBeenCalledTimes(1);
    act(() => picker.close());
    await act(async () => { request.resolve(page([1], cursor)); });
    expect(picker.open).toBe(false);
    expect(picker.images).toEqual([]);
    expect(picker.busy).toBe(false);
    await act(async () => { picker.show(); });
    expect(picker.images.map((photo) => photo.id)).toEqual([2]);
  });

  it("resets results and ignores requests belonging to a different card", async () => {
    const request = deferred();
    fetchPage.mockReturnValueOnce(request.promise);
    act(() => picker.show());
    act(() => renderer.update(createElement(Harness, { term: "cat" })));
    await act(async () => { request.resolve(page([1], cursor)); });
    expect(picker.query).toBe("cat");
    expect(picker.open).toBe(false);
    expect(picker.images).toEqual([]);
    expect(picker.cursor).toBeNull();
  });
});
