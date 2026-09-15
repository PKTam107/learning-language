/**
 * Phân tích nội dung do hệ điều hành chuyển vào qua thao tác **Chia sẻ**
 * (share target của PWA trên web, `ACTION_SEND` trên Android).
 *
 * Nội dung chia sẻ có hai dạng khác hẳn nhau về ý định:
 *  - **Một từ / cụm ngắn**: người dùng bôi đen đúng thứ họ muốn tra → tra luôn.
 *  - **Cả đoạn văn**: tra cả đoạn là vô nghĩa và tốn hạn mức, nên tách thành
 *    danh sách từ để người dùng chạm chọn.
 *
 * Logic thuần (không đụng UI) nên web và mobile dùng chung một bản — xem
 * `tests/parity.test.ts`.
 */

/** Nhiều nhất bao nhiêu từ ứng viên hiện ra để chạm chọn. */
export const MAX_CHIPS = 40;

/** Dài hơn mức này thì coi là "một đoạn văn", không phải một từ cần tra. */
export const MAX_TERM_WORDS = 4;

/** Cắt bớt nội dung quá dài — chia sẻ cả trang web thì không cần giữ hết. */
export const MAX_SHARED_LEN = 2000;

/** Đường link trong nội dung chia sẻ. */
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi;

export interface SharedText {
  /** Nguyên văn đã cắt độ dài — để hiện lại cho người dùng đối chiếu. */
  text: string;
  /** Có phải một từ/cụm đủ ngắn để tra thẳng không. */
  isSingleTerm: boolean;
  /** Từ để tra sẵn khi `isSingleTerm`; ngược lại `null`. */
  term: string | null;
  /** Các từ ứng viên để chạm chọn khi là đoạn văn. */
  candidates: string[];
}

/**
 * Rút các từ tiếng Anh đáng tra khỏi một đoạn: bỏ dấu câu, bỏ trùng (không
 * phân biệt hoa thường), giữ nguyên thứ tự xuất hiện.
 */
function extractCandidates(body: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of body.split(/[^A-Za-z'-]+/)) {
    const w = raw.replace(/^['-]+|['-]+$/g, "");
    // Từ 1 ký tự gần như luôn là rác ("I" thì không ai cần tra).
    if (w.length < 2) continue;
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
    if (out.length >= MAX_CHIPS) break;
  }
  return out;
}

export function parseSharedText(raw: string): SharedText {
  const text = (raw ?? "").slice(0, MAX_SHARED_LEN).trim();

  // Bỏ link trước khi quyết định: chia sẻ một trang web thì nội dung thường
  // CHỈ là địa chỉ — tra nó ra thẻ rác, mà nó lại đếm là "một từ".
  const body = text.replace(URL_PATTERN, " ").replace(/\s+/g, " ").trim();
  const words = body ? body.split(" ") : [];

  const isSingleTerm =
    words.length > 0 && words.length <= MAX_TERM_WORDS && !/[.!?]$/.test(body);

  return {
    text,
    isSingleTerm,
    term: isSingleTerm ? body : null,
    candidates: isSingleTerm ? [] : extractCandidates(body),
  };
}
