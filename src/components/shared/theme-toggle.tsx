import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { getStorageString, setStorageItem } from "@/lib/storage";

export function ThemeToggle() {
  const [theme, setTheme] = useState<string>(() => {
    return getStorageString("gradeup-theme", "dark");
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    setStorageItem("gradeup-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      aria-label="Ubah Tema"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700" />
      )}
    </button>
  );
}

export default ThemeToggle;
