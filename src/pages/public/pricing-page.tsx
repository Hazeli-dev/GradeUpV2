import type { ReactNode } from "react";
import { Check, Minus } from "lucide-react";
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
const patternDot =
  "[--gu-dot:rgba(5,150,105,0.42)] dark:[--gu-dot:rgba(110,231,183,0.28)]";

function PricingStyles() {
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

function GridPattern({ dots = false }: { dots?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${
        dots ? "gu-dots" : "gu-grid"
      } ${dots ? patternDot : patternLine}`}
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

export default function PricingPage() {
  return (
    <>
      <PricingStyles />

      {/* HARGA */}
      <section
        className={`relative isolate overflow-hidden bg-gradient-to-br from-[#c9ecd8] via-[#e6f5ec] to-[#d3eddf] dark:from-[#0b2418] dark:via-[#0e2b1c] dark:to-[#0c2418] ${smooth}`}
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

        <div className="container py-16 sm:py-24">
          <div className="gu-reveal">
            <SectionTitle
              eyebrow="Harga"
              title="Harga sederhana, tanpa kejutan"
              description="Mulai gratis dan upgrade saat Anda membutuhkan lebih banyak."
            />
          </div>

          <div className="relative mt-14">
            <PricingCards />
          </div>

          <p
            className={`mt-8 text-center text-xs ${mutedText}`}
          >
            Harga bersifat contoh. Pembayaran dan langganan belum aktif pada
            versi kerangka ini.
          </p>
        </div>
      </section>

      {/* PERBANDINGAN PAKET */}
      <section
        className={`relative isolate overflow-hidden border-y border-emerald-300/40 bg-gradient-to-b from-[#d3eddf] via-[#c3e8d3] to-[#d8f0e2] py-16 dark:border-emerald-900/30 dark:from-[#0c2418] dark:via-[#0e2a1b] dark:to-[#0b2016] sm:py-24 ${smooth}`}
      >
        <DecorLayer>
          <GridPattern dots />
          <div className="gu-drift absolute left-1/2 -top-32 h-[30rem] w-[44rem] -translate-x-1/2 rounded-full bg-emerald-400/50 blur-[110px] dark:bg-emerald-500/20" />
          <div className="gu-drift-rev absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-teal-300/60 blur-3xl dark:bg-teal-600/20" />
          <div className="absolute -left-32 bottom-20 h-80 w-80 rounded-full bg-emerald-300/55 blur-3xl dark:bg-emerald-700/20" />
          <div className="absolute -right-16 top-24 h-64 w-64 rounded-full border border-emerald-400/45 dark:border-emerald-500/10" />
        </DecorLayer>

        <div className="container max-w-3xl">
          <h2
            className={`text-center text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl ${headingText}`}
          >
            Perbandingan paket
          </h2>

          <div
            className={`mt-8 overflow-hidden rounded-3xl shadow-[0_20px_60px_-35px_rgba(15,118,110,0.4)] ring-1 ring-emerald-900/[0.04] dark:ring-white/5 ${cardSurface}`}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-emerald-100 bg-emerald-50/80 text-left dark:border-slate-700 dark:bg-slate-800/80">
                  <th className={`px-5 py-4 font-bold ${headingText}`}>
                    Fitur
                  </th>
                  <th className={`px-5 py-4 text-center font-bold ${headingText}`}>
                    Gratis
                  </th>
                  <th className="px-5 py-4 text-center font-bold text-teal-700 dark:text-emerald-300">
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.map(([label, free, premium]) => (
                  <tr
                    key={label}
                    className="border-b border-slate-100 transition-colors duration-300 last:border-0 hover:bg-emerald-50/60 dark:border-slate-800 dark:hover:bg-slate-800/60"
                  >
                    <td
                      className={`px-5 py-4 font-medium ${mutedText}`}
                    >
                      {label}
                    </td>
                    {[free, premium].map((v, i) => (
                      <td key={i} className="px-5 py-4 text-center">
                        {v ? (
                          <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                            <Check
                              className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                              strokeWidth={3}
                              aria-label="Tersedia"
                            />
                          </span>
                        ) : (
                          <Minus
                            className="mx-auto h-4 w-4 text-slate-400 dark:text-slate-500"
                            aria-label="Tidak tersedia"
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ HARGA */}
      <section
        className={`relative isolate overflow-hidden bg-gradient-to-b from-[#d8f0e2] via-[#e2f3f0] to-[#cfeae3] dark:from-[#0b2016] dark:via-[#0c2220] dark:to-[#0b1f19] ${smooth}`}
      >
        <DecorLayer>
          <GridPattern />
          <div className="gu-drift-rev absolute -left-32 top-24 h-96 w-96 rounded-full bg-teal-300/60 blur-3xl dark:bg-teal-600/20" />
          <div className="gu-drift absolute -right-32 bottom-24 h-[26rem] w-[26rem] rounded-full bg-emerald-300/55 blur-3xl dark:bg-emerald-600/20" />
          <div className="absolute right-[5%] top-16 h-44 w-44 rotate-45 rounded-[2.5rem] border border-teal-300/45 dark:border-teal-500/10" />
          <div className="absolute bottom-24 left-[4%] h-28 w-28 rotate-12 rounded-3xl border border-emerald-300/45 bg-gradient-to-br from-white/50 to-transparent dark:border-emerald-500/10 dark:from-white/5" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/50 to-transparent dark:via-teal-700/30" />
        </DecorLayer>

        <div className="container max-w-3xl py-16 sm:py-24">
          <h2
            className={`mb-8 text-center text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl ${headingText}`}
          >
            Pertanyaan seputar harga
          </h2>

          <div
            className={`rounded-3xl p-5 shadow-[0_20px_60px_-35px_rgba(15,118,110,0.4)] ring-1 ring-emerald-900/[0.04] transition-colors duration-300 dark:ring-white/5 sm:p-8 ${cardSurface}`}
          >
            <FaqAccordion
              items={faqs.filter((f) => f.category === "Pembayaran")}
            />
          </div>
        </div>
      </section>
    </>
  );
}
