"use client";

import { useRef } from "react";
import { Volume2 } from "lucide-react";

interface AudioButtonProps {
  url?: string | null;
  /** Văn bản để đọc bằng TTS khi không có URL audio (vd cụm từ). */
  text?: string | null;
  label?: string; // "US" | "UK"
}

/**
 * Nút phát âm. Ưu tiên file audio; nếu không có URL nhưng có `text` thì đọc
 * bằng Web Speech (SpeechSynthesis) — giọng US/UK theo label. Ẩn nếu thiếu cả hai.
 */
export function AudioButton({ url, text, label }: AudioButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (!url && !text) return null;

  const play = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (url) {
      if (!audioRef.current) audioRef.current = new Audio(url);
      audioRef.current.currentTime = 0;
      void audioRef.current.play();
      return;
    }
    if (text && typeof window !== "undefined" && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = label === "UK" ? "en-GB" : "en-US";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <button
      type="button"
      onClick={play}
      className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2.5 py-1 text-xs font-medium text-brand-dark hover:bg-brand/20"
      aria-label={`Nghe phát âm ${label ?? ""}`}
    >
      <Volume2 className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
