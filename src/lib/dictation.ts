/** Ignore case/punctuation, preserve spelling and contractions. Limit work for long input. */
function words(text: string): string[] {
  return (text.normalize("NFKC").replace(/[‘’]/g, "'").toLowerCase().match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu) ?? []).slice(0, 200);
}
export interface DictationToken { text: string; kind: "correct" | "missing" | "extra" | "wrong"; expected?: string }
export function checkDictation(expected: string, answer: string) {
  const target = words(expected);
  const input = words(answer);
  const dp = Array.from({ length: target.length + 1 }, () => Array<number>(input.length + 1).fill(0));
  for (let i = 0; i <= target.length; i++) dp[i][0] = i;
  for (let j = 0; j <= input.length; j++) dp[0][j] = j;
  for (let i = 1; i <= target.length; i++) for (let j = 1; j <= input.length; j++) {
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (target[i - 1] === input[j - 1] ? 0 : 1));
  }
  const tokens: DictationToken[] = [];
  let i = target.length, j = input.length;
  while (i || j) {
    if (i && j && target[i - 1] === input[j - 1]) { tokens.push({ text: input[--j], kind: "correct" }); i--; }
    else if (i && j && dp[i][j] === dp[i - 1][j - 1] + 1) { tokens.push({ text: input[--j], expected: target[--i], kind: "wrong" }); }
    else if (i && dp[i][j] === dp[i - 1][j] + 1) tokens.push({ text: target[--i], kind: "missing" });
    else tokens.push({ text: input[--j], kind: "extra" });
  }
  return { correct: target.length > 0 && dp[target.length][input.length] === 0, tokens: tokens.reverse() };
}
export function dictationSentences(cards: { source_language: string; examples: { text: string }[] | null }[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const card of cards) {
    if (card.source_language !== "en") continue;
    for (const example of card.examples ?? []) {
      const text = example.text?.trim();
      if (!text || text.length > 500) continue;
      const count = words(text).length;
      const key = words(text).join(" ");
      if (count < 3 || count > 60 || seen.has(key)) continue;
      seen.add(key); result.push(text);
    }
  }
  return result;
}
