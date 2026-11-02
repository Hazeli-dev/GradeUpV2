import { Flame, Target, Trophy } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { weeklyActivity } from "@/data/analytics";

/** Pratinjau dashboard dekoratif untuk hero (data statis, bukan data pengguna). */
export function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-brand-gradient opacity-20 blur-2xl" />
      <div className="glass overflow-hidden rounded-3xl p-4 shadow-2xl sm:p-5">
        <div className="mb-4 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 h-5 flex-1 rounded-md bg-muted" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Trophy, label: "Rata-rata", value: "82" },
            { icon: Flame, label: "Streak", value: "12 hari" },
            { icon: Target, label: "Ujian", value: "24" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-card p-3 shadow-soft">
              <s.icon className="mb-2 h-4 w-4 text-primary dark:text-accent" />
              <p className="text-lg font-extrabold leading-none">{s.value}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl bg-card p-4 shadow-soft">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold">Aktivitas minggu ini</p>
            <span className="text-[11px] text-muted-foreground">contoh</span>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyActivity} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="previewFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="soal" stroke="#0F766E" strokeWidth={2.5} fill="url(#previewFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="mt-3 space-y-2 rounded-2xl bg-card p-4 shadow-soft">
          {[["Matematika", 78], ["Bahasa Inggris", 64], ["IPA", 91]].map(([name, val]) => (
            <div key={name as string} className="space-y-1">
              <div className="flex justify-between text-[11px] font-semibold"><span>{name}</span><span>{val}%</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${val}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -left-4 top-1/3 hidden animate-float rounded-2xl border bg-card px-4 py-3 shadow-glow sm:block">
        <p className="text-xs text-muted-foreground">Skor try out</p>
        <p className="text-xl font-extrabold text-primary dark:text-accent">+12 poin</p>
      </div>
    </div>
  );
}
