import { cefrLevel } from "@/lib/cefr";

/**
 * Làm giàu thẻ khi tra từ MỚI (chạy phía server trong /api/lookup):
 *  - CEFR: tra danh sách CEFR-J (offline).
 *  - Collocations: Datamuse rel_bgb (đứng trước) + rel_bga (đứng sau).
 *  - Word family: sinh ứng viên bằng luật hậu tố/tiền tố rồi xác minh có thật
 *    qua Datamuse (miễn phí, không key). Đây là xấp xỉ — có thể sót/nhiễu.
 * Toàn bộ best-effort: lỗi/timeout → bỏ qua phần đó, không chặn việc tạo thẻ.
 */
export interface Enrichment {
  cefrLevel?: string;
  wordFamily?: string[];
  collocations?: string[];
}

const DATAMUSE = "https://api.datamuse.com/words";
const NET_TIMEOUT_MS = 3500;

interface DatamuseWord {
  word: string;
  score?: number;
  tags?: string[];
}

/** Tần suất tối thiểu (lượt/1 triệu từ) để coi 1 dạng phái sinh là "thật" —
 *  cắt các biến thể sai chính tả / bịa (happyness, mishappy, beautyful...). */
const MIN_FREQ = 0.5;

/** Lấy tần suất `f:` từ tags (md=f). 0 nếu không có. */
function freqOf(u: DatamuseWord): number {
  const t = (u.tags ?? []).find((x) => x.startsWith("f:"));
  return t ? parseFloat(t.slice(2)) : 0;
}

async function datamuse(qs: string): Promise<DatamuseWord[]> {
  try {
    const res = await fetch(`${DATAMUSE}?${qs}`, {
      signal: AbortSignal.timeout(NET_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    return (await res.json()) as DatamuseWord[];
  } catch {
    return [];
  }
}

const isWordLike = (w: string) => /^[a-z][a-z'-]*$/.test(w);

/** Collocations: ghép "X <word>" (đứng trước) và "<word> X" (đứng sau). */
async function collocations(word: string): Promise<string[]> {
  const enc = encodeURIComponent(word);
  const [before, after] = await Promise.all([
    datamuse(`rel_bgb=${enc}&max=8`),
    datamuse(`rel_bga=${enc}&max=8`),
  ]);

  const scored: { phrase: string; score: number }[] = [];
  for (const b of before)
    if (isWordLike(b.word))
      scored.push({ phrase: `${b.word} ${word}`, score: b.score ?? 0 });
  for (const a of after)
    if (isWordLike(a.word))
      scored.push({ phrase: `${word} ${a.word}`, score: a.score ?? 0 });

  scored.sort((x, y) => y.score - x.score);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of scored) {
    if (seen.has(s.phrase)) continue;
    seen.add(s.phrase);
    out.push(s.phrase);
    if (out.length >= 6) break;
  }
  return out;
}

/** Sinh ứng viên hậu tố (giữ dạng gốc, bỏ 'e' cuối, đổi 'y'→'i'). */
function suffixCandidates(word: string): Set<string> {
  const dropE = word.endsWith("e") ? word.slice(0, -1) : word;
  const yToI = word.endsWith("y") ? word.slice(0, -1) + "i" : word;
  const suf = [
    "s", "es", "ing", "ed", "ly", "ness", "ment", "ful", "less", "er", "est",
    "ion", "tion", "ation", "ity", "al", "ive", "ance", "ence", "able", "ist",
    "ism", "ize", "hood", "ship",
  ];
  const set = new Set<string>();
  for (const s of suf) {
    set.add(word + s);
    set.add(dropE + s);
    set.add(yToI + s);
  }
  set.delete(word);
  return set;
}

/**
 * Word family: hậu tố (giao tập ứng viên với 1 truy vấn sp=stem*) + tiền tố
 * (xác minh trực tiếp). Lọc theo tần suất (MIN_FREQ) để bỏ dạng sai chính tả/bịa.
 */
async function wordFamily(word: string): Promise<string[]> {
  const found = new Map<string, number>(); // dạng phái sinh → tần suất

  // 1) Hậu tố: lấy các từ bắt đầu bằng "stem" (kèm tần suất) rồi giao ứng viên.
  let stem = word;
  if (stem.endsWith("e") || stem.endsWith("y")) stem = stem.slice(0, -1);
  if (stem.length >= 3) {
    const universe = await datamuse(
      `sp=${encodeURIComponent(stem)}*&max=150&md=f`
    );
    const cands = suffixCandidates(word);
    for (const u of universe) {
      const w = u.word.toLowerCase();
      if (cands.has(w) && freqOf(u) >= MIN_FREQ) found.set(w, freqOf(u));
    }
  }

  // 2) Tiền tố phổ biến, đáng tin: xác minh từng ứng viên (số lượng nhỏ).
  const prefixes = ["un", "re", "dis"];
  const checks = await Promise.all(
    prefixes.map(async (p) => {
      const c = p + word;
      const r = await datamuse(`sp=${encodeURIComponent(c)}&max=1&md=f`);
      const hit = r[0];
      return hit?.word?.toLowerCase() === c && freqOf(hit) >= MIN_FREQ
        ? ([c, freqOf(hit)] as const)
        : null;
    })
  );
  for (const c of checks) if (c) found.set(c[0], c[1]);

  found.delete(word);
  return [...found.entries()]
    .filter(([w]) => isWordLike(w) && w.length >= 3 && w.length <= 24)
    .sort((a, b) => b[1] - a[1]) // tần suất giảm dần (dạng phổ biến trước)
    .slice(0, 8)
    .map(([w]) => w);
}

/** Bọc promise với timeout → trả null nếu quá hạn (không chặn lookup). */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/** Làm giàu 1 từ đơn. Best-effort; các phần lỗi/timeout được bỏ qua. */
export async function enrichWord(term: string): Promise<Enrichment> {
  const word = term.trim().toLowerCase();
  const out: Enrichment = {};
  if (!word || word.includes(" ")) return out;

  const level = cefrLevel(word);
  if (level) out.cefrLevel = level;

  const [family, colloc] = await Promise.all([
    withTimeout(wordFamily(word), NET_TIMEOUT_MS + 500),
    withTimeout(collocations(word), NET_TIMEOUT_MS + 500),
  ]);
  if (family && family.length) out.wordFamily = family;
  if (colloc && colloc.length) out.collocations = colloc;

  return out;
}
