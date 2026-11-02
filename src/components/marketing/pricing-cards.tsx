import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pricingPlans } from "@/data/marketing";
import { formatRupiah } from "@/utils/format";
import { cn } from "@/lib/utils";

export function PricingCards() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3 lg:items-stretch">
      {pricingPlans.map((plan) => (
        <div
          key={plan.id}
          className={cn(
            "relative flex flex-col rounded-3xl border bg-card p-7 shadow-soft transition-all duration-300 hover:-translate-y-1",
            plan.popular && "border-primary shadow-glow lg:scale-[1.04]"
          )}
        >
          {plan.popular && (
            <Badge variant="solid" className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-gradient px-3 py-1 text-[11px] tracking-wider">
              POPULER
            </Badge>
          )}
          <h3 className="text-lg font-bold">{plan.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
          <p className="mt-6 flex items-baseline gap-1">
            <span className="text-4xl font-extrabold tracking-tight">{formatRupiah(plan.price)}</span>
            <span className="text-sm font-medium text-muted-foreground">{plan.period}</span>
          </p>
          {plan.note && <p className="mt-1 text-xs font-semibold text-primary dark:text-accent">{plan.note}</p>}
          <ul className="mt-6 flex-1 space-y-3 text-sm">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-soft text-primary dark:text-accent">
                  <Check className="h-3 w-3" strokeWidth={3.5} />
                </span>
                {f}
              </li>
            ))}
          </ul>
          <Button asChild variant={plan.popular ? "default" : "outline"} size="lg" className="mt-8 w-full">
            <Link to="/register">{plan.price === 0 ? "Mulai Gratis" : "Pilih Paket"}</Link>
          </Button>
        </div>
      ))}
    </div>
  );
}
