"use client";

import { useEffect, useState } from "react";
import { AlarmClock } from "lucide-react";
import { useSettings } from "@/lib/settings";
import {
  formatCountdown,
  formatHm,
  nextReminderIn,
  parseHm,
  partOfDay,
  REMINDER_PRESETS,
} from "@/lib/reminder";
import { Spinner } from "@/components/ui/Spinner";

export function SettingsForm() {
  const { settings, ready, update } = useSettings();
  const [now, setNow] = useState(() => new Date());

  // Cho dòng "còn bao lâu" không bị cũ khi để trang mở lâu.
  useEffect(() => {
    if (!settings.reminderEnabled) return;
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [settings.reminderEnabled]);

  if (!ready) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const { reminderHour: hour, reminderMinute: minute } = settings;
  const next = nextReminderIn(hour, minute, now);

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
            <div className="space-y-3 border-t border-slate-200 pt-4">
              {/* Giờ nhắc — chọn tự do tới từng phút */}
              <div className="flex items-center gap-3 rounded-xl bg-brand-light p-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-dark">
                  <AlarmClock className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="reminder-time"
                    className="block text-xs font-semibold text-brand-dark"
                  >
                    Giờ nhắc mỗi ngày
                  </label>
                  <input
                    id="reminder-time"
                    type="time"
                    step={60}
                    value={formatHm(hour, minute)}
                    onChange={(e) => {
                      const parsed = parseHm(e.target.value);
                      if (!parsed) return;
                      update({
                        reminderHour: parsed.hour,
                        reminderMinute: parsed.minute,
                      });
                      setNow(new Date());
                    }}
                    className="w-full cursor-pointer bg-transparent text-3xl font-extrabold tabular-nums text-brand-dark outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand/40"
                  />
                  <p className="text-xs text-slate-500">
                    Buổi {partOfDay(hour)} · lần nhắc tới{" "}
                    {next.tomorrow ? "mai" : "hôm nay"},{" "}
                    {formatCountdown(next.minutes)}
                  </p>
                </div>
              </div>

              {/* Mốc gợi ý nhanh */}
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">
                  Gợi ý nhanh
                </p>
                <div className="flex flex-wrap gap-2">
                  {REMINDER_PRESETS.map((p) => {
                    const active = p.hour === hour && p.minute === minute;
                    return (
                      <button
                        key={p.label}
                        onClick={() => {
                          update({
                            reminderHour: p.hour,
                            reminderMinute: p.minute,
                          });
                          setNow(new Date());
                        }}
                        className={`rounded-xl border px-3 py-1.5 text-left transition-colors ${
                          active
                            ? "border-brand bg-brand-light text-brand-dark"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="block text-sm font-bold tabular-nums">
                          {formatHm(p.hour, p.minute)}
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          {p.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
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
