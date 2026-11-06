
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Crown,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { supabase } from "@/lib/supabase";
import { formatRupiah } from "@/utils/format";
import { cn } from "@/lib/utils";

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
      pay: (
        token: string,
        callbacks?: SnapCallbacks
      ) => void;
    };
  }
}

const MIDTRANS_CLIENT_KEY =
  import.meta.env.VITE_MIDTRANS_CLIENT_KEY;

const SNAP_SCRIPT_URL =
  "https://app.sandbox.midtrans.com/snap/snap.js";

export function UpgradeModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();

  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [selected, setSelected] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState("");

  const [checkoutPlanId, setCheckoutPlanId] =
    useState<string | null>(null);

  const [snapReady, setSnapReady] = useState(false);

  const [lastInvoice, setLastInvoice] = useState("");
  const [message, setMessage] = useState("");

  const [isCheckingStatus, setIsCheckingStatus] =
    useState(false);

  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatusResponse | null>(null);

  const plan =
    plans.find((item) => item.id === selected) ??
    plans.find((item) => item.code === "quarterly") ??
    plans[0];

  // Memuat paket Premium dari Supabase.
  useEffect(() => {
    if (!open) return;

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
        setLoadingError(
          "Paket Premium gagal dimuat. Silakan coba lagi."
        );
        setPlans([]);
      } else {
        const activePlans = (data ?? []) as PremiumPlan[];

        setPlans(activePlans);

        setSelected((current) => {
          if (
            current &&
            activePlans.some((item) => item.id === current)
          ) {
            return current;
          }

          return (
            activePlans.find(
              (item) => item.code === "quarterly"
            )?.id ??
            activePlans[0]?.id ??
            ""
          );
        });
      }

      setIsLoading(false);
    }

    loadPlans();

    return () => {
      mounted = false;
    };
  }, [open]);

  // Memuat Midtrans Snap.js.
  useEffect(() => {
    if (!MIDTRANS_CLIENT_KEY) {
      console.error(
        "VITE_MIDTRANS_CLIENT_KEY belum dikonfigurasi."
      );
      return;
    }

    if (window.snap) {
      setSnapReady(true);
      return;
    }

    const existingScript =
      document.querySelector<HTMLScriptElement>(
        `script[src="${SNAP_SCRIPT_URL}"]`
      );

    const script =
      existingScript ?? document.createElement("script");

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
      script.setAttribute(
        "data-client-key",
        MIDTRANS_CLIENT_KEY
      );
      document.body.appendChild(script);
    }

    return () => {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };
  }, []);

  // Membuat transaksi pembayaran.
  const handleChoosePlan = async () => {
    if (!plan || checkoutPlanId) return;

    setMessage("");
    setPaymentStatus(null);
    setLastInvoice("");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      setMessage(
        "Tidak dapat memeriksa sesi login. Silakan coba lagi."
      );
      return;
    }

    if (!session?.user) {
      const destination =
        `/pricing?plan=${encodeURIComponent(plan.id)}`;

      onOpenChange(false);

      navigate(
        `/login?redirect=${encodeURIComponent(destination)}`
      );
      return;
    }

    if (!MIDTRANS_CLIENT_KEY) {
      setMessage(
        "Konfigurasi pembayaran belum tersedia."
      );
      return;
    }

    if (!snapReady || !window.snap) {
      setMessage(
        "Midtrans belum siap dimuat. Silakan coba beberapa saat lagi."
      );
      return;
    }

    setCheckoutPlanId(plan.id);

    try {
      const { data, error } =
        await supabase.functions.invoke("create-payment", {
          body: {
            plan_id: plan.id,
          },
        });

      if (error) {
        console.error("Create payment error:", error);

        throw new Error(
          data?.error ||
            "Gagal membuat transaksi pembayaran."
        );
      }

      if (!data?.success || !data?.snap_token) {
        throw new Error(
          data?.error ||
            "Token pembayaran tidak diterima."
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

  // Memeriksa status pembayaran.
  const handleCheckPaymentStatus = async () => {
    if (!lastInvoice || isCheckingStatus) return;

    setIsCheckingStatus(true);
    setMessage("");
    setPaymentStatus(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        throw new Error(
          "Sesi login tidak tersedia. Silakan login kembali."
        );
      }

      const { data, error } =
        await supabase.functions.invoke(
          "check-payment-status",
          {
            body: {
              invoice_number: lastInvoice,
            },
          }
        );

      if (error) {
        console.error("Check payment status error:", error);

        throw new Error(
          "Gagal memeriksa status pembayaran."
        );
      }

      const result =
        data as PaymentStatusResponse;

      if (!result?.success) {
        throw new Error(
          result?.error ||
            "Status pembayaran belum dapat diperiksa."
        );
      }

      setPaymentStatus(result);

      const status = String(
        result.midtrans_status || ""
      ).toLowerCase();

      switch (status) {
        case "settlement":
        case "capture":
          setMessage(
            "Midtrans melaporkan pembayaran berhasil. Silakan tunggu sinkronisasi status Premium."
          );
          break;

        case "pending":
          setMessage(
            "Pembayaran masih menunggu penyelesaian."
          );
          break;

        case "expire":
          setMessage(
            "Transaksi sudah kedaluwarsa (expired)."
          );
          break;

        case "deny":
          setMessage(
            "Pembayaran ditolak oleh penyedia pembayaran."
          );
          break;

        case "cancel":
          setMessage(
            "Transaksi telah dibatalkan."
          );
          break;

        default:
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="items-center text-center pr-0">
          <span className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
            <Crown className="h-6 w-6" />
          </span>

          <DialogTitle className="text-2xl">
            Upgrade ke Premium
          </DialogTitle>

          <DialogDescription>
            Buka seluruh materi, paket ujian, dan statistik belajar lengkap.
          </DialogDescription>
        </DialogHeader>

        {/* Pesan sistem */}
        {message && (
          <div
            role="status"
            className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-foreground"
          >
            {message}
          </div>
        )}

        {/* Informasi invoice */}
        {lastInvoice && (
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">
              Nomor Invoice
            </p>

            <p className="mt-1 break-all text-sm font-semibold">
              {lastInvoice}
            </p>

            <Button
              variant="outline"
              className="mt-3 w-full"
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
                      {formatRupiah(
                        Number(paymentStatus.amount)
                      )}
                    </strong>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Daftar paket */}
        {isLoading ? (
          <div className="flex min-h-32 items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Memuat paket Premium...
          </div>
        ) : loadingError ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center">
            <p className="text-sm text-destructive">
              {loadingError}
            </p>

            <Button
              variant="outline"
              className="mt-3"
              onClick={() => {
                setLoadingError("");
                setIsLoading(true);

                supabase
                  .from("premium_plans")
                  .select(
                    "id, code, name, description, price, duration_months, features, is_active, sort_order"
                  )
                  .eq("is_active", true)
                  .order("sort_order", {
                    ascending: true,
                  })
                  .then(({ data, error }) => {
                    if (error) {
                      setLoadingError(
                        "Paket Premium gagal dimuat. Silakan coba lagi."
                      );
                    } else {
                      const activePlans =
                        (data ?? []) as PremiumPlan[];

                      setPlans(activePlans);
                      setSelected(
                        activePlans.find(
                          (item) =>
                            item.code === "quarterly"
                        )?.id ??
                          activePlans[0]?.id ??
                          ""
                      );
                    }

                    setIsLoading(false);
                  });
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Coba lagi
            </Button>
          </div>
        ) : plans.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Belum ada paket Premium yang tersedia.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {plans.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item.id)}
                  className={cn(
                    "relative rounded-2xl border-2 p-4 text-left transition-all",
                    selected === item.id
                      ? "border-primary bg-soft/60"
                      : "border-border hover:border-primary/40"
                  )}
                  aria-pressed={selected === item.id}
                >
                  {item.code === "quarterly" && (
                    <Badge
                      variant="solid"
                      className="absolute -top-2.5 right-3"
                    >
                      POPULER
                    </Badge>
                  )}

                  <p className="text-sm font-bold">
                    {item.name}
                  </p>

                  <p className="mt-1 text-xl font-extrabold">
                    {formatRupiah(Number(item.price))}
                    <span className="text-xs font-medium text-muted-foreground">
                      {" "}
                      / {item.duration_months} bulan
                    </span>
                  </p>

                  {item.description && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </button>
              ))}
            </div>

            {/* Fitur paket terpilih */}
            {plan && (
              <ul className="grid gap-2 text-sm sm:grid-cols-2">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" strokeWidth={3} />
                  Akses Premium selama {plan.duration_months} bulan
                </li>

                {(plan.features ?? [])
                  .filter(
                    (feature) =>
                      typeof feature === "string" &&
                      feature.trim().length > 0
                  )
                  .map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-secondary"
                        strokeWidth={3}
                      />
                      {feature}
                    </li>
                  ))}
              </ul>
            )}

            <Button
              size="lg"
              className="w-full"
              disabled={
                !plan ||
                Boolean(checkoutPlanId) ||
                !snapReady
              }
              onClick={handleChoosePlan}
            >
              {checkoutPlanId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyiapkan pembayaran...
                </>
              ) : !snapReady ? (
                "Menyiapkan pembayaran..."
              ) : (
                `Pilih ${plan?.name ?? "Paket"}`
              )}
            </Button>
          </>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Pembayaran diproses melalui Midtrans.
        </p>
      </DialogContent>
    </Dialog>
  );
}
