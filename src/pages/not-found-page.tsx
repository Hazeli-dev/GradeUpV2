import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <Logo />
      <p className="text-gradient text-8xl font-extrabold tracking-tight">404</p>
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold">Halaman tidak ditemukan</h1>
        <p className="max-w-md text-muted-foreground">Alamat yang Anda tuju tidak tersedia atau sudah dipindahkan.</p>
      </div>
      <div className="flex gap-3">
        <Button asChild><Link to="/">Ke Beranda</Link></Button>
        <Button asChild variant="outline"><Link to="/dashboard">Ke Dashboard</Link></Button>
      </div>
    </div>
  );
}
