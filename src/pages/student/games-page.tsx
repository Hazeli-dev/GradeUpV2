
import { Gamepad2, Search, Sparkles } from "lucide-react";

export default function StudentGamesPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 to-emerald-500 p-6 text-white md:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-teal-100">
            <Gamepad2 size={18} />
            Pusat Permainan Edukatif
          </div>

          <h1 className="text-3xl font-bold md:text-4xl">
            GradeUp Games
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-teal-50 md:text-base">
            Belajar jadi lebih seru! Asah kemampuan berpikir,
            tingkatkan konsentrasi, dan tantang kemampuanmu
            melalui permainan edukatif.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm">
            <Sparkles size={16} />
            Gratis untuk semua siswa
          </div>
        </div>

        <Gamepad2
          className="absolute -bottom-8 -right-5 h-48 w-48 text-white/10"
          strokeWidth={1}
        />
      </div>

      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold">Daftar Permainan</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih permainan dan mulai tantanganmu.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex h-36 items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600">
              <Search size={64} className="text-white" />
            </div>

            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Gratis
                </span>
                <span className="text-xs text-muted-foreground">
                  HOTS
                </span>
              </div>

              <h3 className="text-lg font-bold">Cari Kata HOTS</h3>

              <p className="text-sm text-muted-foreground">
                Temukan kata tersembunyi dan latih konsentrasi,
                ketelitian, serta kemampuan berpikirmu.
              </p>

              <div className="rounded-lg bg-muted px-3 py-2 text-center text-sm font-medium text-muted-foreground">
                Game sedang dipersiapkan
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
