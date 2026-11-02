import type { ReactNode } from "react";

interface DemoBannerProps {
  children?: ReactNode;
  className?: string;
}

export function DemoBanner({ children, className }: DemoBannerProps) {
  // Mengembalikan null agar banner demo tidak tampil, 
  // namun tetap menerima properti apa pun tanpa error TypeScript.
  return null;
}
