import * as XLSX from "xlsx";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import type { DraftCard } from "@/types";

/**
 * Bảng cột chuẩn cho file import (đồng bộ với web src/lib/import/xlsx.ts).
 * Header không phân biệt hoa/thường; chấp nhận tên tiếng Anh lẫn tiếng Việt.
 */
const COLUMN_ALIASES: Record<keyof ParsedRow, string[]> = {
  term: ["term", "từ", "tu", "word", "vocab", "vocabulary"],
  meaningVi: ["meaning_vi", "meaning", "nghĩa", "nghia", "nghĩa tiếng việt"],
  phonetic: ["phonetic", "phiên âm", "phien am", "ipa", "pronunciation"],
  partOfSpeech: ["part_of_speech", "pos", "từ loại", "tu loai", "loại từ"],
  note: ["note", "notes", "ghi chú", "ghi chu"],
};

interface ParsedRow {
  term: string;
  meaningVi?: string;
  phonetic?: string;
  partOfSpeech?: string;
  note?: string;
}

function normalizeHeader(h: string): string {
  return String(h).trim().toLowerCase();
}

function buildHeaderMap(headers: string[]): Map<string, keyof ParsedRow> {
  const map = new Map<string, keyof ParsedRow>();
  for (const raw of headers) {
    const norm = normalizeHeader(raw);
    for (const key of Object.keys(COLUMN_ALIASES) as (keyof ParsedRow)[]) {
      if (COLUMN_ALIASES[key].includes(norm)) {
        map.set(raw, key);
        break;
      }
    }
  }
  return map;
}

function cell(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

/** Parse nội dung .xlsx (base64) → DraftCard[]. Chỉ đọc sheet đầu tiên. */
export function parseCardRows(base64: string): DraftCard[] {
  const wb = XLSX.read(base64, { type: "base64" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("File không có sheet nào.");
  const sheet = wb.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  if (rows.length === 0) return [];

  const headerMap = buildHeaderMap(Object.keys(rows[0]));
  if (!Array.from(headerMap.values()).includes("term")) {
    throw new Error(
      'Không tìm thấy cột "term" (hoặc "từ"/"word"). Kiểm tra hàng tiêu đề.'
    );
  }

  const drafts: DraftCard[] = [];
  for (const row of rows) {
    const parsed: ParsedRow = { term: "" };
    for (const [rawHeader, key] of headerMap) {
      parsed[key] = cell(row[rawHeader]);
    }
    const term = parsed.term.trim();
    if (!term) continue;

    drafts.push({
      term,
      phonetic: parsed.phonetic || undefined,
      partOfSpeech: parsed.partOfSpeech || undefined,
      meaningVi: parsed.meaningVi || undefined,
      note: parsed.note || undefined,
      definitions: [],
      examples: [],
      sourceLanguage: "en",
      targetLanguage: "vi",
    });
  }
  return drafts;
}

/**
 * Mở document picker chọn file .xlsx → đọc base64 → parse.
 * Trả về null nếu người dùng hủy chọn.
 */
export async function pickAndParseXlsx(): Promise<DraftCard[] | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.[0]) return null;

  const base64 = await FileSystem.readAsStringAsync(res.assets[0].uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return parseCardRows(base64);
}
