
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CreditCard,
  HelpCircle,
  LifeBuoy,
  MessageCircle,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import { SectionHeading } from "@/components/shared/page-header";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/shared/search-input";
import { faqs } from "@/data/marketing";

const groups = [
  { name: "Umum", icon: HelpCircle },
  { name: "Akun", icon: UserRound },
  { name: "Ujian", icon: BookOpen },
  { name: "Pembayaran", icon: CreditCard },
] as const;

const helpHighlights = [
  {
    icon: BookOpen,
    title: "Panduan Penggunaan",
    description:
      "Pelajari cara menggunakan fitur GradeUp untuk mendukung kegiatan belajar.",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    icon: ShieldCheck,
    title: "Informasi Akun",
    description:
      "Temukan informasi seputar pendaftaran, login, profil, dan keamanan akun.",
    className: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    icon: LifeBuoy,
    title: "Solusi Kendala",
    description:
      "Cari solusi untuk kendala teknis dan pertanyaan seputar layanan GradeUp.",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
];

export default function FaqPage() {
  const [q, setQ] = useState("");
  const normalizedQuery = q.trim().toLowerCase();

  const filteredFaqs = useMemo(() => {
    return faqs.filter(
      (item) =>
        item.question.toLowerCase().includes(normalizedQuery) ||
        item.answer.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery]);

  const getCategoryItems = (category: string) =>
    filteredFaqs.filter((item) => item.category === category);

  const totalResults = filteredFaqs.length;

  return (
    <main className="overflow-hidden">
      {/* HERO FAQ */}
      <section className="relative isolate overflow-hidden border-b bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="container relative mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-lg backdrop-blur-sm">
              <HelpCircle className="h-7 w-7" />
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold tracking-wider text-blue-50">
              PUSAT BANTUAN GRADEUP
            </span>

            <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Ada yang ingin kamu tanyakan?
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-blue-50/90 sm:text-base">
              Temukan jawaban atas pertanyaan seputar GradeUp. Kami telah
              merangkum informasi penting agar pengalaman belajarmu semakin
              mudah dan nyaman.
            </p>

            <div className="mx-auto mt-9 max-w-2xl rounded-2xl bg-white p-2 shadow-2xl shadow-blue-950/20">
              <SearchInput
                value={q}
                onChange={setQ}
                placeholder="Cari pertanyaan atau kata kunci..."
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>

            {normalizedQuery && (
              <p className="mt-4 text-sm text-blue-50">
                Ditemukan{" "}
                <strong className="font-extrabold">{totalResults}</strong>{" "}
                pertanyaan yang cocok.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* INFORMASI BANTUAN */}
      <section className="container mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="mb-8 text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-primary">
            Pusat Informasi
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Bagaimana kami bisa membantu?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Pilih topik yang sesuai untuk menemukan informasi yang kamu
            butuhkan.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {helpHighlights.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="group rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-6"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${item.className}`}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <h3 className="text-base font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* DAFTAR FAQ */}
      <section className="container mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:pb-20">
        <div className="mb-8">
          <SectionHeading
            eyebrow="FAQ"
            title="Pertanyaan yang sering diajukan"
            description="Jelajahi berbagai kategori untuk menemukan jawaban yang kamu cari."
          />
        </div>

        <Tabs defaultValue="Umum" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-muted/60 p-2 sm:grid-cols-4">
            {groups.map((group) => {
              const Icon = group.icon;
              const count = getCategoryItems(group.name).length;

              return (
                <TabsTrigger
                  key={group.name}
                  value={group.name}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold sm:text-sm"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{group.name}</span>
                  <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-bold">
                    {count}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {groups.map((group) => {
            const items = getCategoryItems(group.name);
            const Icon = group.icon;

            return (
              <TabsContent
                key={group.name}
                value={group.name}
                className="mt-6 focus-visible:outline-none"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold">{group.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {items.length} pertanyaan tersedia
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {items.length} FAQ
                  </span>
                </div>

                {items.length > 0 ? (
                  <FaqAccordion items={items} />
                ) : (
                  <div className="rounded-2xl border border-dashed bg-muted/20 px-5 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      {normalizedQuery ? (
                        <Search className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <MessageCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <h3 className="mt-4 font-bold">
                      {normalizedQuery
                        ? "Tidak ada pertanyaan yang cocok"
                        : "Belum ada pertanyaan tersedia"}
                    </h3>

                    <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                      {normalizedQuery
                        ? "Coba gunakan kata kunci lain atau hapus pencarian untuk melihat semua pertanyaan."
                        : "Informasi untuk kategori ini belum tersedia."}
                    </p>

                    {normalizedQuery && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-5 gap-2"
                        onClick={() => setQ("")}
                      >
                        <X className="h-4 w-4" />
                        Hapus Pencarian
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </section>

      {/* CTA BANTUAN */}
      <section className="container mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:pb-20">
        <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="relative flex flex-col items-center justify-between gap-7 text-center md:flex-row md:text-left">
            <div className="max-w-xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
                <MessageCircle className="h-3.5 w-3.5" />
                Kami siap membantu
              </div>

              <h2 className="text-2xl font-extrabold sm:text-3xl">
                Masih punya pertanyaan?
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-blue-50/90 sm:text-base">
                Jangan ragu menghubungi tim GradeUp jika kamu belum menemukan
                jawaban yang dibutuhkan.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="gap-2 rounded-xl font-bold"
              >
                <Link to="/contact">
                  Hubungi Kami
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="gap-2 rounded-xl border-white/30 bg-white/10 font-bold text-white hover:bg-white/20 hover:text-white"
              >
                <Link to="/features">
                  Jelajahi Fitur
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
