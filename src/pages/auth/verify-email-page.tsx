import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // Tambahkan useNavigate
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resendVerification } from "@/services/auth.service";
import { supabase } from "@/lib/supabase"; // Import supabase untuk cek sesi

export default function VerifyEmailPage() {
  const navigate = useNavigate(); // Inisialisasi navigate
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const resend = async () => {
    setLoading(true);
    const res = await resendVerification();
    setLoading(false);
    setCooldown(30);
    toast.success(res.message);
  };

  // Fungsi pengecekan sebelum masuk dashboard
  const handleProceedToDashboard = async () => {
    setChecking(true);
    const { data: { session } } = await supabase.auth.getSession();
    setChecking(false);

    if (session) {
      // Jika sesi benar-benar ada/aktif, izinkan ke dashboard
      navigate("/dashboard", { replace: true });
    } else {
      // Jika belum verifikasi / belum ada sesi, arahkan ke login dengan pesan
      toast.info("Silakan masuk setelah verifikasi email Anda.");
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="text-center">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-soft text-primary dark:text-accent">
        <MailCheck className="h-9 w-9" />
      </span>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Periksa email Anda</h1>
      <p className="mt-3 text-muted-foreground">
        Kami akan mengirim tautan verifikasi ke email Anda. Klik tautan tersebut untuk mengaktifkan akun.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">(Silakan periksa kotak masuk atau folder spam Anda.)</p>
      
      <div className="mt-8 space-y-3">
        {/* Tombol diganti dengan handler yang mengecek sesi */}
        <Button size="lg" className="w-full" onClick={handleProceedToDashboard} disabled={checking}>
          {checking ? <><Loader2 className="animate-spin" /> Memeriksa...</> : "Lanjut ke Halaman Masuk"}
        </Button>
        
        <Button size="lg" variant="outline" className="w-full" onClick={resend} disabled={loading || cooldown > 0}>
          {loading ? <><Loader2 className="animate-spin" /> Mengirim...</> : cooldown > 0 ? `Kirim ulang dalam ${cooldown} dtk` : "Kirim ulang email"}
        </Button>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Salah email? <Link to="/register" className="font-bold text-primary hover:underline dark:text-accent">Daftar ulang</Link>
      </p>
    </div>
  );
}
