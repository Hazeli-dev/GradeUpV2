
import { useEffect, useState } from "react";
import {
  Gift,
  Sparkles,
  X,
  Crown,
  ArrowRight,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type PromoCampaign = {
  id: string;
  name: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

interface FloatingPromoProps {
  isFree: boolean;
  onUpgradeClick: () => void;
}

export function FloatingPromo({
  isFree,
  onUpgradeClick,
}: FloatingPromoProps) {
  const [campaign, setCampaign] = useState<PromoCampaign | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadCampaign = async () => {
      if (!isFree) {
        setCampaign(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("promo_campaigns")
          .select("id, name, description, starts_at, ends_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (mounted) {
          setCampaign(data as PromoCampaign | null);
        }
      } catch (error) {
        console.error("Gagal memuat kampanye promo:", error);

        if (mounted) {
          setCampaign(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadCampaign();

    return () => {
      mounted = false;
    };
  }, [isFree]);

  useEffect(() => {
    if (!isFree || !campaign) {
      setIsOpen(false);
    }
  }, [isFree, campaign]);

  if (loading || !isFree || !campaign) {
    return null;
  }

  return (
    <>
      {/* TOMBOL FLOATING PROMO */}
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label="Lihat promo GradeUp"
        aria-expanded={isOpen}
        className={cn(
          "fixed bottom-20 right-5 z-40",
          "sm:bottom-24 sm:right-7",
          "flex items-center gap-2 rounded-full",
          "border border-amber-300/60 bg-gradient-to-r",
          "from-amber-500 to-orange-500 px-4 py-3",
          "text-sm font-bold text-white shadow-xl",
          "shadow-amber-500/20 transition-all duration-200",
          "hover:-translate-y-1 hover:shadow-2xl",
          "active:scale-95"
        )}
      >
        {isOpen ? (
          <X className="h-4 w-4" />
        ) : (
          <Gift className="h-4 w-4" />
        )}

        <span>{isOpen ? "Tutup Promo" : "Promo Spesial"}</span>

        {!isOpen && (
          <Sparkles className="h-4 w-4" />
        )}
      </button>

      {/* POPUP PROMO */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-36 right-5 z-40",
            "sm:bottom-40 sm:right-7",
            "w-[calc(100vw-2.5rem)] max-w-[340px]",
            "animate-in fade-in slide-in-from-bottom-3 duration-200"
          )}
        >
          <div className="overflow-hidden rounded-2xl border border-amber-200 bg-card shadow-2xl dark:border-amber-900">
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-5 text-white">
              <div className="absolute -right-5 -top-5 h-28 w-28 rounded-full bg-white/10" />
              <div className="absolute -bottom-10 right-16 h-24 w-24 rounded-full bg-white/10" />

              <div className="relative flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                  <Gift className="h-6 w-6" />
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Tutup popup promo"
                  className="rounded-full p-1.5 transition-colors hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="relative mt-4">
                <p className="text-xs font-bold uppercase tracking-widest text-white/80">
                  Promo GradeUp
                </p>

                <h3 className="mt-1 text-xl font-extrabold leading-tight">
                  {campaign.name}
                </h3>
              </div>
            </div>

            <div className="p-5">
              {campaign.description && (
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                  {campaign.description}
                </p>
              )}

              <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>
                  Manfaatkan kesempatan ini untuk meningkatkan pengalaman belajarmu!
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onUpgradeClick();
                }}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:brightness-110 active:scale-[0.98]"
              >
                <Crown className="h-4 w-4" />
                Lihat Premium
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="mt-3 w-full text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Nanti saja
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
