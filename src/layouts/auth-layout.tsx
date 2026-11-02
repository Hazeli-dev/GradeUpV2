import { Link, Outlet } from "react-router-dom";
import { ArrowLeft, BarChart3, BookOpenCheck, Timer } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-background">
      {/* Sisi Kiri: Form Auth */}
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          {Logo ? <Logo /> : <span className="font-bold text-xl">GradeUp</span>}
          <div className="flex items-center gap-1">
            {ThemeToggle && <ThemeToggle />}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Beranda
            </Link>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <Outlet />
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Autentikasi pada versi ini hanya simulasi dan belum siap produksi.
        </p>
      </div>

      {/* Sisi Kanan: Banner Promosi */}
      <aside className="relative hidden overflow-hidden bg-brand-gradient p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        
        <div className="relative">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur">
            Belajar. Berlatih. Naik kelas.
          </span>
          <h2 className="mt-6 max-w-md text-4xl font-extrabold leading-tight tracking-tight">
            Naik kelas lebih cepat bersama GradeUp.
          </h2>
          <p className="mt-4 max-w-md text-white/80">
            Satu tempat untuk materi, try out, dan evaluasi hasil belajar siswa di semua jenjang.
          </p>
        </div>

        <div className="relative space-y-4">
          <div className="glass flex items-center gap-4 rounded-2xl !border-white/20 !bg-white/10 p-4 text-white">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <BookOpenCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold">Materi terstruktur</p>
              <p className="text-sm text-white/75">Belajar per bab sesuai jenjang Anda.</p>
            </div>
          </div>

          <div className="glass flex items-center gap-4 rounded-2xl !border-white/20 !bg-white/10 p-4 text-white">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Timer className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold">Try out berwaktu</p>
              <p className="text-sm text-white/75">Latihan dengan suasana ujian sungguhan.</p>
            </div>
          </div>

          <div className="glass flex items-center gap-4 rounded-2xl !border-white/20 !bg-white/10 p-4 text-white">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold">Statistik jelas</p>
              <p className="text-sm text-white/75">Pantau perkembangan nilai dari waktu ke waktu.</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default AuthLayout;
