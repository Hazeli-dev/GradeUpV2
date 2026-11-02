import { useState } from "react";
import { SectionHeading } from "@/components/shared/page-header";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { faqs } from "@/data/marketing";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/states";

const groups = ["Umum", "Akun", "Ujian", "Pembayaran"];

export default function FaqPage() {
  const [q, setQ] = useState("");
  const matches = (text: string) => text.toLowerCase().includes(q.toLowerCase());

  return (
    <section className="container max-w-3xl py-16 sm:py-24">
      <SectionHeading eyebrow="FAQ" title="Pertanyaan yang sering diajukan" description="Temukan jawaban cepat seputar GradeUp." />
      <SearchInput value={q} onChange={setQ} placeholder="Cari pertanyaan..." className="mt-8" />
      <Tabs defaultValue="Umum" className="mt-6">
        <TabsList>
          {groups.map((g) => (
            <TabsTrigger key={g} value={g}>{g}</TabsTrigger>
          ))}
        </TabsList>
        {groups.map((g) => {
          const items = faqs.filter((f) => f.category === g && (matches(f.question) || matches(f.answer)));
          return (
            <TabsContent key={g} value={g}>
              {items.length ? <FaqAccordion items={items} /> : <EmptyState title="Tidak ada pertanyaan yang cocok" />}
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
}
