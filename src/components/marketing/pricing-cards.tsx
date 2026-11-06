```tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Crown, Loader2, RefreshCw } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { pricingPlans } from "@/data/marketing";
import { formatRupiah } from "@/utils/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PremiumPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  duration_months: number;
  features: string[] | null;
  is_active: boolean;
  sort_order: number;
}

interface SnapCallbacks {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
}

interface PaymentStatusResponse {
  success?: boolean;
  invoice?: string;
  amount?: number;
  database_status?: string;
  midtrans_status?: string;
  payment_type?: string;
  transaction_id?: string;
  qris_url?: string | null;
  message?: string;
  error?: string;
}

declare global {
  interface Window {
    snap?: {
      pay: (token: string, callbacks?: SnapCallbacks) => void;
    };
  }
}

const MIDTRANS_CLIENT_KEY =
  import.meta.env.VITE_MIDTRANS_CLIENT_KEY;

const SNAP_SCRIPT_URL =
  "https://app.sandbox.midtrans.com/snap/snap.js";

export function PricingCards() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const [snapReady, setSnapReady] = useState(false);
  const [message, setMessage] = useState("");

  const [lastInvoice, setLastInvoice] = useState("");
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatusResponse | null>(null);

  const selectedPlanId = searchParams.get("plan");

  // Memuat paket aktif dari Supabase.
  useEffect(() => {
    let mounted = true;

    async function loadPlans() {
      setIsLoading(true);
      setLoadingError("");

      const { data, error } = await supabase
        .from("premium_plans")
        .select(
          "id, code, name, description, price, duration_months, features, is_active, sort_order"
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!mounted) return;

      if (error) {
        console.error("Premium plans error:", error);
        setLoadingError("Paket Premium gagal dimuat. Silakan coba lagi.");
        setPlans([]);
      } else {
        setPlans((data ?? []) as PremiumPlan[]);
      }

      setIsLoading(false);
    }

    loadPlans();

    return () => {
      mounted = false;
    };
  }, []);

  // Memuat Midtrans Snap.js menggunakan Client Key dari Vercel.
  useEffect(() => {
    if (!MIDTRANS_CLIENT_KEY) {
      console.error("VITE_MIDTRANS_CLIENT_KEY belum dikonfigurasi.");
      return;
    }

    if (window.snap) {
      setSnapReady(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${SNAP_SCRIPT_URL}"]`
    );

    const script = existingScript ?? document.createElement("script");

    const handleLoad = () => {
      setSnapReady(Boolean(window.snap));
    };

    const handleError = () => {
      setSnapReady(false);
      console.error("Gagal memuat Midtrans Snap.");
    };

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);

    if (!existingScript) {
      script.src = SNAP_SCRIPT_URL;
      script.async = true;
      script.setAttribute("data-client-key", MIDTRANS_CLIENT_KEY);
      document.body.appendChild(script);
    }

    return () => {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };
  }, []);

  // Membuat transaksi pembayaran.
  const handleChoosePlan = async (plan: PremiumPlan) => {
    if (checkoutPlanId) return;

    setMessage("");
    setPaymentStatus(null);
    setLastInvoice("");

    // Pastikan pengguna sudah login.
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      setMessage("Tidak dapat memeriksa sesi login. Silakan coba lagi.");
      return;
    }

    if (!session?.user) {
      const destination = `/pricing?plan=${encodeURIComponent(plan.id)}`;

      navigate(`/login?redirect=${encodeURIComponent(destination)}`);
      return;
    }

    if (!MIDTRANS_CLIENT_KEY) {
      setMessage("Konfigurasi pembayaran belum tersedia.");
      return;
    }

    if (!snapReady || !window.snap) {
      setMessage("Midtrans belum siap dimuat. Silakan coba beberapa saat lagi.");
      return;
    }

    setCheckoutPlanId(plan.id);

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-payment",
        {
          body: {
            plan_id: plan.id,
          },
        }
      );

      if (error) {
        console.error("Create payment error:", error);
        throw new Error(
          data?.error || "Gagal membuat transaksi pembayaran."
        );
      }

      if (!data?.success || !data?.snap_token) {
        throw new Error(
          data?.error || "Token pembayaran tidak diterima."
        );
      }

      if (typeof data.invoice === "string") {
        setLastInvoice(data.invoice);
      }

      window.snap.pay(data.snap_token, {
        onSuccess: () => {
          setMessage(
            "Pembayaran diterima. GradeUp sedang menunggu verifikasi dari Midtrans."
          );
          setCheckoutPlanId(null);
        },

        onPending: () => {
          setMessage(
            "Pembayaran masih menunggu penyelesaian. Status Premium akan diperbarui setelah pembayaran terverifikasi."
          );
          setCheckoutPlanId(null);
        },

        onError: () => {
          setMessage(
            "Terjadi kendala pada pembayaran. Silakan periksa transaksi Anda."
          );
          setCheckoutPlanId(null);
        },

        onClose: () => {
          setCheckoutPlanId(null);
        },
      });
    } catch (error) {
      console.error("Checkout error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memproses pembayaran."
      );

      setCheckoutPlanId(null);
    }
  };

  // Memeriksa status pembayaran langsung melalui Edge Function.
  const handleCheckPaymentStatus = async () => {
    if (!lastInvoice || isCheckingStatus) return;

    setIsCheckingStatus(true);
    setMessage("");

    try {
      // Pastikan sesi pengguna masih tersedia.
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        throw new Error(
          "Sesi login tidak tersedia. Silakan login kembali."
        );
      }

      const { data, error } = await supabase.functions.invoke(
        "check-payment-status",
        {
          body: {
            invoice_number: lastInvoice,
          },
        }
      );

      if (error) {
        console.error("Check payment status error:", error);
        throw new Error("Gagal memeriksa status pembayaran.");
      }

      const result = data as PaymentStatusResponse;

      if (!result?.success) {
        throw new Error(
          result?.error || "Status pembayaran belum dapat diperiksa."
        );
      }

      setPaymentStatus(result);

      const status = String(
        result.midtrans_status || ""
      ).toLowerCase();

      if (status === "settlement" || status === "capture") {
        setMessage(
          "Midtrans melaporkan pembayaran berhasil. Silakan tunggu sinkronisasi status Premium."
        );
      } else if (status === "expire") {
        setMessage(
          "Transaksi sudah kedaluwarsa (expired)."
        );
      } else if (status === "pending") {
        setMessage(
          "Pembayaran masih menunggu penyelesaian."
        );
      } else if (status === "deny") {
        setMessage(
          "Pembayaran ditolak oleh penyedia pembayaran."
        );
      } else if (status === "cancel") {
        setMessage(
          "Transaksi telah dibatalkan."
        );
      } else {
        setMessage(
          `Status pembayaran dari Midtrans: ${status || "belum diketahui"}.`
        );
      }
    } catch (error) {
      console.error("Check payment status error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memeriksa pembayaran."
      );
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const freePlan = pricingPlans.find((plan) => plan.price === 0);

  return (
    <div className="mx-auto max-w-6xl">
      {message && (
        <div
          role="status"
          className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-foreground"
        >
          {message}
        </div>
      )}

      {/* Informasi transaksi dan pemeriksaan status. */}
      {lastInvoice && (
        <div className="mb-6 rounded-xl border bg-card p-4">
          <div className="mb-3">
            <p className="text-xs text-muted-foreground">
              Nomor Invoice
            </p>

            <p className="mt-1 break-all text-sm font-semibold">
              {lastInvoice}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleCheckPaymentStatus}
            disabled={isCheckingStatus}
          >
            {isCheckingStatus ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memeriksa...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Periksa Status Pembayaran
              </>
            )}
          </Button>

          {paymentStatus && (
            <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Status Midtrans
                </span>
                <strong className="capitalize">
                  {paymentStatus.midtrans_status || "-"}
                </strong>
              </div>

              <div className="mt-2 flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Metode Pembayaran
                </span>
                <strong className="uppercase">
                  {paymentStatus.payment_type || "-"}
                </strong>
              </div>

              {paymentStatus.amount !== undefined && (
                <div className="mt-2 flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    Nominal
                  </span>
                  <strong>
                    {formatRupiah(Number(paymentStatus.amount))}
                  </strong>
                </div>
              )}

              {paymentStatus.qris_url && (
                <p className="mt-3 break-all text-xs text-muted-foreground">
                  URL QRIS tersedia pada respons pemeriksaan.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {selectedPlanId && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          Paket pilihan Anda sudah tersimpan. Silakan lanjutkan pembayaran
          setelah masuk ke akun GradeUp.
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Memuat paket Premium...
        </div>
      ) : loadingError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">
            {loadingError}
          </p>

          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Muat ulang
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {freePlan && (
            <div className="relative flex flex-col rounded-3xl border bg-card p-7 shadow-soft transition-all duration-300 hover:-translate-y-1">
              <h3 className="text-lg font-bold">
                {freePlan.name}
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                {freePlan.description}
              </p>

              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight">
                  {formatRupiah(0)}
                </span>

                <span className="text-sm text-muted-foreground">
                  {freePlan.period}
                </span>
              </p>

              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {freePlan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-soft text-primary">
                      <Check
                        className="h-3 w-3"
                        strokeWidth={3.5}
                      />
                    </span>

                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant="outline"
                size="lg"
                className="mt-8 w-full"
                onClick={() => navigate("/register")}
              >
                Mulai Gratis
              </Button>
            </div>
          )}

          {plans.map((plan) => {
            const features = Array.isArray(plan.features)
              ? plan.features.filter(
                  (feature): feature is string =>
                    typeof feature === "string" &&
                    feature.trim().length > 0
                )
              : [];

            const isPopular = plan.code === "quarterly";
            const isSelected = selectedPlanId === plan.id;
            const isProcessing = checkoutPlanId === plan.id;

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-3xl border bg-card p-7 shadow-soft transition-all duration-300 hover:-translate-y-1",
                  isPopular && "border-primary shadow-glow",
                  isSelected && "ring-2 ring-primary"
                )}
              >
                {isPopular && (
                  <Badge
                    variant="solid"
                    className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-gradient px-3 py-1 text-[11px] tracking-wider"
                  >
                    <Crown className="mr-1 h-3 w-3" />
                    POPULER
                  </Badge>
                )}

                <h3 className="text-lg font-bold">
                  {plan.name}
                </h3>

                <p className="mt-1 min-h-10 text-sm text-muted-foreground">
                  {plan.description}
                </p>

                <p className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">
                    {formatRupiah(Number(plan.price))}
                  </span>

                  <span className="text-sm font-medium text-muted-foreground">
                    / {plan.duration_months} bulan
                  </span>
                </p>

                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  <li className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-soft text-primary dark:text-accent">
                      <Check
                        className="h-3 w-3"
                        strokeWidth={3.5}
                      />
                    </span>

                    Akses Premium selama {plan.duration_months} bulan
                  </li>

                  {features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-soft text-primary dark:text-accent">
                        <Check
                          className="h-3 w-3"
                          strokeWidth={3.5}
                        />
                      </span>

                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isPopular ? "default" : "outline"}
                  size="lg"
                  className="mt-8 w-full"
                  disabled={Boolean(checkoutPlanId)}
                  onClick={() => handleChoosePlan(plan)}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyiapkan pembayaran...
                    </>
                  ) : isSelected ? (
                    "Lanjutkan Pembayaran"
                  ) : (
                    "Pilih Paket"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !loadingError && plans.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Belum ada paket Premium yang tersedia.
        </p>
      )}
    </div>
  );
}
```
