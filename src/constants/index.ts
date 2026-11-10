
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Trophy,
  Award,
  BarChart3,
  History,
  Settings,
  Crown,
  Users,
  FolderTree,
  Library,
  Receipt,
  FileBarChart,
  SlidersHorizontal,
  Bookmark,
  Megaphone,
  MessageCircle,
  CalendarDays,
  TicketPercent,
  Gamepad2,
  type LucideIcon,
} from "lucide-react";

// ==========================================
// INFORMASI APLIKASI
// ==========================================

export const APP_NAME = "GradeUp";

export const CONTACT = {
  email: "halo@gradeup.id",
  phone: "+62 21 5000 1234",
  address: "Jl. Jenderal Sudirman Kav. 52, Jakarta Selatan",
};

// ==========================================
// TIPE NAVIGASI
// ==========================================

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

// ==========================================
// NAVIGASI HALAMAN PUBLIK
// ==========================================

export const PUBLIC_NAV: { label: string; to: string }[] = [
  { label: "Beranda", to: "/" },
  { label: "Fitur", to: "/features" },
  { label: "Materi", to: "/courses" },
  { label: "Ujian", to: "/exams" },
  { label: "Harga", to: "/pricing" },
  { label: "FAQ", to: "/faq" },
];

// ==========================================
// NAVIGASI DASHBOARD SISWA
// ==========================================

export const STUDENT_NAV: NavGroup[] = [
  {
    title: "MENU UTAMA",
    items: [
      {
        label: "Overview",
        to: "/dashboard",
        icon: LayoutDashboard,
        end: true,
      },
    ],
  },
  {
    title: "PEMBELAJARAN",
    items: [
      {
        label: "Materi Belajar",
        to: "/dashboard/courses",
        icon: BookOpen,
      },
      {
        label: "Koleksi Saya",
        to: "/dashboard/collections",
        icon: Bookmark,
      },
      {
        label: "Jadwal Belajar",
        to: "/dashboard/learning-schedule",
        icon: CalendarDays,
      },
    ],
  },
  {
    title: "EVALUASI & UJIAN",
    items: [
      {
        label: "Paket Ujian",
        to: "/dashboard/exams",
        icon: ClipboardList,
      },
      {
        label: "Hasil Belajar",
        to: "/dashboard/results",
        icon: Award,
      },
      {
        label: "Statistik Belajar",
        to: "/dashboard/statistics",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "PENGEMBANGAN DIRI",
    items: [
      {
        label: "GradeUp Games",
        to: "/dashboard/games",
        icon: Gamepad2,
      },
      {
        label: "Pencapaian",
        to: "/dashboard/achievements",
        icon: Trophy,
      },
      {
        label: "Riwayat Aktivitas",
        to: "/dashboard/activity",
        icon: History,
      },
    ],
  },
  {
    title: "PENGATURAN",
    items: [
      {
        label: "Pengaturan",
        to: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];

// ==========================================
// NAVIGASI DASHBOARD ADMIN
// ==========================================

export const ADMIN_NAV: NavGroup[] = [
  {
    title: "MENU UTAMA",
    items: [
      {
        label: "Overview",
        to: "/admin",
        icon: LayoutDashboard,
        end: true,
      },
    ],
  },
  {
    title: "MANAJEMEN AKADEMIK",
    items: [
      {
        label: "Manajemen Materi",
        to: "/admin/courses",
        icon: BookOpen,
      },
      {
        label: "Kategori Materi",
        to: "/admin/categories",
        icon: FolderTree,
      },
      {
        label: "Paket Ujian",
        to: "/admin/exams",
        icon: ClipboardList,
      },
      {
        label: "Bank Soal",
        to: "/admin/questions",
        icon: Library,
      },
    ],
  },
  {
    title: "PENGGUNA & KOMUNIKASI",
    items: [
      {
        label: "Manajemen Pengguna",
        to: "/admin/users",
        icon: Users,
      },
      {
        label: "Chat Siswa",
        to: "/admin/chats",
        icon: MessageCircle,
      },
      {
        label: "Manajemen Pengumuman",
        to: "/admin/announcements",
        icon: Megaphone,
      },
    ],
  },
  {
    title: "MONETISASI",
    items: [
      {
        label: "Transaksi",
        to: "/admin/transactions",
        icon: Receipt,
      },
      {
        label: "Manajemen Paket Premium",
        to: "/admin/premium-plans",
        icon: Crown,
      },
      {
        label: "Manajemen Promo",
        to: "/admin/promos",
        icon: TicketPercent,
      },
    ],
  },
  {
    title: "ANALITIK & SISTEM",
    items: [
      {
        label: "Laporan & Analitik",
        to: "/admin/reports",
        icon: FileBarChart,
      },
      {
        label: "Pengaturan Sistem",
        to: "/admin/settings",
        icon: SlidersHorizontal,
      },
    ],
  },
];

// ==========================================
// NAVIGASI UPGRADE PREMIUM
// ==========================================

export const UPGRADE_NAV = {
  label: "Upgrade Premium",
  icon: Crown,
};

// ==========================================
// KONSTANTA PEMBELAJARAN
// ==========================================

export const LEVELS = ["SD", "SMP", "SMA", "Umum"] as const;

export const DIFFICULTIES = ["Mudah", "Sedang", "Sulit"] as const;

// ==========================================
// WARNA GRAFIK GRADEUP
// ==========================================

export const CHART_COLORS = {
  primary: "#0F766E",
  secondary: "#10B981",
  accent: "#34D399",
  soft: "#99F6E4",
  muted: "#94A3B8",
  danger: "#F87171",
};
