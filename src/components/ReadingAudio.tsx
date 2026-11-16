"use client";
import { useEffect, useState, type ReactNode } from "react";
export function ReadingAudio({ text, children }: { text: string; children: ReactNode }) {
  const [playing, setPlaying] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [rate, setRate] = useState(0.85);
  const [error, setError] = useState("");
  useEffect(() => { setPlaying(false); setHidden(false); return () => { window.speechSynthesis?.cancel(); }; }, [text]);
  function play(value: string) {
    if (!("speechSynthesis" in window)) { setError("Trình duyệt này chưa hỗ trợ đọc văn bản."); return; }
    window.speechSynthesis.cancel(); setError("");
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = "en-US"; utterance.rate = rate;
    utterance.onstart = () => setPlaying(true);
    utterance.onend = () => setPlaying(false);
    utterance.onerror = (event) => { if (!["interrupted", "canceled"].includes(event.error)) { setPlaying(false); setError("Chưa phát được giọng đọc. Hãy kiểm tra âm thanh rồi thử lại."); } };
    window.speechSynthesis.speak(utterance);
  }
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <button onClick={() => play(text)} className="rounded-lg bg-brand px-3 py-2 text-white">Nghe cả bài</button>
      <button disabled={!playing} onClick={() => { window.speechSynthesis.cancel(); setPlaying(false); }} className="rounded-lg border px-3 py-2 disabled:opacity-40">Dừng</button>
      <label>Tốc độ <select aria-label="Tốc độ đọc" value={rate} onChange={(e) => { window.speechSynthesis?.cancel(); setPlaying(false); setRate(Number(e.target.value)); }} className="rounded border bg-transparent p-2"><option value={0.85}>Chậm</option><option value={1}>Bình thường</option></select></label>
      <button onClick={() => setHidden(!hidden)} className="rounded-lg border px-3 py-2">{hidden ? "Hiện đoạn văn" : "Ẩn đoạn văn để luyện nghe"}</button>
    </div>
    {error && <p role="status" className="text-sm text-amber-700">{error}</p>}
    {!hidden ? <>{children}<details><summary className="cursor-pointer text-sm">Nghe từng câu</summary><div className="mt-2 space-y-2">{(text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text]).map((sentence, index) => <button key={index} onClick={() => play(sentence.trim())} className="block w-full rounded-lg border p-3 text-left text-sm">🔊 {sentence.trim()}</button>)}</div></details></> : <p className="text-sm text-slate-500">Đoạn văn đang ẩn. Bấm Nghe cả bài để luyện nghe.</p>}
  </div>;
}
