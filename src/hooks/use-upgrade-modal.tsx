import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { UpgradeModal } from "@/components/shared/upgrade-modal";

interface UpgradeContextValue {
  openUpgrade: () => void;
}

// 1. Default fallback context untuk mencegah runtime error saat dipanggil di luar Provider
const defaultContextValue: UpgradeContextValue = {
  openUpgrade: () => {},
};

const UpgradeContext = createContext<UpgradeContextValue>(defaultContextValue);

export function UpgradeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openUpgrade = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ openUpgrade }), [openUpgrade]);

  return (
    <UpgradeContext.Provider value={value}>
      {children}
      <UpgradeModal open={open} onOpenChange={setOpen} />
    </UpgradeContext.Provider>
  );
}

export function useUpgradeModal() {
  const ctx = useContext(UpgradeContext);
  // 2. Kembalikan ctx atau defaultContextValue tanpa melempar (throw) Error
  return ctx || defaultContextValue;
}

export default UpgradeProvider;
