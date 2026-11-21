import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
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

/* ------------------------------------------------------------------ */
/* Dekorasi visual (murni tampilan, tidak interaktif)                  */
/* ------------------------------------------------------------------ */

const patternLine =
  "[--gu-line:rgba(15,118,110,0.16)] dark:[--gu-line:rgba(52,211,153,0.13)]";
const patternDot =
  "[--gu-dot:rgba(5,150,105,0.42)] dark:[--gu-dot:rgba(110,231,183,0.28)]";

function ContactStyles() {
  return (
    <style>{`
      @keyframes gu-drift {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(22px, -16px, 0) scale(1.07); }
      }
      @keyframes gu-drift-rev {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(-20px, 14px, 0) scale(1.06); }
      }
      @keyframes gu-reveal {
        from { opacity: 0; transform: translate3d(0, 16px, 0); }
        to { opacity: 1; transform: translate3d(0, 0, 0); }
      }
      .gu-drift { animation: gu-drift 20s ease-in-out infinite; }
      .gu-drift-rev { animation: gu-drift-rev 24s ease-in-out infinite; }
      .gu-reveal { animation: gu-reveal 0.8s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .gu-reveal-delay { animation-delay: 0.15s; }

      .gu-grid {
        background-image:
          linear-gradient(to right, var(--gu-line) 1px, transparent 1px),
          linear-gradient(to bottom, var(--gu-line) 1px, transparent 1px);
        background-size: 44px 44px;
        -webkit-mask-image: radial-gradient(ellipse 75% 65% at 50% 30%, #000 25%, transparent 100%);
        mask-image: radial-gradient(ellipse 75% 65% at 50% 30%, #000 25%, transparent 100%);
      }
      .gu-dots {
        background-image: radial-gradient(var(--gu-dot) 1.2px, transparent 1.5px);
        background-size: 24px 24px;
        -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 60%, #000 20%, transparent 100%);
        mask-image: radial-gradient(ellipse 70% 60% at 50% 60%, #000 20%, transparent 100%);
      }

      @media (prefers-reduced-motion: reduce) {
        .gu-drift, .gu-drift-rev, .gu-reveal {
          animation: none !important;
        }
      }
    `}</style>
  );
}

function DecorLayer({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {children}
    </div>
  );
}

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
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#c9ecd8] via-[#e6f5ec] to-[#d3eddf] dark:from-[#0b2418] dark:via-[#0d2a1b] dark:to-[#0c2418]">
      <ContactStyles />

      <DecorLayer>
        <div className={`gu-grid absolute inset-0 ${patternLine}`} />
        <div className={`gu-dots absolute inset-x-0 bottom-0 h-2/3 ${patternDot}`} />
        <div className="gu-drift absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-emerald-400/55 blur-[100px] dark:bg-emerald-500/25" />
        <div className="gu-drift-rev absolute -left-32 top-1/3 h-[26rem] w-[26rem] rounded-full bg-teal-400/50 blur-[100px] dark:bg-teal-500/25" />
        <div className="absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-emerald-300/55 blur-3xl dark:bg-emerald-700/20" />
        <div className="absolute right-[6%] top-16 h-64 w-64 rounded-full border border-emerald-400/45 dark:border-emerald-400/10" />
        <div className="absolute right-[10%] top-24 h-40 w-40 rounded-full border border-teal-400/45 dark:border-teal-400/10" />
        <div className="absolute -left-10 top-56 h-36 w-36 rotate-12 rounded-[2rem] border border-teal-400/45 bg-gradient-to-br from-white/70 to-emerald-200/30 dark:border-teal-400/20 dark:from-white/5" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent dark:via-emerald-500/30" />
      </DecorLayer>

      <div className="container py-16 sm:py-24">
        <div className="gu-reveal">
          <SectionHeading
            eyebrow="Kontak"
            title="Hubungi kami"
            description="Ada pertanyaan atau masukan? Kirim pesan kepada tim GradeUp."
          />
        </div>

        <div className="gu-reveal gu-reveal-delay mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-5">
          {/* INFORMASI KONTAK */}
          <div className="space-y-4 lg:col-span-2">
            {contactItems.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="group relative flex items-start gap-4 overflow-hidden rounded-2xl border border-emerald-200/70 bg-card/90 p-5 shadow-[0_12px_32px_-20px_rgba(15,118,110,0.4)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/60 hover:shadow-[0_24px_50px_-24px_rgba(15,118,110,0.5)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-emerald-900/40"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-14 -right-14 h-36 w-36 rounded-full bg-emerald-400/0 blur-3xl transition-colors duration-500 group-hover:bg-emerald-400/25 dark:group-hover:bg-emerald-500/15"
                />

                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-primary dark:bg-emerald-950 dark:text-accent">
                  <Icon className="h-5 w-5" />
                </span>

                <div className="relative min-w-0">
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
          <div className="relative lg:col-span-3">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-emerald-400/40 via-teal-300/25 to-transparent blur-2xl dark:from-emerald-600/20 dark:via-teal-700/10"
            />

            <form
              onSubmit={submit}
              noValidate
              className="relative space-y-4 rounded-3xl border border-emerald-200/70 bg-card/90 p-6 shadow-[0_30px_80px_-35px_rgba(15,118,110,0.5)] ring-1 ring-emerald-900/[0.04] backdrop-blur-md dark:border-emerald-900/40 dark:ring-white/5 sm:p-8"
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
                className="w-full shadow-lg shadow-emerald-700/20"
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
        </div>
      </div>
    </section>
  );
}
