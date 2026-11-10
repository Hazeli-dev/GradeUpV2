
import { Gamepad2, Sparkles } from "lucide-react";
import WordSearchGame from "@/components/games/word-search-game";

export default function StudentGamesPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
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
            soal. Asah kemampuan berpikir, konsentrasi, dan
            kreativitas melalui permainan edukatif.
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

      <WordSearchGame />
    </div>
  );
}
