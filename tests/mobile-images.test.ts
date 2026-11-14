import { describe, expect, it } from "vitest";
import { cardImageSource } from "../mobile/src/lib/image-source";
import { parseCardImage } from "../mobile/src/lib/card-image";

const photo = {
  id: 7823406, source: "commons", url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Red_Apple.jpg/960px-Red_Apple.jpg",
  pageUrl: "https://commons.wikimedia.org/wiki/File:Red_Apple.jpg", photographer: "Abhijit Tembhekar",
  alt: "Red Apple.jpg", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0",
};

describe("mobile image requests", () => {
  it("identifies the app to Wikimedia instead of using Android's rejected default user agent", () => {
    for (const host of ["thumb.wikimedia.org", "upload.wikimedia.org"]) {
      const image = parseCardImage({ ...photo, url: photo.url.replace("thumb.wikimedia.org", host) });
      expect(image).not.toBeNull();
      const source = cardImageSource(image!);
      expect(source.uri).toBe(image!.url);
      expect(source.headers?.["User-Agent"]).toMatch(/^LinguaCards\/[\d.]+ \(https:\/\//);
    }
  });

  it("keeps previously saved Pexels images working", () => {
    const image = parseCardImage({ id: 1, url: "https://images.pexels.com/photos/1/photo.jpeg", pageUrl: "https://www.pexels.com/photo/1/", photographer: "Photographer", alt: "Apple" });
    expect(image).not.toBeNull();
    expect(cardImageSource(image!)).toEqual({ uri: image!.url });
  });
});
