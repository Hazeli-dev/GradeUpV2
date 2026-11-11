
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
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

export default function FeaturesPage() {
  return (
    <>
      {/* HERO SECTION */}
      <section className="relative isolate overflow-hidden border-b bg-muted/30">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-32 -z-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        />

        <div className="container py-20 sm:py-28 lg:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/90 px-4 py-2 text-xs font-bold tracking-wide text-primary shadow-sm">
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
              <Button asChild size="lg" className="gap-2 rounded-xl px-7">
                <Link to="/register">
                  Mulai Belajar
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-xl px-7"
              >
                <a href="#daftar-fitur">
                  Jelajahi Fitur
                  <ArrowDown className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  icon: Layers3,
                  title: "Terintegrasi",
                  text: "Berbagai kebutuhan belajar dalam satu platform.",
                },
                {
                  icon: Target,
                  title: "Terarah",
                  text: "Mendukung proses belajar yang lebih terstruktur.",
                },
                {
                  icon: Zap,
                  title: "Interaktif",
                  text: "Pengalaman belajar digital yang praktis.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border bg-background/80 p-5 text-left shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>

                  <h3 className="mt-4 text-sm font-bold">{item.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE OVERVIEW */}
      <section id="daftar-fitur" className="container scroll-mt-24 py-20 sm:py-24">
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
              className="group rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg sm:p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-6 w-6" />
                </div>

                <span className="text-sm font-black tracking-widest text-primary/30">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>

              <h3 className="mt-5 font-bold transition-colors group-hover:text-primary">
                {feature.title}
              </h3>

              <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted-foreground">
                {feature.detail}
              </p>

              <div className="mt-5 flex items-center gap-2 text-xs font-bold text-primary">
                Pelajari fitur
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* FEATURE DETAILS */}
      <section className="border-y bg-muted/30 py-20 sm:py-24">
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
                    "grid items-center gap-8 overflow-hidden rounded-3xl border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg sm:p-9 lg:gap-12 lg:p-10",
                    index % 2 === 1 && "lg:[&>*:first-child]:order-2"
                  )}
                >
                  {/* DESCRIPTION */}
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
                            item && array.indexOf(item) === itemIndex
                        )
                        .map((text) => (
                          <li
                            key={text}
                            className="flex items-start gap-3 text-sm leading-7 text-muted-foreground"
                          >
                            <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <Check className="h-3 w-3" strokeWidth={3} />
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

                  {/* VISUAL */}
                  <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-2xl border bg-gradient-to-br from-soft via-muted to-primary/5 p-8 sm:min-h-80">
                    <div
                      aria-hidden="true"
                      className="absolute h-48 w-48 rounded-full border border-primary/10 sm:h-64 sm:w-64"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute h-36 w-36 rounded-full border border-primary/10 sm:h-48 sm:w-48"
                    />

                    <div className="relative flex h-36 w-36 items-center justify-center rounded-[2rem] border bg-background/80 text-primary shadow-xl backdrop-blur-sm transition-transform duration-500 hover:scale-105 sm:h-44 sm:w-44">
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

                    <div className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-xl border bg-background/90 text-primary shadow-sm">
                      <Sparkles className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* LEARNING EXPERIENCE */}
      <section className="container py-20 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="PENGALAMAN BELAJAR"
              title="Satu platform untuk perjalanan belajar yang lebih terarah"
              description="GradeUp membantu menghubungkan berbagai aktivitas belajar dalam pengalaman digital yang lebih praktis."
            />

            <div className="mt-8 space-y-5">
              {[
                {
                  icon: BookOpen,
                  title: "Mulai dari materi",
                  text: "Bangun pemahaman melalui materi pembelajaran.",
                },
                {
                  icon: Target,
                  title: "Lanjutkan dengan latihan",
                  text: "Asah kemampuan melalui latihan dan simulasi.",
                },
                {
                  icon: GraduationCap,
                  title: "Evaluasi perkembangan",
                  text: "Gunakan hasil pengerjaan sebagai bahan evaluasi.",
                },
              ].map((item, index) => (
                <div key={item.title} className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="font-bold">{item.title}</h3>
                    <p className="mt-1 text-sm leading-7 text-muted-foreground">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border bg-card p-7 shadow-soft sm:p-10">
            <div
              aria-hidden="true"
              className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
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
                {[
                  "Akses pembelajaran dalam satu platform",
                  "Latihan sesuai kebutuhan belajar",
                  "Evaluasi untuk mengenali kemampuan",
                  "Motivasi untuk terus berkembang",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20 sm:pb-24">
        <div className="relative isolate overflow-hidden rounded-3xl bg-brand-gradient px-6 py-14 text-center text-white shadow-soft sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full border border-white/15"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-36 -left-20 -z-10 h-80 w-80 rounded-full border border-white/15"
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
      </section>
    </>
  );
}
