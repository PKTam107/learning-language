"use client";

import { useEffect, useState } from "react";

interface CountUpProps {
  value: number;
  /** Thời gian chạy số (ms). */
  duration?: number;
  className?: string;
}

/**
 * Số đếm tăng dần tới `value` — dùng cho các con số đáng ăn mừng (tổng kết
 * phiên học). Dùng `tabular-nums` để chữ số không co giãn làm giật layout.
 */
export function CountUp({ value, duration = 900, className = "" }: CountUpProps) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out-cubic: chạy nhanh lúc đầu rồi hãm dần về đích.
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={`tabular-nums ${className}`}>{shown}</span>;
}
