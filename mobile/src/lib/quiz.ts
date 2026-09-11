import type { CardStatus, CardWithProgress } from "@/types";

/**
 * Các kiểu ôn. Hai chiều kiểm tra khác nhau hẳn về độ khó:
 *  - **Nhận diện** (thấy từ Anh → nhớ nghĩa): `flashcard`, `mcq`.
 *  - **Sản sinh** (thấy nghĩa Việt → nhớ ra từ Anh): `mcq_reverse`, `typing`.
 *    Chiều này khó hơn và mới là thứ cần khi nói/viết. `typing` bắt gõ đúng
 *    chính tả, `mcq_reverse` thì chỉ cần nhận ra từ — nhẹ hơn cho từ dài.
 *  - `listening`: nghe âm → gõ lại từ.
 *  - `cloze`: điền từ vào chỗ trống trong **chính câu ví dụ của thẻ** — gần với
 *    việc dùng từ thật nhất (đúng ngữ pháp, đúng ngữ cảnh) mà không cần thêm
 *    dữ liệu nào. Thẻ không có ví dụ chứa từ thì không dựng được.
 */
export type ReviewType =
  | "flashcard"
  | "mcq"
  | "mcq_reverse"
  | "typing"
  | "listening"
  | "cloze";

export const REVIEW_TYPES: { value: ReviewType; label: string }[] = [
  { value: "flashcard", label: "Lật thẻ" },
  { value: "mcq", label: "Trắc nghiệm" },
  { value: "mcq_reverse", label: "Việt → Anh" },
  { value: "typing", label: "Gõ từ" },
  { value: "listening", label: "Nghe" },
  { value: "cloze", label: "Điền chỗ trống" },
];

/**
 * Lựa chọn ở màn chuẩn bị phiên: các kiểu ôn + `auto`.
 *
 * `auto` không phải một kiểu câu hỏi — nó là **chính sách chọn kiểu cho từng
 * thẻ** (xem `pickReviewType`). Ôn 30 thẻ cùng một kiểu vừa nhàm vừa dễ nhớ vẹt
 * theo hình thức câu hỏi thay vì nhớ từ.
 */
export type SessionReviewType = ReviewType | "auto";

export const SESSION_TYPES: { value: SessionReviewType; label: string }[] = [
  { value: "auto", label: "Tự động" },
  ...REVIEW_TYPES,
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

// ---------------------------------------------------------------------------
// Điền chỗ trống (cloze)
// ---------------------------------------------------------------------------

export interface Cloze {
  /** Phần câu trước chỗ trống. */
  before: string;
  /** Phần câu sau chỗ trống. */
  after: string;
  /** Dạng chữ **đúng như trong câu** — có thể là dạng chia (running, studies). */
  answer: string;
  /** Bản dịch câu, hiện sau khi trả lời (nếu thẻ có). */
  translation?: string;
}

/** Câu ngắn hơn mức này thì khoét xong không còn ngữ cảnh để đoán. */
const CLOZE_MIN_WORDS = 3;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Regex tìm từ trong câu ví dụ, có tính tới **biến cách** — câu thật hiếm khi
 * dùng đúng dạng nguyên thể của thẻ (*run* xuất hiện thành *running*, *study*
 * thành *studies*). Bắt đúng dạng trong câu mới khoét được chỗ trống, và mới
 * chấm được câu trả lời.
 *
 * Chỉ xử lý các luật biến cách phổ biến của tiếng Anh — bất quy tắc (*go →
 * went*) không khớp, thẻ đó coi như không có cloze thay vì khoét sai chỗ.
 */
function clozeRegex(term: string): RegExp | null {
  const t = term.trim();
  if (!t) return null;

  const base = escapeRe(t).replace(/\s+/g, "\\s+");
  const alts = [`${base}(?:s|es|ed|ing|d)?`];

  const last = t[t.length - 1]?.toLowerCase() ?? "";
  const stem = escapeRe(t.slice(0, -1)).replace(/\s+/g, "\\s+");
  if (last === "y") alts.push(`${stem}(?:ies|ied|ier|iest)`);
  if (last === "e") alts.push(`${stem}(?:ing|ed)`);
  // Phụ âm cuối nhân đôi: stop → stopping, plan → planned.
  if (/[aeiou][bdgklmnprtvz]$/i.test(t)) alts.push(`${base}${last}(?:ing|ed)`);

  try {
    return new RegExp(`\\b(?:${alts.join("|")})\\b`, "i");
  } catch {
    return null; // từ có ký tự lạ làm hỏng regex → coi như không dựng được
  }
}

/**
 * Dựng câu điền chỗ trống từ ví dụ đầu tiên **có chứa từ đang học**.
 * Trả `null` khi thẻ không có ví dụ nào dùng tới từ, hoặc câu quá ngắn.
 */
export function buildCloze(card: CardWithProgress): Cloze | null {
  const re = clozeRegex(card.term ?? "");
  if (!re) return null;

  for (const ex of card.examples ?? []) {
    const text = (ex?.text ?? "").trim();
    if (!text) continue;
    if (text.split(/\s+/).length < CLOZE_MIN_WORDS) continue;

    const m = re.exec(text);
    if (!m) continue;

    return {
      before: text.slice(0, m.index),
      after: text.slice(m.index + m[0].length),
      answer: m[0],
      translation: (ex?.textVi ?? "").trim() || undefined,
    };
  }
  return null;
}

/** Thẻ có dựng được câu điền chỗ trống hay không (để lọc phiên/hiện số đếm). */
export function hasCloze(card: CardWithProgress): boolean {
  return buildCloze(card) !== null;
}

/**
 * Chấm câu điền chỗ trống: nhận **cả dạng trong câu lẫn dạng nguyên thể** của
 * thẻ. Đề khoét mất *running* mà gõ *run* thì người học rõ ràng nhớ từ — chấm
 * sai ở đó chỉ dạy họ nhớ hình thái, không phải nhớ nghĩa.
 */
export function checkCloze(input: string, cloze: Cloze, term: string): boolean {
  return checkTyped(input, cloze.answer) || checkTyped(input, term);
}

// ---------------------------------------------------------------------------
// Chế độ "Tự động": chọn kiểu ôn theo từng thẻ
// ---------------------------------------------------------------------------

/**
 * Thứ tự ưu tiên kiểu ôn theo trạng thái thẻ. Ý đồ: **khó dần theo mức thuộc**.
 *  - *chưa học*: lật thẻ — chưa gặp lần nào thì phải được xem đáp án trước.
 *  - *chưa thuộc*: trắc nghiệm nhận diện — nhẹ nhất, để gây dựng lại.
 *  - *đang thuộc*: cloze / chiều sản sinh — bắt đầu đòi nhớ ra từ.
 *  - *đã thuộc*: gõ lại và nghe — kiểm tra chặt nhất.
 */
const AUTO_PLAN: Record<CardStatus, ReviewType[]> = {
  new: ["flashcard"],
  hard: ["mcq", "flashcard"],
  good: ["cloze", "mcq_reverse", "typing", "mcq", "flashcard"],
  easy: ["typing", "listening", "cloze", "mcq_reverse", "flashcard"],
};

/** Kiểu ôn này dựng được câu hỏi cho thẻ này không. */
export function canUseReviewType(
  type: ReviewType,
  card: CardWithProgress,
  pool: CardWithProgress[]
): boolean {
  switch (type) {
    case "flashcard":
      return true;
    case "mcq":
      return buildMcq(card, pool, "termToMeaning") !== null;
    case "mcq_reverse":
      return buildMcq(card, pool, "meaningToTerm") !== null;
    case "typing":
      // Cần nghĩa tiếng Việt làm đề bài, không thì đề trống.
      return !!card.term?.trim() && !!(card.meaning_vi ?? "").trim();
    case "listening":
      return !!card.term?.trim();
    case "cloze":
      return hasCloze(card);
  }
}

/**
 * Chọn kiểu ôn cho một thẻ ở chế độ "Tự động".
 *
 * **Tất định** theo dữ liệu của thẻ (không random): cùng một thẻ trong một phiên
 * luôn ra cùng một kiểu, nên component không bị đổi kiểu câu hỏi giữa hai lần
 * render. Thiếu dữ liệu cho kiểu ưu tiên thì **hạ xuống** kiểu khả thi kế tiếp —
 * không bỏ thẻ, vì thẻ vẫn đang tới hạn ôn.
 *
 * Thẻ "đã thuộc" luân phiên gõ/nghe theo số lần đã ôn, để cùng một từ không mãi
 * nhận một dạng câu hỏi.
 */
export function pickReviewType(
  card: CardWithProgress,
  pool: CardWithProgress[]
): ReviewType {
  const status: CardStatus = card.progress?.status ?? "new";
  let plan = AUTO_PLAN[status] ?? AUTO_PLAN.new;

  if (status === "easy" && (card.progress?.review_count ?? 0) % 2 === 1) {
    plan = ["listening", ...plan.filter((t) => t !== "listening")];
  }

  for (const type of plan) {
    if (canUseReviewType(type, card, pool)) return type;
  }
  return "flashcard";
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
