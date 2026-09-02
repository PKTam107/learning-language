import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { supabase } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/paginate";
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

/**
 * Chỉ giữ trường nội dung khi xuất — bỏ id, user_id, deck_id, created_at,
 * updated_at (thông tin nội bộ). JSON giữ được cả definitions/examples.
 */
function cardToExport(c: Card) {
  return {
    term: c.term,
    meaning_vi: c.meaning_vi ?? null,
    phonetic: c.phonetic ?? null,
    phonetic_uk: c.phonetic_uk ?? null,
    phonetic_us: c.phonetic_us ?? null,
    audio_us: c.audio_us ?? null,
    audio_uk: c.audio_uk ?? null,
    part_of_speech: c.part_of_speech ?? null,
    note: c.note ?? null,
    definitions: c.definitions ?? [],
    examples: c.examples ?? [],
  };
}

export function cardsToJson(cards: Card[]): string {
  return JSON.stringify(cards.map(cardToExport), null, 2);
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

  // Sao lưu BẮT BUỘC phải phân trang: `select()` trần bị cắt ở 1000 dòng mà
  // không báo lỗi, nên file backup trông vẫn "thành công" nhưng thiếu thẻ —
  // đúng loại mất dữ liệu chỉ phát hiện ra lúc cần phục hồi.
  const [profileRes, decks, cards, progress] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    fetchAllRows<unknown>((f, t) =>
      supabase.from("decks").select("*").order("id").range(f, t)
    ),
    fetchAllRows<unknown>((f, t) =>
      supabase.from("cards").select("*").order("id").range(f, t)
    ),
    fetchAllRows<unknown>((f, t) =>
      supabase.from("card_progress").select("*").order("id").range(f, t)
    ),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: profileRes.data ?? null,
    decks,
    cards,
    progress,
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

// ---------- File Excel mẫu để nhập ----------

/** Cột mẫu — khớp alias trong lib/import/xlsx.ts. */
const TEMPLATE_COLUMNS = [
  "term",
  "meaning_vi",
  "phonetic",
  "part_of_speech",
  "note",
] as const;

const TEMPLATE_SAMPLE = [
  {
    term: "hello",
    meaning_vi: "xin chào",
    phonetic: "/həˈloʊ/",
    part_of_speech: "exclamation",
    note: "câu chào thông dụng",
  },
  {
    term: "accommodation",
    meaning_vi: "chỗ ở",
    phonetic: "/əˌkɒməˈdeɪʃn/",
    part_of_speech: "n",
    note: "",
  },
];

/** Tạo & chia sẻ file Excel mẫu để người dùng điền trước khi nhập. */
export async function downloadImportTemplate(): Promise<void> {
  const ws = XLSX.utils.json_to_sheet(TEMPLATE_SAMPLE, {
    header: [...TEMPLATE_COLUMNS],
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "template");
  const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  await writeAndShare(
    "linguacards-mau-nhap.xlsx",
    base64,
    FileSystem.EncodingType.Base64,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
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
