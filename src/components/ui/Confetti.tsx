"use client";

import { useEffect, useRef } from "react";

/** Màu giấy vụn — brand indigo trộn với vài màu vui mắt cho đỡ đơn điệu. */
const COLORS = ["#4f46e5", "#818cf8", "#f59e0b", "#22c55e", "#f43f5e", "#38bdf8"];

const GRAVITY = 0.26;
const DRAG = 0.992;

interface ConfettiProps {
  /** Số mảnh giấy. Nhiều quá thì rối, ~90 là vừa. */
  pieces?: number;
  /** Thời gian bắn (ms) — hết giờ thì canvas tự dọn. */
  duration?: number;
}

/**
 * Hiệu ứng pháo giấy ăn mừng, vẽ bằng canvas nên không cần thư viện ngoài.
 * Phủ toàn màn hình nhưng `pointer-events-none` để không chặn thao tác.
 *
 * Mount là bắn — muốn bắn lại thì đổi `key` của component.
 */
export function Confetti({ pieces = 90, duration = 2600 }: ConfettiProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Người dùng đã yêu cầu giảm chuyển động thì bỏ hẳn hiệu ứng.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Hai chùm bắn chéo lên từ hai mép dưới — giống pháo giấy cầm tay.
    const particles = Array.from({ length: pieces }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const angle =
        ((fromLeft ? -62 : -118) * Math.PI) / 180 + (Math.random() - 0.5) * 0.8;
      const speed = 9 + Math.random() * 8;
      return {
        x: width * (fromLeft ? 0.06 : 0.94),
        y: height * 0.82,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 6 + Math.random() * 5,
        h: 9 + Math.random() * 6,
        spin: Math.random() * Math.PI * 2,
        spinRate: (Math.random() - 0.5) * 0.28,
        color: COLORS[i % COLORS.length],
      };
    });

    const start = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, width, height);

      // Mờ dần ở 30% thời lượng cuối để kết thúc êm thay vì biến mất đột ngột.
      const fadeFrom = duration * 0.7;
      const alpha =
        elapsed <= fadeFrom
          ? 1
          : Math.max(0, 1 - (elapsed - fadeFrom) / (duration - fadeFrom));
      ctx.globalAlpha = alpha;

      for (const p of particles) {
        p.vy += GRAVITY;
        p.vx *= DRAG;
        p.x += p.vx;
        p.y += p.vy;
        p.spin += p.spinRate;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        // Bóp theo chiều dọc để mảnh giấy trông như đang lật trong không khí.
        ctx.scale(1, Math.cos(p.spin * 1.6));
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (elapsed < duration) {
        raf = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [pieces, duration]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}
