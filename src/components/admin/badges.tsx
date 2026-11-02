import { Badge } from "@/components/ui/badge";
import type { AccountStatus, PaymentStatus, PublishStatus } from "@/types";

export function PublishBadge({ status }: { status: PublishStatus }) {
  return <Badge variant={status === "Published" ? "success" : "muted"}>{status === "Published" ? "Terbit" : "Draf"}</Badge>;
}

export function AccountBadge({ status }: { status: AccountStatus }) {
  const v = status === "Aktif" ? "success" : status === "Nonaktif" ? "muted" : "danger";
  return <Badge variant={v}>{status}</Badge>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const v = status === "Berhasil" ? "success" : status === "Menunggu" ? "warning" : status === "Refund" ? "muted" : "danger";
  return <Badge variant={v}>{status}</Badge>;
}
