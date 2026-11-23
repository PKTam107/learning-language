"use client";
import { useEffect, useRef, useState } from "react";
import { checkDictation } from "@/lib/dictation";
import { Button } from "@/components/ui/Button";

export function DictationExercise({ sentences }: { sentences: string[] }) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [rate, setRate] = useState(0.85);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const request = useRef(0);
  useEffect(() => () => { request.current++; window.speechSynthesis?.cancel(); }, []);
  function stop() { request.current++; window.speechSynthesis?.cancel(); setPlaying(false); }
  function play() {
    stop(); setError("");
    if (!("speechSynthesis" in window)) { setError("Thiết bị này chưa hỗ trợ giọng đọc. Hãy thử trình duyệt khác."); return; }
    const id = request.current;
    const utterance = new SpeechSynthesisUtterance(sentences[index]);
    utterance.lang = "en-US"; utterance.rate = rate;
    utterance.onend = () => { if (id === request.current) setPlaying(false); };
    utterance.onerror = (event) => { if (id === request.current) { setPlaying(false); if (!["interrupted", "canceled"].includes(event.error)) setError("Chưa phát được câu. Kiểm tra giọng tiếng Anh trên thiết bị rồi thử lại."); } };
    setPlaying(true); window.speechSynthesis.speak(utterance);
  }
  if (!sentences.length) return <p className="text-sm text-slate-500">Chưa có câu phù hợp. Hãy thêm câu ví dụ tiếng Anh từ 3–60 từ vào thẻ.</p>;
  const result = checked ? checkDictation(sentences[index], answer) : null;
  function reset(next: number) { stop(); setIndex(next); setAnswer(""); setChecked(false); setError(""); }
  return <section className="space-y-4 rounded-xl border p-4 dark:border-slate-800">
    <h2 className="font-semibold">Nghe chép chính tả · Câu {index + 1}/{sentences.length}</h2>
    <p className="text-sm text-slate-500">Nghe rồi gõ lại. Bỏ qua chữ hoa và dấu câu; vẫn kiểm tra chính tả. Luyện bổ sung không thay đổi lịch ôn.</p>
    <div className="flex flex-wrap items-center gap-2"><Button onClick={play}>Nghe câu</Button><Button variant="secondary" disabled={!playing} onClick={stop}>Dừng</Button><label className="text-sm">Tốc độ <select aria-label="Tốc độ đọc" value={rate} onChange={(e) => { stop(); setRate(Number(e.target.value)); }} className="rounded border bg-transparent p-2"><option value={0.85}>Chậm</option><option value={1}>Bình thường</option></select></label></div>
    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    <form onSubmit={(e) => { e.preventDefault(); if (answer.trim()) { stop(); setChecked(true); } }} className="space-y-3">
      <label className="block text-sm">Câu bạn nghe được<textarea value={answer} disabled={checked} onChange={(e) => setAnswer(e.target.value)} maxLength={1500} autoCorrect="off" autoCapitalize="off" spellCheck={false} rows={3} className="mt-1 w-full rounded-lg border bg-transparent p-3 dark:border-slate-700" /></label>
      <Button type="submit" disabled={checked || !answer.trim()}>Kiểm tra</Button>
    </form>
    {result && <div role="status" className="space-y-3">
      <p className="font-medium">{result.correct ? "Chính xác!" : "Đối chiếu câu trả lời:"}</p>
      <div className="flex flex-wrap gap-2">{result.tokens.map((token, i) => <span key={i} className={`rounded px-2 py-1 text-sm ${token.kind === "correct" ? "bg-green-100 text-green-900 dark:bg-green-500/20 dark:text-green-200" : "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200"}`}>{token.kind === "missing" ? `Thiếu: ${token.text}` : token.kind === "extra" ? `Thừa: ${token.text}` : token.kind === "wrong" ? `${token.text} → ${token.expected}` : token.text}</span>)}</div>
      <p lang="en" className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">{sentences[index]}</p>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => reset(index)}>Thử lại câu này</Button><Button onClick={() => reset((index + 1) % sentences.length)}>{index + 1 === sentences.length ? "Luyện lại từ đầu" : "Câu tiếp theo"}</Button></div>
    </div>}
  </section>;
}
