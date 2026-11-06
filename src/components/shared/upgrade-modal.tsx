import { useState } from "react";
import { Check, Crown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { pricingPlans } from "@/data/marketing";
import { formatRupiah } from "@/utils/format";
import { cn } from "@/lib/utils";

export function UpgradeModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const paid = pricingPlans.filter((p) => p.price > 0);
  const [selected, setSelected] = useState("monthly");
  const plan = paid.find((p) => p.id === selected) ?? paid[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="items-center text-center pr-0">
          <span className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
            <Crown className="h-6 w-6" />
          </span>
          <DialogTitle className="text-2xl">Upgrade ke Premium</DialogTitle>
          <DialogDescription>Buka seluruh materi, paket ujian, dan statistik belajar lengkap.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {paid.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={cn(
                "relative rounded-2xl border-2 p-4 text-left transition-all",
                selected === p.id ? "border-primary bg-soft/60" : "border-border hover:border-primary/40"
              )}
              aria-pressed={selected === p.id}
            >
              {p.popular && <Badge variant="solid" className="absolute -top-2.5 right-3">POPULER</Badge>}
              <p className="text-sm font-bold">{p.name}</p>
              <p className="mt-1 text-xl font-extrabold">
                {formatRupiah(p.price)}
                <span className="text-xs font-medium text-muted-foreground"> {p.period}</span>
              </p>
              {p.note && <p className="mt-0.5 text-xs text-muted-foreground">{p.note}</p>}
            </button>
          ))}
        </div>

        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" strokeWidth={3} />
              {f}
            </li>
          ))}
        </ul>

        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            toast.info("Pembayaran belum aktif", {
              description: "Gateway pembayaran akan diintegrasikan pada fase berikutnya. Ini hanya tampilan demo.",
            });
            onOpenChange(false);
          }}
        >
          Pilih {plan.name}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Mode demo: tidak ada transaksi atau penagihan yang diproses.
        </p>
      </DialogContent>
    </Dialog>
  );
}
