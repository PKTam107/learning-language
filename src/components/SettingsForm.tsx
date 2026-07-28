"use client";

import { useSettings } from "@/lib/settings";
import { Spinner } from "@/components/ui/Spinner";

const HOUR_OPTIONS = [7, 8, 9, 12, 18, 20, 21, 22];

export function SettingsForm() {
  const { settings, ready, update } = useSettings();

  if (!ready) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* --- Học tập --- */}
      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
          Học tập
        </h2>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <Toggle
            label="Tự phát âm khi lật thẻ"
            desc="Đọc từ tiếng Anh mỗi khi bạn lật xem đáp án / lộ đáp án."
            checked={settings.autoSpeak}
            onChange={(v) => update({ autoSpeak: v })}
          />
        </div>
      </section>

      {/* --- Nhắc học --- */}
      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
          Nhắc học hằng ngày
        </h2>
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <Toggle
            label="Bật nhắc học"
            desc="Hiện banner nhắc trên trang chủ khi tới giờ mà hôm nay bạn chưa ôn."
            checked={settings.reminderEnabled}
            onChange={(v) => update({ reminderEnabled: v })}
          />

          {settings.reminderEnabled && (
            <div className="border-t border-slate-200 pt-4">
              <p className="mb-2 text-sm font-medium text-slate-700">Giờ nhắc</p>
              <div className="flex flex-wrap gap-2">
                {HOUR_OPTIONS.map((h) => {
                  const active = settings.reminderHour === h;
                  return (
                    <button
                      key={h}
                      onClick={() => update({ reminderHour: h })}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        active
                          ? "border-brand bg-brand-light font-semibold text-brand-dark"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {String(h).padStart(2, "0")}:00
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          Nhắc học hiển thị dưới dạng banner ngay trong app khi bạn mở trang chủ —
          không cần cấp quyền thông báo.
        </p>
      </section>
    </div>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-brand" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
