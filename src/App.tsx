import { createContext, useContext, Component, type ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "@/routes";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/utils/theme-provider";

// Fallback Provider agar tidak crash meskipun impor path Provider spesifik berbeda
const GuestGateContext = createContext<{ requireLogin: (activity?: string) => void }>({
  requireLogin: () => {},
});

export function AppGuestGateProvider({ children }: { children: ReactNode }) {
  return (
    <GuestGateContext.Provider value={{ requireLogin: () => {} }}>
      {children}
    </GuestGateContext.Provider>
  );
}

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class SafeErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error("[GradeUp] Error Halaman:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
          <div className="max-w-md space-y-4 rounded-xl border border-border bg-card p-6 shadow-lg">
            <h2 className="text-xl font-bold text-foreground">Terjadi Kesalahan Aplikasi</h2>
            <p className="text-sm text-muted-foreground">
              Aplikasi mengalami masalah saat memuat komponen.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function App() {
  return (
    <SafeErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="gradeup-ui-theme">
        <AppGuestGateProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster position="top-right" richColors />
          </BrowserRouter>
        </AppGuestGateProvider>
      </ThemeProvider>
    </SafeErrorBoundary>
  );
}

export default App;
