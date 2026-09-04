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
  ["src/lib/srs.ts", "mobile/src/lib/srs.ts"],
  ["src/lib/queue.ts", "mobile/src/lib/queue.ts"],
  ["src/lib/flip.ts", "mobile/src/lib/flip.ts"],
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
