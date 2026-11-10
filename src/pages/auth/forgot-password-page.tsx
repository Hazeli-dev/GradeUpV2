
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AuthHeading,
  FieldError,
  FormAlert,
} from "@/components/auth/auth-bits";

import { supabase } from "@/lib/supabase";
import { isValidEmail } from "@/utils/format";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setError("Masukkan alamat email yang valid.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo,
          }
        );

      if (resetError) {
        throw resetError;
      }

      setSent(true);
    } catch (err) {
      console.error("Password reset error:", err);

      setError(
        "Gagal mengirim tautan reset password. Silakan coba beberapa saat lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthHeading
        title="Lupa kata sandi?"
        description="Masukkan email Anda dan kami akan mengirim tautan untuk mengatur ulang kata sandi."
      />

      {sent ? (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <MailCheck className="h-14 w-14 text-primary" />

            <h3 className="text-lg font-semibold">
              Periksa Email Anda
            </h3>

            <p className="text-sm text-muted-foreground">
              Jika email terdaftar, tautan pengaturan ulang kata
              sandi akan dikirim ke:
            </p>

            <p className="font-semibold break-all">
              {email.trim().toLowerCase()}
            </p>
          </div>

          <FormAlert type="success">
            Permintaan reset password berhasil diproses.
            Silakan periksa kotak masuk atau folder spam email Anda.
          </FormAlert>

          <Button
            asChild
            size="lg"
            className="w-full"
          >
            <Link to="/login">
              Kembali ke halaman masuk
            </Link>
          </Button>
        </div>
      ) : (
        <form
          onSubmit={submit}
          noValidate
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>

            <Input
              id="email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              autoComplete="email"
              disabled={loading}
              aria-invalid={!!error}
              required
            />

            <FieldError message={error} />
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
                Mengirim...
              </>
            ) : (
              "Kirim Tautan Reset"
            )}
          </Button>
        </form>
      )}

      <Link
        to="/login"
        className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke halaman masuk
      </Link>
    </>
  );
}
