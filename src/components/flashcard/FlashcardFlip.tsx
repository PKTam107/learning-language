"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CardWithProgress } from "@/types";
import {
  dragAngle,
  isBack,
  isHorizontalDrag,
  nearestTurn,
  settleDrag,
  snapToFace,
  DRAG_SLOP,
} from "@/lib/flip";
import { AudioButton } from "./AudioButton";
import { StickyNote } from "lucide-react";

interface FlashcardFlipProps {
  card: CardWithProgress;
  flipped: boolean;
  onFlip: () => void;
}

/**
 * Góc **đang hiển thị thật sự**, đọc từ ma trận biến đổi. Cần nó để nắm lại thẻ
 * giữa lúc đang lật mà thẻ không nhảy giật về góc đích.
 */
function visualDeg(el: HTMLElement | null, fallback: number): number {
  if (!el) return fallback;
  try {
    const t = getComputedStyle(el).transform;
    if (!t || t === "none") return fallback;
    const m = new DOMMatrixReadOnly(t);
    // rotateY(θ) → m11 = cos θ, m13 = −sin θ.
    const deg = (Math.atan2(-m.m13, m.m11) * 180) / Math.PI;
    return nearestTurn(deg, fallback);
  } catch {
    return fallback;
  }
}

interface Gesture {
  id: number;
  startX: number;
  startY: number;
  /** Góc lúc bắt đầu chạm. */
  base: number;
  width: number;
  lastX: number;
  lastT: number;
  /** px/ms của đoạn di chuyển gần nhất — vuốt nhanh thì lật dù kéo chưa xa. */
  velocity: number;
  /** Đã vượt ngưỡng và đang thực sự kéo. */
  active: boolean;
}

/**
 * Thẻ lật: mặt trước = từ + phiên âm + audio; mặt sau = nghĩa + từ loại + ví dụ.
 *
 * Lật được bằng ba cách: chạm/click, kéo ngang (chuột, ngón tay, bút — dùng
 * Pointer Events nên một nhánh code chạy cho cả ba), hoặc phím Space do
 * StudySession bắt. Khi kéo, góc xoay **bám theo con trỏ**; thả tay ra mới quyết
 * định lật hẳn hay bật về chỗ cũ.
 *
 * Góc xoay được **cộng dồn** (0 → 180 → 360 → …) chứ không tua ngược 180 → 0:
 * thẻ luôn quay tiếp theo hướng người dùng vừa vuốt, không có cảm giác "chỉ xoay
 * một chiều". Mặt nào đang hiện chỉ phụ thuộc góc chẵn/lẻ vòng nửa (`isBack`).
 */
export function FlashcardFlip({ card, flipped, onFlip }: FlashcardFlipProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [deg, setDeg] = useState(() => (flipped ? 180 : 0));
  const [dragging, setDragging] = useState(false);

  const degRef = useRef(deg);
  degRef.current = deg;
  /** Hướng lật gần nhất (1 = sang phải). Lật bằng chạm/phím đi theo hướng này. */
  const dirRef = useRef(1);
  const gestureRef = useRef<Gesture | null>(null);
  /** pointerup sinh thêm một sự kiện click — nuốt nó sau khi vừa kéo xong. */
  const swallowClickRef = useRef(false);

  // Cha giữ trạng thái `flipped` (phím Space, nút "Hiện đáp án", sang thẻ mới).
  // Lệch với góc đang có thì quay THÊM nửa vòng theo hướng gần nhất.
  useEffect(() => {
    if (isBack(degRef.current) === flipped) return;
    setDeg(snapToFace(degRef.current) + 180 * dirRef.current);
  }, [flipped]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Cú kéo trước đã xong: nếu trình duyệt KHÔNG sinh click sau pointerup thì cờ
    // nuốt click còn treo lại — dọn ở đây để cú chạm này không bị nuốt oan.
    swallowClickRef.current = false;
    // Nắm lại giữa chừng: lấy góc đang thấy, không lấy góc đích.
    const base = visualDeg(innerRef.current, degRef.current);
    gestureRef.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      base,
      width: rootRef.current?.clientWidth || 320,
      lastX: e.clientX,
      lastT: e.timeStamp,
      velocity: 0,
      active: false,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g || g.id !== e.pointerId) return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (!g.active) {
      // Nghiêng về chiều dọc → nhường cho việc cuộn trang / cuộn mặt sau.
      if (Math.abs(dy) > DRAG_SLOP && Math.abs(dy) > Math.abs(dx)) {
        gestureRef.current = null;
        return;
      }
      if (!isHorizontalDrag(dx, dy)) return;
      g.active = true;
      setDragging(true);
      setDeg(g.base); // chốt góc thật trước khi bám tay
      rootRef.current?.setPointerCapture(e.pointerId);
    }

    const dt = e.timeStamp - g.lastT;
    if (dt > 0) g.velocity = (e.clientX - g.lastX) / dt;
    g.lastX = e.clientX;
    g.lastT = e.timeStamp;

    setDeg(dragAngle(g.base, dx, g.width));
  }, []);

  const endGesture = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
      const g = gestureRef.current;
      gestureRef.current = null;
      if (!g || g.id !== e.pointerId || !g.active) return;

      rootRef.current?.releasePointerCapture?.(e.pointerId);
      setDragging(false);
      swallowClickRef.current = true;

      const settled = settleDrag({
        base: g.base,
        dx: e.clientX - g.startX,
        velocity: g.velocity,
        width: g.width,
        cancelled,
      });
      setDeg(settled.deg);
      if (settled.flipped) {
        dirRef.current = settled.dir;
        onFlip();
      }
    },
    [onFlip]
  );

  const onClick = useCallback(() => {
    if (swallowClickRef.current) {
      swallowClickRef.current = false;
      return;
    }
    onFlip();
  }, [onFlip]);

  return (
    <div
      ref={rootRef}
      className={`flip-card h-72 w-full select-none sm:h-96 ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endGesture(e, false)}
      onPointerCancel={(e) => endGesture(e, true)}
      onClick={onClick}
      role="button"
      aria-label="Lật thẻ — chạm, kéo ngang hoặc bấm Space"
    >
      <div
        ref={innerRef}
        className={`flip-inner h-full w-full ${dragging ? "dragging" : ""}`}
        style={{
          transform: `rotateY(${deg}deg) scale(${dragging ? 1.02 : 1})`,
        }}
      >
        {/* Mặt trước */}
        <div className="flip-face flex h-full w-full flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="text-center text-4xl font-bold sm:text-5xl">
            {card.term}
          </h2>
          {card.phonetic && (
            <p className="text-lg text-slate-500 dark:text-slate-400">{card.phonetic}</p>
          )}
          {(card.phonetic_uk || card.phonetic_us) && (
            <div className="flex gap-x-4 text-sm text-slate-400 dark:text-slate-500">
              {card.phonetic_uk && <span>UK {card.phonetic_uk}</span>}
              {card.phonetic_us && <span>US {card.phonetic_us}</span>}
            </div>
          )}
          <div className="flex gap-2">
            <AudioButton url={card.audio_us} text={card.term} label="US" />
            <AudioButton url={card.audio_uk} text={card.term} label="UK" />
          </div>
          <p className="absolute bottom-4 text-xs text-slate-400 dark:text-slate-500">
            Nhấn hoặc kéo ngang để lật (Space)
          </p>
        </div>

        {/* Mặt sau */}
        <div className="flip-face flip-back flex h-full w-full flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold">{card.term}</span>
            {card.part_of_speech && (
              <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400">
                {card.part_of_speech}
              </span>
            )}
          </div>
          {card.meaning_vi && (
            <p className="text-lg font-medium text-brand-dark dark:text-indigo-300">
              {card.meaning_vi}
            </p>
          )}

          {card.note && (
            <p className="flex items-start gap-1.5 rounded-md bg-amber-50 dark:bg-amber-500/10 px-2 py-1 text-sm text-amber-900 dark:text-amber-200">
              <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {card.note}
            </p>
          )}

          {card.definitions?.length > 0 && (
            <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
              {card.definitions.slice(0, 3).map((d, i) => (
                <li key={i}>• {d.definitionVi || d.definition}</li>
              ))}
            </ul>
          )}

          {card.examples?.length > 0 && (
            <div className="mt-auto space-y-1 border-t border-slate-100 dark:border-slate-800 pt-2 text-sm">
              {card.examples.slice(0, 2).map((ex, i) => (
                <div key={i}>
                  <p className="italic text-slate-700 dark:text-slate-300">“{ex.text}”</p>
                  {ex.textVi && (
                    <p className="text-slate-400 dark:text-slate-500">→ {ex.textVi}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
