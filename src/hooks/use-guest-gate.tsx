import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface GuestGateContextValue {
  /** Tampilkan modal "wajib masuk" untuk tamu yang mencoba aktivitas belajar. */
  requireLogin: (activity?: string) => void;
}

// Default context agar tidak pernah bernilai null
const defaultContextValue: GuestGateContextValue = {
  requireLogin: () => {},
};

const GuestGateContext = createContext<GuestGateContextValue>(defaultContextValue);

export function GuestGateProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState("mengakses fitur ini");

  const requireLogin = useCallback((a?: string) => {
    setActivity(a ?? "mengakses fitur ini");
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ requireLogin }), [requireLogin]);

  return (
    <GuestGateContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-soft text-primary dark:text-accent">
            <Lock className="h-6 w-6" />
          </div>
          <DialogHeader className="items-center pr-0 text-center">
            <DialogTitle>Masuk untuk melanjutkan</DialogTitle>
            <DialogDescription>
              Anda perlu masuk ke akun GradeUp untuk {activity}. Belum punya akun? Daftar gratis dalam hitungan menit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Nanti saja
            </Button>
            <Button asChild variant="soft">
              <Link to="/register" onClick={() => setOpen(false)}>Daftar Gratis</Link>
            </Button>
            <Button asChild>
              <Link to="/login" onClick={() => setOpen(false)}>Masuk</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GuestGateContext.Provider>
  );
}

export function useGuestGate() {
  const ctx = useContext(GuestGateContext);
  // Mengembalikan context asli atau fallback aman tanpa pernah melempar error throw
  return ctx || defaultContextValue;
}

export default GuestGateProvider;
