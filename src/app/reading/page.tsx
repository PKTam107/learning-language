import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { ReadingPractice } from "@/components/ReadingPractice";
export const metadata: Metadata = { title: "Đọc bằng kho từ của bạn" };
export default function ReadingPage() {
  return <><Navbar /><main className="mx-auto max-w-5xl px-4 pb-24 pt-6"><ReadingPractice /></main></>;
}
