
import { Link } from "react-router-dom";
import {
  Gamepad2,
  Sparkles,
  Search,
  ArrowRight,
  Microscope,
} from "lucide-react";

const games = [
  {
    id: "cari-kata",
    title: "Cari Kata HOTS",
    description:
      "Temukan kata-kata tersembunyi sambil mengasah konsentrasi, ketelitian, dan kemampuan berpikir.",
    category: "Asah Otak",
    difficulty: "Mudah - Sulit",
    icon: Search,
    path: "/dashboard/games/cari-kata",
    color: "from-teal-500 to-emerald-500",
  },
  {
    id: "detektif-sains",
    title: "Detektif Sains IPA",
    description:
      "Asah pengetahuan IPA dengan menebak 400 kosakata ilmiah dari 20 modul pembelajaran.",
    category: "Sains dan Pengetahuan",
    difficulty: "Menengah",
    icon: Microscope,
    path: "/dashboard/games/detektif-sains",
    color: "from-emerald-500 to-green-600",
  },
];

export default function StudentGamesPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-500 p-6 text-white md:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium">
            <Gamepad2 size={17} />
            Pusat Permainan Edukatif
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            GradeUp Games
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-teal-50 md:text-base">
            Belajar tidak harus selalu dengan membaca dan mengerjakan
            soal. Asah kemampuan berpikir, konsentrasi, dan kreativitas
            melalui berbagai permainan edukatif.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
            <Sparkles size={16} />
            Gratis untuk seluruh siswa
          </div>
        </div>

        <Gamepad2
          className="absolute -bottom-8 -right-5 h-48 w-48 text-white/10"
          strokeWidth={1}
        />
      </section>

      {/* Katalog */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Pilih Permainan
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Pilih game dan mulai tantanganmu!
            </p>
          </div>

          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
            {games.length} Game Tersedia
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => {
            const Icon = game.icon;

            return (
              <article
                key={game.id}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900"
              >
                <div
                  className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${game.color}`}
                >
                  <div className="rounded-2xl bg-white/20 p-5 text-white backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                    <Icon size={48} strokeWidth={1.7} />
                  </div>

                  <span className="absolute right-3 top-3 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                    Gratis
                  </span>
                </div>

                <div className="space-y-4 p-5">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">
                      {game.category}
                    </span>

                    <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                      {game.title}
                    </h3>

                    <p className="mt-2 min-h-12 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                      {game.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {game.difficulty}
                    </span>

                    <Link
                      to={game.path}
                      className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
                    >
                      Mainkan
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
