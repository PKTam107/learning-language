"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRecorder } from "@/lib/recorder";
import { useRecorder } from "@/hooks/useRecorder";
import { Button } from "@/components/ui/Button";
export function ShadowingExercise({ sentence }: { sentence: string }) {
  const adapter = useMemo(() => createRecorder(), []);
  const recording = useRecorder(adapter);
  const [rate, setRate] = useState(0.85);
  const [sampleError, setSampleError] = useState("");
  const [samplePlaying, setSamplePlaying] = useState(false);
  const sampleRequest = useRef(0);
  const stopSample = useCallback(() => { sampleRequest.current++; window.speechSynthesis?.cancel(); setSamplePlaying(false); }, []);
  const { reset } = recording;
  useEffect(() => {
    const leave = () => { if (document.visibilityState === "hidden") { reset(); stopSample(); } };
    document.addEventListener("visibilitychange", leave);
    return () => { document.removeEventListener("visibilitychange", leave); stopSample(); };
  }, [reset, stopSample]);
  const busy = ["requesting", "stopping", "saving"].includes(recording.phase);
  const capturing = recording.phase === "recording";
  async function sample() {
    stopSample(); setSampleError("");
    const id = sampleRequest.current;
    await recording.stopPlayback();
    if (id !== sampleRequest.current) return;
    if (!("speechSynthesis" in window)) { setSampleError("Thiết bị này chưa hỗ trợ giọng đọc mẫu."); return; }
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = "en-US"; utterance.rate = rate;
    utterance.onend = () => { if (id === sampleRequest.current) setSamplePlaying(false); };
    utterance.onerror = (event) => { if (id === sampleRequest.current) { setSamplePlaying(false); if (!["interrupted", "canceled"].includes(event.error)) setSampleError("Chưa phát được câu mẫu. Hãy kiểm tra giọng tiếng Anh rồi thử lại."); } };
    setSamplePlaying(true); window.speechSynthesis.speak(utterance);
  }
  return <section className="space-y-3 rounded-xl border p-4 dark:border-slate-700">
    <h3 className="font-semibold">Thu âm và nghe đối chiếu</h3><p lang="en" className="text-lg">{sentence}</p>
    <p className="text-sm text-slate-500">Nghe mẫu → thu giọng mình → nghe lại hai bản. Tự so sánh, không chấm điểm tự động. Mỗi bản thu tối đa 60 giây; chỉ giữ trong phiên trừ khi bạn tải về.</p>
    <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy || capturing} onClick={() => void sample()}>Nghe mẫu</Button><Button variant="secondary" disabled={!samplePlaying} onClick={stopSample}>Dừng mẫu</Button><label className="text-sm">Tốc độ mẫu <select aria-label="Tốc độ mẫu" disabled={busy || capturing} value={rate} onChange={(e) => { stopSample(); setRate(Number(e.target.value)); }} className="rounded border bg-transparent p-2"><option value={0.85}>Chậm</option><option value={1}>Bình thường</option></select></label></div>
    <div className="flex flex-wrap gap-2">{capturing ? <Button onClick={() => void recording.finish()}>Dừng thu</Button> : <Button disabled={busy} onClick={() => { stopSample(); void recording.start(); }}>{recording.phase === "ready" ? "Thu lại" : "Thu giọng mình"}</Button>}
      <Button variant="secondary" disabled={recording.phase !== "ready" || recording.playing} onClick={() => { stopSample(); void recording.play(); }}>Nghe bản thu</Button>
      <Button variant="secondary" disabled={!recording.playing} onClick={() => void recording.stopPlayback()}>Dừng bản thu</Button>
      <Button variant="secondary" disabled={recording.phase !== "ready"} onClick={() => void recording.save()}>Tải bản thu</Button>
      <Button variant="ghost" disabled={busy || recording.phase === "idle"} onClick={() => { stopSample(); recording.reset(); }}>Xóa bản thu trong phiên</Button>
    </div>
    <p role="status" className="text-sm">{capturing ? "● Đang thu… Bấm Dừng thu khi nói xong." : busy ? "Đang xử lý…" : recording.playing ? "Đang phát bản thu…" : ""}</p>
    {(recording.error || sampleError) && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{recording.error || sampleError}</p>}
    {recording.message && <p role="status" className="text-sm">{recording.message}</p>}
  </section>;
}
export function ShadowingPractice({ sentences }: { sentences: string[] }) {
  const [index, setIndex] = useState(0);
  if (!sentences.length) return <p className="text-sm text-slate-500">Chưa có câu phù hợp. Hãy bổ sung câu ví dụ tiếng Anh vào thẻ.</p>;
  return <div className="space-y-3"><p className="text-sm">Câu {index + 1}/{sentences.length}</p><ShadowingExercise key={`${index}-${sentences[index]}`} sentence={sentences[index]} /><div className="flex gap-2"><Button variant="secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>Câu trước</Button><Button variant="secondary" onClick={() => setIndex((index + 1) % sentences.length)}>{index + 1 === sentences.length ? "Về câu đầu" : "Câu tiếp theo"}</Button></div></div>;
}
