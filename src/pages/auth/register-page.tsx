import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthHeading, FieldError, FormAlert, GoogleButton, OrDivider } from "@/components/auth/auth-bits";
import * as AuthService from "@/services/auth.service";
import { isValidEmail } from "@/utils/format";

// Safe resolution untuk fungsi signUp agar tidak bernilai undefined
const safeSignUp =
  (AuthService as any).signUp ||
  (AuthService as any).default?.signUp ||
  (async () => ({ ok: false, message: "Layanan pendaftaran belum siap." }));

type Errors = Partial<Record<"name" | "email" | "password" | "confirm" | "terms", string>>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError("");
    const next: Errors = {};
    if (form.name.trim().length < 3) next.name = "Nama minimal 3 karakter.";
    if (!isValidEmail(form.email)) next.email = "Masukkan alamat email yang valid.";
    if (form.password.length < 8) next.password = "Kata sandi minimal 8 karakter.";
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))
      next.password = "Gunakan kombinasi huruf dan angka.";
    if (form.confirm !== form.password) next.confirm = "Konfirmasi kata sandi tidak cocok.";
    if (!terms) next.terms = "Anda perlu menyetujui syarat dan ketentuan.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const res = await safeSignUp(form.name, form.email, form.password);
      if (!res?.ok) {
        setServerError(res?.message || "Gagal mendaftar. Silakan coba lagi.");
        return;
      }
      toast.success("Pendaftaran berhasil! Silakan periksa email Anda.");
      navigate("/verify-email");
    } catch (err: any) {
      setServerError(err?.message || "Terjadi kesalahan saat pendaftaran.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthHeading title="Buat akun gratis" description="Mulai belajar dan berlatih hari ini." />
      <form onSubmit={submit} noValidate className="space-y-4">
        {serverError && <FormAlert type="error">{serverError}</FormAlert>}
        <div className="space-y-2">
          <Label htmlFor="name">Nama lengkap</Label>
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
          <Label htmlFor="email">Email</Label>
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
          <Label htmlFor="password">Kata sandi</Label>
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
          <Label htmlFor="confirm">Konfirmasi kata sandi</Label>
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
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={terms}
              onCheckedChange={(v) => setTerms(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="terms" className="text-sm font-normal leading-snug text-muted-foreground">
              Saya menyetujui <span className="font-semibold text-foreground">Syarat & Ketentuan</span> dan{" "}
              <span className="font-semibold text-foreground">Kebijakan Privasi</span> GradeUp.
            </Label>
          </div>
          <FieldError message={errors.terms} />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="animate-spin" /> Membuat akun...
            </>
          ) : (
            "Daftar Gratis"
          )}
        </Button>
      </form>
      <OrDivider />
      <GoogleButton
        onClick={() =>
          toast.info("Daftar dengan Google belum aktif", {
            description: "Placeholder untuk integrasi Supabase Auth.",
          })
        }
      />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link to="/login" className="font-bold text-primary hover:underline dark:text-accent">
          Masuk
        </Link>
      </p>
    </>
  );
}

// Mengekspor baik default maupun named export untuk keamanan total di Vite/Vercel
export default RegisterPage;
