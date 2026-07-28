import cefrData from "@/data/cefr.json";

// Bản đồ headword → cấp CEFR (A1..C2), dựng từ CEFR-J Wordlist + Octanove C1/C2
// (openlanguageprofiles/olp-en-cefrj, CC BY-SA 4.0). Xem src/data/cefr.json.
const MAP = cefrData as Record<string, string>;

/**
 * Tra cấp CEFR của một từ. Thử khớp chính xác trước; nếu không có thì thử vài
 * dạng gốc đơn giản (bỏ đuôi -s/-es/-ies/-ing/-ed/-ly). Trả null nếu không rõ.
 */
export function cefrLevel(word: string): string | null {
  const w = word.trim().toLowerCase();
  if (!w) return null;
  if (MAP[w]) return MAP[w];

  const cands: string[] = [];
  if (w.endsWith("ies")) cands.push(w.slice(0, -3) + "y");
  if (w.endsWith("es")) cands.push(w.slice(0, -2));
  if (w.endsWith("s")) cands.push(w.slice(0, -1));
  if (w.endsWith("ing")) cands.push(w.slice(0, -3), w.slice(0, -3) + "e");
  if (w.endsWith("ed")) cands.push(w.slice(0, -2), w.slice(0, -1), w.slice(0, -3) + "y");
  if (w.endsWith("ly")) cands.push(w.slice(0, -2), w.slice(0, -3) + "y");

  for (const c of cands) if (c.length >= 2 && MAP[c]) return MAP[c];
  return null;
}
