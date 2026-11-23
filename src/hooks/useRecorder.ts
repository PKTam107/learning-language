import { useCallback, useEffect, useRef, useState } from "react";
export interface RecorderAdapter {
  start(): Promise<void>;
  stop(): Promise<void>;
  play(onEnd: () => void): Promise<void>;
  stopPlayback(): Promise<void>;
  save(): Promise<string>;
  dispose(): void;
}
export const RECORDING_LIMIT_MS = 60000;
export function useRecorder(adapter: RecorderAdapter) {
  const [phase, setPhase] = useState<"idle" | "requesting" | "recording" | "stopping" | "ready" | "saving">("idle");
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const generation = useRef(0), locked = useRef(false);
  const reset = useCallback(() => {
    generation.current++; locked.current = false; adapter.dispose();
    setPhase("idle"); setPlaying(false); setError(""); setMessage("");
  }, [adapter]);
  useEffect(() => () => { generation.current++; adapter.dispose(); }, [adapter]);
  async function start() {
    if (locked.current || phase === "recording") return;
    locked.current = true;
    const id = ++generation.current;
    setError(""); setMessage(""); setPlaying(false); setPhase("requesting");
    try { await adapter.start(); if (id === generation.current) setPhase("recording"); }
    catch { if (id === generation.current) { setError("Chưa thu được âm. Hãy cho phép micro, kiểm tra thiết bị và thử lại. Trên web cần HTTPS hoặc localhost."); setPhase("idle"); } }
    finally { if (id === generation.current) locked.current = false; }
  }
  const finish = useCallback(async () => {
    if (locked.current) return;
    locked.current = true; const id = generation.current; setPhase("stopping");
    try { await adapter.stop(); if (id === generation.current) setPhase("ready"); }
    catch { if (id === generation.current) { setPhase("idle"); setError("Bản thu chưa có âm thanh. Hãy thu lại và nói sau khi nút Dừng thu xuất hiện."); } }
    finally { if (id === generation.current) locked.current = false; }
  }, [adapter]);
  useEffect(() => {
    if (phase !== "recording") return;
    const timer = setTimeout(() => { void finish(); }, RECORDING_LIMIT_MS);
    return () => clearTimeout(timer);
  }, [phase, finish]);
  async function stopPlayback() {
    setPlaying(false);
    try { await adapter.stopPlayback(); } catch { setError("Chưa dừng được âm thanh. Hãy thử lại."); }
  }
  async function play() {
    if (phase !== "ready" || locked.current) return;
    locked.current = true; const id = generation.current;
    setError(""); setPlaying(true);
    try { await adapter.play(() => { if (id === generation.current) setPlaying(false); }); }
    catch { if (id === generation.current) { setPlaying(false); setError("Chưa phát được bản thu. Hãy thử nghe lại."); } }
    finally { if (id === generation.current) locked.current = false; }
  }
  async function save() {
    if (phase !== "ready" || locked.current) return;
    locked.current = true; const id = generation.current; setError(""); setPhase("saving");
    try { const info = await adapter.save(); if (id === generation.current) setMessage(info); }
    catch { if (id === generation.current) setError("Chưa lưu/chia sẻ được bản thu. Bản thu vẫn còn trong phiên để thử lại."); }
    finally { if (id === generation.current) { locked.current = false; setPhase("ready"); } }
  }
  return { phase, playing, error, message, start, finish, play, stopPlayback, save, reset };
}
