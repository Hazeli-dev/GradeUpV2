
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
} from "@/components/auth/auth-bits";

import { signUp } from "@/services/auth.service";
import { isValidEmail } from "@/utils/format";

type Errors = Partial<
  Record<"name" | "email" | "password" | "confirm" | "terms", string>
>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Kode referral dari URL
  const referralCode = (
    searchParams.get("ref") || ""
  ).trim().toUpperCase();

  // State form
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

  // Handle input
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

  // Validasi form
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

  // Daftar dengan email
  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (loading) return;

    setServerError("");

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      const result = await signUp(
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
    } catch (error: unknown) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat pendaftaran."
      );
    } finally {
      setLoading(false);
    }
  };

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
          disabled={loading}
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
