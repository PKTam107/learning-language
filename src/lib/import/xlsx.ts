import * as XLSX from "xlsx";
import type { DraftCard } from "@/types";

/**
 * Bảng cột chuẩn cho file import. Header (hàng đầu) không phân biệt hoa/thường,
 * bỏ khoảng trắng thừa; chấp nhận cả tên tiếng Anh lẫn tiếng Việt.
 *   term          → term (bắt buộc)
 *   meaning_vi    → nghĩa tiếng Việt
 *   phonetic      → phiên âm / IPA
 *   part_of_speech→ từ loại
 *   note          → ghi chú
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

/** Cột mẫu để người dùng tải template. */
export const TEMPLATE_HEADERS = [
  "term",
  "meaning_vi",
  "phonetic",
  "part_of_speech",
  "note",
];

function normalizeHeader(h: string): string {
  return String(h).trim().toLowerCase();
}

/** Dựng map: header trong file → khóa ParsedRow. */
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

/**
 * Parse workbook (.xlsx) → danh sách DraftCard. Chỉ đọc sheet đầu tiên.
 * Bỏ qua các dòng không có `term`. Ném lỗi nếu không tìm thấy cột `term`.
 */
export function parseCardRows(
  input: ArrayBuffer | Uint8Array | string,
  type: "array" | "base64" = "array"
): DraftCard[] {
  const wb = XLSX.read(input, { type });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("File không có sheet nào.");
  const sheet = wb.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  if (rows.length === 0) return [];

  const headerMap = buildHeaderMap(Object.keys(rows[0]));
  const hasTerm = Array.from(headerMap.values()).includes("term");
  if (!hasTerm) {
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
    if (!term) continue; // bỏ dòng trống

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
