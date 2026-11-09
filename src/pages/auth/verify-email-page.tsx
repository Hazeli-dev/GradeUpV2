
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

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
    <div className="text-center">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-soft text-primary dark:text-accent">
        <MailCheck className="h-9 w-9" />
      </span>

      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">
        Periksa email Anda
      </h1>

      <p className="mt-3 text-muted-foreground">
        Masukkan alamat email yang digunakan saat mendaftar.
        Kami akan mengirimkan tautan verifikasi ke alamat tersebut.
      </p>

      <p className="mt-2 text-xs text-muted-foreground">
        Periksa juga folder spam atau promosi.
      </p>

      <div className="mt-8 space-y-3 text-left">
        <label
          htmlFor="verification-email"
          className="text-sm font-medium"
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
        />

        <Button
          size="lg"
          variant="outline"
          className="w-full"
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
          className="w-full"
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

      <p className="mt-8 text-sm text-muted-foreground">
        Salah email?{" "}
        <Link
          to="/register"
          className="font-bold text-primary hover:underline dark:text-accent"
        >
          Daftar ulang
        </Link>
      </p>
    </div>
  );
}
