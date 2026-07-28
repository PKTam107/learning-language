import type { CardWithProgress } from "@/types";

/** Các kiểu ôn: lật thẻ, trắc nghiệm, gõ từ, nghe. */
export type ReviewType = "flashcard" | "mcq" | "typing" | "listening";

export const REVIEW_TYPES: { value: ReviewType; label: string }[] = [
  { value: "flashcard", label: "Lật thẻ" },
  { value: "mcq", label: "Trắc nghiệm" },
  { value: "typing", label: "Gõ từ" },
  { value: "listening", label: "Nghe" },
];

function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

export interface Mcq {
  options: string[];
  answerIndex: number;
}

/**
 * Sinh câu trắc nghiệm: đề = từ (tiếng Anh), đáp án = nghĩa tiếng Việt,
 * nhiễu = nghĩa của các thẻ khác trong deck (ưu tiên cùng từ loại cho khó hơn).
 * Trả về null nếu thẻ không có nghĩa hoặc deck không đủ nhiễu.
 */
export function buildMcq(
  card: CardWithProgress,
  pool: CardWithProgress[]
): Mcq | null {
  const answer = (card.meaning_vi ?? "").trim();
  if (!answer) return null;

  const seen = new Set<string>([norm(answer)]);
  const candidates = pool.filter((c) => {
    const m = (c.meaning_vi ?? "").trim();
    return c.id !== card.id && !!m && !seen.has(norm(m));
  });

  const samePos = shuffle(
    candidates.filter(
      (c) => !!c.part_of_speech && c.part_of_speech === card.part_of_speech
    )
  );
  const otherPos = shuffle(
    candidates.filter(
      (c) => !(c.part_of_speech && c.part_of_speech === card.part_of_speech)
    )
  );

  const distractors: string[] = [];
  for (const c of [...samePos, ...otherPos]) {
    const m = (c.meaning_vi ?? "").trim();
    if (seen.has(norm(m))) continue;
    seen.add(norm(m));
    distractors.push(m);
    if (distractors.length === 3) break;
  }
  if (distractors.length === 0) return null;

  const options = shuffle([answer, ...distractors]);
  return { options, answerIndex: options.indexOf(answer) };
}

/** So khớp đáp án gõ tay: chuẩn hóa khoảng trắng/hoa thường + cho phép sai 1 ký tự. */
export function checkTyped(input: string, term: string): boolean {
  const a = norm(input);
  const b = norm(term);
  if (!a) return false;
  if (a === b) return true;
  return levenshtein(a, b) <= 1;
}

/** Khoảng cách sửa Levenshtein (đủ để biết có ≤1 hay không). */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 1) return 2; // chênh độ dài >1 ⇒ chắc chắn >1
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(
        dp[i] + 1,
        dp[i - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = tmp;
    }
  }
  return dp[m];
}
