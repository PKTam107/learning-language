/**
 * Phát âm một từ: ưu tiên file audio; nếu không có URL nhưng có `text` thì đọc
 * bằng Web Speech (SpeechSynthesis) — giọng US/UK theo `label`.
 * Nguồn dùng chung cho nút phát âm (AudioButton) và tự phát âm khi học.
 */
export function speak({
  url,
  text,
  label,
}: {
  url?: string | null;
  text?: string | null;
  label?: string; // "US" | "UK"
}): void {
  if (typeof window === "undefined") return;

  if (url) {
    const audio = new Audio(url);
    void audio.play().catch(() => {
      // Trình duyệt chặn autoplay hoặc URL lỗi — bỏ qua, không làm gián đoạn học.
    });
    return;
  }

  if (text && "speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = label === "UK" ? "en-GB" : "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }
}
