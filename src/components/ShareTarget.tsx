"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { QuickCreator } from "@/components/QuickCreator";
import { parseSharedText } from "@/lib/share-text";

/**
 * Đích đến của thao tác **Chia sẻ** từ app khác (Chrome, Kindle, YouTube...).
 *
 * Khoảnh khắc gặp từ mới xảy ra ở chỗ khác, không phải trong LinguaCards — luồng
 * cũ buộc người học nhớ từ đó, mở app, gõ lại. Nay bôi đen → Chia sẻ →
 * LinguaCards là xong.
 *
 * Việc phân loại nội dung (một từ hay cả đoạn) nằm ở `lib/share-text.ts` để bản
 * mobile dùng chung — xem `app/(app)/share.tsx` bên mobile.
 */
export function ShareTarget({ shared }: { shared: string }) {
  const { text, isSingleTerm, term, candidates } = useMemo(
    () => parseSharedText(shared),
    [shared]
  );

  const [picked, setPicked] = useState<string | null>(term);

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
