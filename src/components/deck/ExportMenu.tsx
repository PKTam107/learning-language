"use client";

import { useEffect, useRef, useState } from "react";
import type { Card } from "@/types";
import { exportCards, type ExportFormat } from "@/lib/export";
import { Button } from "@/components/ui/Button";

interface Props {
  /** Danh sách thẻ sẽ xuất. */
  cards: Card[];
  /** Tên cơ sở cho file (thường là tên deck). */
  baseName: string;
  label?: string;
}

const OPTIONS: { format: ExportFormat; label: string }[] = [
  { format: "csv", label: "CSV (.csv)" },
  { format: "xlsx", label: "Excel (.xlsx)" },
  { format: "json", label: "JSON (.json)" },
];

/** Dropdown xuất danh sách thẻ ra CSV / Excel / JSON. */
export function ExportMenu({ cards, baseName, label = "Xuất" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function handle(format: ExportFormat) {
    setOpen(false);
    try {
      await exportCards(cards, format, baseName);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="secondary"
        onClick={() => setOpen((v) => !v)}
        disabled={cards.length === 0}
      >
        ⬇️ {label}
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {OPTIONS.map((o) => (
            <button
              key={o.format}
              onClick={() => handle(o.format)}
              className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
