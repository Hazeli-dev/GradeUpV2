
import { useEffect, useState } from "react";
import {
  Check,
  Crown,
  ExternalLink,
  Loader2,
  RefreshCw,
  FlaskConical,
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

interface SnapCallbacks {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
}

interface PaymentStatusResponse {
  success?: boolean;
  invoice?: string;
  database_status?: string;
  database_payment_method?: string | null;
  midtrans_status?: string;
  payment_type?: string;
  amount?: number;
  transaction_id?: string;
  qris_url?: string | null;
  qris_url_v2?: string | null;
  qris_url_legacy?: string | null;
  message?: string;
  error?: string;
}

interface QrisTestResponse {
  success?: boolean;
  test_only?: boolean;
  environment?: string;
  invoice_number?: string;
  transaction_id?: string;
  transaction_status?: string;
  payment_method?: string;
  qr_available?: boolean;
  error?: string;
  message?: string;
  stage?: string;
  detail?: string;
  gateway_status?: number;
  gateway_code?: string | null;
  gateway_message?: string;
}

declare global {
  interface Window {
    snap?: {
      pay: (token: string, callbacks?: SnapCallbacks) => void;
    };
  }
}

const CLIENT_KEY = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
const SNAP_URL = "https://app.sandbox.midtrans.com/snap/snap.js";

const MONTHLY_PLAN_ID =
  "e9a20e84-877d-4d2b-ab59-acc121d7f73d";

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
  const [snapReady, setSnapReady] = useState(false);
  const [invoice, setInvoice] = useState("");
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatusResponse | null>(null);

  const [qrisTestLoading, setQrisTestLoading] = useState(false);
  const [qrisTestResult, setQrisTestResult] =
    useState<QrisTestResponse | null>(null);

  const plan =
    plans.find((item) => item.id === selected) ?? plans[0];

  // Memuat paket Premium.
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

  // Memuat Midtrans Snap.
  useEffect(() => {
    if (!CLIENT_KEY) {
      console.error("VITE_MIDTRANS_CLIENT_KEY belum tersedia.");
      return;
    }

    if (window.snap) {
      setSnapReady(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SNAP_URL}"]`
    );

    const script = existing ?? document.createElement("script");

    const onLoad = () => {
      setSnapReady(Boolean(window.snap));
    };

    const onError = () => {
      setSnapReady(false);
      console.error("Gagal memuat Midtrans Snap.");
    };

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);

    if (!existing) {
      script.src = SNAP_URL;
      script.async = true;
      script.setAttribute("data-client-key", CLIENT_KEY);
      document.body.appendChild(script);
    }

    return () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };
  }, []);

  // Memulai pembayaran Snap.
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

      if (!CLIENT_KEY || !snapReady || !window.snap) {
        throw new Error(
          "Midtrans belum siap. Silakan coba kembali."
        );
      }

      setCheckoutLoading(true);

      const { data, error } = await supabase.functions.invoke(
        "create-payment",
        {
          body: { plan_id: plan.id },
        }
      );

      if (error) {
        console.error("Create payment:", error);

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
        setInvoice(data.invoice);
      }

      window.snap.pay(data.snap_token, {
        onSuccess: () => {
          setMessage(
            "Pembayaran diterima. Menunggu verifikasi dari Midtrans."
          );
          setCheckoutLoading(false);
        },

        onPending: () => {
          setMessage(
            "Pembayaran masih menunggu penyelesaian."
          );
          setCheckoutLoading(false);
        },

        onError: () => {
          setMessage("Terjadi kendala pada pembayaran.");
          setCheckoutLoading(false);
        },

        onClose: () => {
          setCheckoutLoading(false);
        },
      });
    } catch (error) {
      console.error("Checkout:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memproses pembayaran."
      );

      setCheckoutLoading(false);
    }
  };

  // Mengambil detail error dari Edge Function.
  const getQrisErrorDetails = async (
    error: { message: string; context?: unknown },
    data: unknown
  ): Promise<QrisTestResponse> => {
    let responseData =
      data && typeof data === "object"
        ? (data as QrisTestResponse)
        : null;

    let httpStatus: number | undefined;

    try {
      const context = error.context;

      if (context instanceof Response) {
        httpStatus = context.status;

        const parsed = await context.clone().json();

        if (parsed && typeof parsed === "object") {
          responseData = {
            ...responseData,
            ...parsed,
          };
        }
      }
    } catch (parseError) {
      console.warn("Tidak dapat membaca detail respons QRIS:", parseError);
    }

    const details = [
      responseData?.stage
        ? `Tahap: ${responseData.stage}`
        : null,
      responseData?.error || error.message,
      responseData?.detail,
      responseData?.gateway_status
        ? `HTTP Midtrans: ${responseData.gateway_status}`
        : null,
      responseData?.gateway_code
        ? `Kode Midtrans: ${responseData.gateway_code}`
        : null,
      responseData?.gateway_message,
      httpStatus
        ? `HTTP Edge Function: ${httpStatus}`
        : null,
    ].filter(Boolean);

    return {
      error: details.join(" | "),
      stage: responseData?.stage,
      detail: responseData?.detail,
      gateway_status: responseData?.gateway_status,
      gateway_code: responseData?.gateway_code,
      gateway_message: responseData?.gateway_message,
    };
  };

  // Tes QRIS Core API Sandbox.
  const handleTestQrisCoreApi = async () => {
    if (qrisTestLoading) return;

    setQrisTestLoading(true);
    setQrisTestResult(null);
    setMessage("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        throw new Error("Silakan login kembali.");
      }

      const monthlyPlan = plans.find(
        (item) =>
          item.code === "monthly" &&
          item.id === MONTHLY_PLAN_ID
      );

      if (!monthlyPlan || !monthlyPlan.is_active) {
        throw new Error(
          "Paket Premium Bulanan tidak ditemukan atau tidak aktif."
        );
      }

      const { data, error } = await supabase.functions.invoke(
        "create-qris-coreapi-test",
        {
          body: {
            plan_id: monthlyPlan.id,
          },
        }
      );

      if (error) {
        console.error("QRIS Core API test:", {
          message: error.message,
          context: error.context,
          response: data,
        });

        const errorDetails = await getQrisErrorDetails(
          error,
          data
        );

        throw new Error(
          errorDetails.error || "Gagal membuat transaksi QRIS Sandbox."
        );
      }

      const result = data as QrisTestResponse;

      if (
        !result?.success ||
        result.environment !== "sandbox" ||
        result.test_only !== true
      ) {
        throw new Error(
          result?.error ||
            result?.detail ||
            "Respons pengujian QRIS tidak sesuai."
        );
      }

      setQrisTestResult(result);

      setMessage(
        "Transaksi QRIS Sandbox berhasil dibuat. Tidak ada pembayaran yang dilakukan."
      );
    } catch (error) {
      console.error("QRIS test:", error);

      setQrisTestResult({
        error:
          error instanceof Error
            ? error.message
            : "Pengujian QRIS gagal.",
      });
    } finally {
      setQrisTestLoading(false);
    }
  };

  // Memeriksa status transaksi Snap.
  const handleCheckStatus = async () => {
    if (!invoice || checking) return;

    setChecking(true);
    setMessage("");
    setPaymentStatus(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "check-payment-status",
        {
          body: { invoice_number: invoice },
        }
      );

      if (error) {
        console.error("Check payment:", error);

        throw new Error(
          data?.error || "Gagal memeriksa status pembayaran."
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
        result.midtrans_status ?? ""
      ).toLowerCase();

      if (status === "settlement" || status === "capture") {
        setMessage(
          "Pembayaran berhasil menurut Midtrans. Menunggu sinkronisasi status Premium."
        );
      } else if (status === "pending") {
        setMessage(
          "Pembayaran masih menunggu penyelesaian."
        );
      } else if (status === "expire") {
        setMessage("Transaksi sudah kedaluwarsa.");
      } else if (status === "deny") {
        setMessage("Pembayaran ditolak.");
      } else if (status === "cancel") {
        setMessage("Transaksi dibatalkan.");
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

  const qrisUrl =
    paymentStatus?.qris_url ??
    paymentStatus?.qris_url_v2 ??
    paymentStatus?.qris_url_legacy ??
    null;

  const validQrisUrl =
    typeof qrisUrl === "string" &&
    (() => {
      try {
        const parsedUrl = new URL(qrisUrl);

        return parsedUrl.protocol === "https:";
      } catch {
        return false;
      }
    })()
      ? qrisUrl
      : null;

  const paymentMethod = String(
    paymentStatus?.payment_type ||
      paymentStatus?.database_payment_method ||
      ""
  ).toLowerCase();

  const isPendingQris =
    paymentStatus?.midtrans_status?.toLowerCase() === "pending" &&
    paymentMethod === "qris";

  const isPaymentSuccessful = [
    "settlement",
    "capture",
  ].includes(
    String(paymentStatus?.midtrans_status ?? "").toLowerCase()
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
            className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm"
          >
            {message}
          </div>
        )}

        {invoice && (
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">
              Nomor Invoice
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
                  <span>Status Midtrans</span>

                  <strong className="capitalize">
                    {paymentStatus.midtrans_status || "-"}
                  </strong>
                </div>

                <div className="flex justify-between gap-3">
                  <span>Metode Pembayaran</span>

                  <strong className="uppercase">
                    {paymentMethod || "-"}
                  </strong>
                </div>

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

                {isPendingQris && (
                  <div className="border-t pt-3">
                    <p className="mb-2 font-semibold">
                      Pembayaran QRIS
                    </p>

                    {validQrisUrl ? (
                      <>
                        <p className="mb-3 text-xs text-muted-foreground">
                          URL QRIS tersedia dari Midtrans.
                        </p>

                        <Button
                          type="button"
                          className="w-full"
                          onClick={() => {
                            window.open(
                              validQrisUrl,
                              "_blank",
                              "noopener,noreferrer"
                            );
                          }}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Buka QRIS
                        </Button>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        URL QRIS belum tersedia dari respons Midtrans.
                      </p>
                    )}
                  </div>
                )}

                {isPaymentSuccessful && (
                  <div className="border-t pt-3 text-sm text-emerald-700 dark:text-emerald-400">
                    <p className="font-semibold">
                      Pembayaran terkonfirmasi
                    </p>

                    <p className="mt-1 text-xs">
                      Status Premium akan mengikuti sinkronisasi data akun.
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
                  onClick={() => {
                    setSelected(item.id);
                  }}
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
              disabled={
                !plan ||
                checkoutLoading ||
                !snapReady
              }
            >
              {checkoutLoading ? (
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

            <div className="rounded-xl border border-dashed p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">
                  Pengujian Developer
                </p>
                <Badge variant="outline">Sandbox</Badge>
              </div>

              <p className="text-xs text-muted-foreground">
                Pengujian teknis Core API menggunakan paket Premium
                Bulanan. Tidak melakukan pembayaran atau mengaktifkan Premium.
              </p>

              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                onClick={handleTestQrisCoreApi}
                disabled={qrisTestLoading || loading}
              >
                {qrisTestLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menguji QRIS Sandbox...
                  </>
                ) : (
                  "Tes QRIS Core API (Sandbox)"
                )}
              </Button>

              {qrisTestResult && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-2">
                  <p className="font-semibold">
                    Hasil Pengujian QRIS
                  </p>

                  {qrisTestResult.error ? (
                    <div className="space-y-2">
                      <p className="break-words text-destructive">
                        {qrisTestResult.error}
                      </p>

                      {qrisTestResult.stage && (
                        <p className="text-xs text-muted-foreground">
                          Tahap: {qrisTestResult.stage}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between gap-2">
                        <span>Invoice</span>
                        <strong className="break-all text-right">
                          {qrisTestResult.invoice_number || "-"}
                        </strong>
                      </div>

                      <div className="flex justify-between gap-2">
                        <span>Transaction ID</span>
                        <strong className="break-all text-right">
                          {qrisTestResult.transaction_id || "-"}
                        </strong>
                      </div>

                      <div className="flex justify-between gap-2">
                        <span>Status QR</span>
                        <strong>
                          {qrisTestResult.qr_available
                            ? "Tersedia"
                            : "Belum tersedia"}
                        </strong>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Sandbox saja. Jangan pindai atau lakukan pembayaran.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Pembayaran diproses melalui Midtrans.
        </p>
      </DialogContent>
    </Dialog>
  );
}
