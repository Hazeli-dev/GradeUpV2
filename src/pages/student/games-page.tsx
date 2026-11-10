
import { Link } from "react-router-dom";
import {
  Gamepad2,
  Sparkles,
  Search,
  ArrowRight,
  Microscope,
  Brain,
  GraduationCap,
  Zap,
  Play,
  Star,
} from "lucide-react";

const games = [
  {
    id: "cari-kata",
    title: "Cari Kata HOTS",
    description:
      "Temukan kata-kata tersembunyi sambil mengasah konsentrasi, ketelitian, dan kemampuan berpikir kritis.",
    category: "Asah Otak",
    difficulty: "Mudah - Sulit",
    icon: Search,
    path: "/dashboard/games/cari-kata",
    color: "from-teal-500 to-emerald-600",
    iconBg: "bg-teal-50 dark:bg-teal-900/30",
    iconColor: "text-teal-600 dark:text-teal-400",
    number: "01",
    highlight: "Tantangan Logika",
  },
  {
    id: "detektif-sains",
    title: "Detektif Sains IPA",
    description:
      "Jelajahi dunia sains dengan menebak 400 kosakata ilmiah yang terbagi dalam 20 modul pembelajaran.",
    category: "Sains & Pengetahuan",
    difficulty: "Menengah",
    icon: Microscope,
    path: "/dashboard/games/detektif-sains",
    color: "from-emerald-500 to-green-600",
    iconBg: "bg-emerald-50 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    number: "02",
    highlight: "Eksplorasi Sains",
  },
];

export default function StudentGamesPage() {
  return (
    <div className="min-h-full space-y-8 pb-8">
      {/* HERO */}
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-teal-950 to-emerald-900 p-6 shadow-xl shadow-teal-950/10 md:p-9">
        {/* Decorative Background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute -bottom-40 right-1/3 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:22px_22px]" />
        </div>

        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-emerald-100 backdrop-blur-md">
              <Sparkles size={15} className="text-yellow-300" />
              PUSAT PERMAINAN EDUKATIF
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
              GradeUp <span className="text-emerald-300">Games</span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 md:text-base">
              Belajar dengan cara yang lebih menyenangkan. Jelajahi
              permainan edukatif, asah kemampuan berpikir, dan temukan
              pengalaman belajar baru melalui tantangan interaktif.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-md">
                <Zap size={16} className="text-yellow-300" />
                100% Gratis
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-md">
                <GraduationCap size={17} className="text-emerald-300" />
                Belajar Sambil Bermain
              </div>
            </div>
          </div>

          <div className="hidden lg:flex lg:items-center lg:justify-center">
            <div className="relative flex h-52 w-52 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
              <div className="absolute inset-5 rounded-full border border-dashed border-emerald-300/30" />
              <div className="flex h-32 w-32 items-center justify-center rounded-[2rem] border border-white/20 bg-gradient-to-br from-emerald-400/30 to-teal-500/20 text-emerald-200 shadow-2xl shadow-emerald-950/40 backdrop-blur-xl">
                <Gamepad2 size={68} strokeWidth={1.2} />
              </div>
              <div className="absolute right-1 top-7 rounded-xl border border-white/10 bg-white/10 p-2.5 text-yellow-300 backdrop-blur-md">
                <Star size={19} />
              </div>
              <div className="absolute bottom-5 left-0 rounded-xl border border-white/10 bg-white/10 p-2.5 text-emerald-300 backdrop-blur-md">
                <Brain size={20} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GAME STATISTICS */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-50 p-2.5 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
              <Gamepad2 size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {games.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Game tersedia
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <GraduationCap size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                100%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gratis dimainkan
              </p>
            </div>
          </div>
        </div>

        <div className="col-span-2 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                HOTS
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Pengembangan kemampuan
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* GAME CATALOG */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              GAME LIBRARY
            </div>

            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white md:text-2xl">
              Jelajahi Permainan
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Pilih tantangan yang ingin kamu selesaikan hari ini.
            </p>
          </div>

          <span className="rounded-full border border-teal-100 bg-teal-50 px-3.5 py-2 text-xs font-semibold text-teal-700 dark:border-teal-900/50 dark:bg-teal-900/20 dark:text-teal-300">
            {games.length} Permainan
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => {
            const Icon = game.icon;

            return (
              <article
                key={game.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-900/5 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-teal-800"
              >
                {/* Card Header */}
                <div
                  className={`relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br ${game.color}`}
                >
                  <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full border border-white/10" />
                  <div className="absolute -bottom-20 -left-8 h-48 w-48 rounded-full border border-white/10" />

                  <span className="absolute left-4 top-4 text-xs font-bold tracking-widest text-white/60">
                    GAME {game.number}
                  </span>

                  <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                    <Sparkles size={12} />
                    Gratis
                  </span>

                  <div className="relative flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-white/30 bg-white/15 text-white shadow-xl backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <Icon size={46} strokeWidth={1.5} />
                  </div>

                  <div className="absolute bottom-4 left-4 rounded-full bg-black/15 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                    {game.highlight}
                  </div>
                </div>

                {/* Card Content */}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                        {game.category}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 transition-colors group-hover:text-teal-700 dark:text-white dark:group-hover:text-teal-400">
                      {game.title}
                    </h3>

                    <p className="mt-2 min-h-[4.5rem] text-sm leading-6 text-gray-500 dark:text-gray-400">
                      {game.description}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Tingkat kesulitan
                      </p>
                      <p className="mt-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {game.difficulty}
                      </p>
                    </div>

                    <Link
                      to={game.path}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 transition-all hover:bg-teal-700 hover:shadow-md active:scale-95"
                    >
                      <Play size={14} fill="currentColor" />
                      Mainkan
                      <ArrowRight
                        size={15}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* FOOTER NOTE */}
      <section className="flex flex-col gap-3 rounded-2xl border border-dashed border-teal-200 bg-teal-50/70 p-5 dark:border-teal-900/50 dark:bg-teal-950/20 sm:flex-row sm:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-teal-600 shadow-sm dark:bg-gray-900 dark:text-teal-400">
          <Sparkles size={21} />
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Belajar, Bermain, dan Berkembang
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
            GradeUp Games dirancang untuk mendukung pengalaman belajar yang
            lebih interaktif. Nikmati semua permainan tanpa biaya tambahan.
          </p>
        </div>
      </section>
    </div>
  );
}
