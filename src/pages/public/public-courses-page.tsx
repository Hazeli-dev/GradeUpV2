import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { SectionHeading } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import { CourseCard } from "@/components/shared/course-card";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { useGuestGate } from "@/hooks/use-guest-gate";
import { listCategories, listCourses } from "@/services/catalog.service";
import { LEVELS } from "@/constants";

/* ------------------------------------------------------------------ */
/* Dekorasi visual (murni tampilan, tidak interaktif)                  */
/* ------------------------------------------------------------------ */

const patternLine =
  "[--gu-line:rgba(15,118,110,0.16)] dark:[--gu-line:rgba(52,211,153,0.13)]";
const patternDot =
  "[--gu-dot:rgba(5,150,105,0.42)] dark:[--gu-dot:rgba(110,231,183,0.28)]";

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

export default function PublicCoursesPage() {
  const { requireLogin } = useGuestGate();
  const { data, loading, error, reload } = useAsync(listCourses);
  const { data: categories } = useAsync(listCategories);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [level, setLevel] = useState("all");

  const filtered = useMemo(
    () =>
      (data ?? [])
        .filter((c) => c.status === "Published")
        .filter((c) => c.title.toLowerCase().includes(q.toLowerCase()) || c.description.toLowerCase().includes(q.toLowerCase()))
        .filter((c) => category === "all" || c.category === category)
        .filter((c) => level === "all" || c.level === level),
    [data, q, category, level]
  );

  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#c9ecd8] via-[#e6f5ec] to-[#d3eddf] dark:from-[#0b2418] dark:via-[#0d2a1b] dark:to-[#0c2418]">
      <CatalogStyles />

      <DecorLayer>
        <div className={`gu-grid absolute inset-0 ${patternLine}`} />
        <div className={`gu-dots absolute inset-x-0 bottom-0 h-2/3 ${patternDot}`} />
        <div className="gu-drift absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-emerald-400/55 blur-[100px] dark:bg-emerald-500/25" />
        <div className="gu-drift-rev absolute -left-32 top-1/3 h-[26rem] w-[26rem] rounded-full bg-teal-400/50 blur-[100px] dark:bg-teal-500/25" />
        <div className="absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-emerald-300/55 blur-3xl dark:bg-emerald-700/20" />
        <div className="absolute right-[7%] top-16 h-64 w-64 rounded-full border border-emerald-400/45 dark:border-emerald-400/10" />
        <div className="absolute right-[11%] top-24 h-40 w-40 rounded-full border border-teal-400/45 dark:border-teal-400/10" />
        <div className="absolute -left-10 top-48 h-36 w-36 rotate-12 rounded-[2rem] border border-teal-400/45 bg-gradient-to-br from-white/70 to-emerald-200/30 dark:border-teal-400/20 dark:from-white/5" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent dark:via-emerald-500/30" />
      </DecorLayer>

      <div className="container py-14 sm:py-20">
        <div className="gu-reveal">
          <SectionHeading eyebrow="Katalog Materi" title="Jelajahi materi belajar" description="Cari materi berdasarkan kategori dan jenjang. Masuk untuk mulai belajar." />
        </div>
        <div className="mt-10 flex flex-col gap-3 rounded-2xl border border-emerald-200/70 bg-card/70 p-3 shadow-[0_16px_44px_-26px_rgba(15,118,110,0.4)] backdrop-blur-md dark:border-emerald-900/40 sm:flex-row">
          <SearchInput value={q} onChange={setQ} placeholder="Cari materi..." className="flex-1" />
          <FilterSelect value={category} onChange={setCategory} options={(categories ?? []).map((c) => c.name)} allLabel="Semua kategori" />
          <FilterSelect value={level} onChange={setLevel} options={[...LEVELS]} allLabel="Semua jenjang" />
        </div>
        <div className="mt-8">
          {loading ? (
            <CardGridSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : filtered.length === 0 ? (
            <EmptyState title="Materi tidak ditemukan" action={<Button variant="outline" onClick={() => { setQ(""); setCategory("all"); setLevel("all"); }}>Reset filter</Button>} />
          ) : (
            <>
              <p className="mb-4 text-sm font-medium text-muted-foreground">{filtered.length} materi ditemukan</p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((c) => (
                  <CourseCard key={c.id} course={c} onClick={() => requireLogin(`mempelajari materi "${c.title}"`)} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
