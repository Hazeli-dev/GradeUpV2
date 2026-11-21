import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/* Token gaya (disamakan dengan HomePage, LoginPage, RegisterPage)     */
/* ------------------------------------------------------------------ */

const headingText = "text-slate-950 dark:text-white";

const mutedText = "text-slate-600 dark:text-slate-300";

const linkText =
  "font-semibold text-teal-700 transition-colors duration-300 hover:text-teal-800 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300";

const inputStyles =
  "h-11 rounded-xl border-slate-200 bg-white/80 text-sm text-slate-900 transition-all duration-300 placeholder:text-slate-400 hover:border-teal-300 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white dark:placeholder:text-slate-500 dark:hover:border-teal-700 dark:focus-visible:border-emerald-400 dark:focus-visible:ring-emerald-400/25";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const routeState = location.state as { email?: string } | null;

  const [email, setEmail] = useState(routeState?.email || "");
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;

    const id = setTimeout(() => {
      setCooldown((current) => current - 1);
    }, 1000);

    return () => clearTimeout(id);
  }, [cooldown]);

  const resend = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error("Masukkan alamat email terlebih dahulu.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
      });

      if (error) throw error;

      setCooldown(60);
      toast.success(
        "Email verifikasi berhasil dikirim. Periksa kotak masuk atau folder spam."
      );
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal mengirim ulang email verifikasi."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToDashboard = async () => {
    setChecking(true);

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;

      if (session?.user?.email_confirmed_at) {
        navigate("/dashboard", { replace: true });
      } else {
        toast.info("Silakan masuk setelah verifikasi email Anda.");
        navigate("/login", { replace: true });
      }
    } catch {
      toast.error("Gagal memeriksa sesi akun. Silakan coba lagi.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="relative isolate w-full overflow-hidden rounded-3xl border border-white/80 bg-white/75 p-6 text-center shadow-[0_30px_80px_-40px_rgba(6,78,59,0.45)] ring-1 ring-inset ring-white/60 backdrop-blur-xl transition-colors duration-300 dark:border-emerald-900/40 dark:bg-slate-900/70 dark:shadow-[0_30px_80px_-40px_rgba(16,185,129,0.25)] dark:ring-white/5 sm:p-8">
      {/* DEKORASI BACKGROUND (tidak interaktif) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-emerald-400/30 blur-3xl dark:bg-emerald-500/15" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-teal-300/35 blur-3xl dark:bg-teal-600/15" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(5,150,105,0.2)_1px,transparent_1.5px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_80%_45%_at_50%_0%,#000_20%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_80%_45%_at_50%_0%,#000_20%,transparent_100%)] dark:bg-[radial-gradient(rgba(110,231,183,0.16)_1px,transparent_1.5px)]" />
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent dark:via-emerald-500/40" />
        <div className="absolute -left-10 top-10 h-32 w-32 rounded-full border border-emerald-400/40 dark:border-emerald-400/10" />
      </div>

      <span className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-700 to-emerald-600 text-white shadow-lg shadow-teal-700/25 ring-4 ring-emerald-100/80 dark:from-emerald-400 dark:to-teal-400 dark:text-[#123b29] dark:shadow-emerald-500/20 dark:ring-emerald-900/40">
        <MailCheck className="h-9 w-9" />
      </span>

      <h1
        className={`mt-6 text-3xl font-black tracking-[-0.04em] ${headingText}`}
      >
        Periksa email Anda
      </h1>

      <p className={`mt-3 text-sm leading-7 sm:text-base ${mutedText}`}>
        Masukkan alamat email yang digunakan saat mendaftar.
        Kami akan mengirimkan tautan verifikasi ke alamat tersebut.
      </p>

      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
        Periksa juga folder spam atau promosi.
      </p>

      <div className="mt-8 space-y-3 text-left">
        <label
          htmlFor="verification-email"
          className="text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          Alamat Email
        </label>

        <Input
          id="verification-email"
          type="email"
          placeholder="nama@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          disabled={loading}
          className={inputStyles}
        />

        <Button
          size="lg"
          variant="outline"
          className="h-12 w-full rounded-xl border-slate-300 bg-white/80 font-bold text-slate-700 transition-all duration-300 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-teal-700 dark:hover:bg-slate-800"
          onClick={resend}
          disabled={loading || cooldown > 0}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" />
              Mengirim...
            </>
          ) : cooldown > 0 ? (
            `Kirim ulang dalam ${cooldown} detik`
          ) : (
            "Kirim ulang email verifikasi"
          )}
        </Button>

        <Button
          size="lg"
          className="h-12 w-full rounded-xl bg-teal-700 font-bold text-white shadow-lg shadow-teal-700/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-xl disabled:hover:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:bg-emerald-500 dark:text-slate-950 dark:shadow-emerald-500/10 dark:hover:bg-emerald-400"
          onClick={handleProceedToDashboard}
          disabled={checking}
        >
          {checking ? (
            <>
              <Loader2 className="animate-spin" />
              Memeriksa...
            </>
          ) : (
            "Lanjut ke Halaman Masuk"
          )}
        </Button>
      </div>

      <div className="mt-8 border-t border-slate-200/80 pt-5 dark:border-slate-700/70">
        <p className={`text-sm ${mutedText}`}>
          Salah email?{" "}
          <Link to="/register" className={linkText}>
            Daftar ulang
          </Link>
        </p>
      </div>
    </div>
  );
}
