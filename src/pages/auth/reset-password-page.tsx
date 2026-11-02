import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthHeading, FieldError } from "@/components/auth/auth-bits";
import { resetPassword } from "@/services/auth.service";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (password.length < 8) next.password = "Kata sandi minimal 8 karakter.";
    else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) next.password = "Gunakan kombinasi huruf dan angka.";
    if (confirm !== password) next.confirm = "Konfirmasi kata sandi tidak cocok.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    await resetPassword(password);
    setLoading(false);
    toast.success("Kata sandi diperbarui (demo)");
    navigate("/login");
  };

  return (
    <>
      <AuthHeading title="Atur ulang kata sandi" description="Buat kata sandi baru untuk akun Anda." />
      <form onSubmit={submit} noValidate className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password">Kata sandi baru</Label>
          <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} />
          <FieldError message={errors.password} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Konfirmasi kata sandi baru</Label>
          <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={!!errors.confirm} />
          <FieldError message={errors.confirm} />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <><Loader2 className="animate-spin" /> Menyimpan...</> : "Simpan Kata Sandi"}
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-bold text-primary hover:underline dark:text-accent">Kembali ke halaman masuk</Link>
      </p>
    </>
  );
}
