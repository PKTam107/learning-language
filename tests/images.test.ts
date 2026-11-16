import { beforeEach, describe, expect, it, vi } from "vitest";
import { commonsImages } from "@/lib/commons-images";
import { parseCardImage } from "@/lib/card-image";

vi.mock("@/lib/supabase/getUser", () => ({ getRequestUser: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: vi.fn().mockResolvedValue(null), standardRules: vi.fn(() => []) }));
vi.mock("@/lib/user-agent", () => ({ requestDeviceId: () => null }));
import { getRequestUser } from "@/lib/supabase/getUser";
import { POST } from "@/app/api/images/route";

const photo = { id: 1, url: "https://images.pexels.com/photos/1/photo.jpeg", pageUrl: "https://www.pexels.com/photo/1/", photographer: "Photographer", alt: "Apple" };
const commonsPhoto = { id: 42, source: "commons", url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Apple.jpg/640px-Apple.jpg", pageUrl: "https://commons.wikimedia.org/wiki/File:Apple.jpg", photographer: "Alice & Bob", alt: "Apple.jpg", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0" };
const info = { thumburl: commonsPhoto.url, descriptionurl: commonsPhoto.pageUrl, mime: "image/jpeg", extmetadata: { Artist: { value: '<a href="https://example.com">Alice &amp; Bob</a>' }, LicenseShortName: { value: commonsPhoto.license }, LicenseUrl: { value: commonsPhoto.licenseUrl } } };
const commonsResponse = { query: { pages: [{ pageid: 42, title: "File:Apple.jpg", imageinfo: [info] }] } };
const request = (query = "apple", cursor?: unknown) => new Request("http://localhost/api/images", { method: "POST", body: JSON.stringify({ query, cursor }) });

describe("vocabulary images", () => {
  beforeEach(() => {
    vi.stubEnv("PEXELS_API_KEY", "");
    vi.mocked(getRequestUser).mockResolvedValue({ id: "user" } as Awaited<ReturnType<typeof getRequestUser>>);
    vi.stubGlobal("fetch", vi.fn());
  });

  it("only accepts HTTPS Pexels images and credits", () => {
    expect(parseCardImage(photo)).toEqual(photo);
    expect(parseCardImage(null)).toBeNull();
    for (const url of ["javascript:alert(1)", "http://images.pexels.com/a", "https://images.pexels.com.evil.test/a", "https://evil.test/a"]) {
      expect(parseCardImage({ ...photo, url })).toBeNull();
    }
    expect(parseCardImage({ ...photo, pageUrl: "javascript:alert(1)" })).toBeNull();
  });

  it("requires authentication before searching images", async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects empty searches", async () => {
    expect((await POST(request("  "))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("searches Commons without a key and preserves attribution and license", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(commonsResponse));
    const response = await POST(request(" river bank "));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ images: [commonsPhoto], nextCursor: null });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("gsrsearch=river+bank"), expect.objectContaining({ next: { revalidate: 86400 } }));
    const options = vi.mocked(fetch).mock.calls[0][1];
    expect(options?.headers).not.toHaveProperty("Authorization");
    const search = new URL(String(vi.mocked(fetch).mock.calls[0][0])).searchParams;
    expect(search.get("gsrsearch")).toBe("river bank filetype:bitmap|drawing");
    expect(search.get("iiprop")).toContain("thumbmime");
  });

  it("includes SVG anatomy diagrams using Commons bitmap thumbnails", async () => {
    const diagram = { ...commonsPhoto, alt: "Spinal cord.svg", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Spinal_cord.svg/640px-Spinal_cord.svg.png" };
    const svgInfo = { ...info, mime: "image/svg+xml", thumbmime: "image/png", thumburl: diagram.url };
    const data = { query: { pages: [{ pageid: 42, title: "File:Spinal cord.svg", imageinfo: [svgInfo] }] } };
    vi.mocked(fetch).mockResolvedValue(Response.json(data));
    expect(await (await POST(request("spinal cord"))).json()).toEqual({ images: [diagram], nextCursor: null });
    for (const patch of [{ thumbmime: undefined }, { thumbmime: "image/svg+xml" }, { thumburl: undefined }, { mime: "application/pdf" }]) {
      expect(commonsImages({ query: { pages: [{ pageid: 42, title: "File:Spinal cord.svg", imageinfo: [{ ...svgInfo, ...patch }] }] } })).toEqual([]);
    }
  });

  it("filters non-images and missing or unsupported licenses", () => {
    expect(commonsImages({})).toEqual([]);
    for (const patch of [{ mime: "application/pdf" }, { extmetadata: {} }, { extmetadata: { ...info.extmetadata, LicenseShortName: { value: "All rights reserved" } } }]) {
      expect(commonsImages({ query: { pages: [{ pageid: 42, title: "File:Apple.jpg", imageinfo: [{ ...info, ...patch }] }] } })).toEqual([]);
    }
  });

  it("rejects unsafe Commons URLs and requires a license", () => {
    expect(parseCardImage(commonsPhoto)).toEqual(commonsPhoto);
    expect(parseCardImage({ ...commonsPhoto, license: undefined })).toBeNull();
    expect(parseCardImage({ ...commonsPhoto, url: "https://upload.wikimedia.org.evil.test/image.jpg" })).toBeNull();
    expect(parseCardImage({ ...commonsPhoto, licenseUrl: "javascript:alert(1)" })).toBeNull();
  });


  it("returns more than four approved images in search rank order", async () => {
    const pages = Array.from({ length: 12 }, (_, i) => ({
      pageid: 42 + i, index: i + 1, title: `File:Apple ${i}.jpg`, imageinfo: [info],
    })).reverse();
    vi.mocked(fetch).mockResolvedValue(Response.json({ query: { pages } }));
    const data = await (await POST(request())).json();
    expect(data.images).toHaveLength(12);
    expect(data.images.map((image: { id: number }) => image.id)).toEqual(Array.from({ length: 12 }, (_, i) => 42 + i));
    expect(data.nextCursor).toBeNull();
  });

  it("preserves and forwards the provider continuation for loading more", async () => {
    const cursor = { gsroffset: 12, continue: "gsroffset||" };
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ ...commonsResponse, continue: cursor }));
    const first = await (await POST(request())).json();
    expect(first.nextCursor).toEqual(cursor);
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(commonsResponse));
    const last = await (await POST(request("apple", first.nextCursor))).json();
    expect(last.nextCursor).toBeNull();
    const params = new URL(String(vi.mocked(fetch).mock.calls[1][0])).searchParams;
    expect(params.get("gsroffset")).toBe("12");
    expect(params.get("continue")).toBe("gsroffset||");
    expect(params.get("gsrsearch")).toBe("apple filetype:bitmap|drawing");
  });

  it("allows loading more even when the current page has no reusable images", async () => {
    const cursor = { gsroffset: 24, continue: "gsroffset||" };
    vi.mocked(fetch).mockResolvedValue(Response.json({
      continue: cursor,
      query: { pages: [{ pageid: 42, title: "File:Apple.jpg", imageinfo: [{ ...info, extmetadata: {} }] }] },
    }));
    expect(await (await POST(request())).json()).toEqual({ images: [], nextCursor: cursor });
  });

  it("rejects invalid cursors before calling the image provider", async () => {
    for (const cursor of [{ gsroffset: -1, continue: "x" }, { gsroffset: 1.5, continue: "x" }, { gsroffset: 10001, continue: "x" }, { gsroffset: 12, continue: "" }, "bad"]) {
      expect((await POST(request("apple", cursor))).status).toBe(400);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports provider JSON errors as failures", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ error: { code: "maxlag" } }));
    expect((await POST(request())).status).toBe(502);
  });

  it("handles exhausted provider quota", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 429 }));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("hết lượt");
  });

  it("handles network failures", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("timeout"));
    expect((await POST(request())).status).toBe(502);
  });
});
