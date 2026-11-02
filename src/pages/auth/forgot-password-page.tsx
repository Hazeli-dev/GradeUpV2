import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthHeading, FieldError, FormAlert } from "@/components/auth/auth-bits";
import { requestPasswordReset } from "@/services/auth.service";
import { isValidEmail } from "@/utils/format";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError("Masukkan alamat email yang valid.");
      return;
    }
    setError("");
    setLoading(true);
    await requestPasswordReset(email);
    setLoading(false);
    setSent(true);
  };

  return (
    <>
      <AuthHeading title="Lupa kata sandi?" description="Masukkan email Anda dan kami akan mengirim tautan untuk mengatur ulang kata sandi." />
      {sent ? (
        <div className="space-y-5">
          <FormAlert type="success">Jika email terdaftar, tautan pengaturan ulang akan dikirim. (Mode demo: tidak ada email yang benar-benar dikirim.)</FormAlert>
          <Button asChild size="lg" className="w-full"><Link to="/reset-password">Lanjut ke halaman reset (demo)</Link></Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} />
            <FieldError message={error} />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="animate-spin" /> Mengirim...</> : "Kirim Tautan Reset"}
          </Button>
        </form>
      )}
      <Link to="/login" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Kembali ke halaman masuk
      </Link>
    </>
  );
}
