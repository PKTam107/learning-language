"use client";

import { Volume2 } from "lucide-react";
import { speak } from "@/lib/speak";

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
  if (!url && !text) return null;

  const play = (e: React.MouseEvent) => {
    e.stopPropagation();
    speak({ url, text, label });
  };

  return (
    <button
      type="button"
      onClick={play}
      className="inline-flex items-center gap-1 rounded-full bg-brand-light dark:bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-brand-dark dark:text-indigo-300 hover:bg-brand/20"
      aria-label={`Nghe phát âm ${label ?? ""}`}
    >
      <Volume2 className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
