import { createClient } from "@/lib/supabase/client";
import type { Card } from "@/types";

// xlsx (~170KB) chỉ nạp khi thực sự xuất Excel → không làm nặng dashboard/decks.
const loadXlsx = () => import("xlsx");

const supabase = () => createClient();

/** Cột phẳng cho CSV/Excel (5 cột đầu tương thích ngược với import). */
const CARD_COLUMNS = [
  "term",
  "meaning_vi",
  "phonetic",
  "part_of_speech",
  "note",
  "phonetic_uk",
  "phonetic_us",
  "audio_us",
  "audio_uk",
] as const;

type CardRowFlat = Record<(typeof CARD_COLUMNS)[number], string>;

function flattenCard(c: Card): CardRowFlat {
  return {
    term: c.term ?? "",
    meaning_vi: c.meaning_vi ?? "",
    phonetic: c.phonetic ?? "",
    part_of_speech: c.part_of_speech ?? "",
    note: c.note ?? "",
    phonetic_uk: c.phonetic_uk ?? "",
    phonetic_us: c.phonetic_us ?? "",
    audio_us: c.audio_us ?? "",
    audio_uk: c.audio_uk ?? "",
  };
}

// ---------- Serializers (thuần, không I/O) ----------

export function cardsToJson(cards: Card[]): string {
  return JSON.stringify(cards, null, 2);
}

function csvEscape(v: string): string {
  // Bọc trong dấu " nếu chứa dấu phẩy, xuống dòng hoặc dấu ".
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function cardsToCsv(cards: Card[]): string {
  const header = CARD_COLUMNS.join(",");
  const lines = cards.map((c) => {
    const flat = flattenCard(c);
    return CARD_COLUMNS.map((col) => csvEscape(flat[col])).join(",");
  });
  // BOM để Excel mở UTF-8 đúng (tiếng Việt không lỗi font).
  return "﻿" + [header, ...lines].join("\r\n");
}

/** Dựng file .xlsx (Uint8Array) từ danh sách thẻ. Nạp xlsx động. */
export async function cardsToXlsxBytes(cards: Card[]): Promise<Uint8Array> {
  const XLSX = await loadXlsx();
  const rows = cards.map(flattenCard);
  const ws = XLSX.utils.json_to_sheet(rows, { header: [...CARD_COLUMNS] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "cards");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
}

// ---------- Backup toàn tài khoản ----------

export interface AccountBackup {
  version: 1;
  exportedAt: string;
  profile: unknown;
  decks: unknown[];
  cards: unknown[];
  progress: unknown[];
}

/** Lấy toàn bộ dữ liệu của user hiện tại (RLS tự lọc theo user). */
export async function buildAccountBackup(): Promise<AccountBackup> {
  const sb = supabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Chưa đăng nhập");

  const [profileRes, decksRes, cardsRes, progressRes] = await Promise.all([
    sb.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    sb.from("decks").select("*"),
    sb.from("cards").select("*"),
    sb.from("card_progress").select("*"),
  ]);
  for (const r of [decksRes, cardsRes, progressRes]) {
    if (r.error) throw r.error;
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: profileRes.data ?? null,
    decks: decksRes.data ?? [],
    cards: cardsRes.data ?? [],
    progress: progressRes.data ?? [],
  };
}

// ---------- Tải file (browser) ----------

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Tên file an toàn từ tên deck (bỏ ký tự lạ). */
function safeName(name: string): string {
  return name.trim().replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60) || "cards";
}

export type ExportFormat = "csv" | "xlsx" | "json";

/** Xuất 1 danh sách thẻ ra file theo định dạng chọn (đặt tên theo deck). */
export async function exportCards(
  cards: Card[],
  format: ExportFormat,
  baseName: string
): Promise<void> {
  const name = safeName(baseName);
  if (format === "json") {
    downloadBlob(
      `${name}.json`,
      new Blob([cardsToJson(cards)], { type: "application/json" })
    );
  } else if (format === "csv") {
    downloadBlob(
      `${name}.csv`,
      new Blob([cardsToCsv(cards)], { type: "text/csv;charset=utf-8" })
    );
  } else {
    const out = await cardsToXlsxBytes(cards);
    downloadBlob(
      `${name}.xlsx`,
      new Blob([out as unknown as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
    );
  }
}

/** Tải backup toàn tài khoản dạng JSON. */
export async function exportAccountBackup(): Promise<void> {
  const backup = await buildAccountBackup();
  const stamp = backup.exportedAt.slice(0, 10);
  downloadBlob(
    `linguacards-backup-${stamp}.json`,
    new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
  );
}
