import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  Eye,
  ReceiptText,
  RefreshCw,
  Wallet,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "@/components/shared/states";
import { PaymentBadge } from "@/components/admin/badges";
import { useAsync } from "@/hooks/use-async";
import { listTransactions } from "@/services/admin.service";
import { formatDate, formatRupiah } from "@/utils/format";
import type { Transaction } from "@/types";

const STATUS_OPTIONS = [
  "success",
  "pending",
  "failed",
  "expired",
  "Berhasil",
  "Menunggu",
  "Gagal",
];

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  tone: "emerald" | "amber" | "rose" | "blue";
}) {
  const tones = {
    emerald: {
      icon: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
      accent: "bg-emerald-500",
    },
    amber: {
      icon: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
      accent: "bg-amber-500",
    },
    rose: {
      icon: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
      accent: "bg-rose-500",
    },
    blue: {
      icon: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
      accent: "bg-blue-500",
    },
  };

  return (
    <Card className="relative overflow-hidden border-border/60 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {description}
          </p>
        </div>

        <div className={`rounded-xl p-3 ${tones[tone].icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 h-1 w-full ${tones[tone].accent}`} />
    </Card>
  );
}

export default function AdminTransactionsPage() {
  const { data, loading, error, reload } = useAsync(listTransactions);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const [detail, setDetail] = useState<Transaction | null>(null);

  const transactions = data ?? [];

  const plans = useMemo(
    () =>
      [...new Set(
        transactions
          .map((transaction) => transaction.plan)
          .filter(Boolean)
      )].sort(),
    [transactions]
  );

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();

    return transactions
      .filter((transaction) => {
        if (!keyword) return true;

        const orderId = (transaction.merchant_order_id || transaction.invoice || "").toLowerCase();

        return (
          orderId.includes(keyword) ||
          transaction.userName.toLowerCase().includes(keyword) ||
          transaction.userEmail.toLowerCase().includes(keyword)
        );
      })
      .filter((transaction) => {
        if (status === "all") return true;
        return (
          transaction.status.toLowerCase() === status.toLowerCase()
        );
      })
      .filter(
        (transaction) =>
          plan === "all" || transaction.plan === plan
      );
  }, [transactions, q, status, plan]);

  const stats = useMemo(() => {
    const isSuccessful = (s: string) => ["success", "berhasil", "settlement"].includes(s.toLowerCase());
    const isPending = (s: string) => ["pending", "menunggu"].includes(s.toLowerCase());
    const isFailed = (s: string) => ["failed", "gagal", "expired", "expire"].includes(s.toLowerCase());

    const successful = transactions.filter((t) => isSuccessful(t.status));
    const pending = transactions.filter((t) => isPending(t.status));
    const failed = transactions.filter((t) => isFailed(t.status));

    const revenue = successful.reduce(
      (sum, transaction) => sum + transaction.amount,
      0
    );

    return {
      revenue,
      successful: successful.length,
      pending: pending.length,
      failed: failed.length,
    };
  }, [transactions]);

  return (
    <div className="min-h-full space-y-7 pb-8">
      <PageHeader
        title="Manajemen Transaksi Duitku"
        description="Pantau pembayaran, pendapatan, dan aktivitas langganan GradeUp."
      />

      {/* STATISTICS */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Pendapatan"
          value={formatRupiah(stats.revenue)}
          description="Akumulasi transaksi berhasil"
          icon={Wallet}
          tone="emerald"
        />

        <StatCard
          title="Pembayaran Berhasil"
          value={stats.successful.toLocaleString("id-ID")}
          description="Transaksi terkonfirmasi"
          icon={CheckCircle2}
          tone="blue"
        />

        <StatCard
          title="Menunggu Pembayaran"
          value={stats.pending.toLocaleString("id-ID")}
          description="Transaksi belum terselesaikan"
          icon={Clock3}
          tone="amber"
        />

        <StatCard
          title="Transaksi Gagal"
          value={stats.failed.toLocaleString("id-ID")}
          description="Pembayaran gagal atau kedaluwarsa"
          icon={XCircle}
          tone="rose"
        />
      </section>

      {/* TABLE HEADER */}
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border/60 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <ReceiptText className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-bold">
                  Riwayat Transaksi Duitku
                </h2>
                <p className="text-xs text-muted-foreground">
                  Daftar seluruh pembayaran yang tercatat di sistem GradeUp
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => reload()}
            disabled={loading}
            className="gap-2 self-start lg:self-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Perbarui Data
          </Button>
        </div>

        {/* FILTERS */}
        <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/20 p-5 md:flex-row">
          <div className="relative min-w-0 flex-1">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Cari Order ID Duitku, nama, atau email..."
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:w-auto">
            <FilterSelect
              value={status}
              onChange={setStatus}
              options={STATUS_OPTIONS}
              allLabel="Semua Status"
            />

            <FilterSelect
              value={plan}
              onChange={setPlan}
              options={plans}
              allLabel="Semua Paket"
            />
          </div>
        </div>

        {/* TABLE SUMMARY */}
        <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan{" "}
            <span className="font-bold text-foreground">
              {filtered.length}
            </span>{" "}
            dari{" "}
            <span className="font-bold text-foreground">
              {transactions.length}
            </span>{" "}
            transaksi
          </p>

          <p className="text-sm text-muted-foreground">
            Pendapatan sesuai filter:{" "}
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {formatRupiah(
                filtered
                  .filter((t) => ["success", "berhasil", "settlement"].includes(t.status.toLowerCase()))
                  .reduce((sum, t) => sum + t.amount, 0)
              )}
            </span>
          </p>
        </div>

        {/* TABLE CONTENT */}
        {loading ? (
          <div className="p-5">
            <TableSkeleton />
          </div>
        ) : error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12">
            {transactions.length === 0 ? (
              <EmptyState
                title="Belum ada transaksi"
                description="Transaksi pembayaran Duitku akan muncul di halaman ini."
              />
            ) : (
              <EmptyState
                title="Transaksi tidak ditemukan"
                description="Coba ubah kata kunci pencarian atau filter yang digunakan."
              />
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="whitespace-nowrap pl-5">
                    Order ID Duitku
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    Pengguna
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    Paket
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    Metode
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    Jumlah
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    Status
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    Tanggal
                  </TableHead>
                  <TableHead className="whitespace-nowrap pr-5 text-right">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((transaction) => {
                  const displayOrderId = transaction.merchant_order_id || transaction.invoice || "-";

                  return (
                    <TableRow
                      key={transaction.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <TableCell className="whitespace-nowrap pl-5">
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-muted p-2">
                            <ReceiptText className="h-4 w-4 text-muted-foreground" />
                          </div>

                          <span className="font-mono text-xs font-semibold">
                            {displayOrderId}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="min-w-[150px]">
                          <p className="font-semibold text-foreground">
                            {transaction.userName}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {transaction.userEmail || "Email tidak tersedia"}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {transaction.plan}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-xs font-bold uppercase">
                        {transaction.method || "Duitku"}
                      </TableCell>

                      <TableCell className="whitespace-nowrap font-bold">
                        {formatRupiah(transaction.amount)}
                      </TableCell>

                      <TableCell>
                        <PaymentBadge status={transaction.status} />
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(transaction.date)}
                      </TableCell>

                      <TableCell className="pr-5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => setDetail(transaction)}
                        >
                          <Eye className="h-4 w-4" />
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* TABLE FOOTER */}
        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border/60 bg-muted/20 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Data tersinkronisasi otomatis dengan Duitku Payment Gateway.
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              {filtered.length} transaksi ditampilkan
            </p>
          </div>
        )}
      </Card>

      {/* TRANSACTION DETAIL MODAL */}
      <Dialog
        open={!!detail}
        onOpenChange={(open) => !open && setDetail(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {detail && (
            <>
              <DialogHeader>
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ReceiptText className="h-5 w-5" />
                </div>

                <DialogTitle className="text-xl font-bold">
                  Detail Transaksi Duitku
                </DialogTitle>

                <DialogDescription className="font-mono text-xs">
                  {detail.merchant_order_id || detail.invoice}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-3 space-y-5">
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Total Pembayaran
                  </p>

                  <p className="mt-2 text-2xl font-bold tracking-tight">
                    {formatRupiah(detail.amount)}
                  </p>

                  <div className="mt-3">
                    <PaymentBadge status={detail.status} />
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-bold">
                    Informasi Pengguna
                  </h3>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/60 p-3">
                      <p className="text-xs text-muted-foreground">
                        Nama Pengguna
                      </p>
                      <p className="mt-1 break-words text-sm font-semibold">
                        {detail.userName}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/60 p-3">
                      <p className="text-xs text-muted-foreground">
                        Email
                      </p>
                      <p className="mt-1 break-all text-sm font-semibold">
                        {detail.userEmail || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-bold">
                    Informasi Pembayaran
                  </h3>

                  <div className="divide-y divide-border/60 rounded-xl border border-border/60">
                    <div className="flex items-center justify-between gap-4 p-3">
                      <span className="text-sm text-muted-foreground">
                        Paket
                      </span>
                      <span className="text-right text-sm font-semibold">
                        {detail.plan}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 p-3">
                      <span className="text-sm text-muted-foreground">
                        Metode Pembayaran
                      </span>
                      <span className="text-right text-sm font-semibold uppercase">
                        {detail.method || "Duitku"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 p-3">
                      <span className="text-sm text-muted-foreground">
                        Tanggal Transaksi
                      </span>
                      <span className="text-right text-sm font-semibold">
                        {formatDate(detail.date)}
                      </span>
                    </div>

                    {detail.reference && (
                      <div className="flex items-center justify-between gap-4 p-3">
                        <span className="text-sm text-muted-foreground">
                          Referensi Duitku
                        </span>
                        <span className="max-w-[60%] break-all text-right font-mono text-xs font-semibold">
                          {detail.reference}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4 p-3">
                      <span className="text-sm text-muted-foreground">
                        ID Sistem (UUID)
                      </span>
                      <span className="max-w-[60%] break-all text-right font-mono text-xs">
                        {detail.id}
                      </span>
                    </div>
                  </div>
                </div>

                {detail.payment_url && (
                  <Button
                    className="w-full gap-2"
                    onClick={() =>
                      window.open(
                        detail.payment_url,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    <ExternalLink className="h-4 w-4" /> Buka Checkout Duitku
                  </Button>
                )}

                <div className="flex justify-end pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setDetail(null)}
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
