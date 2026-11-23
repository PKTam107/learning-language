"use client";
import Link from "next/link";
import { WordMining } from "@/components/WordMining";
import { QuickCreator } from "@/components/QuickCreator";
import { parseSharedText } from "@/lib/share-text";
export function ShareTarget({ shared }: { shared: string }) {
  const parsed = parseSharedText(shared);
  if (parsed.text && !parsed.isSingleTerm) return <WordMining initialText={shared} />;
  if (!parsed.term) return <p className="rounded-xl border p-6 text-sm dark:border-slate-800">Không nhận được nội dung. Hãy bôi đen từ ở app khác rồi chọn Chia sẻ → LinguaCards.</p>;
  return <div className="space-y-4"><h1 className="text-xl font-bold">Thêm từ được chia sẻ</h1><p className="text-sm text-slate-500">Đang tra từ bạn vừa chia sẻ.</p><blockquote className="rounded-xl border p-4 dark:border-slate-800">{parsed.text}</blockquote><Link href="/dashboard" className="inline-block text-brand underline">Về trang chủ</Link><QuickCreator key={parsed.term} initialWord={parsed.term} autoOpen /></div>;
}
