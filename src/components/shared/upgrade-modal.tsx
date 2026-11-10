
import { useEffect, useState } from "react";
import {
  Check,
  Crown,
  Loader2,
  RefreshCw,
  Tag,
  X,
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
  merchant_order_id?: string;
  database_status?: string;
  payment_method?: string | null;
  amount?: number;
  message?: string;
  error?: string;
}

interface CheckoutResponse {
  success?: boolean;
  payment_url?: string;
  merchant_order_id?: string;
  reference?: string;
  statusCode?: string;
  original_amount?: number;
  discount_amount?: number;
  payment_amount?: number;
  promo_code?: string | null;
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

  const [promoCode, setPromoCode] = useState("");

  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatusResponse | null>(null);

  const [checkoutSummary, setCheckoutSummary] = useState<{
    originalAmount: number;
    discountAmount: number;
    paymentAmount: number;
    promoCode: string | null;
  } | null>(null);

  const plan =
    plans.find((item) => item.id === selected) ?? plans[0];

  // =================================================
  // LOAD PREMIUM PLANS
  // =================================================

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

  // =================================================
  // START DUITKU CHECKOUT + PROMO
  // =================================================

  const handleChoosePlan = async () => {
    if (!plan || checkoutLoading) return;

    setMessage("");
    setPaymentStatus(null);
    setInvoice("");
    setCheckoutSummary(null);

    const normalizedPromoCode = promoCode.trim();

    try {
      setCheckoutLoading(true);

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
        "create-payment",
        {
          body: {
            plan_id: plan.id,
            payment_method: "VC",
            promo_code: normalizedPromoCode || null,
          },
        }
      );

      if (error) {
        console.error("Create payment error:", error);

        const responseData = error.context
          ? await error.context.json().catch(() => null)
          : null;

        throw new Error(
          responseData?.error ||
            error.message ||
            "Gagal membuat transaksi pembayaran Duitku."
        );
      }

      const result = data as CheckoutResponse;

      if (!result?.payment_url) {
        throw new Error(
          result?.error ||
            "URL pembayaran tidak diterima dari Duitku."
        );
      }

      // Simpan ID transaksi dari respons backend.
      const merchantOrderId = result.merchant_order_id;

      if (merchantOrderId) {
        setInvoice(merchantOrderId);
      }

      // Simpan ringkasan pembayaran dari hasil kalkulasi database.
      if (
        typeof result.original_amount === "number" &&
        typeof result.discount_amount === "number" &&
        typeof result.payment_amount === "number"
      ) {
        setCheckoutSummary({
          originalAmount: result.original_amount,
          discountAmount: result.discount_amount,
          paymentAmount: result.payment_amount,
          promoCode: result.promo_code ?? null,
        });
      }

      // Redirect ke hosted checkout Duitku.
      window.location.href = result.payment_url;
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

  // =================================================
  // CHECK PAYMENT STATUS
  // =================================================

  const handleCheckStatus = async () => {
    if (!invoice || checking) return;

    setChecking(true);
    setMessage("");
    setPaymentStatus(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "check-payment-status",
        {
          body: {
            merchant_order_id: invoice,
          },
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
          result?.error ||
            "Status pembayaran belum tersedia."
        );
      }

      setPaymentStatus(result);

      const status = String(
        result.database_status ?? ""
      ).toLowerCase();

      if (
        status === "success" ||
        status === "settlement"
      ) {
        setMessage(
          "Pembayaran berhasil terverifikasi. Premium Anda telah aktif!"
        );
      } else if (status === "pending") {
        setMessage(
          "Pembayaran masih menunggu penyelesaian."
        );
      } else if (
        status === "failed" ||
        status === "expire" ||
        status === "expired"
      ) {
        setMessage(
          "Transaksi gagal atau sudah kedaluwarsa."
        );
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

  // =================================================
  // PAYMENT STATUS
  // =================================================

  const isPaymentSuccessful = [
    "success",
    "settlement",
  ].includes(
    String(
      paymentStatus?.database_status ?? ""
    ).toLowerCase()
  );

  // =================================================
  // RENDER
  // =================================================

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

        {/* PESAN */}
        {message && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300"
          >
            {message}
          </div>
        )}

        {/* DETAIL TRANSAKSI */}
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
                      {formatRupiah(
                        Number(paymentStatus.amount)
                      )}
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

        {/* LOAD STATE */}
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
            {/* PILIH PAKET */}
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

            {/* FITUR PREMIUM */}
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

            {/* INPUT KODE PROMO */}
            <div className="space-y-2 rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />

                <p className="text-sm font-semibold">
                  Punya kode promo?
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(event) => {
                    setPromoCode(event.target.value);
                    setMessage("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleChoosePlan();
                    }
                  }}
                  placeholder="Masukkan kode promo"
                  maxLength={50}
                  autoComplete="off"
                  disabled={checkoutLoading}
                  className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm uppercase outline-none transition-colors placeholder:normal-case placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                />

                {promoCode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setPromoCode("");
                      setMessage("");
                    }}
                    disabled={checkoutLoading}
                    aria-label="Hapus kode promo"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Diskon akan divalidasi otomatis sebelum pembayaran dibuat.
              </p>
            </div>

            {/* RINGKASAN PEMBAYARAN */}
            {checkoutSummary && (
              <div className="space-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    Harga awal
                  </span>

                  <span>
                    {formatRupiah(checkoutSummary.originalAmount)}
                  </span>
                </div>

                {checkoutSummary.discountAmount > 0 && (
                  <div className="flex justify-between gap-3 text-emerald-600">
                    <span>
                      Diskon
                      {checkoutSummary.promoCode
                        ? ` (${checkoutSummary.promoCode})`
                        : ""}
                    </span>

                    <span>
                      -{formatRupiah(checkoutSummary.discountAmount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between gap-3 border-t pt-2 font-bold">
                  <span>Total pembayaran</span>

                  <span>
                    {formatRupiah(checkoutSummary.paymentAmount)}
                  </span>
                </div>
              </div>
            )}

            {/* CHECKOUT */}
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
