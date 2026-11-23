"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchReviewReport, type LearningReport } from "@/lib/db/learning";
export function ReviewEffectiveness() {
  const [report, setReport] = useState<LearningReport | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let alive = true; setError("");
    fetchReviewReport().then((data) => { if (alive) setReport(data); }).catch(() => { if (alive) setError("Chưa tải được báo cáo ôn tập."); });
    return () => { alive = false; };
  }, [reload]);
  return <section className="space-y-4 rounded-xl border p-5 dark:border-slate-800"><h2 className="text-lg font-semibold">Hiệu quả ôn tập · 7 ngày gồm hôm nay</h2>
    {error ? <p role="alert">{error} <button onClick={() => setReload(reload + 1)} className="underline">Thử lại</button></p> : !report ? <p role="status">Đang tải báo cáo…</p> : <>
    <p className="text-2xl font-bold">{report.retention === null ? "Chưa có lượt ôn đủ điều kiện" : `${report.retention}% nhớ khi đến hạn`}</p>
    <p className="text-sm text-slate-500">{report.remembered}/{report.due} lượt ôn đến hạn được đánh giá Tạm nhớ hoặc Đã thuộc. Chỉ tính thẻ đã có khoảng ôn trên 0 ngày; không tính bước học mới hoặc học lại. Đây là kết quả đánh giá trong ứng dụng.</p>
    {report.due > 0 && report.due < 20 && <p className="text-sm text-amber-700 dark:text-amber-300">Mẫu còn ít, hãy tích lũy thêm lượt ôn trước khi kết luận.</p>}
    {(!report.contextAvailable || report.unknown > 0) && <p className="text-sm text-amber-700 dark:text-amber-300">{!report.contextAvailable ? "Chưa có dữ liệu ngữ cảnh để đo tỷ lệ nhớ khi đến hạn." : `${report.unknown} lượt thiếu ngữ cảnh được loại khỏi tỷ lệ nhớ khi đến hạn.`}</p>}
    {report.modes.length > 0 && <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="mb-2 text-left font-medium">Theo kiểu ôn (gồm cả bước học)</caption><thead><tr><th scope="col" className="py-2">Kiểu ôn</th><th scope="col">Lượt ôn</th><th scope="col">Chưa thuộc</th></tr></thead><tbody>{report.modes.map((mode) => <tr key={mode.type} className="border-t dark:border-slate-800"><td className="py-2">{mode.label}</td><td>{mode.total}</td><td>{mode.forgotten}/{mode.total} ({Math.round(mode.forgotten / mode.total * 100)}%)</td></tr>)}</tbody></table><p className="text-xs text-slate-500">Độ khó và thẻ khác nhau giữa các kiểu ôn; không dùng tỷ lệ này để xếp hạng kiểu học.</p></div>}
    <div><h3 className="font-medium">Từ hay quên trong tuần</h3>{report.forgotten.length ? <ul className="mt-2 space-y-2">{report.forgotten.map((card) => <li key={card.id}><Link href={`/decks/${card.deck_id}`} className="text-brand underline">{card.term}</Link> · {card.count} lượt Chưa thuộc</li>)}</ul> : <p className="mt-1 text-sm text-slate-500">{report.total ? "Không có thẻ hiện còn trong kho bị đánh giá Chưa thuộc trong tuần." : "Chưa có lượt ôn trong tuần này."}</p>}</div>
    <Link href="/health" className="inline-block text-sm text-brand underline">Kiểm tra sức khỏe kho thẻ →</Link>
    </>}
  </section>;
}
