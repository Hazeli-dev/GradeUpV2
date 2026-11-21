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
  Compass,
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
  {
    id: "gradeup-adventure",
    title: "GradeUp Adventure",
    description:
      "Jelajahi dunia petualangan edukatif, jawab tantangan dari bank soal GradeUp, dan taklukkan lima checkpoint untuk mencapai puncak kemenangan.",
    category: "Petualangan Edukatif",
    difficulty: "25 Soal • 5 Checkpoint",
    icon: Compass,
    path: "/dashboard/games/gradeup-adventure",
    color: "from-indigo-500 via-violet-600 to-purple-700",
    iconBg: "bg-violet-50 dark:bg-violet-900/30",
    iconColor: "text-violet-600 dark:text-violet-400",
    number: "03",
    highlight: "Jelajahi Dunia Ilmu",
  },
];

/* ------------------------------------------------------------------ */
/* Dekorasi visual (murni tampilan, tidak interaktif)                  */
/* ------------------------------------------------------------------ */

const glassCard =
  "border border-emerald-900/10 bg-white/80 backdrop-blur-sm dark:border-emerald-400/10 dark:bg-slate-900/70";

const patternLine =
  "[--gg-line:rgba(15,118,110,0.10)] dark:[--gg-line:rgba(52,211,153,0.08)]";

function GamesStyles() {
  return (
    <style>{`
      @keyframes gg-drift {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(18px, -14px, 0) scale(1.06); }
      }
      @keyframes gg-drift-rev {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(-16px, 12px, 0) scale(1.05); }
      }
      @keyframes gg-float {
        0%, 100% { transform: translate3d(0, 0, 0); }
        50% { transform: translate3d(0, -8px, 0); }
      }
      @keyframes gg-reveal {
        from { opacity: 0; transform: translate3d(0, 12px, 0); }
        to { opacity: 1; transform: translate3d(0, 0, 0); }
      }
      .gg-drift { animation: gg-drift 22s ease-in-out infinite; }
      .gg-drift-rev { animation: gg-drift-rev 26s ease-in-out infinite; }
      .gg-float { animation: gg-float 6s ease-in-out infinite; }
      .gg-float-slow { animation: gg-float 9s ease-in-out infinite; animation-delay: -3s; }
      .gg-reveal { animation: gg-reveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }

      .gg-grid {
        background-image:
          linear-gradient(to right, var(--gg-line) 1px, transparent 1px),
          linear-gradient(to bottom, var(--gg-line) 1px, transparent 1px);
        background-size: 44px 44px;
        -webkit-mask-image: radial-gradient(ellipse 60% 80% at 50% 0%, #000 5%, transparent 100%);
        mask-image: radial-gradient(ellipse 60% 80% at 50% 0%, #000 5%, transparent 100%);
      }

      @media (prefers-reduced-motion: reduce) {
        .gg-drift, .gg-drift-rev, .gg-float, .gg-float-slow, .gg-reveal {
          animation: none !important;
        }
      }
    `}</style>
  );
}

function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10"
    >
      <div className={`gg-grid absolute inset-x-0 top-0 h-[36rem] ${patternLine}`} />
      <div className="gg-drift absolute right-0 top-0 h-[26rem] w-[26rem] rounded-full bg-emerald-300/30 blur-[110px] dark:bg-emerald-500/10" />
      <div className="gg-drift-rev absolute left-0 top-1/3 h-[24rem] w-[24rem] rounded-full bg-teal-300/25 blur-[110px] dark:bg-teal-600/10" />
      <div className="absolute bottom-0 right-1/4 h-[22rem] w-[22rem] rounded-full bg-emerald-300/20 blur-[110px] dark:bg-emerald-700/10" />
    </div>
  );
}

export default function StudentGamesPage() {
  return (
    <div className="relative isolate min-h-full space-y-8 pb-8">
      <GamesStyles />
      <AmbientBackground />

      {/* HERO */}
      <section className="gg-reveal relative isolate overflow-hidden rounded-3xl border border-emerald-300/20 bg-gradient-to-br from-[#0b2418] via-[#0f3d29] to-[#14533a] p-6 shadow-[0_30px_80px_-40px_rgba(6,78,59,0.7)] ring-1 ring-inset ring-white/10 md:p-9">
        {/* Decorative Background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(52,211,153,0.22),transparent_55%),radial-gradient(circle_at_0%_100%,rgba(20,184,166,0.16),transparent_50%)]" />
          <div className="gg-drift absolute -right-20 -top-32 h-80 w-80 rounded-full bg-emerald-400/25 blur-3xl" />
          <div className="gg-drift-rev absolute -bottom-40 right-1/3 h-80 w-80 rounded-full bg-teal-400/15 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_80%_70%_at_60%_40%,#000_30%,transparent_100%)]" />
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border border-emerald-300/20" />
          <div className="absolute -left-10 bottom-8 h-32 w-32 rotate-12 rounded-[2rem] border border-emerald-300/15 bg-gradient-to-br from-white/10 to-transparent" />
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/50 to-transparent" />
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

            <p className="mt-4 max-w-xl text-sm leading-7 text-emerald-50/80 md:text-base">
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
            <div className="relative flex h-52 w-52 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] shadow-[0_0_80px_-20px_rgba(52,211,153,0.45)]">
              <div className="absolute inset-5 rounded-full border border-dashed border-emerald-300/30" />
              <div className="gg-float flex h-32 w-32 items-center justify-center rounded-[2rem] border border-white/20 bg-gradient-to-br from-emerald-400/30 to-teal-500/20 text-emerald-200 shadow-2xl shadow-emerald-950/40 backdrop-blur-xl">
                <Gamepad2 size={68} strokeWidth={1.2} />
              </div>
              <div className="gg-float-slow absolute right-1 top-7 rounded-xl border border-white/10 bg-white/10 p-2.5 text-yellow-300 backdrop-blur-md">
                <Star size={19} />
              </div>
              <div className="gg-float absolute bottom-5 left-0 rounded-xl border border-white/10 bg-white/10 p-2.5 text-emerald-300 backdrop-blur-md">
                <Brain size={20} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GAME STATISTICS */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div
          className={`group relative overflow-hidden rounded-2xl p-4 shadow-[0_10px_30px_-22px_rgba(15,118,110,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/70 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:hover:border-emerald-700/60 ${glassCard}`}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-400/0 blur-2xl transition-colors duration-500 group-hover:bg-emerald-400/25"
          />
          <div className="relative flex items-center gap-3">
            <div className="rounded-xl bg-teal-50 p-2.5 text-teal-600 ring-1 ring-inset ring-teal-500/10 dark:bg-teal-900/30 dark:text-teal-400">
              <Gamepad2 size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {games.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Game tersedia
              </p>
            </div>
          </div>
        </div>

        <div
          className={`group relative overflow-hidden rounded-2xl p-4 shadow-[0_10px_30px_-22px_rgba(15,118,110,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/70 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:hover:border-emerald-700/60 ${glassCard}`}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-400/0 blur-2xl transition-colors duration-500 group-hover:bg-emerald-400/25"
          />
          <div className="relative flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 ring-1 ring-inset ring-emerald-500/10 dark:bg-emerald-900/30 dark:text-emerald-400">
              <GraduationCap size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                100%
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gratis dimainkan
              </p>
            </div>
          </div>
        </div>

        <div
          className={`group relative col-span-2 overflow-hidden rounded-2xl p-4 shadow-[0_10px_30px_-22px_rgba(15,118,110,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/70 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:hover:border-emerald-700/60 md:col-span-1 ${glassCard}`}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-400/0 blur-2xl transition-colors duration-500 group-hover:bg-amber-400/20"
          />
          <div className="relative flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 ring-1 ring-inset ring-amber-500/10 dark:bg-amber-900/30 dark:text-amber-400">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                HOTS
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
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
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              GAME LIBRARY
            </div>

            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white md:text-2xl">
              Jelajahi Permainan
            </h2>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Pilih tantangan yang ingin kamu selesaikan hari ini.
            </p>
          </div>

          <span className="rounded-full border border-teal-200/80 bg-teal-50/90 px-3.5 py-2 text-xs font-semibold text-teal-800 dark:border-teal-800/60 dark:bg-teal-950/50 dark:text-teal-200">
            {games.length} Permainan
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => {
            const Icon = game.icon;

            return (
              <article
                key={game.id}
                className={`group relative flex flex-col overflow-hidden rounded-2xl shadow-[0_14px_40px_-26px_rgba(15,118,110,0.4)] ring-1 ring-emerald-900/[0.04] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/80 hover:shadow-[0_28px_60px_-28px_rgba(15,118,110,0.5)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:ring-white/5 dark:hover:border-emerald-700/70 ${glassCard}`}
              >
                {/* Card Header */}
                <div
                  className={`relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br ${game.color}`}
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.22),transparent_55%)]"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-[0.10] [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full border border-white/15"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-20 -left-8 h-48 w-48 rounded-full border border-white/15"
                  />

                  <span className="absolute left-4 top-4 text-xs font-bold tracking-widest text-white/70">
                    GAME {game.number}
                  </span>

                  <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                    <Sparkles size={12} />
                    Gratis
                  </span>

                  <div className="relative flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-white/30 bg-white/15 text-white shadow-xl backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-hover:rotate-0">
                    <Icon size={46} strokeWidth={1.5} />
                  </div>

                  <div className="absolute bottom-4 left-4 rounded-full bg-black/20 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                    {game.highlight}
                  </div>
                </div>

                {/* Card Content */}
                <div className="relative flex flex-1 flex-col p-5">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/0 to-transparent transition-colors duration-500 group-hover:via-emerald-400/70"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-16 -right-16 h-44 w-44 rounded-full bg-emerald-400/0 blur-3xl transition-colors duration-500 group-hover:bg-emerald-400/15 dark:group-hover:bg-emerald-500/10"
                  />

                  <div className="relative flex-1">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                        {game.category}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-teal-700 dark:text-white dark:group-hover:text-emerald-300">
                      {game.title}
                    </h3>

                    <p className="mt-2 min-h-[4.5rem] text-sm leading-6 text-slate-600 dark:text-slate-400">
                      {game.description}
                    </p>
                  </div>

                  <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-slate-200/70 pt-4 dark:border-slate-800">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Tingkat kesulitan
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {game.difficulty}
                      </p>
                    </div>

                    <Link
                      to={game.path}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-700/20 transition-all hover:bg-teal-800 hover:shadow-lg active:scale-95 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                    >
                      <Play size={14} fill="currentColor" />
                      Mainkan
                      <ArrowRight
                        size={15}
                        className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
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
      <section className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-dashed border-teal-300/70 bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-emerald-50/50 p-5 dark:border-teal-800/50 dark:from-teal-950/40 dark:via-slate-900/60 dark:to-emerald-950/30 sm:flex-row sm:items-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-emerald-300/40 blur-3xl dark:bg-emerald-600/15"
        />
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-teal-600 shadow-sm ring-1 ring-inset ring-emerald-500/10 dark:bg-slate-900 dark:text-emerald-400">
          <Sparkles size={21} />
        </div>

        <div className="relative">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Belajar, Bermain, dan Berkembang
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            GradeUp Games dirancang untuk mendukung pengalaman belajar yang
            lebih interaktif. Nikmati semua permainan tanpa biaya tambahan.
          </p>
        </div>
      </section>
    </div>
  );
}
