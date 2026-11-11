
import { useMemo, useState } from "react";
import {
  BookOpen,
  CircleHelp,
  CreditCard,
  Search,
  ShieldCheck,
  UserRound,
  ClipboardList,
} from "lucide-react";

import { SectionHeading } from "@/components/shared/page-header";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { faqs } from "@/data/marketing";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/states";

const groups = [
  {
    name: "Umum",
    icon: CircleHelp,
    description:
      "Informasi mengenai GradeUp, layanan pembelajaran, fitur, dan cara memulai.",
  },
  {
    name: "Akun",
    icon: UserRound,
    description:
      "Panduan pendaftaran, login, pengaturan profil, dan keamanan akun.",
  },
  {
    name: "Ujian",
    icon: ClipboardList,
    description:
      "Informasi latihan soal, simulasi ujian, penilaian, pembahasan, dan hasil belajar.",
  },
  {
    name: "Pembayaran",
    icon: CreditCard,
    description:
      "Informasi paket Premium, metode pembayaran, transaksi, dan masa berlangganan.",
  },
];

const helpTopics = [
  {
    icon: BookOpen,
    title: "Layanan pembelajaran",
    description: "Kenali fitur dan layanan yang tersedia di GradeUp.",
  },
  {
    icon: ShieldCheck,
    title: "Pengelolaan akun",
    description: "Temukan panduan untuk mengakses dan menjaga keamanan akun.",
  },
  {
    icon: ClipboardList,
    title: "Evaluasi pembelajaran",
    description: "Pahami proses ujian, penilaian, dan hasil belajar.",
  },
];

export default function FaqPage() {
  const [q, setQ] = useState("");

  const normalizedQuery = q.trim().toLocaleLowerCase("id-ID");

  const filteredGroups = useMemo(() => {
    return groups.map((group) => {
      const categoryFaqs = faqs.filter(
        (faq) => faq.category === group.name
      );

      const items = categoryFaqs.filter((faq) => {
        if (!normalizedQuery) return true;

        const question = faq.question.toLocaleLowerCase("id-ID");
        const answer = faq.answer.toLocaleLowerCase("id-ID");

        return (
          question.includes(normalizedQuery) ||
          answer.includes(normalizedQuery)
        );
      });

      return {
        ...group,
        items,
        total: categoryFaqs.length,
      };
    });
  }, [normalizedQuery]);

  const totalQuestions = faqs.length;

  const totalResults = filteredGroups.reduce(
    (total, group) => total + group.items.length,
    0
  );

  return (
    <>
      <section className="container max-w-3xl py-16 sm:py-24">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <CircleHelp className="h-7 w-7" />
        </div>

        <SectionHeading
          eyebrow="Pusat Bantuan GradeUp"
          title="Pertanyaan yang Sering Diajukan"
          description="Temukan informasi dan panduan lengkap mengenai penggunaan GradeUp, pengelolaan akun, latihan dan simulasi ujian, serta layanan Premium."
        />

        <div className="mt-8">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Cari pertanyaan atau informasi..."
            className="w-full"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Cari berdasarkan pertanyaan maupun jawaban.
            </span>

            <span>
              {normalizedQuery
                ? `${totalResults} hasil ditemukan`
                : `${totalQuestions} informasi tersedia`}
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {helpTopics.map((topic) => (
            <div
              key={topic.title}
              className="rounded-2xl border bg-card p-4 transition-shadow hover:shadow-soft"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <topic.icon className="h-5 w-5" />
              </div>

              <h3 className="text-sm font-bold">{topic.title}</h3>

              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {topic.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <div className="mb-5">
            <h2 className="text-xl font-extrabold tracking-tight">
              Jelajahi berdasarkan kategori
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pilih kategori untuk menemukan jawaban yang sesuai dengan
              kebutuhanmu.
            </p>
          </div>

          <Tabs defaultValue="Umum" className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
              {filteredGroups.map((group) => (
                <TabsTrigger
                  key={group.name}
                  value={group.name}
                  className="flex items-center gap-1.5 py-2.5 text-xs sm:text-sm"
                >
                  <group.icon className="h-4 w-4" />
                  {group.name}
                  <span className="ml-0.5 text-[10px] text-muted-foreground">
                    ({group.items.length})
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {filteredGroups.map((group) => (
              <TabsContent
                key={group.name}
                value={group.name}
                className="mt-5"
              >
                <div className="mb-5 rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-center gap-2">
                    <group.icon className="h-5 w-5 text-primary" />
                    <h3 className="font-bold">{group.name}</h3>
                  </div>

                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {group.description}
                  </p>

                  <p className="mt-2 text-xs text-muted-foreground">
                    Menampilkan {group.items.length} dari {group.total}{" "}
                    pertanyaan.
                  </p>
                </div>

                {group.items.length > 0 ? (
                  <FaqAccordion items={group.items} />
                ) : (
                  <div className="rounded-2xl border border-dashed p-6">
                    <EmptyState
                      title={
                        normalizedQuery
                          ? "Pertanyaan tidak ditemukan"
                          : "Belum ada informasi tersedia"
                      }
                    />

                    <p className="mt-2 text-center text-sm text-muted-foreground">
                      {normalizedQuery
                        ? "Coba gunakan kata kunci lain atau periksa kategori lainnya."
                        : "Informasi untuk kategori ini akan tersedia secara bertahap."}
                    </p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {normalizedQuery && totalResults === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed bg-muted/20 p-5 text-center">
            <h3 className="font-bold">
              Belum menemukan informasi yang dicari?
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              Coba gunakan kata kunci yang lebih umum atau hapus pencarian
              untuk melihat seluruh pertanyaan.
            </p>

            <button
              type="button"
              onClick={() => setQ("")}
              className="mt-3 text-sm font-semibold text-primary hover:underline"
            >
              Tampilkan semua pertanyaan
            </button>
          </div>
        )}
      </section>
    </>
  );
}
