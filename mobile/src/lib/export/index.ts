import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { supabase } from "@/lib/supabase";
import type { Card } from "@/types";

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

// ---------- Serializers ----------

export function cardsToJson(cards: Card[]): string {
  return JSON.stringify(cards, null, 2);
}

function csvEscape(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function cardsToCsv(cards: Card[]): string {
  const header = CARD_COLUMNS.join(",");
  const lines = cards.map((c) => {
    const flat = flattenCard(c);
    return CARD_COLUMNS.map((col) => csvEscape(flat[col])).join(",");
  });
  return "﻿" + [header, ...lines].join("\r\n"); // BOM cho Excel UTF-8
}

export function cardsToXlsxBase64(cards: Card[]): string {
  const rows = cards.map(flattenCard);
  const ws = XLSX.utils.json_to_sheet(rows, { header: [...CARD_COLUMNS] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "cards");
  return XLSX.write(wb, { type: "base64", bookType: "xlsx" });
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

export async function buildAccountBackup(): Promise<AccountBackup> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Chưa đăng nhập");

  const [profileRes, decksRes, cardsRes, progressRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("decks").select("*"),
    supabase.from("cards").select("*"),
    supabase.from("card_progress").select("*"),
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

// ---------- Ghi file + chia sẻ ----------

function safeName(name: string): string {
  return name.trim().replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60) || "cards";
}

async function writeAndShare(
  filename: string,
  content: string,
  encoding: FileSystem.EncodingType,
  mimeType: string
): Promise<void> {
  const uri = (FileSystem.cacheDirectory ?? "") + filename;
  await FileSystem.writeAsStringAsync(uri, content, { encoding });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Thiết bị không hỗ trợ chia sẻ file.");
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: filename });
}

export type ExportFormat = "csv" | "xlsx" | "json";

/** Xuất danh sách thẻ → file tạm rồi mở share sheet của hệ điều hành. */
export async function exportCards(
  cards: Card[],
  format: ExportFormat,
  baseName: string
): Promise<void> {
  const name = safeName(baseName);
  if (format === "json") {
    await writeAndShare(
      `${name}.json`,
      cardsToJson(cards),
      FileSystem.EncodingType.UTF8,
      "application/json"
    );
  } else if (format === "csv") {
    await writeAndShare(
      `${name}.csv`,
      cardsToCsv(cards),
      FileSystem.EncodingType.UTF8,
      "text/csv"
    );
  } else {
    await writeAndShare(
      `${name}.xlsx`,
      cardsToXlsxBase64(cards),
      FileSystem.EncodingType.Base64,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  }
}

/** Chia sẻ backup toàn tài khoản dạng JSON. */
export async function exportAccountBackup(): Promise<void> {
  const backup = await buildAccountBackup();
  const stamp = backup.exportedAt.slice(0, 10);
  await writeAndShare(
    `linguacards-backup-${stamp}.json`,
    JSON.stringify(backup, null, 2),
    FileSystem.EncodingType.UTF8,
    "application/json"
  );
}
