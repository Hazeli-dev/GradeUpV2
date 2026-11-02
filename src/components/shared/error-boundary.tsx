import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Ganti nilai ini (mis. pathname) untuk mereset boundary saat berpindah halaman. */
  resetKey?: string;
}
interface State {
  error: Error | null;
}

const isChunkError = (e: Error) =>
  /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|Loading chunk|Outdated Optimize Dep/i.test(
    e.message
  );

/** Menangkap error render/pemuatan halaman agar tidak berujung layar kosong. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[GradeUp] Error halaman:", error, info.componentStack);
    // Chunk gagal dimuat (mis. setelah deploy baru / re-optimasi dev): muat ulang sekali otomatis.
    if (isChunkError(error)) {
      try {
        if (sessionStorage.getItem("gradeup-chunk-reload") !== "1") {

          sessionStorage.setItem("gradeup-chunk-reload", "1");
          window.location.reload();
        }
      } catch {
        /* ignore */
      }
    }
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 p-6 text-center" role="alert">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-xl font-extrabold">Halaman gagal dimuat</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Terjadi kesalahan saat menampilkan halaman ini. Coba muat ulang.
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw /> Muat ulang
        </Button>
      </div>
    );
  }

}
