import { useEffect, useRef, useState } from "react";
import type { ReadingLesson, ReadingRequest, ReadingWord } from "@/lib/reading";

export function useReadingLesson(fetchLesson: (input: ReadingRequest) => Promise<ReadingLesson>) {
  const [lesson, setLesson] = useState<ReadingLesson | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedWord, setSelectedWord] = useState<ReadingWord | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const version = useRef(0);
  const pending = useRef(false);
  useEffect(() => {
    const requests = version;
    return () => { requests.current++; };
  }, []);
  async function generate(input: ReadingRequest) {
    if (pending.current) return;
    pending.current = true;
    const request = ++version.current;
    setBusy(true); setError("");
    try {
      const result = await fetchLesson(input);
      if (request !== version.current) return;
      setLesson(result); setSelectedWord(null); setAnswers(result.questions.map(() => null));
    } catch (e) {
      if (request === version.current) setError(e instanceof Error ? e.message : "Chưa tải được bài đọc.");
    } finally {
      if (request === version.current) { pending.current = false; setBusy(false); }
    }
  }
  function answer(question: number, option: number) {
    if (!lesson || !lesson.questions[question]?.options[option]) return;
    setAnswers((previous) => previous.map((value, index) => index === question && value === null ? option : value));
  }
  const finished = !!lesson?.questions.length && answers.length === lesson.questions.length && answers.every((a) => a !== null);
  const score = lesson?.questions.reduce((n, q, i) => n + (answers[i] === q.answerIndex ? 1 : 0), 0) ?? 0;
  return { lesson, busy, error, selectedWord, setSelectedWord, answers, answer, generate, finished, score };
}
