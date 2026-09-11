import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { ShareTarget } from "@/components/ShareTarget";

export const metadata: Metadata = { title: "Thêm từ được chia sẻ" };

/**
 * Đích của `share_target` khai báo trong manifest PWA (xem `app/manifest.ts`):
 * hệ điều hành gọi `GET /share?title=…&text=…&url=…` khi người dùng chọn
 * "Chia sẻ → LinguaCards" ở app khác.
 *
 * Ưu tiên `text` (đoạn người dùng bôi đen), rồi `title`; **bỏ `url`** — chia sẻ
 * một trang web thì `text` thường trống và `url` chỉ là địa chỉ, tra nó ra thẻ
 * rác. Trang này cần đăng nhập như mọi trang khác (middleware lo).
 */
export default function SharePage({
  searchParams,
}: {
  searchParams: { title?: string; text?: string; url?: string };
}) {
  const shared = (searchParams.text || searchParams.title || "").slice(0, 2000);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:pt-8 md:pb-12">
        <ShareTarget shared={shared} />
      </main>
    </>
  );
}
