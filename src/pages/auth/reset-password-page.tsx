
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import {
  AuthHeading,
  FieldError,
  FormAlert,
} from "@/components/auth/auth-bits";

import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{
    password?: string;
    confirm?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    let active = true;

    const checkRecoverySession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!active) return;

      setValidSession(!error && !!session);
      setChecking(false);
    };

    checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "PASSWORD_RECOVERY") {
        setValidSession(!!session);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const next: typeof errors = {};

    if (password.length < 8) {
      next.password = "Kata sandi minimal 8 karakter.";
    } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      next.password = "Gunakan kombinasi huruf dan angka.";
    }

    if (confirm !== password) {
      next.confirm = "Konfirmasi kata sandi tidak cocok.";
    }

    setErrors(next);

    if (Object.keys(next).length > 0) return;

    if (!validSession) {
      toast.error("Sesi reset tidak valid atau sudah kedaluwarsa.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      await supabase.auth.signOut();

      toast.success("Kata sandi berhasil diperbarui. Silakan masuk kembali.");

      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Reset password error:", err);

      toast.error(
        "Gagal memperbarui kata sandi. Silakan buka kembali tautan reset dari email."
      );
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Memeriksa tautan reset...
        </p>
      </div>
    );
  }

  if (!validSession) {
    return (
      <>
        <AuthHeading
          title="Tautan tidak valid"
          description="Sesi reset kata sandi tidak ditemukan atau sudah kedaluwarsa."
        />

        <FormAlert type="error">
          Silakan minta tautan reset kata sandi yang baru.
        </FormAlert>

        <Button asChild size="lg" className="mt-5 w-full">
          <Link to="/forgot-password">
            Minta Tautan Reset Baru
          </Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <AuthHeading
        title="Atur ulang kata sandi"
        description="Buat kata sandi baru untuk akun Anda."
      />

      <form
        onSubmit={submit}
        noValidate
        className="space-y-5"
      >
        <div className="space-y-2">
          <Label htmlFor="password">Kata sandi baru</Label>

          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((prev) => ({
                ...prev,
                password: undefined,
              }));
            }}
            aria-invalid={!!errors.password}
          />

          <FieldError message={errors.password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">
            Konfirmasi kata sandi baru
          </Label>

          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setErrors((prev) => ({
                ...prev,
                confirm: undefined,
              }));
            }}
            aria-invalid={!!errors.confirm}
          />

          <FieldError message={errors.confirm} />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" />
              Menyimpan...
            </>
          ) : (
            "Simpan Kata Sandi"
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link
          to="/login"
          className="font-bold text-primary hover:underline dark:text-accent"
        >
          Kembali ke halaman masuk
        </Link>
      </p>
    </>
  );
}
