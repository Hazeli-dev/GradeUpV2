
import { useState, type FormEvent, type ChangeEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";

import {
  AuthHeading,
  FieldError,
  FormAlert,
  GoogleButton,
  OrDivider,
} from "@/components/auth/auth-bits";

import * as AuthService from "@/services/auth.service";
import { isValidEmail } from "@/utils/format";

// ======================================================
// RESOLUSI FUNGSI AUTENTIKASI
// ======================================================

const safeSignUp =
  AuthService.signUp ||
  AuthService.default?.signUp;

const safeGoogleSignIn =
  AuthService.signInWithGoogle ||
  AuthService.default?.signInWithGoogle;

// ======================================================
// TIPE DATA
// ======================================================

type Errors = Partial<
  Record<"name" | "email" | "password" | "confirm" | "terms", string>
>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ====================================================
  // REFERRAL CODE
  // ====================================================

  const referralCode = (
    searchParams.get("ref") || ""
  ).trim().toUpperCase();

  // ====================================================
  // STATE FORM
  // ====================================================

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });

  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // ====================================================
  // HANDLE INPUT
  // ====================================================

  const set =
    (key: keyof typeof form) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [key]: event.target.value,
      }));

      setErrors((current) => ({
        ...current,
        [key]: undefined,
      }));
    };

  // ====================================================
  // VALIDASI FORM
  // ====================================================

  const validateForm = (): Errors => {
    const next: Errors = {};

    if (form.name.trim().length < 3) {
      next.name = "Nama minimal 3 karakter.";
    }

    if (!isValidEmail(form.email)) {
      next.email = "Masukkan alamat email yang valid.";
    }

    if (form.password.length < 8) {
      next.password = "Kata sandi minimal 8 karakter.";
    } else if (
      !/[A-Za-z]/.test(form.password) ||
      !/\d/.test(form.password)
    ) {
      next.password = "Gunakan kombinasi huruf dan angka.";
    }

    if (form.confirm !== form.password) {
      next.confirm = "Konfirmasi kata sandi tidak cocok.";
    }

    if (!terms) {
      next.terms = "Anda perlu menyetujui syarat dan ketentuan.";
    }

    return next;
  };

  // ====================================================
  // DAFTAR DENGAN EMAIL
  // ====================================================

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (loading || googleLoading) return;

    setServerError("");

    const validationErrors = validateForm();

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    if (!safeSignUp) {
      setServerError("Layanan pendaftaran belum tersedia.");
      return;
    }

    setLoading(true);

    try {
      const result = await safeSignUp(
        form.name.trim(),
        form.email.trim(),
        form.password,
        referralCode || undefined
      );

      if (!result?.ok) {
        setServerError(
          result?.message || "Gagal mendaftar. Silakan coba lagi."
        );
        return;
      }

      toast.success(
        "Pendaftaran berhasil! Silakan periksa email Anda."
      );

      navigate("/verify-email");
    } catch (error: any) {
      setServerError(
        error?.message || "Terjadi kesalahan saat pendaftaran."
      );
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // DAFTAR DENGAN GOOGLE
  // ====================================================

  const handleGoogleSignUp = async () => {
    if (loading || googleLoading) return;

    setServerError("");

    if (!safeGoogleSignIn) {
      setServerError(
        "Layanan Google belum tersedia. Silakan coba lagi."
      );
      return;
    }

    setGoogleLoading(true);

    try {
      // Kirim referral code agar terbawa ke OAuth callback.
      const result = await safeGoogleSignIn(
        referralCode || undefined
      );

      if (!result?.ok) {
        setServerError(
          result?.message || "Gagal mendaftar dengan Google."
        );

        setGoogleLoading(false);
      }

      // Jika berhasil, Supabase akan mengarahkan browser ke Google.
      // Loading tidak perlu dimatikan karena browser akan berpindah.
    } catch (error: any) {
      setServerError(
        error?.message ||
          "Terjadi kesalahan saat menghubungkan Google."
      );

      setGoogleLoading(false);
    }
  };

  // ====================================================
  // TAMPILAN
  // ====================================================

  return (
    <>
      <AuthHeading
        title="Buat akun gratis"
        description="Mulai belajar dan berlatih hari ini."
      />

      {serverError && (
        <FormAlert type="error">
          {serverError}
        </FormAlert>
      )}

      {/* INFORMASI REFERRAL */}
      {referralCode && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <p className="font-semibold text-primary">
            Undangan Referral GradeUp
          </p>

          <p className="mt-1 text-muted-foreground">
            Kode undangan:{" "}
            <span className="font-bold text-foreground">
              {referralCode}
            </span>
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Selesaikan pendaftaran dan pembelian Premium pertama
            sesuai ketentuan referral untuk membantu pengundang
            memperoleh hadiah.
          </p>
        </div>
      )}

      {/* FORM PENDAFTARAN */}
      <form
        onSubmit={submit}
        noValidate
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="name">
            Nama lengkap
          </Label>

          <Input
            id="name"
            autoComplete="name"
            placeholder="Nama Anda"
            value={form.name}
            onChange={set("name")}
            aria-invalid={!!errors.name}
          />

          <FieldError message={errors.name} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            Email
          </Label>

          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            value={form.email}
            onChange={set("email")}
            aria-invalid={!!errors.email}
          />

          <FieldError message={errors.email} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">
            Kata sandi
          </Label>

          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Minimal 8 karakter, huruf dan angka"
            value={form.password}
            onChange={set("password")}
            aria-invalid={!!errors.password}
          />

          <FieldError message={errors.password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">
            Konfirmasi kata sandi
          </Label>

          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            placeholder="Ulangi kata sandi"
            value={form.confirm}
            onChange={set("confirm")}
            aria-invalid={!!errors.confirm}
          />

          <FieldError message={errors.confirm} />
        </div>

        {/* PERSETUJUAN */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={terms}
              onCheckedChange={(value) => {
                setTerms(value === true);

                setErrors((current) => ({
                  ...current,
                  terms: undefined,
                }));
              }}
              className="mt-0.5"
            />

            <Label
              htmlFor="terms"
              className="text-sm font-normal leading-snug text-muted-foreground"
            >
              Saya menyetujui{" "}
              <span className="font-semibold text-foreground">
                Syarat & Ketentuan
              </span>{" "}
              dan{" "}
              <span className="font-semibold text-foreground">
                Kebijakan Privasi
              </span>{" "}
              GradeUp.
            </Label>
          </div>

          <FieldError message={errors.terms} />
        </div>

        {/* TOMBOL DAFTAR */}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loading || googleLoading}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" />
              Membuat akun...
            </>
          ) : (
            "Daftar Gratis"
          )}
        </Button>
      </form>

      <OrDivider />

      {/* GOOGLE REGISTER */}
      <GoogleButton
        onClick={handleGoogleSignUp}
      />

      {googleLoading && (
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Menghubungkan ke Google...
        </p>
      )}

      {/* LINK LOGIN */}
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link
          to="/login"
          className="font-bold text-primary hover:underline dark:text-accent"
        >
          Masuk
        </Link>
      </p>
    </>
  );
}

export default RegisterPage;
