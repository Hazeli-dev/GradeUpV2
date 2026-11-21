import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  GraduationCap,
  Layers3,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/shared/page-header";
import { features } from "@/data/marketing";
import { cn } from "@/lib/utils";

const benefits = [
  {
    icon: Layers3,
    title: "Terintegrasi",
    description: "Berbagai kebutuhan belajar dalam satu platform.",
  },
  {
    icon: Target,
    title: "Terarah",
    description: "Mendukung proses belajar yang lebih terstruktur.",
  },
  {
    icon: Zap,
    title: "Interaktif",
    description: "Pengalaman belajar digital yang praktis.",
  },
];

const learningHighlights = [
  {
    icon: BookOpen,
    title: "Mulai dari materi",
    description:
      "Bangun pemahaman melalui materi pembelajaran yang tersedia.",
  },
  {
    icon: Target,
    title: "Lanjutkan dengan latihan",
    description:
      "Asah kemampuan melalui latihan soal dan simulasi.",
  },
  {
    icon: GraduationCap,
    title: "Evaluasi perkembangan",
    description:
      "Gunakan hasil pengerjaan sebagai bahan evaluasi belajar.",
  },
];

const experiencePoints = [
  "Akses pembelajaran dalam satu platform",
  "Latihan sesuai kebutuhan belajar",
  "Evaluasi untuk mengenali kemampuan",
  "Motivasi untuk terus berkembang",
];

/* ------------------------------------------------------------------ */
/* Dekorasi visual (murni tampilan, tidak interaktif)                  */
/* ------------------------------------------------------------------ */

const patternLine =
  "[--gu-line:rgba(15,118,110,0.16)] dark:[--gu-line:rgba(52,211,153,0.13)]";
const patternLineInverse = "[--gu-line:rgba(167,243,208,0.13)]";
const patternDot =
  "[--gu-dot:rgba(5,150,105,0.42)] dark:[--gu-dot:rgba(110,231,183,0.28)]";
const patternDotInverse = "[--gu-dot:rgba(167,243,208,0.3)]";

function FeaturesStyles() {
  return (
    <style>{`
      @keyframes gu-float {
        0%, 100% { transform: translate3d(0, 0, 0); }
        50% { transform: translate3d(0, -12px, 0); }
      }
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
      .gu-float { animation: gu-float 7s ease-in-out infinite; }
      .gu-float-slow { animation: gu-float 10s ease-in-out infinite; animation-delay: -3s; }
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
        .gu-float, .gu-float-slow, .gu-drift, .gu-drift-rev, .gu-reveal {
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
  const tone = dots
    ? inverse
      ? patternDotInverse
      : patternDot
    : inverse
      ? patternLineInverse
      : patternLine;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${
        dots ? "gu-dots" : "gu-grid"
      } ${tone} ${className}`}
    />
  );
}

export default function FeaturesPage() {
  return (
    <>
      <FeaturesStyles />

      {/* HERO */}
      <section className="relative isolate overflow-hidden border-b border-emerald-300/40 bg-gradient-to-br from-[#c9ecd8] via-[#e6f5ec] to-[#b9e4cc] dark:border-emerald-900/30 dark:from-[#0b2418] dark:via-[#0e2b1c] dark:to-[#0a2a20]">
        <DecorLayer>
          <GridPattern />
          <div className="gu-drift absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-emerald-400/55 blur-[100px] dark:bg-emerald-500/25" />
          <div className="gu-drift-rev absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-teal-400/50 blur-[100px] dark:bg-teal-500/25" />
          <div className="absolute left-1/2 top-1/3 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-emerald-300/40 blur-[110px] dark:bg-emerald-600/15" />
          <div className="absolute right-[7%] top-20 h-72 w-72 rounded-full border border-emerald-400/45 dark:border-emerald-400/10" />
          <div className="absolute right-[11%] top-28 h-48 w-48 rounded-full border border-teal-400/45 dark:border-teal-400/10" />
          <div className="absolute -left-10 bottom-24 h-40 w-40 rotate-12 rounded-[2rem] border border-teal-400/45 bg-gradient-to-br from-white/70 to-emerald-200/30 dark:border-teal-400/20 dark:from-white/5" />
          <div className="absolute bottom-16 right-[30%] h-14 w-14 -rotate-12 rounded-2xl bg-emerald-500/25 dark:bg-emerald-400/10" />
        </DecorLayer>

        <div className="container py-20 sm:py-28 lg:py-32">
          <div className="gu-reveal mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-background/90 px-4 py-2 text-xs font-bold tracking-wide text-primary shadow-sm backdrop-blur dark:border-emerald-800/60">
              <Sparkles className="h-4 w-4" />
              EKOSISTEM PEMBELAJARAN GRADEUP
            </div>

            <h1 className="text-4xl font-black leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
              Semua yang Dibutuhkan
              <span className="mt-2 block text-primary">
                untuk Belajar Lebih Baik.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              GradeUp menghadirkan berbagai fitur pembelajaran digital
              untuk membantu siswa memahami materi, berlatih,
              mempersiapkan ujian, dan mengevaluasi perkembangan belajar
              dalam satu platform.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2 rounded-xl px-7 shadow-lg shadow-emerald-700/20">
                <Link to="/register">
                  Mulai Belajar
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-xl bg-background/80 px-7 backdrop-blur"
              >
                <a href="#daftar-fitur">
                  Jelajahi Fitur
                  <ArrowDown className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="mx-auto mt-14 grid max-w-3xl gap-3 sm:grid-cols-3">
              {benefits.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-emerald-200/70 bg-background/80 p-5 text-left shadow-[0_12px_32px_-20px_rgba(15,118,110,0.4)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/60 hover:shadow-[0_24px_50px_-24px_rgba(15,118,110,0.5)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-emerald-900/40"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>

                  <h3 className="mt-4 text-sm font-bold">
                    {item.title}
                  </h3>

                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DAFTAR FITUR */}
      <section
        id="daftar-fitur"
        className="relative isolate scroll-mt-24 overflow-hidden bg-gradient-to-b from-[#b9e4cc] via-[#eaf6ef] to-[#d3eddf] dark:from-[#0a2a20] dark:via-[#0b1c13] dark:to-[#0c2418]"
      >
        <DecorLayer>
          <GridPattern dots />
          <div className="gu-drift absolute -right-40 top-20 h-[26rem] w-[26rem] rounded-full bg-teal-300/55 blur-3xl dark:bg-teal-600/20" />
          <div className="gu-drift-rev absolute -left-40 bottom-10 h-[24rem] w-[24rem] rounded-full bg-emerald-300/55 blur-3xl dark:bg-emerald-600/20" />
          <div className="absolute right-[8%] top-10 h-40 w-40 rotate-12 rounded-[2.5rem] border border-emerald-400/45 dark:border-emerald-500/10" />
          <div className="absolute bottom-16 left-[6%] h-24 w-24 -rotate-12 rounded-3xl border border-teal-400/45 bg-gradient-to-br from-white/70 to-emerald-200/30 dark:border-teal-500/20 dark:from-white/5" />
        </DecorLayer>

        <div className="container py-20 sm:py-24">
          <SectionHeading
            eyebrow="JELAJAHI GRADEUP"
            title="Fitur yang mendukung setiap langkah belajar"
            description="Kenali berbagai fasilitas GradeUp dan temukan bagaimana setiap fitur dapat membantu proses pembelajaran."
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <a
                key={feature.title}
                href={`#fitur-${index}`}
                className="group relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-card/90 p-5 shadow-[0_10px_30px_-20px_rgba(15,118,110,0.3)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_24px_60px_-28px_rgba(15,118,110,0.4)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-emerald-900/40 sm:p-6"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-16 -right-16 h-44 w-44 rounded-full bg-emerald-400/0 blur-3xl transition-colors duration-500 group-hover:bg-emerald-400/25 dark:group-hover:bg-emerald-500/15"
                />

                <div className="relative flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                    <feature.icon className="h-6 w-6" />
                  </div>

                  <span className="text-sm font-black tracking-widest text-primary/30">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="relative mt-5 font-bold transition-colors group-hover:text-primary">
                  {feature.title}
                </h3>

                <p className="relative mt-2 line-clamp-3 text-sm leading-7 text-muted-foreground">
                  {feature.detail}
                </p>

                <div className="relative mt-5 flex items-center gap-2 text-xs font-bold text-primary">
                  Pelajari fitur
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* DETAIL FITUR */}
      <section className="relative isolate overflow-hidden border-y border-emerald-300/40 bg-gradient-to-b from-[#d3eddf] via-[#c3e8d3] to-[#d8f0e2] py-20 dark:border-emerald-900/30 dark:from-[#0c2418] dark:via-[#0e2a1b] dark:to-[#0b2016] sm:py-24">
        <DecorLayer>
          <GridPattern />
          <div className="gu-drift absolute left-1/2 -top-32 h-[30rem] w-[44rem] -translate-x-1/2 rounded-full bg-emerald-400/50 blur-[110px] dark:bg-emerald-500/20" />
          <div className="gu-drift-rev absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-teal-300/60 blur-3xl dark:bg-teal-600/20" />
          <div className="absolute -left-32 bottom-20 h-80 w-80 rounded-full bg-emerald-300/55 blur-3xl dark:bg-emerald-700/20" />
          <div className="absolute -right-16 top-24 h-64 w-64 rounded-full border border-emerald-400/45 dark:border-emerald-500/10" />
        </DecorLayer>

        <div className="container">
          <SectionHeading
            eyebrow="FITUR LEBIH LENGKAP"
            title="Dirancang untuk pengalaman belajar yang lebih baik"
            description="Setiap fitur memiliki peran dalam mendukung proses belajar, mulai dari memahami materi hingga melihat hasil latihan."
          />

          <div className="mt-14 space-y-7 sm:space-y-9">
            {features.map((feature, index) => (
              <article
                id={`fitur-${index}`}
                key={feature.title}
                className="scroll-mt-24"
              >
                <div
                  className={cn(
                    "grid items-center gap-8 overflow-hidden rounded-3xl border border-emerald-200/70 bg-card/90 p-6 shadow-[0_16px_44px_-26px_rgba(15,118,110,0.4)] ring-1 ring-emerald-900/[0.04] backdrop-blur-sm transition-all duration-300 hover:shadow-[0_28px_64px_-28px_rgba(15,118,110,0.5)] dark:border-emerald-900/40 dark:ring-white/5 sm:p-9 lg:grid-cols-2 lg:gap-12 lg:p-10",
                    index % 2 === 1 &&
                      "lg:[&>*:first-child]:order-2"
                  )}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                        <feature.icon className="h-7 w-7" />
                      </div>

                      <span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-bold text-muted-foreground">
                        FITUR {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <h3 className="mt-6 text-2xl font-black tracking-tight sm:text-3xl">
                      {feature.title}
                    </h3>

                    <p className="mt-4 text-sm leading-8 text-muted-foreground sm:text-base">
                      {feature.detail}
                    </p>

                    <div className="my-6 h-px bg-border" />

                    <h4 className="text-sm font-bold">
                      Keunggulan fitur
                    </h4>

                    <ul className="mt-4 space-y-3">
                      {[
                        feature.description,
                        "Mendukung proses belajar yang lebih praktis dan terstruktur.",
                        "Dapat diakses dari ponsel, tablet, dan desktop.",
                      ]
                        .filter(
                          (item, itemIndex, array) =>
                            item &&
                            array.indexOf(item) === itemIndex
                        )
                        .map((text) => (
                          <li
                            key={text}
                            className="flex items-start gap-3 text-sm leading-7 text-muted-foreground"
                          >
                            <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <Check
                                className="h-3 w-3"
                                strokeWidth={3}
                              />
                            </span>

                            <span>{text}</span>
                          </li>
                        ))}
                    </ul>

                    <div className="mt-7">
                      <Button
                        asChild
                        variant="outline"
                        className="gap-2 rounded-xl"
                      >
                        <Link to="/register">
                          Mulai Jelajahi
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* VISUAL FITUR */}
                  <div className="relative isolate flex min-h-64 items-center justify-center overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-100 via-teal-50 to-emerald-200/70 p-8 dark:border-emerald-900/40 dark:from-emerald-950 dark:via-slate-900 dark:to-teal-950 sm:min-h-80">
                    <DecorLayer>
                      <GridPattern dots />
                      <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-emerald-400/40 blur-3xl dark:bg-emerald-500/15" />
                      <div className="absolute -bottom-12 -left-10 h-44 w-44 rounded-full bg-teal-400/40 blur-3xl dark:bg-teal-500/15" />
                    </DecorLayer>

                    <div
                      aria-hidden="true"
                      className="absolute h-48 w-48 rounded-full border border-primary/25 sm:h-64 sm:w-64"
                    />

                    <div
                      aria-hidden="true"
                      className="absolute h-36 w-36 rounded-full border border-primary/25 sm:h-48 sm:w-48"
                    />

                    <div className="relative flex h-36 w-36 items-center justify-center rounded-[2rem] border bg-background/80 text-primary shadow-xl backdrop-blur-sm transition-transform duration-500 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100 sm:h-44 sm:w-44">
                      <feature.icon className="h-16 w-16 sm:h-20 sm:w-20" />
                    </div>

                    <div className="absolute bottom-5 left-5 rounded-xl border bg-background/90 px-4 py-3 shadow-md backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        <span className="text-xs font-bold">
                          Pengalaman Belajar GradeUp
                        </span>
                      </div>
                    </div>

                    <div className="gu-float absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-xl border bg-background/90 text-primary shadow-sm">
                      <Sparkles className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PENGALAMAN BELAJAR */}
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#d8f0e2] via-[#eaf6ef] to-[#d3eddf] dark:from-[#0b2016] dark:via-[#0b1c13] dark:to-[#0d2116]">
        <DecorLayer>
          <GridPattern dots />
          <div className="gu-drift absolute -left-32 top-10 h-96 w-96 rounded-full bg-emerald-300/60 blur-3xl dark:bg-emerald-600/20" />
          <div className="gu-drift-rev absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-teal-300/60 blur-3xl dark:bg-teal-600/20" />
          <div className="absolute right-[6%] top-12 h-40 w-40 rounded-full border border-emerald-400/45 dark:border-emerald-500/10" />
          <div className="absolute bottom-16 left-[5%] h-24 w-24 rotate-12 rounded-3xl border border-teal-400/45 dark:border-teal-500/10" />
        </DecorLayer>

        <div className="container py-20 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionHeading
                eyebrow="PENGALAMAN BELAJAR"
                title="Satu platform untuk perjalanan belajar yang lebih terarah"
                description="GradeUp membantu menghubungkan berbagai aktivitas belajar dalam pengalaman digital yang lebih praktis."
              />

              <div className="mt-8 space-y-5">
                {learningHighlights.map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="font-bold">{item.title}</h3>

                      <p className="mt-1 text-sm leading-7 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-card/90 p-7 shadow-[0_24px_64px_-30px_rgba(15,118,110,0.45)] ring-1 ring-emerald-900/[0.04] backdrop-blur-sm dark:border-emerald-900/40 dark:ring-white/5 sm:p-10">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-400/30 blur-3xl dark:bg-emerald-500/15"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-teal-400/25 blur-3xl dark:bg-teal-500/10"
              />

              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                  <GraduationCap className="h-7 w-7" />
                </div>

                <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                  Your Learning Journey
                </p>

                <h3 className="mt-3 text-2xl font-black leading-snug sm:text-3xl">
                  Belajar, Berlatih,
                  <span className="block text-primary">
                    dan Terus Berkembang.
                  </span>
                </h3>

                <p className="mt-4 text-sm leading-8 text-muted-foreground">
                  Setiap aktivitas belajar merupakan kesempatan untuk
                  meningkatkan pemahaman. Gunakan fitur GradeUp untuk
                  mendukung proses belajar secara bertahap.
                </p>

                <div className="my-7 h-px bg-border" />

                <div className="space-y-4">
                  {experiencePoints.map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#d3eddf] to-[#b9e4cc] pb-20 dark:from-[#0d2116] dark:to-[#0a1d14] sm:pb-24">
        <DecorLayer>
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-emerald-400/45 to-transparent dark:from-emerald-800/30" />
          <div className="absolute bottom-0 left-1/2 h-72 w-2/3 -translate-x-1/2 rounded-full bg-emerald-400/55 blur-[100px] dark:bg-emerald-500/20" />
        </DecorLayer>

        <div className="container">
          <div className="relative isolate overflow-hidden rounded-3xl border border-emerald-300/20 bg-gradient-to-br from-[#0f3324] via-[#174b34] to-[#1e6842] px-6 py-14 text-center text-white shadow-[0_40px_100px_-40px_rgba(6,78,59,0.65)] ring-1 ring-inset ring-white/10 sm:px-12 sm:py-16">
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
              className="pointer-events-none absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full border border-white/15"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-36 -left-20 -z-10 h-80 w-80 rounded-full border border-white/15"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-10 right-[8%] -z-10 hidden h-20 w-20 rotate-12 rounded-3xl border border-white/10 bg-white/5 sm:block"
            />

            <div className="relative mx-auto max-w-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                <GraduationCap className="h-7 w-7" />
              </div>

              <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-white/75">
                Mulai Sekarang
              </p>

              <h2 className="mt-3 text-2xl font-black leading-tight sm:text-4xl">
                Siap Mengembangkan Potensi Belajarmu?
              </h2>

              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/85 sm:text-base">
                Kenali kemampuanmu, tingkatkan pemahaman, dan jadikan
                setiap proses belajar sebagai langkah menuju hasil
                yang lebih baik bersama GradeUp.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="gap-2 rounded-xl bg-white px-7 font-bold text-primary hover:bg-white/90"
                >
                  <Link to="/register">
                    Daftar Gratis
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-xl border-white/40 bg-transparent px-7 font-semibold text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/login">Masuk ke Akun</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
