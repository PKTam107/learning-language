import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Web và mobile là hai client dùng CHUNG một cơ sở dữ liệu, nên logic lịch ôn
 * và hàng đợi phải giống hệt nhau: lệch một hệ số là học trên máy nào ra lịch
 * nấy, và người dùng không có cách nào biết.
 *
 * Hai file được nhân bản (mobile không import được từ web), nên test này canh
 * cho bản sao không trôi: so phần **mã** sau khi bỏ chú thích.
 */
const strip = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "") // chú thích khối
    .replace(/^\s*\/\/.*$/gm, "") // chú thích dòng
    .replace(/\s+/g, " ")
    .trim();

const pairs: [string, string][] = [
  ["src/lib/dictation.ts", "mobile/src/lib/dictation.ts"],
  ["src/lib/learning-insights.ts", "mobile/src/lib/learning-insights.ts"],
  ["src/lib/reading-library.ts", "mobile/src/lib/reading-library.ts"],
  ["src/hooks/useReadingLibrary.ts", "mobile/src/hooks/useReadingLibrary.ts"],
  ["src/lib/goals.ts", "mobile/src/lib/goals.ts"],
  ["src/lib/challenge.ts", "mobile/src/lib/challenge.ts"],
  ["src/lib/reading.ts", "mobile/src/lib/reading.ts"],
  ["src/hooks/useReadingLesson.ts", "mobile/src/hooks/useReadingLesson.ts"],
  ["src/lib/image-search.ts", "mobile/src/lib/image-search.ts"],
  ["src/hooks/useImageSearch.ts", "mobile/src/hooks/useImageSearch.ts"],
  ["src/lib/study-session.ts", "mobile/src/lib/study-session.ts"],
  ["src/lib/card-image.ts", "mobile/src/lib/card-image.ts"],
  ["src/lib/srs.ts", "mobile/src/lib/srs.ts"],
  ["src/lib/queue.ts", "mobile/src/lib/queue.ts"],
  ["src/lib/quiz.ts", "mobile/src/lib/quiz.ts"],
  ["src/lib/flip.ts", "mobile/src/lib/flip.ts"],
  ["src/lib/share-text.ts", "mobile/src/lib/share-text.ts"],
];

describe("web ↔ mobile dùng chung logic thuần", () => {
  for (const [web, mobile] of pairs) {
    it(`${web} khớp ${mobile}`, () => {
      expect(strip(readFileSync(mobile, "utf8"))).toBe(
        strip(readFileSync(web, "utf8"))
      );
    });
  }
});
