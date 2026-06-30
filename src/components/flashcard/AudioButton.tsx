"use client";

import { useRef } from "react";

interface AudioButtonProps {
  url?: string | null;
  label?: string; // "US" | "UK"
}

/** Nút phát âm. Ẩn nếu không có URL audio. */
export function AudioButton({ url, label }: AudioButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (!url) return null;

  const play = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) audioRef.current = new Audio(url);
    audioRef.current.currentTime = 0;
    void audioRef.current.play();
  };

  return (
    <button
      type="button"
      onClick={play}
      className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2.5 py-1 text-xs font-medium text-brand-dark hover:bg-brand/20"
      aria-label={`Nghe phát âm ${label ?? ""}`}
    >
      🔊 {label}
    </button>
  );
}
