import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/utils/theme-provider";
import { cn } from "@/lib/utils";

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: "light" as const, label: "Mode Terang", icon: Sun, bg: "bg-white", bar: "bg-slate-200" },
    { value: "dark" as const, label: "Mode Gelap", icon: Moon, bg: "bg-slate-900", bar: "bg-slate-700" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Tema tampilan">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={theme === o.value}
          onClick={() => setTheme(o.value)}
          className={cn(
            "rounded-2xl border-2 p-4 text-left transition-all hover:border-primary/50",
            theme === o.value ? "border-primary bg-soft/50 shadow-soft" : "border-border"
          )}
        >
          <div className={cn("mb-3 space-y-2 rounded-xl border p-3", o.bg)}>
            <div className="h-2.5 w-1/3 rounded-full bg-brand-gradient" />
            <div className={cn("h-2 w-full rounded-full", o.bar)} />
            <div className={cn("h-2 w-2/3 rounded-full", o.bar)} />
          </div>
          <span className="flex items-center gap-2 text-sm font-bold">
            <o.icon className="h-4 w-4" />
            {o.label}
          </span>
        </button>
      ))}
    </div>
  );
}
