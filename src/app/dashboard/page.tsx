import { Navbar } from "@/components/Navbar";
import { QuickCreator } from "@/components/QuickCreator";
import { StudyOverview } from "@/components/StudyOverview";
import { DailyChallenge } from "@/components/DailyChallenge";
import { WeakWords } from "@/components/WeakWords";
import { EnrichBackfillButton } from "@/components/EnrichBackfillButton";
import { DecksManager } from "@/components/deck/DecksManager";
import { Hand } from "lucide-react";

export default function DashboardPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-8 md:pb-12">
        <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
          Xin chào <Hand className="h-6 w-6 text-amber-500" />
        </h1>
        {/* Thứ tự có chủ ý: việc cần làm hôm nay → bộ thẻ (để học/thêm từ) →
            rồi mới tới các khối tham khảo. Trước đây 4 khối thống kê nằm trên
            lưới bộ thẻ, nên trên điện thoại phải cuộn qua hết mới tới được chỗ
            bắt đầu học. */}
        <StudyOverview />
        <DecksManager showStats />
        <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
          <DailyChallenge />
          <WeakWords limit={6} />
        </div>
        <EnrichBackfillButton banner />
      </main>
      <QuickCreator />
    </>
  );
}
