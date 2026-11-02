import { useState, type FormEvent } from "react";
import { Loader2, Mail, MapPin, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeading } from "@/components/shared/page-header";
import { DemoBanner } from "@/components/shared/demo-banner";
import { CONTACT } from "@/constants";
import { isValidEmail } from "@/utils/format";
import { delay } from "@/services/delay";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Nama wajib diisi.";
    if (!isValidEmail(form.email)) next.email = "Masukkan email yang valid.";
    if (!form.subject.trim()) next.subject = "Subjek wajib diisi.";
    if (form.message.trim().length < 10) next.message = "Pesan minimal 10 karakter.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    await delay(900);
    setLoading(false);
    toast.success("Pesan terkirim (simulasi)", { description: "Formulir ini belum terhubung ke server atau email." });
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  const fieldError = (k: string) => errors[k] && <p className="text-xs font-medium text-destructive" role="alert">{errors[k]}</p>;

  return (
    <section className="container py-16 sm:py-24">
      <SectionHeading eyebrow="Kontak" title="Hubungi kami" description="Ada pertanyaan atau masukan? Kirim pesan kepada tim GradeUp." />
      <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          {[[Mail, "Email", CONTACT.email], [Phone, "Telepon", CONTACT.phone], [MapPin, "Alamat", CONTACT.address]].map(([Icon, label, value]) => {
            const I = Icon as typeof Mail;
            return (
              <div key={label as string} className="flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-soft">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-soft text-primary dark:text-accent"><I className="h-5 w-5" /></span>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">{label as string}</p>
                  <p className="text-sm font-bold">{value as string}</p>
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={submit} noValidate className="space-y-4 rounded-3xl border bg-card p-6 shadow-soft sm:p-8 lg:col-span-3">
          <DemoBanner>Formulir belum terhubung ke server atau email.</DemoBanner>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input id="name" value={form.name} onChange={set("name")} placeholder="Nama lengkap" aria-invalid={!!errors.name} />
              {fieldError("name")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={set("email")} placeholder="nama@email.com" aria-invalid={!!errors.email} />
              {fieldError("email")}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Subjek</Label>
            <Input id="subject" value={form.subject} onChange={set("subject")} placeholder="Topik pesan" aria-invalid={!!errors.subject} />
            {fieldError("subject")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Pesan</Label>
            <Textarea id="message" value={form.message} onChange={set("message")} placeholder="Tulis pesan Anda..." aria-invalid={!!errors.message} />
            {fieldError("message")}
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="animate-spin" /> Mengirim...</> : <><Send /> Kirim Pesan</>}
          </Button>
        </form>
      </div>
    </section>
  );
}
