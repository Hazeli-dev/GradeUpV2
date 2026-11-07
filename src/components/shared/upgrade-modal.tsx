import { useEffect, useState } from "react";
import {
  Check,
  Crown,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

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

interface PaymentStatusResponse {
  success?: boolean;
  order_id?: string;
  database_status?: string;
  payment_method?: string | null;
  amount?: number;
  message?: string;
  error?: string;
}

export function UpgradeModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [invoice, setInvoice] = useState("");
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);

  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatusResponse | null>(null);

  const plan =
    plans.find((item) => item.id === selected) ?? plans[0];

  // Load Premium plans
  useEffect(() => {
    if (!open) return;

    let active = true;

    async function loadPlans() {
      setLoading(true);
      setLoadingError("");

      const { data, error } = await supabase
        .from("premium_plans")
        .select(
          "id, code, name, description, price, duration_months, features, is_active, sort_order"
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!active) return;

      if (error) {
        console.error("Load premium plans:", error);
        setLoadingError("Paket Premium gagal dimuat.");
      } else {
        const result = (data ?? []) as PremiumPlan[];

        setPlans(result);

        setSelected(
          result.find((item) => item.code === "quarterly")?.id ??
            result[0]?.id ??
            ""
        );
      }

      setLoading(false);
    }

    loadPlans();

    return () => {
      active = false;
    };
  }, [open]);

  // Start Duitku checkout
  const handleChoosePlan = async () => {
    if (!plan || checkoutLoading) return;

    setMessage("");
    setPaymentStatus(null);
    setInvoice("");

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

      setCheckoutLoading(true);

      const { data, error } = await supabase.functions.invoke(
        "create-payment",
        {
          body: {
            plan_id: plan.id,
            payment_method: "VC", // Default Duitku hosted checkout
          },
        }
      );

      if (error) {
        console.error("Create payment error:", error);
        throw new Error(
          error.message || "Gagal membuat transaksi pembayaran Duitku."
        );
      }

      if (!data?.payment_url) {
        throw new Error(
          data?.error || "URL pembayaran tidak diterima dari Duitku."
        );
      }

      if (typeof data.order_id === "string") {
        setInvoice(data.order_id);
      }

      // Redirect langsung ke hosted checkout Duitku
      window.location.href = data.payment_url;
    } catch (error) {
      console.error("Checkout error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memproses pembayaran."
      );

      setCheckoutLoading(false);
    }
  };

  // Check payment status
  const handleCheckStatus = async () => {
    if (!invoice || checking) return;

    setChecking(true);
    setMessage("");
    setPaymentStatus(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "check-payment-status",
        {
          body: { merchant_order_id: invoice },
        }
      );

      if (error) {
        console.error("Check payment:", error);
        throw new Error(
          "Gagal memeriksa status pembayaran."
        );
      }

      const result = data as PaymentStatusResponse;

      if (!result?.success) {
        throw new Error(
          result?.error || "Status pembayaran belum tersedia."
        );
      }

      setPaymentStatus(result);

      const status = String(
        result.database_status ?? ""
      ).toLowerCase();

      if (status === "success" || status === "settlement") {
        setMessage(
          "Pembayaran berhasil terverifikasi. Premium Anda telah aktif!"
        );
      } else if (status === "pending") {
        setMessage(
          "Pembayaran masih menunggu penyelesaian."
        );
      } else if (status === "failed" || status === "expire") {
        setMessage("Transaksi gagal atau sudah kedaluwarsa.");
      } else {
        setMessage(
          result.message ||
            `Status pembayaran: ${status || "belum diketahui"}.`
        );
      }
    } catch (error) {
      console.error("Check payment status:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal memeriksa pembayaran."
      );
    } finally {
      setChecking(false);
    }
  };

  const isPaymentSuccessful = [
    "success",
    "settlement",
  ].includes(
    String(paymentStatus?.database_status ?? "").toLowerCase()
  );

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

        {message && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300"
          >
            {message}
          </div>
        )}

        {invoice && (
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">
              ID Transaksi Duitku
            </p>

            <p className="mt-1 break-all text-sm font-semibold">
              {invoice}
            </p>

            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={handleCheckStatus}
              disabled={checking}
            >
              {checking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}

              {checking
                ? "Memeriksa..."
                : "Periksa Status Pembayaran"}
            </Button>

            {paymentStatus && (
              <div className="mt-3 space-y-3 rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span>Status Transaksi</span>

                  <strong className="capitalize">
                    {paymentStatus.database_status || "-"}
                  </strong>
                </div>

                {paymentStatus.payment_method && (
                  <div className="flex justify-between gap-3">
                    <span>Metode Pembayaran</span>

                    <strong className="uppercase">
                      {paymentStatus.payment_method}
                    </strong>
                  </div>
                )}

                {paymentStatus.amount !== undefined && (
                  <div className="flex justify-between gap-3">
                    <span>Nominal</span>

                    <strong>
                      {formatRupiah(Number(paymentStatus.amount))}
                    </strong>
                  </div>
                )}

                {isPaymentSuccessful && (
                  <div className="border-t pt-3 text-sm text-emerald-700 dark:text-emerald-400">
                    <p className="font-semibold">
                      Pembayaran terkonfirmasi!
                    </p>

                    <p className="mt-1 text-xs">
                      Status Premium mengikuti sinkronisasi data akun.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-32 items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Memuat paket Premium...
          </div>
        ) : loadingError ? (
          <p className="rounded-xl bg-destructive/5 p-4 text-center text-sm text-destructive">
            {loadingError}
          </p>
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
                      {" "}/ {item.duration_months} bulan
                    </span>
                  </p>

                  {item.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </button>
              ))}
            </div>

            {plan && (
              <ul className="grid gap-2 text-sm sm:grid-cols-2">
                <li className="flex items-start gap-2">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-secondary"
                    strokeWidth={3}
                  />
                  Akses Premium selama {plan.duration_months} bulan
                </li>

                {(plan.features ?? [])
                  .filter(
                    (feature) =>
                      typeof feature === "string" &&
                      feature.trim()
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
              onClick={handleChoosePlan}
              disabled={!plan || checkoutLoading}
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyiapkan pembayaran...
                </>
              ) : (
                `Pilih ${plan?.name ?? "Paket"}`
              )}
            </Button>
          </>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Pembayaran otomatis & aman melalui Duitku Payment Gateway.
        </p>
      </DialogContent>
    </Dialog>
  );
}
