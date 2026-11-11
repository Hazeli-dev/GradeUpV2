
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Loader2,
  Mail,
  MapPin,
  Phone,
  Send,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeading } from "@/components/shared/page-header";
import { CONTACT } from "@/constants";
import { isValidEmail } from "@/utils/format";
import { supabase } from "@/lib/supabase";

type ContactForm = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type PlatformContact = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

const INITIAL_FORM: ContactForm = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

const DEFAULT_CONTACT: PlatformContact = {
  name: "Tim GradeUp",
  email: CONTACT.email,
  phone: CONTACT.phone,
  address: CONTACT.address,
};

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const [contact, setContact] =
    useState<PlatformContact>(DEFAULT_CONTACT);
  const [loadingContact, setLoadingContact] = useState(true);

  // Ambil informasi kontak terbaru dari Supabase.
  useEffect(() => {
    let active = true;

    async function fetchContact() {
      try {
        const { data, error } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "platform_contact")
          .maybeSingle();

        if (error) throw error;

        if (!active) return;

        if (data?.value && typeof data.value === "object") {
          const value = data.value as Partial<PlatformContact>;

          setContact({
            name: value.name?.trim() || DEFAULT_CONTACT.name,
            email: value.email?.trim() || DEFAULT_CONTACT.email,
            phone: value.phone?.trim() || DEFAULT_CONTACT.phone,
            address:
              value.address?.trim() || DEFAULT_CONTACT.address,
          });
        }
      } catch (error) {
        console.error("Gagal memuat informasi kontak:", error);
      } finally {
        if (active) setLoadingContact(false);
      }
    }

    fetchContact();

    return () => {
      active = false;
    };
  }, []);

  const set =
    (key: keyof ContactForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({
        ...current,
        [key]: event.target.value,
      }));

      setErrors((current) => ({
        ...current,
        [key]: "",
      }));
    };

  const validate = () => {
    const next: Record<string, string> = {};

    const name = form.name.trim();
    const email = form.email.trim();
    const subject = form.subject.trim();
    const message = form.message.trim();

    if (!name) {
      next.name = "Nama wajib diisi.";
    } else if (name.length > 100) {
      next.name = "Nama maksimal 100 karakter.";
    }

    if (!email || !isValidEmail(email)) {
      next.email = "Masukkan email yang valid.";
    } else if (email.length > 254) {
      next.email = "Email terlalu panjang.";
    }

    if (!subject) {
      next.subject = "Subjek wajib diisi.";
    } else if (subject.length > 150) {
      next.subject = "Subjek maksimal 150 karakter.";
    }

    if (message.length < 10) {
      next.message = "Pesan minimal 10 karakter.";
    } else if (message.length > 5000) {
      next.message = "Pesan maksimal 5.000 karakter.";
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  // Kirim pesan melalui Supabase Edge Function dan Resend.
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading || !validate()) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "send-contact-email",
        {
          body: {
            name: form.name.trim(),
            email: form.email.trim(),
            subject: form.subject.trim(),
            message: form.message.trim(),
          },
        },
      );

      if (error) {
        console.error("Contact email error:", error);
        throw new Error(
          "Pesan belum berhasil dikirim. Silakan coba lagi.",
        );
      }

      if (!data?.success) {
        throw new Error(
          data?.error || "Terjadi kesalahan saat mengirim pesan.",
        );
      }

      toast.success("Pesan berhasil dikirim!", {
        description:
          "Terima kasih telah menghubungi GradeUp. Tim kami akan segera memeriksa pesan Anda.",
      });

      setForm(INITIAL_FORM);
      setErrors({});
    } catch (error) {
      console.error("Contact form submission failed:", error);

      toast.error("Pesan gagal dikirim", {
        description:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan. Silakan coba beberapa saat lagi.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (key: keyof ContactForm) =>
    errors[key] ? (
      <p className="text-xs font-medium text-destructive" role="alert">
        {errors[key]}
      </p>
    ) : null;

  const contactItems = [
    {
      icon: UserRound,
      label: "Nama Kontak",
      value: contact.name,
    },
    {
      icon: Mail,
      label: "Email",
      value: contact.email,
    },
    {
      icon: Phone,
      label: "Telepon",
      value: contact.phone,
    },
    {
      icon: MapPin,
      label: "Alamat",
      value: contact.address,
    },
  ];

  return (
    <section className="container py-16 sm:py-24">
      <SectionHeading
        eyebrow="Kontak"
        title="Hubungi kami"
        description="Ada pertanyaan atau masukan? Kirim pesan kepada tim GradeUp."
      />

      <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-5">
        {/* INFORMASI KONTAK */}
        <div className="space-y-4 lg:col-span-2">
          {contactItems.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-soft"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-soft text-primary dark:text-accent">
                <Icon className="h-5 w-5" />
              </span>

              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">
                  {label}
                </p>

                <p className="break-words text-sm font-bold">
                  {loadingContact ? (
                    <span className="inline-flex items-center gap-2 font-normal text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Memuat...
                    </span>
                  ) : (
                    value
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* FORMULIR KONTAK */}
        <form
          onSubmit={submit}
          noValidate
          className="space-y-4 rounded-3xl border bg-card p-6 shadow-soft sm:p-8 lg:col-span-3"
        >
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-medium">
              Ada yang ingin ditanyakan?
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Kirim pesan melalui formulir ini. Pesan Anda akan diteruskan
              langsung ke tim admin GradeUp melalui email.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>

              <Input
                id="name"
                value={form.name}
                onChange={set("name")}
                placeholder="Nama lengkap"
                maxLength={100}
                aria-invalid={!!errors.name}
                aria-describedby={
                  errors.name ? "name-error" : undefined
                }
              />

              {fieldError("name")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>

              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="nama@email.com"
                maxLength={254}
                aria-invalid={!!errors.email}
                aria-describedby={
                  errors.email ? "email-error" : undefined
                }
              />

              {fieldError("email")}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subjek</Label>

            <Input
              id="subject"
              value={form.subject}
              onChange={set("subject")}
              placeholder="Topik pesan"
              maxLength={150}
              aria-invalid={!!errors.subject}
            />

            {fieldError("subject")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Pesan</Label>

            <Textarea
              id="message"
              value={form.message}
              onChange={set("message")}
              placeholder="Tulis pesan Anda..."
              maxLength={5000}
              aria-invalid={!!errors.message}
            />

            {fieldError("message")}

            <p className="text-right text-xs text-muted-foreground">
              {form.message.length}/5000 karakter
            </p>
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
              <>
                <Send />
                Kirim Pesan
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Informasi Anda digunakan untuk keperluan komunikasi dengan tim
            GradeUp.
          </p>
        </form>
      </div>
    </section>
  );
}
