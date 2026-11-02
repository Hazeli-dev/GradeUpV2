import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/shared/page-header";
import { features } from "@/data/marketing";
import { cn } from "@/lib/utils";

export default function FeaturesPage() {
  return (
    <>
      <section className="container py-16 sm:py-24">
        <SectionHeading eyebrow="Fitur" title="Fitur lengkap untuk belajar dan berlatih" description="Dari materi hingga evaluasi, semuanya dirancang untuk membantu siswa naik kelas." />
      </section>
      <section className="container space-y-6 pb-20">
        {features.map((f, i) => (
          <div key={f.title} className={cn("grid items-center gap-8 rounded-3xl border bg-card p-6 shadow-soft sm:p-10 md:grid-cols-2", i % 2 && "md:[&>*:first-child]:order-2")}>
            <div>
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow"><f.icon className="h-7 w-7" /></span>
              <h3 className="mt-5 text-2xl font-extrabold">{f.title}</h3>
              <p className="mt-3 text-muted-foreground">{f.detail}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {[f.description, "Dapat diakses dari ponsel, tablet, dan desktop"].map((t) => (
                  <li key={t} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" strokeWidth={3} />{t}</li>
                ))}
              </ul>
            </div>
            <div className="flex h-48 items-center justify-center rounded-2xl bg-gradient-to-br from-soft to-muted sm:h-56">
              <f.icon className="h-20 w-20 text-primary/30 dark:text-accent/30" />
            </div>
          </div>
        ))}
        <div className="pt-6 text-center">
          <Button asChild size="lg"><Link to="/register">Coba Sekarang</Link></Button>
        </div>
      </section>
    </>
  );
}
