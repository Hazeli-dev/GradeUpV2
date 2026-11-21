
import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/utils/theme-provider";

export function Toaster() {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme === "system" ? "system" : theme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border border-border/70 bg-card font-sans text-card-foreground shadow-lg",
          title: "text-sm font-semibold",
          description: "text-sm text-muted-foreground",
          actionButton: "rounded-lg font-medium",
          cancelButton: "rounded-lg",
          closeButton:
            "border border-border/70 bg-background text-muted-foreground hover:bg-muted",
        },
      }}
    />
  );
}
