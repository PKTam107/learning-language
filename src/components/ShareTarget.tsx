"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { QuickCreator } from "@/components/QuickCreator";

/** Nhiều nhất bao nhiêu từ ứng viên hiện ra để chạm chọn. */
const MAX_CHIPS = 40;
/** Dài hơn mức này thì coi là "một đoạn văn", không phải một từ cần tra. */
const MAX_TERM_WORDS = 4;

/**
 * Đích đến của thao tác **Chia sẻ** từ app khác (Chrome, Kindle, YouTube...).
 *
 * Khoảnh khắc gặp từ mới xảy ra ở chỗ khác, không phải trong LinguaCards — luồng
 * cũ buộc người học nhớ từ đó, mở app, gõ lại. Nay bôi đen → Chia sẻ →
 * LinguaCards là xong.
 *
 * Hai kiểu nội dung được chia sẻ, xử lý khác nhau:
 *  - **Một từ / cụm ngắn**: tra luôn, người dùng chỉ còn bấm Lưu.
 *  - **Cả đoạn văn**: không tra cả đoạn (vô nghĩa, lại tốn hạn mức) mà tách
 *    thành các từ để chạm chọn — bản rút gọn của luồng "tra hàng loạt" sẽ làm
 *    ở đợt sau.
 */
export function ShareTarget({ shared }: { shared: string }) {
  const text = shared.trim();
  const isSingleTerm =
    !!text && text.split(/\s+/).length <= MAX_TERM_WORDS && !/[.!?]$/.test(text);

  const [picked, setPicked] = useState<string | null>(
    isSingleTerm ? text : null
  );

  /** Ứng viên từ trong đoạn: bỏ dấu câu, bỏ trùng, giữ nguyên thứ tự xuất hiện. */
  const candidates = useMemo(() => {
    if (isSingleTerm) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of text.split(/[^A-Za-z'-]+/)) {
      const w = raw.replace(/^['-]+|['-]+$/g, "");
      // Từ 1 ký tự gần như luôn là rác ("I" thì không ai cần tra).
      if (w.length < 2) continue;
      const key = w.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(w);
      if (out.length >= MAX_CHIPS) break;
    }
    return out;
  }, [text, isSingleTerm]);

  if (!text) {
    return (
      <Empty>
        Không nhận được nội dung nào. Hãy bôi đen một từ ở app khác rồi chọn{" "}
        <strong>Chia sẻ → LinguaCards</strong>.
      </Empty>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Thêm từ được chia sẻ</h1>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        {isSingleTerm
          ? "Đang tra từ bạn vừa chia sẻ."
          : "Chạm vào từ bạn muốn tạo thẻ."}
      </p>

      <blockquote className="mb-4 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm italic text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
        {text}
      </blockquote>

      {!isSingleTerm &&
        (candidates.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {candidates.map((w) => (
              <button
                key={w.toLowerCase()}
                onClick={() => setPicked(w)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  picked?.toLowerCase() === w.toLowerCase()
                    ? "border-brand bg-brand-light font-semibold text-brand-dark dark:bg-indigo-500/15 dark:text-indigo-300"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        ) : (
          <Empty>
            Không tìm thấy từ tiếng Anh nào trong nội dung này. Bấm nút{" "}
            <strong>+</strong> để tự gõ.
          </Empty>
        ))}

      <p className="mt-6 text-sm">
        <Link href="/dashboard" className="text-brand hover:underline dark:text-indigo-400">
          Về trang chủ
        </Link>
      </p>

      {/* `key` đổi theo từ đã chọn → QuickCreator mount lại và tra từ mới. */}
      <QuickCreator
        key={picked ?? ""}
        initialWord={picked ?? undefined}
        autoOpen={!!picked}
      />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
      {children}
    </div>
  );
}
