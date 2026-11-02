import {
  Award,
  BookOpen,
  Crown,
  Gem,
  Library,
  LucideIcon,
  ShieldAlert,
  Swords,
  Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  Library,
  Swords,
  ShieldAlert,
  Crown,
  Gem,
  Award,
};

const RARITY_STYLES = {
  common: {
    border: "border-slate-700/60 hover:border-slate-500",
    glow: "bg-slate-500/10 text-slate-300",
    badgeBg: "bg-slate-800 text-slate-300 border-slate-600",
    label: "COMMON",
  },
  rare: {
    border: "border-blue-500/40 hover:border-blue-400",
    glow: "bg-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]",
    badgeBg: "bg-blue-950 text-blue-300 border-blue-500/50",
    label: "RARE",
  },
  epic: {
    border: "border-amber-500/50 hover:border-amber-400",
    glow: "bg-amber-500/20 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]",
    badgeBg: "bg-amber-950 text-amber-300 border-amber-500/60",
    label: "EPIC",
  },
  legendary: {
    border: "border-purple-500/60 hover:border-purple-400 bg-gradient-to-br from-purple-950/40 via-background to-emerald-950/20",
    glow: "bg-gradient-to-tr from-purple-600 to-amber-400 text-white shadow-[0_0_25px_rgba(168,85,247,0.4)] animate-pulse",
    badgeBg: "bg-gradient-to-r from-purple-600 to-amber-500 text-white border-none font-black",
    label: "LEGENDARY",
  },
};

interface BadgeCardProps {
  title: string;
  description: string;
  iconName: string;
  rarity?: "common" | "rare" | "epic" | "legendary";
  xpReward?: number;
  isUnlocked: boolean;
  isPremiumOnly?: boolean;
}

export function BadgeCard({
  title,
  description,
  iconName,
  rarity = "common",
  xpReward = 50,
  isUnlocked,
  isPremiumOnly = false,
}: BadgeCardProps) {
  const IconComponent = ICON_MAP[iconName] || Award;
  const style = RARITY_STYLES[rarity] || RARITY_STYLES.common;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 border-2",
        style.border,
        !isUnlocked && "opacity-45 grayscale bg-muted/10 hover:opacity-60"
      )}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300",
            isUnlocked ? style.glow : "bg-muted text-muted-foreground"
          )}
        >
          {isUnlocked ? <IconComponent className="h-7 w-7" /> : <Lock className="h-6 w-6 text-muted-foreground/70" />}
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-extrabold leading-none text-foreground tracking-tight">{title}</h4>
            <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-md border tracking-wider", style.badgeBg)}>
              {style.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{description}</p>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              +{xpReward} XP
            </span>
            {isPremiumOnly && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                <Gem className="h-3 w-3" /> VIP
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
