import { describe, expect, it } from "vitest";
import {
  buildCloze,
  canUseReviewType,
  checkCloze,
  hasCloze,
  pickReviewType,
} from "../src/lib/quiz";
import type { CardStatus, CardWithProgress, Example } from "../src/types";

/** Thẻ tối giản cho test — chỉ những cột mà quiz.ts thật sự đọc. */
function card(
  over: {
    id?: string;
    term?: string;
    meaning_vi?: string | null;
    part_of_speech?: string | null;
    examples?: Example[];
    status?: CardStatus;
    review_count?: number;
  } = {}
): CardWithProgress {
  const { status, review_count, ...rest } = over;
  return {
    id: over.id ?? "c1",
    term: over.term ?? "run",
    meaning_vi: over.meaning_vi ?? "chạy",
    part_of_speech: over.part_of_speech ?? "verb",
    examples: over.examples ?? [],
    progress: status
      ? ({ status, review_count: review_count ?? 0 } as never)
      : null,
    ...rest,
  } as unknown as CardWithProgress;
}

const ex = (text: string, textVi?: string): Example => ({ text, textVi });

describe("buildCloze — khoét chỗ trống từ ví dụ của thẻ", () => {
  it("khoét đúng từ và giữ lại hai phía của câu", () => {
    const c = card({
      term: "resilient",
      examples: [ex("The economy is resilient enough.", "Nền kinh tế đủ sức bật.")],
    });
    const cz = buildCloze(c)!;
    expect(cz.answer).toBe("resilient");
    expect(cz.before).toBe("The economy is ");
    expect(cz.after).toBe(" enough.");
    expect(cz.translation).toBe("Nền kinh tế đủ sức bật.");
  });

  it("khớp cả dạng chia, và answer là dạng CÓ TRONG CÂU", () => {
    // Câu thật hiếm dùng dạng nguyên thể — bắt sai dạng là khoét sai chỗ.
    expect(buildCloze(card({ term: "run", examples: [ex("She is running fast now.")] }))!.answer)
      .toBe("running");
    expect(buildCloze(card({ term: "study", examples: [ex("He studies every night.")] }))!.answer)
      .toBe("studies");
    expect(buildCloze(card({ term: "plan", examples: [ex("They planned the whole trip.")] }))!.answer)
      .toBe("planned");
    expect(buildCloze(card({ term: "decide", examples: [ex("We are deciding right now.")] }))!.answer)
      .toBe("deciding");
  });

  it("bỏ qua ví dụ không chứa từ, lấy ví dụ kế tiếp", () => {
    const cz = buildCloze(
      card({
        term: "brave",
        examples: [ex("A different sentence entirely."), ex("He was a brave young man.")],
      })
    )!;
    expect(cz.answer).toBe("brave");
  });

  it("không dựng được khi thẻ không có ví dụ nào dùng tới từ", () => {
    expect(buildCloze(card({ term: "brave", examples: [] }))).toBeNull();
    expect(
      buildCloze(card({ term: "brave", examples: [ex("Nothing matches here.")] }))
    ).toBeNull();
    // Bất quy tắc: thà không có cloze còn hơn khoét sai chỗ.
    expect(buildCloze(card({ term: "go", examples: [ex("She went to school.")] }))).toBeNull();
  });

  it("câu quá ngắn thì bỏ — khoét xong không còn ngữ cảnh", () => {
    expect(buildCloze(card({ term: "run", examples: [ex("Run!")] }))).toBeNull();
    expect(buildCloze(card({ term: "run", examples: [ex("I run.")] }))).toBeNull();
  });

  it("hasCloze khớp với buildCloze", () => {
    const c = card({ term: "run", examples: [ex("She is running fast now.")] });
    expect(hasCloze(c)).toBe(true);
    expect(hasCloze(card({ term: "run", examples: [] }))).toBe(false);
  });
});

describe("checkCloze — chấm câu điền chỗ trống", () => {
  const c = card({ term: "run", examples: [ex("She is running fast now.")] });
  const cz = buildCloze(c)!;

  it("nhận cả dạng trong câu lẫn dạng nguyên thể của thẻ", () => {
    expect(checkCloze("running", cz, c.term)).toBe(true);
    expect(checkCloze("run", cz, c.term)).toBe(true);
    expect(checkCloze("  RUNNING ", cz, c.term)).toBe(true);
  });

  it("vẫn cho sai 1 ký tự như kiểu gõ từ", () => {
    expect(checkCloze("runing", cz, c.term)).toBe(true);
  });

  it("từ khác thì sai", () => {
    expect(checkCloze("walking", cz, c.term)).toBe(false);
    expect(checkCloze("", cz, c.term)).toBe(false);
  });
});

describe("canUseReviewType — kiểu ôn nào dựng được cho thẻ này", () => {
  const pool = [
    card({ id: "a", term: "run", meaning_vi: "chạy" }),
    card({ id: "b", term: "walk", meaning_vi: "đi bộ" }),
    card({ id: "c", term: "swim", meaning_vi: "bơi" }),
    card({ id: "d", term: "jump", meaning_vi: "nhảy" }),
  ];

  it("lật thẻ luôn dùng được", () => {
    expect(canUseReviewType("flashcard", card({ meaning_vi: null }), [])).toBe(true);
  });

  it("gõ từ cần nghĩa tiếng Việt làm đề bài", () => {
    expect(canUseReviewType("typing", card({ meaning_vi: "chạy" }), pool)).toBe(true);
    expect(canUseReviewType("typing", card({ meaning_vi: null }), pool)).toBe(false);
  });

  it("trắc nghiệm cần thẻ khác để làm nhiễu", () => {
    expect(canUseReviewType("mcq", pool[0], pool)).toBe(true);
    expect(canUseReviewType("mcq", pool[0], [pool[0]])).toBe(false);
  });

  it("cloze cần ví dụ chứa từ", () => {
    expect(canUseReviewType("cloze", pool[0], pool)).toBe(false);
    expect(
      canUseReviewType(
        "cloze",
        card({ term: "run", examples: [ex("She is running fast now.")] }),
        pool
      )
    ).toBe(true);
  });
});

describe("pickReviewType — chế độ Tự động", () => {
  const others = [
    card({ id: "b", term: "walk", meaning_vi: "đi bộ" }),
    card({ id: "c", term: "swim", meaning_vi: "bơi" }),
    card({ id: "d", term: "jump", meaning_vi: "nhảy" }),
  ];
  const withPool = (c: CardWithProgress) => pickReviewType(c, [c, ...others]);

  it("thẻ chưa học → lật thẻ (phải được xem đáp án trước)", () => {
    expect(withPool(card())).toBe("flashcard");
    expect(withPool(card({ status: "new" }))).toBe("flashcard");
  });

  it("thẻ chưa thuộc → trắc nghiệm nhận diện (nhẹ nhất)", () => {
    expect(withPool(card({ status: "hard" }))).toBe("mcq");
  });

  it("thẻ đang thuộc → cloze khi có ví dụ, không thì chiều sản sinh", () => {
    expect(
      withPool(card({ status: "good", examples: [ex("She is running fast now.")] }))
    ).toBe("cloze");
    expect(withPool(card({ status: "good" }))).toBe("mcq_reverse");
  });

  it("thẻ đã thuộc → gõ từ, luân phiên sang nghe theo số lượt ôn", () => {
    expect(withPool(card({ status: "easy", review_count: 4 }))).toBe("typing");
    expect(withPool(card({ status: "easy", review_count: 5 }))).toBe("listening");
  });

  it("thiếu dữ liệu thì HẠ xuống kiểu khả thi, không bỏ thẻ", () => {
    // Không nghĩa tiếng Việt: trắc nghiệm và gõ từ đều không dựng được.
    expect(pickReviewType(card({ status: "hard", meaning_vi: null }), others)).toBe(
      "flashcard"
    );
    // Không có thẻ nào khác làm nhiễu.
    const lonely = card({ status: "good" });
    expect(pickReviewType(lonely, [lonely])).toBe("typing");
  });

  it("tất định — gọi lại cho cùng thẻ ra cùng kiểu", () => {
    const c = card({ status: "good", examples: [ex("She is running fast now.")] });
    const pool = [c, ...others];
    const first = pickReviewType(c, pool);
    for (let i = 0; i < 20; i++) expect(pickReviewType(c, pool)).toBe(first);
  });
});
