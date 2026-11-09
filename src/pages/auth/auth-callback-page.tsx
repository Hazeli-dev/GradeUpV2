
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function handleCallback() {
      try {
        // Periksa apakah Google mengembalikan pesan error.
        const oauthError =
          searchParams.get("error_description") ||
          searchParams.get("error");

        if (oauthError) {
          throw new Error(oauthError);
        }

        // Ambil sesi login Google dari Supabase.
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (!data.session?.user) {
          throw new Error(
            "Sesi Google belum berhasil dipulihkan. Silakan coba masuk kembali."
          );
        }

        const user = data.session.user;

        // Ambil kode referral dari URL callback.
        const referralCode = searchParams.get("ref")?.trim().toUpperCase();

        // Terapkan referral jika pengguna datang melalui tautan referral.
        if (referralCode) {
          const { data: referralResult, error: referralError } =
            await supabase.rpc("apply_referral_code", {
              p_code: referralCode,
            });

          if (referralError) {
            console.error(
              "Gagal menerapkan kode referral:",
              referralError.message
            );
          } else if (
            referralResult &&
            referralResult.ok === false
          ) {
            console.warn(
              "Kode referral tidak diterapkan:",
              referralResult.message
            );
          }
        }

        if (!active) return;

        // Pastikan tujuan navigasi tetap berada di dalam website.
        const requestedPath = searchParams.get("next") || "/dashboard";

        const safePath =
          requestedPath.startsWith("/") &&
          !requestedPath.startsWith("//")
            ? requestedPath
            : "/dashboard";

        // Login tetap dilanjutkan meskipun referral tidak valid.
        console.info("Google OAuth berhasil:", user.id);

        navigate(safePath, { replace: true });
      } catch (error: unknown) {
        if (!active) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menghubungkan akun Google."
        );
      }
    }

    handleCallback();

    return () => {
      active = false;
    };
  }, [navigate, searchParams]);

  if (errorMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />

          <h1 className="text-xl font-bold">
            Login Google Belum Berhasil
          </h1>

          <p className="text-sm text-muted-foreground">
            {errorMessage}
          </p>

          <Button
            className="w-full"
            onClick={() => navigate("/login", { replace: true })}
          >
            Kembali ke Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />

      <div className="text-center">
        <h1 className="font-bold">
          Menghubungkan Akun Google
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Mohon tunggu, GradeUp sedang mempersiapkan akun Anda.
        </p>
      </div>
    </div>
  );
}
