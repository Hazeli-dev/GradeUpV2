import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { SectionHeading } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import { ExamCard } from "@/components/shared/exam-card";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { useAsync } from "@/hooks/use-async";
import { useGuestGate } from "@/hooks/use-guest-gate";
import { listExams } from "@/services/catalog.service";
import { DIFFICULTIES, LEVELS } from "@/constants";

/* ------------------------------------------------------------------ */
/* Dekorasi visual (murni tampilan, tidak interaktif)                  */
/* ------------------------------------------------------------------ */

const patternLine =
  "[--gu-line:rgba(13,148,136,0.16)] dark:[--gu-line:rgba(45,212,191,0.12)]";
const patternDot =
  "[--gu-dot:rgba(13,148,136,0.4)] dark:[--gu-dot:rgba(94,234,212,0.26)]";

function CatalogStyles() {
  return (
    <style>{`
      @keyframes gu-drift {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(22px, -16px, 0) scale(1.07); }
      }
      @keyframes gu-drift-rev {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(-20px, 14px, 0) scale(1.06); }
      }
      @keyframes gu-reveal {
        from { opacity: 0; transform: translate3d(0, 16px, 0); }
        to { opacity: 1; transform: translate3d(0, 0, 0); }
      }
      .gu-drift { animation: gu-drift 20s ease-in-out infinite; }
      .gu-drift-rev { animation: gu-drift-rev 24s ease-in-out infinite; }
      .gu-reveal { animation: gu-reveal 0.8s cubic-bezier(0.22, 1, 0.36, 1) both; }

      .gu-grid {
        background-image:
          linear-gradient(to right, var(--gu-line) 1px, transparent 1px),
          linear-gradient(to bottom, var(--gu-line) 1px, transparent 1px);
        background-size: 44px 44px;
        -webkit-mask-image: radial-gradient(ellipse 75% 65% at 50% 30%, #000 25%, transparent 100%);
        mask-image: radial-gradient(ellipse 75% 65% at 50% 30%, #000 25%, transparent 100%);
      }
      .gu-dots {
        background-image: radial-gradient(var(--gu-dot) 1.2px, transparent 1.5px);
        background-size: 24px 24px;
        -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 60%, #000 20%, transparent 100%);
        mask-image: radial-gradient(ellipse 70% 60% at 50% 60%, #000 20%, transparent 100%);
      }

      @media (prefers-reduced-motion: reduce) {
        .gu-drift, .gu-drift-rev, .gu-reveal {
          animation: none !important;
        }
      }
    `}</style>
  );
}

function DecorLayer({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {children}
    </div>
  );
}

export default function PublicExamsPage() {
  const { requireLogin } = useGuestGate();
  const { data, loading, error, reload } = useAsync(listExams);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");
  const [difficulty, setDifficulty] = useState("all");

  const filtered = useMemo(
    () =>
      (data ?? [])
        .filter((e) => e.status === "Published")
        .filter((e) => e.title.toLowerCase().includes(q.toLowerCase()))
        .filter((e) => level === "all" || e.level === level)
        .filter((e) => difficulty === "all" || e.difficulty === difficulty),
    [data, q, level, difficulty]
  );

  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#c3e8e0] via-[#e2f3f0] to-[#cfeae3] dark:from-[#0a2420] dark:via-[#0c2220] dark:to-[#0b1f19]">
      <CatalogStyles />

      <DecorLayer>
        <div className={`gu-grid absolute inset-0 ${patternLine}`} />
        <div className={`gu-dots absolute inset-x-0 bottom-0 h-2/3 ${patternDot}`} />
        <div className="gu-drift-rev absolute -left-32 -top-24 h-[28rem] w-[28rem] rounded-full bg-teal-400/55 blur-[100px] dark:bg-teal-500/25" />
        <div className="gu-drift absolute -right-32 top-1/3 h-[26rem] w-[26rem] rounded-full bg-emerald-400/50 blur-[100px] dark:bg-emerald-500/25" />
        <div className="absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-teal-300/55 blur-3xl dark:bg-teal-700/20" />
        <div className="absolute right-[6%] top-16 h-44 w-44 rotate-45 rounded-[2.5rem] border border-teal-400/45 dark:border-teal-400/10" />
        <div className="absolute left-[4%] top-56 h-28 w-28 rotate-12 rounded-3xl border border-emerald-400/45 bg-gradient-to-br from-white/70 to-teal-200/30 dark:border-emerald-400/20 dark:from-white/5" />
        <div className="absolute -right-20 bottom-24 h-64 w-64 rounded-full border border-emerald-400/45 dark:border-emerald-500/10" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/50 to-transparent dark:via-teal-500/30" />
      </DecorLayer>

      <div className="container py-14 sm:py-20">
        <div className="gu-reveal">
          <SectionHeading eyebrow="Paket Ujian" title="Katalog paket ujian" description="Lihat jenjang, durasi, dan jumlah soal. Masuk untuk mengerjakan." />
        </div>
        <div className="mt-10 flex flex-col gap-3 rounded-2xl border border-teal-200/70 bg-card/70 p-3 shadow-[0_16px_44px_-26px_rgba(15,118,110,0.4)] backdrop-blur-md dark:border-teal-900/40 sm:flex-row">
          <SearchInput value={q} onChange={setQ} placeholder="Cari paket ujian..." className="flex-1" />
          <FilterSelect value={level} onChange={setLevel} options={[...LEVELS]} allLabel="Semua jenjang" />
          <FilterSelect value={difficulty} onChange={setDifficulty} options={[...DIFFICULTIES]} allLabel="Semua tingkat" />
        </div>
        <div className="mt-8">
          {loading ? (
            <CardGridSkeleton count={3} />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : filtered.length === 0 ? (
            <EmptyState title="Paket ujian tidak ditemukan" />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((e) => (
                <ExamCard key={e.id} exam={e} actionLabel="Mulai" onAction={() => requireLogin(`mengerjakan paket "${e.title}"`)} />
              ))}
            </div>
          )}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">Jumlah soal pada paket demo sengaja dibuat singkat untuk keperluan pengujian antarmuka.</p>
      </div>
    </section>
  );
}
