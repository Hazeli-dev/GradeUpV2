
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  Gift,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  TicketPercent,
  TrendingUp,
  Users,
  X,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

// ==========================================
// TYPES
// ==========================================

type DiscountType = "percent" | "fixed";
type RedemptionStatus = "reserved" | "used" | "cancelled";
type TabType = "codes" | "campaigns" | "redemptions";

interface PromoCampaign {
  id: string;
  name: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface PromoCode {
  id: string;
  campaign_id: string | null;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  max_discount_amount: number | null;
  min_transaction_amount: number;
  max_uses: number | null;
  max_uses_per_user: number;
  assigned_user_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface PromoRedemption {
  id: string;
  promo_code_id: string;
  user_id: string;
  invoice_number: string | null;
  discount_amount: number;
  status: RedemptionStatus;
  created_at: string;
}

interface CampaignForm {
  name: string;
  description: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

interface PromoForm {
  code: string;
  campaign_id: string;
  discount_type: DiscountType;
  discount_value: string;
  max_discount_amount: string;
  min_transaction_amount: string;
  max_uses: string;
  max_uses_per_user: string;
  assigned_user_id: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

// ==========================================
// HELPERS
// ==========================================

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (value: string | null) => {
  if (!value) return "Tidak dibatasi";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toDateTimeLocal = (value: string | null) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
};

const toIsoDate = (value: string) => {
  return value ? new Date(value).toISOString() : null;
};

const isExpired = (value: string | null) => {
  return value ? new Date(value).getTime() <= Date.now() : false;
};

const isNotStarted = (value: string | null) => {
  return value ? new Date(value).getTime() > Date.now() : false;
};

const getPromoStatus = (promo: PromoCode) => {
  if (!promo.is_active) return "Nonaktif";
  if (isExpired(promo.ends_at)) return "Kedaluwarsa";
  if (isNotStarted(promo.starts_at)) return "Akan Datang";
  return "Aktif";
};

const getCampaignStatus = (campaign: PromoCampaign) => {
  if (!campaign.is_active) return "Nonaktif";
  if (isExpired(campaign.ends_at)) return "Kedaluwarsa";
  if (isNotStarted(campaign.starts_at)) return "Akan Datang";
  return "Aktif";
};

const emptyCampaignForm: CampaignForm = {
  name: "",
  description: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
};

const emptyPromoForm: PromoForm = {
  code: "",
  campaign_id: "",
  discount_type: "percent",
  discount_value: "",
  max_discount_amount: "",
  min_transaction_amount: "0",
  max_uses: "",
  max_uses_per_user: "1",
  assigned_user_id: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
};

// ==========================================
// REUSABLE UI
// ==========================================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Aktif: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Nonaktif: "bg-slate-100 text-slate-600 border-slate-200",
    Kedaluwarsa: "bg-red-50 text-red-700 border-red-200",
    "Akan Datang": "bg-blue-50 text-blue-700 border-blue-200",
    reserved: "bg-amber-50 text-amber-700 border-amber-200",
    used: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
        styles[status] || styles.Nonaktif
      }`}
    >
      {status}
    </span>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: typeof Gift;
  color: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight">
            {value}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {description}
          </p>
        </div>

        <div className={`rounded-xl p-3 ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
  description,
}: {
  label: string;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border bg-background shadow-2xl">
        <div className="flex items-start justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================

export default function AdminPromoManagementPage() {
  const [campaigns, setCampaigns] = useState<PromoCampaign[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [redemptions, setRedemptions] = useState<PromoRedemption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>("codes");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [campaignModal, setCampaignModal] = useState(false);
  const [promoModal, setPromoModal] = useState(false);

  const [editingCampaign, setEditingCampaign] =
    useState<PromoCampaign | null>(null);

  const [editingPromo, setEditingPromo] =
    useState<PromoCode | null>(null);

  const [campaignForm, setCampaignForm] =
    useState<CampaignForm>(emptyCampaignForm);

  const [promoForm, setPromoForm] =
    useState<PromoForm>(emptyPromoForm);

  // ==========================================
  // FETCH DATA
  // ==========================================

  const fetchData = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const [campaignResult, promoResult, redemptionResult] =
        await Promise.all([
          supabase
            .from("promo_campaigns")
            .select("*")
            .order("created_at", { ascending: false }),

          supabase
            .from("promo_codes")
            .select("*")
            .order("created_at", { ascending: false }),

          supabase
            .from("promo_redemptions")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(500),
        ]);

      if (campaignResult.error) throw campaignResult.error;
      if (promoResult.error) throw promoResult.error;
      if (redemptionResult.error) throw redemptionResult.error;

      setCampaigns((campaignResult.data || []) as PromoCampaign[]);
      setPromos((promoResult.data || []) as PromoCode[]);
      setRedemptions((redemptionResult.data || []) as PromoRedemption[]);
    } catch (error) {
      console.error("Gagal memuat data promo:", error);

      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Gagal memuat data promo.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // ==========================================
  // STATISTICS
  // ==========================================

  const stats = useMemo(() => {
    const activePromos = promos.filter(
      (promo) => getPromoStatus(promo) === "Aktif"
    ).length;

    const activeCampaigns = campaigns.filter(
      (campaign) => getCampaignStatus(campaign) === "Aktif"
    ).length;

    const used = redemptions.filter(
      (item) => item.status === "used"
    ).length;

    const reserved = redemptions.filter(
      (item) => item.status === "reserved"
    ).length;

    const totalDiscount = redemptions
      .filter((item) => item.status === "used")
      .reduce((total, item) => total + Number(item.discount_amount || 0), 0);

    return {
      totalPromos: promos.length,
      activePromos,
      activeCampaigns,
      used,
      reserved,
      totalDiscount,
    };
  }, [promos, campaigns, redemptions]);

  const redemptionCounts = useMemo(() => {
    const result: Record<string, number> = {};

    redemptions.forEach((item) => {
      result[item.promo_code_id] =
        (result[item.promo_code_id] || 0) + 1;
    });

    return result;
  }, [redemptions]);

  const campaignNames = useMemo(() => {
    return Object.fromEntries(
      campaigns.map((campaign) => [campaign.id, campaign.name])
    );
  }, [campaigns]);

  // ==========================================
  // SEARCH AND FILTER
  // ==========================================

  const filteredPromos = useMemo(() => {
    return promos.filter((promo) => {
      const keyword = search.toLowerCase();

      const matchesSearch =
        promo.code.toLowerCase().includes(keyword) ||
        (promo.assigned_user_id || "").toLowerCase().includes(keyword);

      const status = getPromoStatus(promo);

      const matchesStatus =
        statusFilter === "Semua" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [promos, search, statusFilter]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const matchesSearch =
        campaign.name.toLowerCase().includes(search.toLowerCase());

      const status = getCampaignStatus(campaign);

      const matchesStatus =
        statusFilter === "Semua" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [campaigns, search, statusFilter]);

  const filteredRedemptions = useMemo(() => {
    return redemptions.filter((item) => {
      const promo = promos.find((p) => p.id === item.promo_code_id);

      const matchesSearch =
        (promo?.code || "").toLowerCase().includes(search.toLowerCase()) ||
        item.user_id.toLowerCase().includes(search.toLowerCase()) ||
        (item.invoice_number || "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "Semua" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [redemptions, promos, search, statusFilter]);

  // ==========================================
  // CAMPAIGN CRUD
  // ==========================================

  const openCreateCampaign = () => {
    setEditingCampaign(null);
    setCampaignForm(emptyCampaignForm);
    setCampaignModal(true);
  };

  const openEditCampaign = (campaign: PromoCampaign) => {
    setEditingCampaign(campaign);

    setCampaignForm({
      name: campaign.name,
      description: campaign.description || "",
      starts_at: toDateTimeLocal(campaign.starts_at),
      ends_at: toDateTimeLocal(campaign.ends_at),
      is_active: campaign.is_active,
    });

    setCampaignModal(true);
  };

  const saveCampaign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!campaignForm.name.trim()) {
      setMessage({
        type: "error",
        text: "Nama campaign wajib diisi.",
      });
      return;
    }

    if (
      campaignForm.starts_at &&
      campaignForm.ends_at &&
      new Date(campaignForm.ends_at) <= new Date(campaignForm.starts_at)
    ) {
      setMessage({
        type: "error",
        text: "Tanggal selesai harus setelah tanggal mulai.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        name: campaignForm.name.trim(),
        description: campaignForm.description.trim() || null,
        starts_at: toIsoDate(campaignForm.starts_at),
        ends_at: toIsoDate(campaignForm.ends_at),
        is_active: campaignForm.is_active,
      };

      const result = editingCampaign
        ? await supabase
            .from("promo_campaigns")
            .update(payload)
            .eq("id", editingCampaign.id)
        : await supabase
            .from("promo_campaigns")
            .insert(payload);

      if (result.error) throw result.error;

      setCampaignModal(false);
      setMessage({
        type: "success",
        text: editingCampaign
          ? "Campaign berhasil diperbarui."
          : "Campaign berhasil dibuat.",
      });

      await fetchData();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Gagal menyimpan campaign.",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleCampaign = async (campaign: PromoCampaign) => {
    setMessage(null);

    const { error } = await supabase
      .from("promo_campaigns")
      .update({ is_active: !campaign.is_active })
      .eq("id", campaign.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    setMessage({
      type: "success",
      text: `Campaign ${campaign.is_active ? "dinonaktifkan" : "diaktifkan"}.`,
    });

    await fetchData();
  };

  // ==========================================
  // PROMO CODE CRUD
  // ==========================================

  const openCreatePromo = () => {
    setEditingPromo(null);
    setPromoForm(emptyPromoForm);
    setPromoModal(true);
  };

  const openEditPromo = (promo: PromoCode) => {
    setEditingPromo(promo);

    setPromoForm({
      code: promo.code,
      campaign_id: promo.campaign_id || "",
      discount_type: promo.discount_type,
      discount_value: String(promo.discount_value),
      max_discount_amount:
        promo.max_discount_amount === null
          ? ""
          : String(promo.max_discount_amount),
      min_transaction_amount: String(promo.min_transaction_amount),
      max_uses: promo.max_uses === null ? "" : String(promo.max_uses),
      max_uses_per_user: String(promo.max_uses_per_user),
      assigned_user_id: promo.assigned_user_id || "",
      starts_at: toDateTimeLocal(promo.starts_at),
      ends_at: toDateTimeLocal(promo.ends_at),
      is_active: promo.is_active,
    });

    setPromoModal(true);
  };

  const savePromo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = promoForm.code.trim().toUpperCase();
    const discountValue = Number(promoForm.discount_value);
    const minimum = Number(promoForm.min_transaction_amount);
    const maxPerUser = Number(promoForm.max_uses_per_user);
    const maxUses = promoForm.max_uses
      ? Number(promoForm.max_uses)
      : null;

    if (!code) {
      setMessage({ type: "error", text: "Kode promo wajib diisi." });
      return;
    }

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      setMessage({
        type: "error",
        text: "Nilai diskon harus lebih besar dari 0.",
      });
      return;
    }

    if (promoForm.discount_type === "percent" && discountValue > 100) {
      setMessage({
        type: "error",
        text: "Diskon persentase tidak boleh lebih dari 100%.",
      });
      return;
    }

    if (!Number.isFinite(minimum) || minimum < 0) {
      setMessage({
        type: "error",
        text: "Minimum transaksi tidak valid.",
      });
      return;
    }

    if (!Number.isInteger(maxPerUser) || maxPerUser < 1) {
      setMessage({
        type: "error",
        text: "Batas penggunaan per siswa minimal 1.",
      });
      return;
    }

    if (
      maxUses !== null &&
      (!Number.isInteger(maxUses) || maxUses < 1)
    ) {
      setMessage({
        type: "error",
        text: "Batas total penggunaan harus minimal 1.",
      });
      return;
    }

    if (
      promoForm.starts_at &&
      promoForm.ends_at &&
      new Date(promoForm.ends_at) <= new Date(promoForm.starts_at)
    ) {
      setMessage({
        type: "error",
        text: "Tanggal selesai harus setelah tanggal mulai.",
      });
      return;
    }

    const maxDiscount = promoForm.max_discount_amount
      ? Number(promoForm.max_discount_amount)
      : null;

    if (
      maxDiscount !== null &&
      (!Number.isFinite(maxDiscount) || maxDiscount <= 0)
    ) {
      setMessage({
        type: "error",
        text: "Batas diskon maksimal harus lebih besar dari 0.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        code,
        campaign_id: promoForm.campaign_id || null,
        discount_type: promoForm.discount_type,
        discount_value: discountValue,
        max_discount_amount: maxDiscount,
        min_transaction_amount: minimum,
        max_uses: maxUses,
        max_uses_per_user: maxPerUser,
        assigned_user_id: promoForm.assigned_user_id.trim() || null,
        starts_at: toIsoDate(promoForm.starts_at),
        ends_at: toIsoDate(promoForm.ends_at),
        is_active: promoForm.is_active,
      };

      const result = editingPromo
        ? await supabase
            .from("promo_codes")
            .update(payload)
            .eq("id", editingPromo.id)
        : await supabase
            .from("promo_codes")
            .insert(payload);

      if (result.error) throw result.error;

      setPromoModal(false);
      setMessage({
        type: "success",
        text: editingPromo
          ? "Kode promo berhasil diperbarui."
          : "Kode promo berhasil dibuat.",
      });

      await fetchData();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Gagal menyimpan promo.";

      setMessage({
        type: "error",
        text: errorMessage.toLowerCase().includes("unique")
          ? "Kode promo sudah digunakan. Gunakan kode lain."
          : errorMessage,
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePromo = async (promo: PromoCode) => {
    setMessage(null);

    const { error } = await supabase
      .from("promo_codes")
      .update({ is_active: !promo.is_active })
      .eq("id", promo.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    setMessage({
      type: "success",
      text: `Kode ${promo.code} ${promo.is_active ? "dinonaktifkan" : "diaktifkan"}.`,
    });

    await fetchData();
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setMessage({
        type: "success",
        text: `Kode ${code} berhasil disalin.`,
      });
    } catch {
      setMessage({
        type: "error",
        text: "Tidak dapat menyalin kode promo.",
      });
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="space-y-6 pb-10">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <TicketPercent className="h-4 w-4" />
            Admin / Manajemen Promo
          </div>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Manajemen Promo
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Kelola campaign, kode diskon, dan riwayat penggunaan promo GradeUp.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void fetchData()}
            disabled={loading}
            className={`${buttonClass} border bg-background hover:bg-muted`}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={activeTab === "campaigns" ? openCreateCampaign : openCreatePromo}
            className={`${buttonClass} bg-primary text-primary-foreground hover:bg-primary/90`}
          >
            <Plus className="h-4 w-4" />
            {activeTab === "campaigns" ? "Buat Campaign" : "Buat Kode Promo"}
          </button>
        </div>
      </div>

      {/* ALERT */}
      {message && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}

          <span className="flex-1">{message.text}</span>

          <button
            type="button"
            onClick={() => setMessage(null)}
            aria-label="Tutup pesan"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* STATISTICS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Kode Promo"
          value={stats.totalPromos}
          description="Semua kode terdaftar"
          icon={TicketPercent}
          color="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Promo Aktif"
          value={stats.activePromos}
          description={`${stats.activeCampaigns} campaign aktif`}
          icon={Activity}
          color="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          title="Berhasil Digunakan"
          value={stats.used}
          description={`${stats.reserved} penggunaan masih reserved`}
          icon={TrendingUp}
          color="bg-violet-50 text-violet-600"
        />

        <StatCard
          title="Total Diskon"
          value={formatCurrency(stats.totalDiscount)}
          description="Dari penukaran berstatus used"
          icon={Gift}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {[
          { id: "codes", label: "Kode Promo", icon: TicketPercent },
          { id: "campaigns", label: "Campaign", icon: CalendarDays },
          { id: "redemptions", label: "Riwayat Penukaran", icon: HistoryIcon },
        ].map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setSearch("");
                setStatusFilter("Semua");
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SEARCH AND FILTER */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              activeTab === "codes"
                ? "Cari kode promo atau ID siswa..."
                : activeTab === "campaigns"
                  ? "Cari nama campaign..."
                  : "Cari kode, ID siswa, atau invoice..."
            }
            className={`${inputClass} pl-10`}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className={`${inputClass} sm:w-48`}
        >
          <option value="Semua">Semua Status</option>

          {activeTab === "redemptions" ? (
            <>
              <option value="reserved">Reserved</option>
              <option value="used">Used</option>
              <option value="cancelled">Cancelled</option>
            </>
          ) : (
            <>
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
              <option value="Akan Datang">Akan Datang</option>
              <option value="Kedaluwarsa">Kedaluwarsa</option>
            </>
          )}
        </select>
      </div>

      {/* LOADING */}
      {loading ? (
        <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Memuat data promo...
          </span>
        </div>
      ) : (
        <>
          {/* ================================== */}
          {/* PROMO CODES */}
          {/* ================================== */}

          {activeTab === "codes" && (
            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="flex flex-col justify-between gap-2 border-b p-5 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-bold">Daftar Kode Promo</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {filteredPromos.length} kode promo ditemukan
                  </p>
                </div>

                <span className="text-xs text-muted-foreground">
                  Penggunaan dihitung dari data penukaran yang dimuat
                </span>
              </div>

              {filteredPromos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <TicketPercent className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="font-semibold">Belum ada kode promo</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Buat kode promo pertama untuk GradeUp.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-5 py-4">Kode Promo</th>
                        <th className="px-5 py-4">Diskon</th>
                        <th className="px-5 py-4">Campaign</th>
                        <th className="px-5 py-4">Penggunaan</th>
                        <th className="px-5 py-4">Masa Berlaku</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {filteredPromos.map((promo) => {
                        const usedCount =
                          redemptionCounts[promo.id] || 0;

                        const discountLabel =
                          promo.discount_type === "percent"
                            ? `${promo.discount_value}%`
                            : formatCurrency(promo.discount_value);

                        return (
                          <tr
                            key={promo.id}
                            className="transition hover:bg-muted/30"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <div>
                                  <p className="font-bold tracking-wide">
                                    {promo.code}
                                  </p>

                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {promo.assigned_user_id
                                      ? "Khusus siswa"
                                      : "Promo umum"}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => void copyCode(promo.code)}
                                  title="Salin kode"
                                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-semibold text-primary">
                                {discountLabel}
                              </p>

                              <p className="mt-1 text-xs text-muted-foreground">
                                Min. {formatCurrency(Number(promo.min_transaction_amount))}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span className="text-sm">
                                {promo.campaign_id
                                  ? campaignNames[promo.campaign_id] || "Campaign tidak ditemukan"
                                  : "Tanpa campaign"}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-semibold">
                                {usedCount}
                                <span className="text-muted-foreground">
                                  {" "}/ {promo.max_uses ?? "∞"}
                                </span>
                              </p>

                              <p className="mt-1 text-xs text-muted-foreground">
                                Maks. {promo.max_uses_per_user} / siswa
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p>{formatDate(promo.starts_at)}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                s.d. {formatDate(promo.ends_at)}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <StatusBadge status={getPromoStatus(promo)} />
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditPromo(promo)}
                                  title="Edit promo"
                                  className="rounded-lg border p-2 hover:bg-muted"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void togglePromo(promo)}
                                  title={promo.is_active ? "Nonaktifkan" : "Aktifkan"}
                                  className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                                    promo.is_active
                                      ? "text-red-600 hover:bg-red-50"
                                      : "text-emerald-600 hover:bg-emerald-50"
                                  }`}
                                >
                                  {promo.is_active ? "Nonaktifkan" : "Aktifkan"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================================== */}
          {/* CAMPAIGNS */}
          {/* ================================== */}

          {activeTab === "campaigns" && (
            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="border-b p-5">
                <h2 className="font-bold">Campaign Promo</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Kelola periode dan kelompok promosi GradeUp.
                </p>
              </div>

              {filteredCampaigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="font-semibold">Belum ada campaign</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Buat campaign untuk mengelompokkan kode promo.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                  {filteredCampaigns.map((campaign) => {
                    const campaignPromos = promos.filter(
                      (promo) => promo.campaign_id === campaign.id
                    );

                    return (
                      <div
                        key={campaign.id}
                        className="rounded-2xl border p-5 transition hover:border-primary/40 hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="rounded-xl bg-primary/10 p-3 text-primary">
                            <Gift className="h-5 w-5" />
                          </div>

                          <StatusBadge status={getCampaignStatus(campaign)} />
                        </div>

                        <h3 className="mt-4 font-bold">{campaign.name}</h3>

                        <p className="mt-1 min-h-10 text-sm text-muted-foreground">
                          {campaign.description || "Tidak ada deskripsi."}
                        </p>

                        <div className="mt-4 space-y-2 border-t pt-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            Mulai: {formatDate(campaign.starts_at)}
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Selesai: {formatDate(campaign.ends_at)}
                          </div>

                          <div className="flex items-center gap-2">
                            <TicketPercent className="h-4 w-4" />
                            {campaignPromos.length} kode promo
                          </div>
                        </div>

                        <div className="mt-5 flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditCampaign(campaign)}
                            className="flex-1 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-muted"
                          >
                            <Edit3 className="mr-2 inline h-4 w-4" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => void toggleCampaign(campaign)}
                            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${
                              campaign.is_active
                                ? "text-red-600 hover:bg-red-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                          >
                            {campaign.is_active ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================================== */}
          {/* REDEMPTIONS */}
          {/* ================================== */}

          {activeTab === "redemptions" && (
            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="border-b p-5">
                <h2 className="font-bold">Riwayat Penukaran Promo</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Menampilkan maksimal 500 data penukaran terbaru.
                </p>
              </div>

              {filteredRedemptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="font-semibold">Belum ada riwayat penukaran</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Data penggunaan promo akan muncul di sini.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-5 py-4">Kode Promo</th>
                        <th className="px-5 py-4">ID Siswa</th>
                        <th className="px-5 py-4">Invoice</th>
                        <th className="px-5 py-4">Diskon</th>
                        <th className="px-5 py-4">Tanggal</th>
                        <th className="px-5 py-4">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {filteredRedemptions.map((item) => {
                        const promo = promos.find(
                          (p) => p.id === item.promo_code_id
                        );

                        return (
                          <tr key={item.id} className="hover:bg-muted/30">
                            <td className="px-5 py-4 font-bold">
                              {promo?.code || "Promo tidak ditemukan"}
                            </td>

                            <td className="px-5 py-4">
                              <span className="font-mono text-xs">
                                {item.user_id}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              {item.invoice_number || "-"}
                            </td>

                            <td className="px-5 py-4 font-semibold text-primary">
                              {formatCurrency(Number(item.discount_amount))}
                            </td>

                            <td className="px-5 py-4">
                              {new Date(item.created_at).toLocaleString("id-ID")}
                            </td>

                            <td className="px-5 py-4">
                              <StatusBadge status={item.status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ====================================== */}
      {/* CAMPAIGN MODAL */}
      {/* ====================================== */}

      {campaignModal && (
        <Modal
          title={editingCampaign ? "Edit Campaign" : "Buat Campaign Baru"}
          description="Atur nama, deskripsi, dan periode campaign promo."
          onClose={() => setCampaignModal(false)}
        >
          <form onSubmit={saveCampaign} className="space-y-5">
            <FormField label="Nama Campaign">
              <input
                required
                maxLength={100}
                value={campaignForm.name}
                onChange={(event) =>
                  setCampaignForm({
                    ...campaignForm,
                    name: event.target.value,
                  })
                }
                placeholder="Contoh: Promo Kemerdekaan"
                className={inputClass}
              />
            </FormField>

            <FormField label="Deskripsi">
              <textarea
                rows={3}
                maxLength={500}
                value={campaignForm.description}
                onChange={(event) =>
                  setCampaignForm({
                    ...campaignForm,
                    description: event.target.value,
                  })
                }
                placeholder="Deskripsi singkat campaign..."
                className={inputClass}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Tanggal Mulai">
                <input
                  type="datetime-local"
                  value={campaignForm.starts_at}
                  onChange={(event) =>
                    setCampaignForm({
                      ...campaignForm,
                      starts_at: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Tanggal Selesai">
                <input
                  type="datetime-local"
                  value={campaignForm.ends_at}
                  onChange={(event) =>
                    setCampaignForm({
                      ...campaignForm,
                      ends_at: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-4">
              <input
                type="checkbox"
                checked={campaignForm.is_active}
                onChange={(event) =>
                  setCampaignForm({
                    ...campaignForm,
                    is_active: event.target.checked,
                  })
                }
                className="h-4 w-4 accent-primary"
              />

              <div>
                <p className="text-sm font-semibold">Campaign Aktif</p>
                <p className="text-xs text-muted-foreground">
                  Campaign dapat digunakan sesuai periode yang ditentukan.
                </p>
              </div>
            </label>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={() => setCampaignModal(false)}
                className={`${buttonClass} border hover:bg-muted`}
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={saving}
                className={`${buttonClass} bg-primary text-primary-foreground`}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingCampaign ? "Simpan Perubahan" : "Buat Campaign"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ====================================== */}
      {/* PROMO MODAL */}
      {/* ====================================== */}

      {promoModal && (
        <Modal
          title={editingPromo ? "Edit Kode Promo" : "Buat Kode Promo"}
          description="Atur diskon, kuota, target pengguna, dan masa berlaku."
          onClose={() => setPromoModal(false)}
        >
          <form onSubmit={savePromo} className="space-y-5">
            <FormField
              label="Kode Promo"
              description="Kode akan otomatis diubah menjadi huruf kapital."
            >
              <input
                required
                maxLength={40}
                value={promoForm.code}
                onChange={(event) =>
                  setPromoForm({
                    ...promoForm,
                    code: event.target.value.toUpperCase().replace(/\s/g, ""),
                  })
                }
                placeholder="Contoh: GRADEUP20"
                className={`${inputClass} font-mono font-bold tracking-wider`}
              />
            </FormField>

            <FormField label="Campaign">
              <select
                value={promoForm.campaign_id}
                onChange={(event) =>
                  setPromoForm({
                    ...promoForm,
                    campaign_id: event.target.value,
                  })
                }
                className={inputClass}
              >
                <option value="">Tanpa Campaign</option>

                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Jenis Diskon">
                <select
                  value={promoForm.discount_type}
                  onChange={(event) =>
                    setPromoForm({
                      ...promoForm,
                      discount_type: event.target.value as DiscountType,
                    })
                  }
                  className={inputClass}
                >
                  <option value="percent">Persentase (%)</option>
                  <option value="fixed">Nominal Tetap (Rp)</option>
                </select>
              </FormField>

              <FormField label="Nilai Diskon">
                <input
                  required
                  type="number"
                  min="0.01"
                  step="any"
                  value={promoForm.discount_value}
                  onChange={(event) =>
                    setPromoForm({
                      ...promoForm,
                      discount_value: event.target.value,
                    })
                  }
                  placeholder={
                    promoForm.discount_type === "percent" ? "20" : "10000"
                  }
                  className={inputClass}
                />
              </FormField>
            </div>

            {promoForm.discount_type === "percent" && (
              <FormField
                label="Maksimal Potongan (Rp)"
                description="Kosongkan jika tidak ada batas nominal diskon."
              >
                <input
                  type="number"
                  min="1"
                  value={promoForm.max_discount_amount}
                  onChange={(event) =>
                    setPromoForm({
                      ...promoForm,
                      max_discount_amount: event.target.value,
                    })
                  }
                  placeholder="Contoh: 20000"
                  className={inputClass}
                />
              </FormField>
            )}

            <FormField label="Minimum Transaksi (Rp)">
              <input
                required
                type="number"
                min="0"
                value={promoForm.min_transaction_amount}
                onChange={(event) =>
                  setPromoForm({
                    ...promoForm,
                    min_transaction_amount: event.target.value,
                  })
                }
                className={inputClass}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Maksimal Total Penggunaan"
                description="Kosongkan jika tidak dibatasi."
              >
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={promoForm.max_uses}
                  onChange={(event) =>
                    setPromoForm({
                      ...promoForm,
                      max_uses: event.target.value,
                    })
                  }
                  placeholder="Tidak terbatas"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Maksimal per Siswa">
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={promoForm.max_uses_per_user}
                  onChange={(event) =>
                    setPromoForm({
                      ...promoForm,
                      max_uses_per_user: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>
            </div>

            <FormField
              label="ID Pengguna Khusus (Opsional)"
              description="Kosongkan untuk promo umum. Jika diisi, kode hanya ditujukan kepada siswa dengan ID tersebut."
            >
              <input
                value={promoForm.assigned_user_id}
                onChange={(event) =>
                  setPromoForm({
                    ...promoForm,
                    assigned_user_id: event.target.value.trim(),
                  })
                }
                placeholder="UUID user dari tabel profiles"
                className={`${inputClass} font-mono text-xs`}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Mulai Berlaku">
                <input
                  type="datetime-local"
                  value={promoForm.starts_at}
                  onChange={(event) =>
                    setPromoForm({
                      ...promoForm,
                      starts_at: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Berakhir">
                <input
                  type="datetime-local"
                  value={promoForm.ends_at}
                  onChange={(event) =>
                    setPromoForm({
                      ...promoForm,
                      ends_at: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-4">
              <input
                type="checkbox"
                checked={promoForm.is_active}
                onChange={(event) =>
                  setPromoForm({
                    ...promoForm,
                    is_active: event.target.checked,
                  })
                }
                className="h-4 w-4 accent-primary"
              />

              <div>
                <p className="text-sm font-semibold">Aktifkan Kode Promo</p>
                <p className="text-xs text-muted-foreground">
                  Kode dapat digunakan sesuai periode dan ketentuan.
                </p>
              </div>
            </label>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={() => setPromoModal(false)}
                className={`${buttonClass} border hover:bg-muted`}
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={saving}
                className={`${buttonClass} bg-primary text-primary-foreground`}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingPromo ? "Simpan Perubahan" : "Buat Kode Promo"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// Ikon untuk tab riwayat penukaran.
function HistoryIcon(props: React.ComponentProps<"svg">) {
  return <Clock {...props} />;
}
