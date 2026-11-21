import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  CreditCard,
  MessageCircle,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { faqs } from "@/data/marketing";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/states";

const groups = [
  {
    name: "Umum",
    description: "Informasi dasar mengenai GradeUp dan layanan pembelajaran.",
    icon: CircleHelp,
  },
  {
    name: "Akun",
    description: "Panduan pendaftaran, login, profil, dan pengelolaan akun.",
    icon: UserRound,
  },
  {
    name: "Ujian",
    description: "Informasi latihan soal, simulasi ujian, dan hasil belajar.",
    icon: ClipboardList,
  },
  {
    name: "Pembayaran",
    description: "Informasi GradeUp Premium, paket berlangganan, dan transaksi.",
    icon: CreditCard,
  },
];

const helpHighlights = [
  {
    icon: BookOpen,
    title: "Panduan penggunaan",
    description: "Temukan informasi untuk memulai pengalaman belajar di GradeUp.",
  },
  {
    icon: ShieldCheck,
    title: "Informasi akun",
    description: "Pelajari cara mengelola akun dan menjaga keamanan akses.",
  },
  {
    icon: CheckCircle2,
    title: "Solusi kendala",
    description: "Cari jawaban atas pertanyaan umum seputar fitur dan layanan.",
  },
];

const mutedText = "text-slate-600 dark:text-slate-300";

const headingText = "text-slate-950 dark:text-white";

const cardSurface =
  "border border-slate-200/80 bg-white/90 backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/85";

const smooth = "transition-colors duration-300 ease-in-out";

/* ------------------------------------------------------------------ */
/* Dekorasi visual (murni tampilan, tidak interaktif)                  */
/* ------------------------------------------------------------------ */

const patternLine =
  "[--gu-line:rgba(15,118,110,0.16)] dark:[--gu-line:rgba(52,211,153,0.13)]";
const patternLineInverse = "[--gu-line:rgba(167,243,208,0.13)]";
const patternDot =
  "[--gu-dot:rgba(5,150,105,0.42)] dark:[--gu-dot:rgba(110,231,183,0.28)]";

function FaqStyles() {
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
        -webkit-mask-image: radial-gradient(ellipse 75% 65% at 50% 45%, #000 25%, transparent 100%);
        mask-image: radial-gradient(ellipse 75% 65% at 50% 45%, #000 25%, transparent 100%);
      }
      .gu-dots {
        background-image: radial-gradient(var(--gu-dot) 1.2px, transparent 1.5px);
        background-size: 24px 24px;
        -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 20%, transparent 100%);
        mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 20%, transparent 100%);
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

function GridPattern({
  dots = false,
  inverse = false,
  className = "",
}: {
  dots?: boolean;
  inverse?: boolean;
  className?: string;
}) {
  const tone = dots ? patternDot : inverse ? patternLineInverse : patternLine;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${
        dots ? "gu-dots" : "gu-grid"
      } ${tone} ${className}`}
    />
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-800 transition-colors duration-300 dark:border-teal-800/70 dark:bg-teal-950/60 dark:text-teal-200 sm:text-[11px]">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {children}
    </span>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <SectionLabel>{eyebrow}</SectionLabel>

      <h1
        className={`mt-5 text-[1.85rem] font-extrabold leading-[1.2] tracking-[-0.035em] sm:text-3xl lg:text-[2.65rem] ${headingText}`}
      >
        {title}
      </h1>

      <p
        className={`mt-4 text-sm leading-7 sm:text-base sm:leading-8 ${mutedText}`}
      >
        {description}
      </p>
    </div>
  );
}

export default function FaqPage() {
  const [q, setQ] = useState("");

  const normalizedQuery = q.trim().toLowerCase();

  const matches = (text: string) =>
    text.toLowerCase().includes(normalizedQuery);

  const totalQuestions = faqs.length;

  const filteredGroups = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        items: faqs.filter(
          (faq) =>
            faq.category === group.name &&
            (!normalizedQuery ||
              matches(faq.question) ||
              matches(faq.answer))
        ),
        total: faqs.filter((faq) => faq.category === group.name).length,
      })),
    [normalizedQuery]
  );

  const totalMatches = filteredGroups.reduce(
    (total, group) => total + group.items.length,
    0
  );

  const activeCategory = filteredGroups.find(
    (group) => group.items.length > 0
  );

  return (
    <>
      <FaqStyles />

      {/* HERO PUSAT BANTUAN */}
      <section
        className={`relative isolate overflow-hidden border-b border-emerald-100/70 bg-gradient-to-br from-[#c9ecd8] via-[#e6f5ec] to-[#d3eddf] dark:border-emerald-900/30 dark:from-[#0b2418] dark:via-[#0e2b1c] dark:to-[#0c2418] ${smooth}`}
      >
        <DecorLayer>
          <div className="gu-drift absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-emerald-400/55 blur-[100px] dark:bg-emerald-500/25" />
          <div className="gu-drift-rev absolute -right-32 top-10 h-[430px] w-[430px] rounded-full bg-teal-400/50 blur-[110px] dark:bg-teal-500/25" />
          <div className="absolute -bottom-32 left-1/3 h-[320px] w-[320px] rounded-full bg-emerald-400/45 blur-[90px] dark:bg-emerald-600/20" />
          <GridPattern />
          <div className="absolute right-[6%] top-16 h-72 w-72 rounded-full border border-emerald-400/45 dark:border-emerald-400/10" />
          <div className="absolute right-[10%] top-24 h-48 w-48 rounded-full border border-teal-400/45 dark:border-teal-400/10" />
          <div className="absolute -left-10 bottom-24 h-40 w-40 rotate-12 rounded-[2rem] border border-teal-400/45 bg-gradient-to-br from-white/70 to-emerald-200/30 dark:border-teal-400/20 dark:from-white/8" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent dark:via-emerald-700/50" />
        </DecorLayer>

        <div className="container relative py-16 sm:py-20 lg:py-24">
          <div className="gu-reveal mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-700 to-emerald-500 text-white shadow-lg shadow-teal-700/25 ring-1 ring-inset ring-white/30 dark:from-emerald-500 dark:to-teal-400 dark:text-slate-950">
              <CircleHelp className="h-7 w-7" />
            </div>

            <SectionTitle
              eyebrow="Pusat Bantuan GradeUp"
              title="Ada yang ingin kamu ketahui?"
              description="Temukan jawaban atas berbagai pertanyaan seputar akun, fitur pembelajaran, ujian, dan layanan GradeUp dalam satu tempat."
            />

            <div className="mx-auto mt-8 max-w-2xl text-left">
              <div className="rounded-2xl shadow-[0_20px_50px_-30px_rgba(15,118,110,0.45)]">
                <SearchInput
                  value={q}
                  onChange={setQ}
                  placeholder="Cari pertanyaan atau topik..."
                  className="w-full"
                />
              </div>
              <div
                className={`mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs ${mutedText}`}
              >
                <span className="flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-teal-600 dark:text-emerald-400" />
                  Pencarian berdasarkan pertanyaan dan jawaban
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-teal-600 dark:text-emerald-400" />
                  {totalQuestions} pertanyaan tersedia
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KATEGORI FAQ */}
      <section
        className={`relative isolate overflow-hidden bg-gradient-to-b from-[#d3eddf] via-[#c3e8d3] to-[#d8f0e2] dark:from-[#0c2418] dark:via-[#0e2a1b] dark:to-[#0b2016] ${smooth}`}
      >
        <DecorLayer>
          <GridPattern dots />
          <div className="gu-drift absolute left-1/2 -top-32 h-[30rem] w-[44rem] -translate-x-1/2 rounded-full bg-emerald-400/50 blur-[110px] dark:bg-emerald-500/20" />
          <div className="gu-drift-rev absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-teal-300/60 blur-3xl dark:bg-teal-600/20" />
          <div className="absolute -left-32 bottom-20 h-80 w-80 rounded-full bg-emerald-300/55 blur-3xl dark:bg-emerald-700/20" />
          <div className="absolute -right-16 top-24 h-64 w-64 rounded-full border border-emerald-400/45 dark:border-emerald-500/10" />
          <div className="absolute bottom-24 left-[5%] h-24 w-24 rotate-12 rounded-3xl border border-teal-300/45 bg-gradient-to-br from-white/40 to-transparent dark:border-teal-500/10 dark:from-white/5" />
        </DecorLayer>

        <div className="container max-w-5xl py-14 sm:py-20">
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            {helpHighlights.map((item) => (
              <div
                key={item.title}
                className={`group relative overflow-hidden rounded-3xl p-5 shadow-[0_10px_30px_-20px_rgba(15,118,110,0.25)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/80 hover:bg-white hover:shadow-[0_24px_60px_-28px_rgba(15,118,110,0.35)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:hover:border-emerald-700/70 dark:hover:bg-slate-900 ${cardSurface}`}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-emerald-400/0 blur-3xl transition-colors duration-500 group-hover:bg-emerald-400/20 dark:group-hover:bg-emerald-500/15"
                />
                <div className="relative mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-teal-700 transition-all duration-300 group-hover:bg-teal-700 group-hover:text-white dark:bg-emerald-950 dark:text-emerald-300 dark:group-hover:bg-emerald-500 dark:group-hover:text-slate-950">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className={`relative font-bold ${headingText}`}>
                  {item.title}
                </h3>
                <p
                  className={`relative mt-2 text-sm leading-relaxed ${mutedText}`}
                >
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionLabel>Jelajahi FAQ</SectionLabel>
              <h2
                className={`mt-4 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl ${headingText}`}
              >
                Pertanyaan berdasarkan kategori
              </h2>
              <p className={`mt-2 text-sm ${mutedText}`}>
                Pilih kategori untuk menemukan informasi yang kamu butuhkan.
              </p>
            </div>

            {normalizedQuery && (
              <div className="rounded-full border border-teal-200/80 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 dark:border-teal-800/70 dark:bg-teal-950/60 dark:text-teal-200">
                {totalMatches} hasil ditemukan
              </div>
            )}
          </div>

          <Tabs defaultValue="Umum" className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border border-slate-200/80 bg-white/70 p-1.5 shadow-[0_10px_30px_-20px_rgba(15,118,110,0.3)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/70 sm:grid-cols-4">
              {filteredGroups.map((group) => (
                <TabsTrigger
                  key={group.name}
                  value={group.name}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-xs text-slate-600 transition-all duration-300 data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-md dark:text-slate-300 dark:data-[state=active]:bg-emerald-500 dark:data-[state=active]:text-slate-950 sm:text-sm"
                >
                  <group.icon className="h-4 w-4 shrink-0" />
                  <span>{group.name}</span>
                  <span className="rounded-full bg-emerald-100/80 px-1.5 py-0.5 text-[10px] font-bold text-teal-800 dark:bg-slate-800 dark:text-emerald-200">
                    {group.items.length}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {filteredGroups.map((group) => (
              <TabsContent
                key={group.name}
                value={group.name}
                className="mt-7 focus-visible:outline-none"
              >
                <div
                  className={`mb-5 flex items-start gap-3 rounded-3xl p-4 shadow-[0_10px_30px_-20px_rgba(15,118,110,0.25)] sm:p-5 ${cardSurface}`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-teal-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <group.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`font-bold ${headingText}`}>
                        {group.name}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {group.items.length} dari {group.total} pertanyaan
                      </span>
                    </div>
                    <p
                      className={`mt-1 text-sm leading-relaxed ${mutedText}`}
                    >
                      {group.description}
                    </p>
                  </div>
                </div>

                {group.items.length > 0 ? (
                  <div
                    className={`rounded-3xl p-4 shadow-[0_20px_60px_-35px_rgba(15,118,110,0.4)] ring-1 ring-emerald-900/[0.04] dark:ring-white/5 sm:p-6 ${cardSurface}`}
                  >
                    <FaqAccordion items={group.items} />
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-teal-300/70 bg-white/60 p-6 text-center backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/60 sm:p-10">
                    <EmptyState
                      title={
                        normalizedQuery
                          ? "Tidak ada pertanyaan yang cocok"
                          : "Belum ada pertanyaan di kategori ini"
                      }
                    />
                    <p className={`mt-2 text-sm ${mutedText}`}>
                      {normalizedQuery
                        ? "Coba gunakan kata kunci lain atau pilih kategori yang berbeda."
                        : "Informasi untuk kategori ini akan ditambahkan secara bertahap."}
                    </p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          {normalizedQuery && totalMatches === 0 && (
            <div className="mt-8 rounded-3xl border border-dashed border-teal-300/70 bg-white/60 p-6 text-center backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/60">
              <Search className="mx-auto mb-3 h-8 w-8 text-teal-600 dark:text-emerald-400" />
              <h3 className={`font-bold ${headingText}`}>
                Belum menemukan jawaban?
              </h3>
              <p className={`mx-auto mt-2 max-w-md text-sm ${mutedText}`}>
                Pertanyaan yang kamu cari belum tersedia. Kamu bisa menghubungi
                tim GradeUp untuk mendapatkan bantuan lebih lanjut.
              </p>
              <Button
                variant="outline"
                className="mt-4 rounded-xl border-slate-300 font-semibold text-slate-700 transition-colors duration-300 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-teal-700 dark:hover:bg-slate-800"
                onClick={() => setQ("")}
              >
                Hapus pencarian
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA BANTUAN */}
      <section
        className={`relative isolate overflow-hidden bg-gradient-to-b from-[#d8f0e2] to-[#b9e4cc] pb-16 pt-4 dark:from-[#0b2016] dark:to-[#0a1d14] sm:pb-24 ${smooth}`}
      >
        <DecorLayer>
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-emerald-400/45 to-transparent dark:from-emerald-800/30" />
          <div className="absolute bottom-0 left-1/2 h-72 w-2/3 -translate-x-1/2 rounded-full bg-emerald-400/55 blur-[100px] dark:bg-emerald-500/20" />
        </DecorLayer>

        <div className="container max-w-5xl">
          <div className="relative isolate overflow-hidden rounded-[2rem] border border-emerald-300/45 bg-gradient-to-br from-[#0f3324] via-[#174b34] to-[#1e6842] p-7 text-white shadow-[0_40px_100px_-40px_rgba(6,78,59,0.65)] ring-1 ring-inset ring-white/10 sm:p-10 lg:p-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(52,211,153,0.24),transparent_50%),radial-gradient(circle_at_95%_100%,rgba(20,184,166,0.22),transparent_45%)]"
            />
            <GridPattern inverse className="-z-10" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-10 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent"
            />
            <div
              aria-hidden="true"
              className="gu-drift pointer-events-none absolute left-1/2 top-0 -z-10 h-40 w-2/3 -translate-x-1/2 rounded-full bg-emerald-300/15 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full border border-emerald-300/45"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-36 -left-24 -z-10 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 -left-10 -z-10 h-64 w-64 rounded-full border border-emerald-300/45"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-10 right-[8%] -z-10 hidden h-20 w-20 rotate-12 rounded-3xl border border-white/10 bg-white/5 sm:block"
            />

            <div className="relative grid gap-7 md:grid-cols-[1fr_auto] md:items-center">
              <div className="max-w-xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-300" />
                  Butuh bantuan lebih lanjut?
                </div>

                <h2 className="text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">
                  Kami siap membantu
                  <span className="text-emerald-300">
                    {" "}
                    perjalanan belajarmu.
                  </span>
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                  Jika belum menemukan jawaban yang sesuai, silakan hubungi tim
                  GradeUp melalui halaman kontak resmi kami.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-xl bg-emerald-400 px-7 font-extrabold text-[#123b29] transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-300"
                >
                  <Link to="/contact">
                    Hubungi Kami
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-xl border-white/30 bg-white/5 px-7 font-bold text-white transition-all duration-300 hover:border-white/50 hover:bg-white/10 hover:text-white"
                >
                  <Link to="/features">Jelajahi Fitur</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
