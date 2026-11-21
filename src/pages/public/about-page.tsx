import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  GraduationCap,
  Heart,
  Lightbulb,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/shared/page-header";

const highlights = [
  {
    icon: GraduationCap,
    title: "Berbagai Jenjang",
    description: "Mendukung kebutuhan belajar dari berbagai jenjang pendidikan.",
  },
  {
    icon: BookOpen,
    title: "Materi Terstruktur",
    description: "Membantu siswa belajar secara bertahap dan terarah.",
  },
  {
    icon: BarChart3,
    title: "Evaluasi Belajar",
    description: "Memahami hasil latihan dan perkembangan kemampuan.",
  },
];

const features = [
  {
    icon: BookOpen,
    title: "Materi Pembelajaran",
    text: "Pelajari berbagai topik melalui materi yang disusun secara terstruktur untuk membantu membangun pemahaman.",
  },
  {
    icon: ClipboardCheck,
    title: "Latihan dan Simulasi",
    text: "Asah kemampuan melalui latihan soal dan simulasi ujian dengan pengalaman pengerjaan berbasis komputer.",
  },
  {
    icon: BarChart3,
    title: "Evaluasi Hasil Belajar",
    text: "Tinjau hasil pengerjaan, jawaban benar dan salah, serta perkembangan kemampuan belajar.",
  },
  {
    icon: Trophy,
    title: "Pencapaian Belajar",
    text: "Bangun motivasi melalui XP, level, badge, dan pencapaian untuk mendukung konsistensi belajar.",
  },
];

const values = [
  {
    icon: Target,
    title: "Terarah",
    text: "Setiap materi, latihan, dan evaluasi memiliki tujuan belajar yang jelas.",
  },
  {
    icon: Heart,
    title: "Ramah Siswa",
    text: "Menghadirkan pengalaman belajar yang nyaman, sederhana, dan mudah digunakan.",
  },
  {
    icon: BarChart3,
    title: "Berbasis Evaluasi",
    text: "Hasil latihan membantu siswa mengenali kemampuan dan menentukan langkah berikutnya.",
  },
  {
    icon: Lightbulb,
    title: "Terus Berkembang",
    text: "Mendorong proses belajar yang konsisten melalui latihan dan perbaikan berkelanjutan.",
  },
  {
    icon: ShieldCheck,
    title: "Bertanggung Jawab",
    text: "Mengutamakan pengalaman belajar yang informatif dan memberikan manfaat.",
  },
  {
    icon: Users,
    title: "Inklusif",
    text: "Mengembangkan pembelajaran digital yang dapat dimanfaatkan oleh siswa dari berbagai jenjang.",
  },
];

const learningSteps = [
  {
    number: "01",
    icon: Users,
    title: "Buat Akun",
    text: "Daftar dan lengkapi profil untuk memulai perjalanan belajar di GradeUp.",
  },
  {
    number: "02",
    icon: BookOpen,
    title: "Pilih Pembelajaran",
    text: "Temukan materi, latihan soal, atau paket ujian sesuai kebutuhan.",
  },
  {
    number: "03",
    icon: BrainCircuit,
    title: "Belajar dan Berlatih",
    text: "Pelajari materi dan kerjakan latihan untuk memperkuat pemahaman.",
  },
  {
    number: "04",
    icon: BarChart3,
    title: "Evaluasi Hasil",
    text: "Tinjau hasil belajar, pahami kesalahan, dan tingkatkan kemampuan.",
  },
];

const missions = [
  "Menyediakan materi dan latihan soal yang terstruktur serta mudah diakses.",
  "Menghadirkan simulasi ujian digital sebagai sarana persiapan siswa.",
  "Menyediakan evaluasi untuk membantu memahami hasil belajar.",
  "Mengembangkan pengalaman pembelajaran yang interaktif dan nyaman.",
  "Mendorong kebiasaan belajar mandiri dan konsisten.",
  "Terus meningkatkan kualitas layanan berdasarkan kebutuhan pengguna.",
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

function AboutStyles() {
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
        .gu-float, .gu-drift, .gu-drift-rev, .gu-reveal {
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

/* Permukaan card yang konsisten di seluruh halaman */
const cardGlass =
  "border border-emerald-200/70 bg-card/90 backdrop-blur-sm dark:border-emerald-900/40";

export default function AboutPage() {
  return (
    <>
      <AboutStyles />

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
              MENGENAL GRADEUP
            </div>

            <h1 className="text-4xl font-black leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
              Belajar Lebih Terarah,
              <span className="mt-2 block text-primary">
                Berkembang Lebih Baik.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              GradeUp merupakan platform pembelajaran digital yang
              menggabungkan materi, latihan soal, simulasi ujian, dan
              evaluasi hasil belajar untuk mendukung perjalanan akademik
              siswa dari berbagai jenjang pendidikan.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="gap-2 rounded-xl px-7 shadow-lg shadow-emerald-700/20"
              >
                <Link to="/register">
                  Mulai Belajar Gratis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-xl bg-background/80 px-7 backdrop-blur"
              >
                <Link to="/login">Masuk ke GradeUp</Link>
              </Button>
            </div>

            <div className="mx-auto mt-14 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-emerald-200/70 bg-background/80 p-5 shadow-[0_12px_32px_-20px_rgba(15,118,110,0.4)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/60 hover:shadow-[0_24px_50px_-24px_rgba(15,118,110,0.5)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-emerald-900/40"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>

                  <h3 className="mt-4 text-sm font-bold">{item.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PROFIL */}
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#b9e4cc] via-[#eaf6ef] to-[#d3eddf] dark:from-[#0a2a20] dark:via-[#0b1c13] dark:to-[#0c2418]">
        <DecorLayer>
          <GridPattern dots />
          <div className="gu-drift absolute -left-40 top-16 h-[26rem] w-[26rem] rounded-full bg-emerald-300/55 blur-3xl dark:bg-emerald-600/20" />
          <div className="gu-drift-rev absolute -right-40 bottom-10 h-[26rem] w-[26rem] rounded-full bg-teal-300/55 blur-3xl dark:bg-teal-600/20" />
          <div className="absolute left-[5%] top-12 h-32 w-32 rotate-12 rounded-[2rem] border border-emerald-400/45 dark:border-emerald-500/10" />
          <div className="absolute bottom-20 right-[6%] h-24 w-24 -rotate-12 rounded-3xl border border-teal-400/45 bg-gradient-to-br from-white/70 to-emerald-200/30 dark:border-teal-500/20 dark:from-white/5" />
        </DecorLayer>

        <div className="container py-20 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionHeading
                eyebrow="TENTANG KAMI"
                title="Belajar bukan sekadar mendapatkan nilai"
                description="Proses belajar yang baik tidak hanya berfokus pada hasil akhir. Memahami materi, mengenali kemampuan, dan memperbaiki kekurangan juga merupakan bagian penting dari perjalanan pendidikan."
              />

              <div className="mt-7 space-y-4 text-sm leading-8 text-muted-foreground sm:text-base">
                <p>
                  GradeUp hadir sebagai platform pembelajaran digital
                  yang mengintegrasikan materi, latihan soal, simulasi
                  ujian, dan evaluasi hasil belajar dalam satu pengalaman
                  yang lebih terstruktur.
                </p>

                <p>
                  Melalui pendekatan belajar berbasis latihan, siswa
                  dapat membangun pemahaman secara bertahap. Hasil
                  pengerjaan juga dapat menjadi bahan evaluasi untuk
                  menentukan strategi belajar selanjutnya.
                </p>

                <p>
                  Kami ingin menjadikan teknologi sebagai sarana
                  pendukung pendidikan yang membantu siswa belajar
                  secara lebih mandiri, terarah, dan percaya diri.
                </p>
              </div>
            </div>

            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-emerald-400/45 via-teal-300/30 to-transparent blur-2xl dark:from-emerald-600/20 dark:via-teal-700/10"
              />

              <div className="relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-card/90 p-7 shadow-[0_30px_80px_-35px_rgba(15,118,110,0.5)] ring-1 ring-emerald-900/[0.04] backdrop-blur-md dark:border-emerald-900/40 dark:ring-white/5 sm:p-10">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-400/30 blur-3xl dark:bg-emerald-500/15"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-teal-400/25 blur-3xl dark:bg-teal-500/10"
                />

                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-lg">
                    <GraduationCap className="h-8 w-8" />
                  </div>

                  <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    Learning Experience
                  </p>

                  <h3 className="mt-3 text-2xl font-black leading-snug sm:text-3xl">
                    Satu Platform,
                    <span className="block text-primary">
                      Banyak Kesempatan Belajar.
                    </span>
                  </h3>

                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
                    Dari memahami materi hingga mengevaluasi hasil ujian,
                    GradeUp dirancang untuk mendukung proses belajar dalam
                    satu platform digital.
                  </p>

                  <div className="my-7 h-px bg-border" />

                  <div className="space-y-4">
                    {[
                      "Pembelajaran lebih terstruktur",
                      "Latihan dan simulasi ujian",
                      "Evaluasi hasil pengerjaan",
                      "Motivasi melalui pencapaian belajar",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VISI DAN MISI */}
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
            eyebrow="ARAH DAN TUJUAN"
            title="Visi dan Misi GradeUp"
            description="Landasan yang menjadi arah pengembangan GradeUp dalam menghadirkan pengalaman pembelajaran digital."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div
              className={`relative overflow-hidden rounded-3xl p-7 shadow-[0_16px_44px_-26px_rgba(15,118,110,0.4)] transition-shadow hover:shadow-[0_28px_64px_-28px_rgba(15,118,110,0.5)] sm:p-9 ${cardGlass}`}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-400/25 blur-3xl dark:bg-emerald-500/10"
              />

              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Eye className="h-6 w-6" />
                </div>

                <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                  Visi Kami
                </p>

                <h3 className="mt-2 text-2xl font-black">
                  Pendidikan yang Lebih Terarah
                </h3>

                <p className="mt-4 text-sm leading-8 text-muted-foreground sm:text-base">
                  Menjadi platform pembelajaran digital yang membantu
                  siswa dari berbagai jenjang pendidikan mengembangkan
                  potensi, meningkatkan pemahaman, dan membangun
                  kepercayaan diri dalam menghadapi tantangan akademik.
                </p>
              </div>
            </div>

            <div
              className={`relative overflow-hidden rounded-3xl p-7 shadow-[0_16px_44px_-26px_rgba(15,118,110,0.4)] transition-shadow hover:shadow-[0_28px_64px_-28px_rgba(15,118,110,0.5)] sm:p-9 ${cardGlass}`}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-16 -right-16 h-44 w-44 rounded-full bg-teal-400/25 blur-3xl dark:bg-teal-500/10"
              />

              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Target className="h-6 w-6" />
                </div>

                <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                  Misi Kami
                </p>

                <h3 className="mt-2 text-2xl font-black">
                  Langkah Nyata untuk Belajar
                </h3>

                <ul className="mt-5 space-y-4">
                  {missions.map((mission) => (
                    <li
                      key={mission}
                      className="flex items-start gap-3 text-sm leading-7 text-muted-foreground"
                    >
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                      <span>{mission}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FITUR */}
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#d8f0e2] via-[#eaf6ef] to-[#d3eddf] dark:from-[#0b2016] dark:via-[#0b1c13] dark:to-[#0c2418]">
        <DecorLayer>
          <GridPattern dots />
          <div className="gu-drift-rev absolute -left-32 top-20 h-96 w-96 rounded-full bg-emerald-300/60 blur-3xl dark:bg-emerald-600/20" />
          <div className="gu-drift absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-teal-300/60 blur-3xl dark:bg-teal-600/20" />
          <div className="absolute right-[8%] top-10 h-40 w-40 rotate-12 rounded-[2.5rem] border border-emerald-400/45 dark:border-emerald-500/10" />
          <div className="absolute bottom-16 left-[6%] h-24 w-24 -rotate-12 rounded-3xl border border-teal-400/45 bg-gradient-to-br from-white/70 to-emerald-200/30 dark:border-teal-500/20 dark:from-white/5" />
        </DecorLayer>

        <div className="container py-20 sm:py-24">
          <SectionHeading
            eyebrow="FITUR DAN LAYANAN"
            title="Semua kebutuhan belajar dalam satu tempat"
            description="Berbagai fasilitas pembelajaran yang dirancang untuk membantu siswa memahami materi, berlatih, dan mengevaluasi kemampuan."
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className={`group relative overflow-hidden rounded-2xl p-6 shadow-[0_10px_30px_-20px_rgba(15,118,110,0.3)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_60px_-28px_rgba(15,118,110,0.4)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${cardGlass}`}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-16 -right-16 h-44 w-44 rounded-full bg-emerald-400/0 blur-3xl transition-colors duration-500 group-hover:bg-emerald-400/25 dark:group-hover:bg-emerald-500/15"
                />

                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-6 w-6" />
                </div>

                <p className="relative mt-6 text-xs font-bold tracking-widest text-primary/70">
                  0{index + 1}
                </p>

                <h3 className="relative mt-2 text-base font-bold">
                  {feature.title}
                </h3>

                <p className="relative mt-3 text-sm leading-7 text-muted-foreground">
                  {feature.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CARA BELAJAR */}
      <section className="relative isolate overflow-hidden border-y border-teal-300/40 bg-gradient-to-b from-[#d3eddf] via-[#d3ece6] to-[#cfeae3] py-20 dark:border-teal-900/30 dark:from-[#0c2418] dark:via-[#0c2220] dark:to-[#0b1f19] sm:py-24">
        <DecorLayer>
          <GridPattern />
          <div className="gu-drift absolute -right-32 top-10 h-[26rem] w-[26rem] rounded-full bg-teal-300/60 blur-3xl dark:bg-teal-600/20" />
          <div className="gu-drift-rev absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-emerald-300/55 blur-3xl dark:bg-emerald-600/20" />
          <div className="absolute left-[4%] top-16 h-44 w-44 rotate-45 rounded-[2.5rem] border border-teal-400/45 dark:border-teal-500/10" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/50 to-transparent dark:via-teal-700/30" />
        </DecorLayer>

        <div className="container">
          <SectionHeading
            eyebrow="MULAI BELAJAR"
            title="Empat langkah menuju belajar lebih terarah"
            description="Mulai dari membuat akun hingga mengevaluasi hasil belajar. Setiap langkah dirancang agar mudah diikuti."
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {learningSteps.map((step) => (
              <article
                key={step.number}
                className={`relative rounded-2xl p-6 shadow-[0_14px_40px_-26px_rgba(15,118,110,0.4)] ring-1 ring-teal-900/[0.04] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_64px_-28px_rgba(15,118,110,0.5)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:ring-white/5 ${cardGlass}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-black tracking-tight text-primary/20">
                    {step.number}
                  </span>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <step.icon className="h-5 w-5" />
                  </div>
                </div>

                <h3 className="mt-6 font-bold">{step.title}</h3>

                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {step.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* NILAI GRADEUP */}
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#cfeae3] via-[#e6f5ec] to-[#d9f0e3] dark:from-[#0b1f19] dark:via-[#0b1c13] dark:to-[#0d2116]">
        <DecorLayer>
          <GridPattern dots />
          <div className="gu-drift absolute -left-32 top-10 h-96 w-96 rounded-full bg-emerald-300/60 blur-3xl dark:bg-emerald-600/20" />
          <div className="gu-drift-rev absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-teal-300/60 blur-3xl dark:bg-teal-600/20" />
          <div className="absolute right-[6%] top-12 h-40 w-40 rounded-full border border-emerald-400/45 dark:border-emerald-500/10" />
          <div className="absolute bottom-16 left-[5%] h-24 w-24 rotate-12 rounded-3xl border border-teal-400/45 dark:border-teal-500/10" />
        </DecorLayer>

        <div className="container py-20 sm:py-24">
          <SectionHeading
            eyebrow="PRINSIP KAMI"
            title="Nilai yang menjadi dasar GradeUp"
            description="Prinsip yang kami pegang dalam mengembangkan platform dan menghadirkan pengalaman pembelajaran yang bermanfaat."
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((value) => (
              <article
                key={value.title}
                className={`group relative overflow-hidden rounded-2xl p-6 shadow-[0_10px_30px_-20px_rgba(15,118,110,0.3)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_60px_-28px_rgba(15,118,110,0.4)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${cardGlass}`}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-16 -right-16 h-44 w-44 rounded-full bg-emerald-400/0 blur-3xl transition-colors duration-500 group-hover:bg-emerald-400/25 dark:group-hover:bg-emerald-500/15"
                />

                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-sm transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                  <value.icon className="h-6 w-6" />
                </div>

                <h3 className="relative mt-5 text-lg font-bold">
                  {value.title}
                </h3>

                <p className="relative mt-2 text-sm leading-7 text-muted-foreground">
                  {value.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* KOMITMEN */}
      <section className="relative isolate overflow-hidden border-y border-emerald-300/40 bg-gradient-to-b from-[#d9f0e3] via-[#c9ebd8] to-[#d3eddf] py-20 dark:border-emerald-900/30 dark:from-[#0d2116] dark:via-[#0d2a1b] dark:to-[#0d2116] sm:py-24">
        <DecorLayer>
          <GridPattern />
          <div className="gu-drift absolute left-1/2 top-0 h-[26rem] w-[40rem] -translate-x-1/2 rounded-full bg-emerald-400/50 blur-[110px] dark:bg-emerald-500/20" />
          <div className="absolute -left-24 bottom-10 h-72 w-72 rounded-full border border-emerald-400/45 dark:border-emerald-500/10" />
          <div className="absolute -right-24 top-10 h-72 w-72 rounded-full border border-teal-400/45 dark:border-teal-500/10" />
        </DecorLayer>

        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[0_0_0_8px_rgba(16,185,129,0.12)]">
              <Award className="h-7 w-7" />
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Komitmen GradeUp
            </p>

            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
              Setiap Proses Belajar Berarti
            </h2>

            <p className="mt-5 text-sm leading-8 text-muted-foreground sm:text-base">
              Kami berkomitmen untuk terus mengembangkan platform
              pembelajaran yang mudah digunakan, relevan dengan
              kebutuhan siswa, dan mendukung proses belajar yang
              lebih terarah.
            </p>

            <p className="mt-4 text-sm leading-8 text-muted-foreground sm:text-base">
              Kami memahami bahwa setiap siswa memiliki kebutuhan
              dan kecepatan belajar yang berbeda. Karena itu, GradeUp
              ingin menjadi salah satu sarana pendukung agar siswa
              dapat terus berlatih, memahami kemampuan, dan
              meningkatkan pencapaian akademik secara bertahap.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#d3eddf] to-[#b9e4cc] dark:from-[#0d2116] dark:to-[#0a1d14]">
        <DecorLayer>
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-emerald-400/45 to-transparent dark:from-emerald-800/30" />
          <div className="absolute bottom-0 left-1/2 h-72 w-2/3 -translate-x-1/2 rounded-full bg-emerald-400/55 blur-[100px] dark:bg-emerald-500/20" />
        </DecorLayer>

        <div className="container py-20 sm:py-24">
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
                <Rocket className="h-7 w-7" />
              </div>

              <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-white/75">
                Waktunya Berkembang
              </p>

              <h2 className="mt-3 text-2xl font-black leading-tight sm:text-4xl">
                Mulai Perjalanan Belajarmu Bersama GradeUp
              </h2>

              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/85 sm:text-base">
                Pelajari materi, kerjakan latihan, dan evaluasi
                perkembanganmu. Jadikan setiap proses belajar sebagai
                langkah menuju kemampuan yang lebih baik.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="gap-2 rounded-xl border-white bg-white px-7 font-bold text-primary hover:bg-white/90 hover:text-primary"
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
                  <Link to="/login">Sudah Punya Akun?</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
