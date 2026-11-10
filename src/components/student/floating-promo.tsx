
import { useEffect, useState } from "react";
import {
  Gift,
  Sparkles,
  X,
  Crown,
  ArrowRight,
  Zap,
  PartyPopper,
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

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (loading || !isFree || !campaign) {
    return null;
  }

  return (
    <>
      {/* FLOATING PROMO BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label={isOpen ? "Tutup promo GradeUp" : "Lihat promo GradeUp"}
        aria-expanded={isOpen}
        className={cn(
          "fixed bottom-20 right-5 z-40 sm:bottom-24 sm:right-7",
          "group flex items-center gap-2.5 rounded-full",
          "border border-sky-300/50",
          "bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600",
          "px-4 py-3 text-sm font-bold text-white",
          "shadow-xl shadow-blue-500/25",
          "transition-all duration-300 ease-out",
          "hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/30",
          "active:scale-95",
          "focus-visible:outline-none focus-visible:ring-4",
          "focus-visible:ring-blue-400/30"
        )}
      >
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
          {isOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Gift className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
          )}
        </span>

        <span>{isOpen ? "Tutup Promo" : "Promo Spesial"}</span>

        {!isOpen && (
          <Sparkles className="h-4 w-4 animate-pulse" />
        )}
      </button>

      {/* POPUP PROMO */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-36 right-5 z-40 sm:bottom-40 sm:right-7",
            "w-[calc(100vw-2.5rem)] max-w-[360px]",
            "animate-in fade-in slide-in-from-bottom-3 duration-300"
          )}
        >
          <div
            role="dialog"
            aria-modal="false"
            aria-labelledby="gradeup-promo-title"
            className={cn(
              "relative overflow-hidden rounded-3xl",
              "border border-blue-200/80 bg-card",
              "shadow-2xl shadow-blue-950/15",
              "dark:border-blue-900/70"
            )}
          >
            {/* DECORATIVE BACKGROUND */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-blue-500/5 blur-2xl" />

            {/* HEADER */}
            <div className="relative overflow-hidden bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 p-5 text-white">
              <div className="pointer-events-none absolute -right-6 -top-8 h-36 w-36 rounded-full border-[18px] border-white/10" />

              <div className="pointer-events-none absolute -bottom-12 right-20 h-28 w-28 rounded-full bg-cyan-300/20 blur-xl" />

              <div className="relative flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-inner backdrop-blur-sm">
                  <Gift className="h-6 w-6" />
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Tutup popup promo"
                  className="rounded-full border border-white/20 bg-white/10 p-2 transition-all hover:rotate-90 hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative mt-5">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 backdrop-blur-sm">
                  <Sparkles className="h-3 w-3" />
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.18em]">
                    Promo GradeUp
                  </span>
                </div>

                <h3
                  id="gradeup-promo-title"
                  className="text-xl font-extrabold leading-tight tracking-tight"
                >
                  {campaign.name}
                </h3>

                <p className="mt-1.5 text-xs font-medium text-white/80">
                  Kesempatan spesial untuk pengalaman belajar lebih maksimal.
                </p>
              </div>
            </div>

            {/* CONTENT */}
            <div className="relative p-5">
              {campaign.description ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                  {campaign.description}
                </p>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  Nikmati pengalaman belajar yang lebih lengkap bersama
                  GradeUp Premium.
                </p>
              )}

              {/* INFO BOX */}
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-sky-50 to-blue-50 p-3.5 dark:border-blue-900/60 dark:from-sky-950/40 dark:to-blue-950/40">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-300">
                  <Zap className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-xs font-bold text-blue-800 dark:text-blue-300">
                    Tingkatkan pengalaman belajarmu!
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-blue-700/80 dark:text-blue-300/70">
                    Temukan lebih banyak kesempatan belajar dengan
                    GradeUp Premium.
                  </p>
                </div>
              </div>

              {/* UPGRADE BUTTON */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onUpgradeClick();
                }}
                className={cn(
                  "mt-5 flex w-full items-center justify-center gap-2",
                  "rounded-2xl bg-gradient-to-r",
                  "from-sky-400 via-blue-500 to-indigo-600",
                  "px-4 py-3.5 text-sm font-extrabold text-white",
                  "shadow-lg shadow-blue-500/20",
                  "transition-all duration-200",
                  "hover:-translate-y-0.5 hover:brightness-110 hover:shadow-xl",
                  "active:scale-[0.98]",
                  "focus-visible:outline-none focus-visible:ring-4",
                  "focus-visible:ring-blue-400/30"
                )}
              >
                <Crown className="h-4 w-4" />
                Lihat Premium
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>

              {/* CLOSE BUTTON */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Nanti saja
              </button>

              {/* FOOTER */}
              <div className="mt-3 flex items-center justify-center gap-1.5 border-t border-border/60 pt-3">
                <PartyPopper className="h-3 w-3 text-blue-500" />
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground">
                  Belajar lebih baik bersama GradeUp
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
