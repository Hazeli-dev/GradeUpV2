import { useState, type FormEvent, type ChangeEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { GraduationCap, Loader2 } from "lucide-react";
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

/* ------------------------------------------------------------------ */
/* Token gaya (disamakan dengan HomePage dan LoginPage)                */
/* ------------------------------------------------------------------ */

const linkText =
  "font-semibold text-teal-700 transition-colors duration-300 hover:text-teal-800 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300";

const labelText = "text-sm font-semibold text-slate-700 dark:text-slate-200";

/**
 * Gaya untuk semua <input> di dalam form, termasuk input di dalam
 * komponen PasswordInput, tanpa perlu mengubah komponen bersama.
 * Kondisi aria-invalid sengaja dikecualikan agar state error tetap terlihat.
 */
const fieldStyles =
  "[&_input]:h-11 [&_input]:rounded-xl [&_input]:border-slate-200 [&_input]:bg-white/80 [&_input]:text-sm [&_input]:text-slate-900 [&_input]:transition-all [&_input]:duration-300 [&_input]:placeholder:text-slate-400 " +
  "[&_input:not([aria-invalid=true]):hover]:border-teal-300 [&_input:not([aria-invalid=true]):focus-visible]:border-emerald-500 [&_input:not([aria-invalid=true]):focus-visible]:ring-emerald-500/30 " +
  "dark:[&_input]:border-slate-700 dark:[&_input]:bg-slate-900/80 dark:[&_input]:text-white dark:[&_input]:placeholder:text-slate-500 " +
  "dark:[&_input:not([aria-invalid=true]):hover]:border-teal-700 dark:[&_input:not([aria-invalid=true]):focus-visible]:border-emerald-400 dark:[&_input:not([aria-invalid=true]):focus-visible]:ring-emerald-400/25";

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // KODE REFERRAL
  const referralCode = (searchParams.get("ref") || "")
    .trim()
    .toUpperCase();

  // STATE FORM
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

  // HANDLE INPUT
  const set =
    (key: keyof typeof form) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;

      setForm((current) => ({
        ...current,
        [key]: value,
      }));

      setErrors((current) => ({
        ...current,
        [key]: undefined,
      }));

      setServerError("");
    };

  // VALIDASI FORM
  const validateForm = (): Errors => {
    const next: Errors = {};
    const normalizedEmail = form.email.trim().toLowerCase();

    if (form.name.trim().length < 3) {
      next.name = "Nama minimal 3 karakter.";
    }

    if (!isValidEmail(normalizedEmail)) {
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

  // DAFTAR DENGAN EMAIL DAN PASSWORD
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    setServerError("");

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const normalizedEmail = form.email.trim().toLowerCase();

    setLoading(true);

    try {
      const result = await signUp(
        form.name.trim(),
        normalizedEmail,
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

      navigate("/verify-email", {
        replace: true,
        state: {
          email: normalizedEmail,
        },
      });
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
    <div className="relative isolate flex w-full flex-col space-y-6 overflow-hidden rounded-3xl border border-white/80 bg-white/75 p-6 shadow-[0_30px_80px_-40px_rgba(6,78,59,0.45)] ring-1 ring-inset ring-white/60 backdrop-blur-xl transition-colors duration-300 dark:border-emerald-900/40 dark:bg-slate-900/70 dark:shadow-[0_30px_80px_-40px_rgba(16,185,129,0.25)] dark:ring-white/5 sm:p-8">
      {/* DEKORASI BACKGROUND (tidak interaktif) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-emerald-400/30 blur-3xl dark:bg-emerald-500/15" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-teal-300/35 blur-3xl dark:bg-teal-600/15" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(5,150,105,0.2)_1px,transparent_1.5px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_80%_40%_at_50%_0%,#000_20%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_80%_40%_at_50%_0%,#000_20%,transparent_100%)] dark:bg-[radial-gradient(rgba(110,231,183,0.16)_1px,transparent_1.5px)]" />
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent dark:via-emerald-500/40" />
        <div className="absolute -right-10 top-10 h-32 w-32 rounded-full border border-emerald-400/40 dark:border-emerald-400/10" />
      </div>

      <div className="flex flex-col space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-700/25 dark:bg-emerald-400 dark:text-[#123b29] dark:shadow-emerald-500/20">
          <GraduationCap className="h-6 w-6" />
        </div>

        <AuthHeading
          title="Buat akun gratis"
          description="Mulai belajar dan berlatih hari ini."
        />
      </div>

      {serverError && (
        <FormAlert type="error">
          {serverError}
        </FormAlert>
      )}

      {/* INFORMASI REFERRAL */}
      {referralCode && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-sm dark:border-emerald-800/60 dark:bg-emerald-950/40">
          <p className="font-semibold text-teal-800 dark:text-emerald-300">
            Undangan Referral GradeUp
          </p>

          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Kode undangan:{" "}
            <span className="font-bold text-slate-900 dark:text-white">
              {referralCode}
            </span>
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
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
        className={`space-y-4 ${fieldStyles}`}
      >
        <div className="space-y-2">
          <Label htmlFor="name" className={labelText}>
            Nama lengkap
          </Label>

          <Input
            id="name"
            autoComplete="name"
            placeholder="Nama Anda"
            value={form.name}
            onChange={set("name")}
            aria-invalid={!!errors.name}
            disabled={loading}
          />

          <FieldError message={errors.name} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className={labelText}>
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
            disabled={loading}
          />

          <FieldError message={errors.email} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className={labelText}>
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
          <Label htmlFor="confirm" className={labelText}>
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
              disabled={loading}
              onCheckedChange={(value) => {
                setTerms(value === true);

                setErrors((current) => ({
                  ...current,
                  terms: undefined,
                }));
              }}
              className="mt-0.5 border-slate-300 data-[state=checked]:border-teal-700 data-[state=checked]:bg-teal-700 data-[state=checked]:text-white dark:border-slate-600 dark:data-[state=checked]:border-emerald-500 dark:data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:text-slate-950"
            />

            <Label
              htmlFor="terms"
              className="text-sm font-normal leading-snug text-slate-600 dark:text-slate-300"
            >
              Saya menyetujui{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                Syarat & Ketentuan
              </span>{" "}
              dan{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                Kebijakan Privasi
              </span>{" "}
              GradeUp.
            </Label>
          </div>

          <FieldError message={errors.terms} />
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full rounded-xl bg-teal-700 font-bold text-white shadow-lg shadow-teal-700/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-xl disabled:hover:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:bg-emerald-500 dark:text-slate-950 dark:shadow-emerald-500/10 dark:hover:bg-emerald-400"
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
      <div className="border-t border-slate-200/80 pt-5 dark:border-slate-700/70">
        <p className="text-center text-sm text-slate-600 dark:text-slate-300">
          Sudah punya akun?{" "}
          <Link to="/login" className={linkText}>
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
