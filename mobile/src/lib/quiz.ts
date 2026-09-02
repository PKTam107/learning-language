import type { CardWithProgress } from "@/types";

/**
 * Các kiểu ôn. Hai chiều kiểm tra khác nhau hẳn về độ khó:
 *  - **Nhận diện** (thấy từ Anh → nhớ nghĩa): `flashcard`, `mcq`.
 *  - **Sản sinh** (thấy nghĩa Việt → nhớ ra từ Anh): `mcq_reverse`, `typing`.
 *    Chiều này khó hơn và mới là thứ cần khi nói/viết. `typing` bắt gõ đúng
 *    chính tả, `mcq_reverse` thì chỉ cần nhận ra từ — nhẹ hơn cho từ dài.
 *  - `listening`: nghe âm → gõ lại từ.
 */
export type ReviewType =
  | "flashcard"
  | "mcq"
  | "mcq_reverse"
  | "typing"
  | "listening";

export const REVIEW_TYPES: { value: ReviewType; label: string }[] = [
  { value: "flashcard", label: "Lật thẻ" },
  { value: "mcq", label: "Trắc nghiệm" },
  { value: "mcq_reverse", label: "Việt → Anh" },
  { value: "typing", label: "Gõ từ" },
  { value: "listening", label: "Nghe" },
];

/** Kiểu ôn cần ít nhất 2 thẻ có dữ liệu để dựng đáp án nhiễu. */
export const MCQ_TYPES: ReviewType[] = ["mcq", "mcq_reverse"];

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
 * Chiều của câu trắc nghiệm:
 *  - `termToMeaning`: đề là từ tiếng Anh, chọn nghĩa tiếng Việt (nhận diện).
 *  - `meaningToTerm`: đề là nghĩa tiếng Việt, chọn từ tiếng Anh (sản sinh).
 */
export type McqDirection = "termToMeaning" | "meaningToTerm";

/** Giá trị đem ra làm đáp án/nhiễu, tùy chiều. */
function answerText(c: CardWithProgress, dir: McqDirection): string {
  return dir === "termToMeaning" ? (c.meaning_vi ?? "").trim() : c.term.trim();
}

/** Giá trị làm **đề bài** — mặt đối diện của đáp án. */
function promptText(c: CardWithProgress, dir: McqDirection): string {
  return dir === "termToMeaning" ? c.term.trim() : (c.meaning_vi ?? "").trim();
}

/**
 * Sinh câu trắc nghiệm. Nhiễu lấy từ các thẻ khác trong cùng nguồn học, ưu tiên
 * **cùng từ loại** cho khó hơn (chọn giữa 4 danh từ khó hơn giữa 1 danh từ và 3
 * động từ).
 *
 * Trả `null` khi không dựng được: thẻ thiếu dữ liệu ở một trong hai chiều, hoặc
 * nguồn học không còn thẻ nào khác để làm nhiễu.
 */
export function buildMcq(
  card: CardWithProgress,
  pool: CardWithProgress[],
  direction: McqDirection = "termToMeaning"
): Mcq | null {
  const answer = answerText(card, direction);
  // Chiều ngược vẫn cần nghĩa tiếng Việt để làm *đề bài*, nên cả hai chiều đều
  // đòi thẻ có đủ cả từ lẫn nghĩa.
  if (!answer || !(card.meaning_vi ?? "").trim() || !card.term.trim()) {
    return null;
  }

  const seen = new Set<string>([norm(answer)]);
  // Bỏ thẻ có **cùng đề bài** với thẻ đang hỏi: nhìn vào đề thì đáp án của nó
  // cũng đúng, thành câu hai đáp án. Ví dụ chiều ngược, đề "quyết định" mà lấy
  // cả `decision` lẫn `decide` làm lựa chọn.
  //
  // Trước đây khó gặp vì mỗi bộ thẻ đã chặn trùng từ, nhưng phiên "Ôn hôm nay"
  // gộp mọi bộ thẻ — mà cùng một từ được phép nằm ở nhiều bộ.
  const prompt = norm(promptText(card, direction));
  const candidates = pool.filter((c) => {
    const v = answerText(c, direction);
    if (c.id === card.id || !v || seen.has(norm(v))) return false;
    return norm(promptText(c, direction)) !== prompt;
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
    const v = answerText(c, direction);
    if (seen.has(norm(v))) continue;
    seen.add(norm(v));
    distractors.push(v);
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
