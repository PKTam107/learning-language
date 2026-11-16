"use client";
import { useReadingLibrary } from "@/hooks/useReadingLibrary";
import { createReadingStore } from "@/lib/reading-store";
import { ReadingAudio } from "@/components/ReadingAudio";


import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { fetchDecks } from "@/lib/db/decks";
import { READING_TOPICS, ReadingResponseSchema, readingSegments, type ReadingRequest } from "@/lib/reading";
import { useReadingLesson } from "@/hooks/useReadingLesson";
import type { Deck } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AudioButton } from "@/components/flashcard/AudioButton";
import { CardPhoto } from "@/components/flashcard/CardPhoto";

async function fetchLesson(input: ReadingRequest) {
  const response = await apiFetch("/api/reading", input);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || "Chưa tải được bài đọc.");
  return ReadingResponseSchema.parse(data);
}

export function ReadingPractice() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckError, setDeckError] = useState(false);
  const [deckId, setDeckId] = useState("");
  const [topic, setTopic] = useState<ReadingRequest["topic"]>("daily");
  const reading = useReadingLesson(fetchLesson);
  const store = useMemo(() => createReadingStore(), []);
  const library = useReadingLibrary(store, reading.lesson, reading.answers);
  useEffect(() => {
    let alive = true;
    fetchDecks().then((data) => { if (alive) setDecks(data.filter((d) => d.source_language === "en" && d.target_language === "vi")); }).catch(() => { if (alive) setDeckError(true); });
    return () => { alive = false; };
  }, []);
  const { lesson } = reading;
  return <div className="mx-auto max-w-2xl space-y-5">
    <div><h1 className="text-2xl font-bold">Đọc bằng kho từ của bạn</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Một đoạn đọc 80–120 từ, dùng 3–5 từ trong kho. Chạm vào từ được đánh dấu để xem nghĩa và nghe.</p></div>
    <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <label className="block text-sm">Chủ đề<select disabled={reading.busy} value={topic} onChange={(e) => setTopic(e.target.value as ReadingRequest["topic"])} className="mt-1 w-full rounded-lg border bg-transparent p-2 dark:border-slate-700 dark:bg-slate-900">{READING_TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
      <label className="block text-sm">Kho từ<select disabled={reading.busy} value={deckId} onChange={(e) => setDeckId(e.target.value)} className="mt-1 w-full rounded-lg border bg-transparent p-2 dark:border-slate-700 dark:bg-slate-900"><option value="">Tất cả bộ thẻ tiếng Anh</option>{decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
      {deckError && <p className="text-xs text-slate-500">Chưa tải được danh sách bộ thẻ; bạn vẫn có thể đọc từ tất cả bộ thẻ.</p>}
      <Button disabled={reading.busy} onClick={() => void reading.generate({ topic, ...(deckId ? { deckId } : {}) })}>{reading.busy ? "Đang chuẩn bị bài đọc…" : lesson ? "Tạo bài khác" : "Bắt đầu đọc"}</Button>
      <p className="text-xs text-slate-500">Cần ít nhất 3 từ có nghĩa tiếng Việt. Đọc hiểu là luyện bổ sung, không thay đổi lịch ôn thẻ.</p>
    </section>
    <section className="space-y-2 rounded-xl border p-4 dark:border-slate-800"><h2 className="font-semibold">Bài đọc đã lưu ({library.items.length}/20)</h2><p className="text-xs text-slate-500">Tự lưu trên thiết bị này theo tài khoản, gồm câu trả lời. Chọn bài để học tiếp; chưa đồng bộ sang thiết bị khác.</p>{library.error && <p role="status">{library.error} <button onClick={library.retry} className="underline">Lưu lại</button></p>}{!library.ready && !library.error && <p>Đang tải…</p>}{library.ready && !library.items.length && <p className="text-sm text-slate-500">Bài mới sẽ tự xuất hiện ở đây sau khi tạo.</p>}<div className="max-h-52 space-y-2 overflow-y-auto">{library.items.map((item) => <button key={item.lesson.passage} disabled={reading.busy} onClick={() => reading.restore(item)} className="block w-full rounded-lg border p-3 text-left text-sm">{item.lesson.title} · {item.answers.filter((a) => a !== null).length}/{item.lesson.questions.length} câu đã làm</button>)}</div></section>
    {reading.error && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">{reading.error} <Link href="/decks" className="underline">Xem bộ thẻ</Link></p>}
    {lesson && <>
      <article className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
        <h2 className="mb-3 text-xl font-semibold">{lesson.title}</h2>
        {lesson.source === "examples" && <p className="mb-3 text-sm text-slate-500">Chưa tạo được đoạn đọc mới. Đây là các câu ví dụ đã lưu trong kho, không phải một câu chuyện liền mạch.</p>}
        <ReadingAudio key={lesson.passage} text={lesson.passage}>
        <p className="whitespace-pre-line text-lg leading-9">{readingSegments(lesson.passage, lesson.words).map((segment, index) => segment.word ? <button key={index} type="button" onClick={() => reading.setSelectedWord(segment.word!)} className="rounded bg-indigo-100 px-0.5 font-semibold text-indigo-800 underline decoration-dotted dark:bg-indigo-500/20 dark:text-indigo-200">{segment.text}</button> : <span key={index}>{segment.text}</span>)}</p>
        </ReadingAudio>
      </article>
      <div className="flex flex-wrap gap-2">{lesson.words.map((word) => <button key={word.id} type="button" onClick={() => reading.setSelectedWord(word)} className="rounded-full border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700">{word.term}</button>)}</div>
      <Modal open={!!reading.selectedWord} onClose={() => reading.setSelectedWord(null)} title={reading.selectedWord?.term}>
        {reading.selectedWord && <div className="space-y-3"><AudioButton url={reading.selectedWord.audio} text={reading.selectedWord.term} label="US" /><p>{reading.selectedWord.meaning}</p><CardPhoto image={reading.selectedWord.image} /></div>}
      </Modal>
      {lesson.questions.map((q, index) => <section key={`${lesson.passage}-${index}`} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800"><h3 className="font-semibold">{index + 1}. {q.prompt}</h3>{q.options.map((option, i) => <button key={i} type="button" disabled={reading.answers[index] !== null} onClick={() => reading.answer(index, i)} className={`block w-full rounded-lg border p-3 text-left text-sm ${reading.answers[index] !== null && i === q.answerIndex ? "border-green-600 bg-green-50 dark:bg-green-500/10" : reading.answers[index] === i ? "border-red-500 bg-red-50 dark:bg-red-500/10" : "border-slate-200 dark:border-slate-700"}`}>{option}</button>)}{reading.answers[index] !== null && <p role="status" className="text-sm text-slate-500 dark:text-slate-400">{reading.answers[index] === q.answerIndex ? "Chính xác! " : "Đáp án: " + q.options[q.answerIndex] + ". "}{q.explanation}</p>}</section>)}
      {reading.finished && <p className="rounded-xl bg-green-50 p-4 text-green-800 dark:bg-green-500/10 dark:text-green-200">Bạn đã trả lời đúng {reading.score}/{lesson.questions.length} câu. Đọc lại đoạn văn và nghe những từ bạn muốn nhớ chắc hơn nhé.</p>}
    </>}
  </div>;
}
