
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Compass,
  GraduationCap,
  Heart,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Eye,
  ClipboardCheck,
  Rocket,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/shared/page-header";

const values = [
  {
    icon: Target,
    title: "Terarah",
    text: "Setiap materi, latihan, dan evaluasi dirancang agar siswa memiliki tujuan belajar yang jelas dan terukur.",
  },
  {
    icon: Heart,
    title: "Ramah Siswa",
    text: "Menghadirkan pengalaman belajar yang nyaman, mudah dipahami, dan mendorong semangat belajar.",
  },
  {
    icon: BarChart3,
    title: "Berbasis Data",
    text: "Hasil latihan dan statistik belajar membantu siswa memahami perkembangan serta menentukan langkah berikutnya.",
  },
  {
    icon: Lightbulb,
    title: "Terus Berkembang",
    text: "Kami percaya bahwa proses belajar merupakan perjalanan yang membutuhkan konsistensi dan perbaikan berkelanjutan.",
  },
  {
    icon: ShieldCheck,
    title: "Bertanggung Jawab",
    text: "Mengutamakan pengalaman belajar yang aman, informatif, dan memberikan manfaat bagi penggunanya.",
  },
  {
    icon: Users,
    title: "Inklusif",
    text: "Mengembangkan pengalaman pembelajaran digital yang dapat digunakan oleh siswa dari berbagai jenjang pendidikan.",
  },
];

const features = [
  {
    icon: BookOpen,
    title: "Materi Pembelajaran",
    text: "Akses materi belajar yang disusun secara terstruktur untuk membantu memahami berbagai topik pelajaran.",
  },
  {
    icon: ClipboardCheck,
    title: "Latihan dan Simulasi Ujian",
    text: "Berlatih melalui soal-soal dan simulasi ujian dengan pengalaman pengerjaan berbasis komputer.",
  },
  {
    icon: BarChart3,
    title: "Evaluasi Hasil Belajar",
    text: "Lihat hasil pengerjaan, jumlah jawaban benar dan salah, serta perkembangan kemampuan belajar.",
  },
  {
    icon: Trophy,
    title: "Motivasi dan Pencapaian",
    text: "Bangun kebiasaan belajar melalui XP, level, badge, dan pencapaian yang mendorong konsistensi.",
  },
];

const learningSteps = [
  {
    number: "01",
    title: "Buat Akun",
    text: "Daftar dan lengkapi profil untuk memulai perjalanan belajar di GradeUp.",
  },
  {
    number: "02",
    title: "Pilih Materi atau Ujian",
    text: "Temukan materi, latihan soal, atau paket ujian yang sesuai dengan kebutuhan belajar.",
  },
  {
    number: "03",
    title: "Belajar dan Berlatih",
    text: "Pelajari materi dan kerjakan latihan secara bertahap untuk memperkuat pemahaman.",
  },
  {
    number: "04",
    title: "Evaluasi Perkembangan",
    text: "Periksa hasil belajar, pahami kesalahan, dan tingkatkan kemampuan melalui latihan berikutnya.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b bg-muted/30">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />

        <div className="container relative py-20 sm:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-xs font-bold text-primary shadow-sm">
              <Sparkles className="h-4 w-4" />
              Mengenal GradeUp
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Membantu Setiap Siswa
              <span className="block text-primary">
                Belajar dan Berkembang
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              GradeUp adalah platform pembelajaran digital berbasis
              latihan dan evaluasi ujian yang dirancang untuk membantu
              siswa dari berbagai jenjang pendidikan belajar lebih
              terarah, memahami kemampuan, dan mempersiapkan diri
              menghadapi ujian.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link to="/register">
                  Mulai Belajar Gratis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button asChild size="lg" variant="outline">
                <Link to="/login">Masuk ke GradeUp</Link>
              </Button>
            </div>

            <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                {
                  icon: GraduationCap,
                  title: "Berbagai Jenjang",
                  description: "Pengalaman belajar yang fleksibel",
                },
                {
                  icon: BookOpen,
                  title: "Materi dan Latihan",
                  description: "Belajar secara bertahap",
                },
                {
                  icon: BarChart3,
                  title: "Evaluasi Belajar",
                  description: "Pantau hasil perkembangan",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border bg-background/80 p-4 text-left shadow-sm"
                >
                  <item.icon className="h-6 w-6 text-primary" />
                  <p className="mt-3 text-sm font-bold">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PROFIL GRADEUP */}
      <section className="container py-20 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Siapa Kami"
              title="Belajar bukan sekadar mengerjakan soal"
              description="Kami percaya bahwa proses belajar yang baik tidak berhenti pada mendapatkan nilai. Siswa juga perlu memahami materi, mengenali kemampuan, dan mengetahui hal-hal yang masih perlu ditingkatkan."
            />

            <div className="mt-7 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                GradeUp hadir sebagai platform pembelajaran digital
                yang menggabungkan materi, latihan soal, simulasi
                ujian, dan evaluasi hasil belajar dalam satu
                pengalaman yang terintegrasi.
              </p>

              <p>
                Melalui pendekatan pembelajaran berbasis latihan,
                siswa dapat membangun pemahaman secara bertahap.
                Hasil pengerjaan juga dapat digunakan sebagai bahan
                evaluasi untuk menentukan strategi belajar berikutnya.
              </p>

              <p>
                Kami ingin menjadikan teknologi sebagai sarana
                pendukung pendidikan yang membantu siswa belajar
                dengan lebih terstruktur, mandiri, dan percaya diri.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-2xl" />

            <div className="relative overflow-hidden rounded-3xl border bg-card p-7 shadow-soft sm:p-9">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white">
                <GraduationCap className="h-8 w-8" />
              </div>

              <h3 className="mt-6 text-2xl font-black">
                Satu Platform,
                <span className="block text-primary">
                  Banyak Kesempatan Belajar
                </span>
              </h3>

              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Dari memahami materi hingga mengevaluasi hasil ujian,
                GradeUp dirancang untuk mendukung perjalanan belajar
                dalam satu platform digital.
              </p>

              <div className="mt-7 space-y-4">
                {[
                  "Pembelajaran lebih terstruktur",
                  "Latihan dan simulasi ujian",
                  "Evaluasi hasil pengerjaan",
                  "Motivasi melalui pencapaian belajar",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm font-medium">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VISI DAN MISI */}
      <section className="bg-muted/40 py-20 sm:py-24">
        <div className="container">
          <SectionHeading
            eyebrow="Arah dan Tujuan"
            title="Visi dan Misi GradeUp"
            description="Menjadi platform yang terus berkembang untuk mendukung pengalaman belajar digital yang lebih baik."
          />

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border bg-card p-8 shadow-soft sm:p-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-soft text-primary dark:text-accent">
                <Eye className="h-7 w-7" />
              </div>

              <h3 className="mt-6 text-2xl font-black">Visi</h3>

              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Menjadi platform pembelajaran digital yang membantu
                siswa dari berbagai jenjang pendidikan mengembangkan
                potensi, meningkatkan pemahaman, dan membangun
                kepercayaan diri dalam menghadapi tantangan akademik.
              </p>
            </div>

            <div className="rounded-3xl border bg-card p-8 shadow-soft sm:p-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-soft text-primary dark:text-accent">
                <Target className="h-7 w-7" />
              </div>

              <h3 className="mt-6 text-2xl font-black">Misi</h3>

              <ul className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
                {[
                  "Menyediakan materi dan latihan soal yang terstruktur dan mudah diakses.",
                  "Menghadirkan simulasi ujian digital untuk membantu siswa berlatih.",
                  "Menyediakan evaluasi yang membantu siswa memahami hasil belajar.",
                  "Mengembangkan pengalaman belajar yang interaktif dan mudah digunakan.",
                  "Mendorong kebiasaan belajar mandiri dan konsisten.",
                  "Terus meningkatkan kualitas layanan dan pengalaman pengguna.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FITUR DAN LAYANAN */}
      <section className="container py-20 sm:py-24">
        <SectionHeading
          eyebrow="Apa yang Kami Hadirkan"
          title="Dukungan belajar dalam satu platform"
          description="GradeUp menggabungkan beberapa kebutuhan pembelajaran agar siswa dapat belajar, berlatih, dan mengevaluasi kemampuan secara lebih terstruktur."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="card-hover rounded-2xl border bg-card p-6 shadow-soft"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-soft text-primary dark:text-accent">
                <feature.icon className="h-6 w-6" />
              </div>

              <h3 className="mt-5 font-bold">
                {feature.title}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CARA KERJA */}
      <section className="bg-muted/40 py-20 sm:py-24">
        <div className="container">
          <SectionHeading
            eyebrow="Cara Menggunakan"
            title="Mulai belajar dengan langkah sederhana"
            description="Perjalanan belajar di GradeUp dirancang agar mudah diikuti dan dapat dilakukan secara bertahap."
          />

          <div className="relative mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {learningSteps.map((step, index) => (
              <div
                key={step.number}
                className="relative rounded-2xl border bg-card p-6 shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-primary/20">
                    {step.number}
                  </span>

                  {index === 0 ? (
                    <Users className="h-5 w-5 text-primary" />
                  ) : index === 1 ? (
                    <BookOpen className="h-5 w-5 text-primary" />
                  ) : index === 2 ? (
                    <BrainCircuit className="h-5 w-5 text-primary" />
                  ) : (
                    <BarChart3 className="h-5 w-5 text-primary" />
                  )}
                </div>

                <h3 className="mt-5 font-bold">
                  {step.title}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NILAI GRADEUP */}
      <section className="container py-20 sm:py-24">
        <SectionHeading
          eyebrow="Prinsip Kami"
          title="Nilai yang kami pegang"
          description="Nilai-nilai ini menjadi dasar dalam mengembangkan GradeUp dan menghadirkan pengalaman pembelajaran yang bermanfaat."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((value) => (
            <div
              key={value.title}
              className="card-hover rounded-2xl border bg-card p-6 shadow-soft"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-white">
                <value.icon className="h-6 w-6" />
              </div>

              <h3 className="mt-5 text-lg font-bold">
                {value.title}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {value.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* KOMITMEN */}
      <section className="border-y bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-soft text-primary dark:text-accent">
              <Award className="h-7 w-7" />
            </div>

            <h2 className="mt-6 text-2xl font-black sm:text-3xl">
              Komitmen Kami untuk Pembelajaran
            </h2>

            <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
              GradeUp berkomitmen untuk terus mengembangkan platform
              pembelajaran yang mudah digunakan, relevan dengan
              kebutuhan siswa, dan mendukung proses belajar yang
              lebih terarah. Kami memahami bahwa setiap siswa
              memiliki kebutuhan dan kecepatan belajar yang berbeda.
            </p>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Karena itu, kami ingin menjadikan GradeUp sebagai
              salah satu sarana pendukung bagi siswa untuk terus
              berlatih, memahami kemampuan, dan meningkatkan
              pencapaian akademik secara bertahap.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20 sm:py-24">
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient px-6 py-14 text-center text-white shadow-soft sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full border border-white/10" />

          <div className="relative mx-auto max-w-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
              <Rocket className="h-7 w-7" />
            </div>

            <h2 className="mt-6 text-2xl font-black sm:text-4xl">
              Saatnya Meningkatkan Kemampuan Belajar
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
              Mulai perjalanan belajar yang lebih terarah bersama
              GradeUp. Pelajari materi, kerjakan latihan, dan
              evaluasi perkembanganmu selangkah demi selangkah.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="gap-2 font-bold"
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
                className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/login">Sudah Punya Akun?</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
