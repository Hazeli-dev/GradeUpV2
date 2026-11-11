
import { useMemo, useState } from "react";
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

import { SectionHeading } from "@/components/shared/page-header";
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
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/[0.07] via-background to-background">
        <div className="container relative py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
              <CircleHelp className="h-7 w-7" />
            </div>

            <SectionHeading
              eyebrow="Pusat Bantuan GradeUp"
              title="Ada yang ingin kamu ketahui?"
              description="Temukan jawaban atas berbagai pertanyaan seputar akun, fitur pembelajaran, ujian, dan layanan GradeUp dalam satu tempat."
            />

            <div className="mx-auto mt-8 max-w-2xl text-left">
              <SearchInput
                value={q}
                onChange={setQ}
                placeholder="Cari pertanyaan atau topik..."
                className="w-full"
              />
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5" />
                  Pencarian berdasarkan pertanyaan dan jawaban
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  {totalQuestions} pertanyaan tersedia
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container max-w-5xl py-14 sm:py-20">
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {helpHighlights.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">
              Jelajahi FAQ
            </p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Pertanyaan berdasarkan kategori
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Pilih kategori untuk menemukan informasi yang kamu butuhkan.
            </p>
          </div>

          {normalizedQuery && (
            <div className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              {totalMatches} hasil ditemukan
            </div>
          )}
        </div>

        <Tabs defaultValue="Umum" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-muted p-1.5 sm:grid-cols-4">
            {filteredGroups.map((group) => (
              <TabsTrigger
                key={group.name}
                value={group.name}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-xs sm:text-sm"
              >
                <group.icon className="h-4 w-4 shrink-0" />
                <span>{group.name}</span>
                <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] font-bold">
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
              <div className="mb-5 flex items-start gap-3 rounded-2xl border bg-card p-4 sm:p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <group.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{group.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {group.items.length} dari {group.total} pertanyaan
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {group.description}
                  </p>
                </div>
              </div>

              {group.items.length > 0 ? (
                <FaqAccordion items={group.items} />
              ) : (
                <div className="rounded-2xl border border-dashed bg-muted/20 p-6 text-center sm:p-10">
                  <EmptyState
                    title={
                      normalizedQuery
                        ? "Tidak ada pertanyaan yang cocok"
                        : "Belum ada pertanyaan di kategori ini"
                    }
                  />
                  <p className="mt-2 text-sm text-muted-foreground">
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
          <div className="mt-8 rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
            <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h3 className="font-bold">Belum menemukan jawaban?</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Pertanyaan yang kamu cari belum tersedia. Kamu bisa menghubungi
              tim GradeUp untuk mendapatkan bantuan lebih lanjut.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setQ("")}
            >
              Hapus pencarian
            </Button>
          </div>
        )}
      </section>

      <section className="container max-w-5xl pb-16 sm:pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-7 text-white shadow-glow sm:p-10 lg:p-12">
          <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[35px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full border-[35px] border-white/10" />

          <div className="relative grid gap-7 md:grid-cols-[1fr_auto] md:items-center">
            <div className="max-w-xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">
                <MessageCircle className="h-3.5 w-3.5" />
                Butuh bantuan lebih lanjut?
              </div>

              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Kami siap membantu perjalanan belajarmu.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">
                Jika belum menemukan jawaban yang sesuai, silakan hubungi tim
                GradeUp melalui halaman kontak resmi kami.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <Button
                asChild
                size="lg"
                className="bg-white text-primary hover:bg-white/90"
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
                className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/features">
                  Jelajahi Fitur
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
