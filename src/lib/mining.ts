import { cefrLevel } from "./cefr";
export const MINING_MAX_TEXT = 20000;
export const MINING_BATCH = 5;
export interface MinedWord { term: string; context: string; level: string | null; count: number }
export function mineWords(raw: string): MinedWord[] {
  const text = raw.slice(0, MINING_MAX_TEXT);
  const found = new Map<string, MinedWord>();
  const masked = text.replace(/(?:https?:\/\/|www\.)\S+/gi, (url) => " ".repeat(url.length));
  for (const match of masked.matchAll(/[^.!?\n]+[.!?]*/g)) {
    const context = text.slice(match.index, (match.index ?? 0) + match[0].length);
    for (const token of match[0].matchAll(/(?<![\p{L}\p{N}_])[A-Za-z]+(?:['’-][A-Za-z]+)*(?![\p{L}\p{N}_])/gu)) {
      const term = token[0].replace(/’/g, "'").toLowerCase();
      if (term.length < 2 || term.length > 80) continue;
      const prior = found.get(term);
      if (prior) prior.count++;
      else if (found.size < 200) found.set(term, { term, context: context.slice(Math.max(0, (token.index ?? 0) - 250), Math.max(0, (token.index ?? 0) - 250) + 600).trim(), level: cefrLevel(term), count: 1 });
    }
  }
  return [...found.values()];
}
export const termKey = (term: string) => term.trim().replace(/\s+/g, " ").toLowerCase();
