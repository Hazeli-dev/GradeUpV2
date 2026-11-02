import { Check, Minus } from "lucide-react";
import { SectionHeading } from "@/components/shared/page-header";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { faqs } from "@/data/marketing";

const comparison: [string, boolean, boolean][] = [
  ["Akses materi dasar", true, true],
  ["Materi premium", false, true],
  ["Paket ujian gratis", true, true],
  ["Seluruh paket ujian", false, true],
  ["Pembahasan soal lengkap", false, true],
  ["Statistik belajar lanjutan", false, true],
  ["Sertifikat penyelesaian (tahunan)", false, true],
];

export default function PricingPage() {
  return (
    <>
      <section className="container py-16 sm:py-24">
        <SectionHeading eyebrow="Harga" title="Harga sederhana, tanpa kejutan" description="Mulai gratis dan upgrade saat Anda membutuhkan lebih banyak." />
        <div className="mt-14"><PricingCards /></div>
        <p className="mt-8 text-center text-xs text-muted-foreground">Harga bersifat contoh. Pembayaran dan langganan belum aktif pada versi kerangka ini.</p>
      </section>

      <section className="bg-muted/50 py-16">
        <div className="container max-w-3xl">
          <h2 className="text-center text-2xl font-extrabold">Perbandingan paket</h2>
          <div className="mt-8 overflow-hidden rounded-2xl border bg-card shadow-soft">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/60 text-left">
                  <th className="px-5 py-3.5 font-bold">Fitur</th>
                  <th className="px-5 py-3.5 text-center font-bold">Gratis</th>
                  <th className="px-5 py-3.5 text-center font-bold">Premium</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map(([label, free, premium]) => (
                  <tr key={label} className="border-b last:border-0">
                    <td className="px-5 py-3.5">{label}</td>
                    {[free, premium].map((v, i) => (
                      <td key={i} className="px-5 py-3.5 text-center">
                        {v ? <Check className="mx-auto h-4 w-4 text-secondary" strokeWidth={3} aria-label="Tersedia" /> : <Minus className="mx-auto h-4 w-4 text-muted-foreground" aria-label="Tidak tersedia" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="container max-w-3xl py-16">
        <h2 className="mb-8 text-center text-2xl font-extrabold">Pertanyaan seputar harga</h2>
        <FaqAccordion items={faqs.filter((f) => f.category === "Pembayaran")} />
      </section>
    </>
  );
}
