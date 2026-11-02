import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import { DemoBanner } from "@/components/shared/demo-banner";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { PaymentBadge } from "@/components/admin/badges";
import { useAsync } from "@/hooks/use-async";
import { listTransactions } from "@/services/admin.service";
import { formatDate, formatRupiah } from "@/utils/format";
import type { Transaction } from "@/types";

export default function AdminTransactionsPage() {
  const { data, loading, error, reload } = useAsync(listTransactions);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const [detail, setDetail] = useState<Transaction | null>(null);

  const filtered = useMemo(
    () =>
      (data ?? [])
        .filter((t) => t.invoice.toLowerCase().includes(q.toLowerCase()) || t.userName.toLowerCase().includes(q.toLowerCase()))
        .filter((t) => status === "all" || t.status === status)
        .filter((t) => plan === "all" || t.plan === plan),
    [data, q, status, plan]
  );

  const total = filtered.filter((t) => t.status === "Berhasil").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Transaksi" description="Pantau pembayaran langganan Premium." />
      <DemoBanner>Transaksi di bawah adalah data contoh. Payment gateway belum terintegrasi.</DemoBanner>
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Cari invoice atau nama..." className="flex-1" />
        <FilterSelect value={status} onChange={setStatus} options={["Berhasil", "Menunggu", "Gagal", "Refund"]} allLabel="Semua status" />
        <FilterSelect value={plan} onChange={setPlan} options={["Premium Bulanan", "Premium Tahunan"]} allLabel="Semua paket" />
      </div>
      <p className="text-sm text-muted-foreground">Total berhasil (sesuai filter): <span className="font-extrabold text-foreground">{formatRupiah(total)}</span></p>

      <Card className="overflow-hidden">
        {loading ? <TableSkeleton /> : error ? <div className="p-4"><ErrorState message={error} onRetry={reload} /></div> : filtered.length === 0 ? <div className="p-4"><EmptyState title="Transaksi tidak ditemukan" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Pengguna</TableHead><TableHead>Paket</TableHead><TableHead>Jumlah</TableHead><TableHead>Status</TableHead><TableHead>Tanggal</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs font-semibold">{t.invoice}</TableCell>
                  <TableCell><p className="font-semibold">{t.userName}</p><p className="text-xs text-muted-foreground">{t.userEmail}</p></TableCell>
                  <TableCell className="whitespace-nowrap">{t.plan}</TableCell>
                  <TableCell className="whitespace-nowrap font-bold">{formatRupiah(t.amount)}</TableCell>
                  <TableCell><PaymentBadge status={t.status} /></TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(t.date)}</TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="soft" onClick={() => setDetail(t)}><Eye /> Detail</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader><DialogTitle>Detail Transaksi</DialogTitle><DialogDescription className="font-mono">{detail.invoice}</DialogDescription></DialogHeader>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {[["Pengguna", detail.userName], ["Email", detail.userEmail], ["Paket", detail.plan], ["Metode", detail.method], ["Jumlah", formatRupiah(detail.amount)], ["Tanggal", formatDate(detail.date)]].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-muted p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="break-words font-bold">{v}</dd></div>
                ))}
              </dl>
              <div className="flex items-center justify-between rounded-xl border p-3"><span className="text-sm text-muted-foreground">Status pembayaran</span><PaymentBadge status={detail.status} /></div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
