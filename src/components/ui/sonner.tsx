import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/hooks/use-theme";

export function Toaster() {
  const { theme } = useTheme();
  return (
    <Sonner
      theme={theme}
      position="top-right"
      richColors
      toastOptions={{ classNames: { toast: "rounded-xl font-sans shadow-soft" } }}
    />
  );
}
