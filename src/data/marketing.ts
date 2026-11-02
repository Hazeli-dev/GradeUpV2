import {
  BookOpenCheck,
  ClipboardCheck,
  LineChart,
  Timer,
  MessageSquareText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { FaqItem, PricingPlan, Testimonial } from "@/types";

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  detail: string;
}

export const features: Feature[] = [
  { icon: BookOpenCheck, title: "Materi Terstruktur", description: "Video dan bacaan singkat yang disusun per bab dan jenjang.", detail: "Setiap materi memiliki tujuan belajar, daftar pelajaran, dan kuis penutup agar progres mudah diukur." },
  { icon: ClipboardCheck, title: "Paket Ujian Realistis", description: "Try out dan simulasi dengan format mirip ujian sesungguhnya.", detail: "Timer, navigasi soal, dan konfirmasi pengumpulan membantu siswa terbiasa dengan suasana ujian." },
  { icon: LineChart, title: "Statistik Belajar", description: "Pantau tren nilai, mata pelajaran terkuat, dan area yang perlu diperkuat.", detail: "Grafik performa mingguan dan perbandingan jawaban benar–salah memberi gambaran belajar yang jelas." },
  { icon: Timer, title: "Latihan Berwaktu", description: "Latih manajemen waktu dengan batas durasi per paket ujian.", detail: "Kebiasaan menjawab dengan tempo yang tepat dibangun lewat latihan berulang." },
  { icon: MessageSquareText, title: "Pembahasan Lengkap", description: "Setiap soal disertai penjelasan langkah demi langkah.", detail: "Tinjau jawaban Anda, pahami kesalahan, dan pelajari cara berpikir yang benar." },
  { icon: ShieldCheck, title: "Aman untuk Semua Jenjang", description: "Konten untuk SD, SMP, SMA, hingga persiapan ujian masuk.", detail: "Level dan kategori memudahkan siswa dan orang tua menemukan materi yang sesuai." },
];

export const testimonials: Testimonial[] = [
  { id: "ts-1", name: "Aulia R.", role: "Siswa SMA kelas 12", quote: "Tampilan try out-nya mirip ujian beneran. Setelah rutin latihan, saya jadi lebih tenang dan nilai matematika naik." },
  { id: "ts-2", name: "Pak Hendra", role: "Orang tua siswa", quote: "Saya bisa melihat perkembangan anak lewat statistik belajarnya. Sederhana tapi sangat membantu." },
  { id: "ts-3", name: "Bu Lestari", role: "Guru SD", quote: "Materi pecahan dan kuisnya menarik. Murid-murid saya jadi lebih semangat berlatih di rumah." },
  { id: "ts-4", name: "Raka P.", role: "Siswa SMP kelas 9", quote: "Pembahasannya jelas, jadi saya paham kenapa jawaban saya salah. Streak harian bikin saya konsisten belajar." },
];

export const faqs: FaqItem[] = [
  { id: "f-1", category: "Umum", question: "Apa itu GradeUp?", answer: "GradeUp adalah platform belajar berbasis ujian yang menyediakan materi, latihan soal, try out online, dan pelacakan progres untuk siswa berbagai jenjang." },
  { id: "f-2", category: "Umum", question: "Untuk jenjang apa saja GradeUp tersedia?", answer: "Tersedia konten untuk SD, SMP, SMA, serta persiapan ujian masuk perguruan tinggi." },
  { id: "f-3", category: "Akun", question: "Bagaimana cara mendaftar?", answer: "Klik tombol Daftar Gratis, isi nama, email, dan kata sandi, lalu verifikasi email Anda." },
  { id: "f-4", category: "Akun", question: "Saya lupa kata sandi, apa yang harus dilakukan?", answer: "Gunakan halaman Lupa Kata Sandi untuk meminta tautan pengaturan ulang melalui email." },
  { id: "f-5", category: "Ujian", question: "Apakah ujian memiliki batas waktu?", answer: "Ya. Setiap paket ujian memiliki durasi tertentu dan pengumpulan akan dikonfirmasi sebelum dikirim." },
  { id: "f-6", category: "Ujian", question: "Apakah saya bisa melihat pembahasan soal?", answer: "Pembahasan tersedia di halaman Hasil Belajar setelah ujian selesai." },
  { id: "f-7", category: "Pembayaran", question: "Apa perbedaan paket Gratis dan Premium?", answer: "Paket Gratis memberi akses materi dan ujian dasar. Premium membuka seluruh materi, paket ujian eksklusif, dan statistik lanjutan." },
  { id: "f-8", category: "Pembayaran", question: "Metode pembayaran apa yang tersedia?", answer: "Metode pembayaran akan tersedia saat fitur langganan diaktifkan. Pada versi demo ini belum ada transaksi nyata." },
];

export const pricingPlans: PricingPlan[] = [
  {
    id: "free", name: "Gratis", price: 0, period: "selamanya",
    description: "Mulai belajar tanpa biaya.",
    features: ["Akses materi dasar", "3 paket ujian gratis", "Statistik belajar dasar", "Pembahasan soal terbatas"],
  },
  {
    id: "monthly", name: "Premium Bulanan", price: 49000, period: "/ bulan",
    description: "Fleksibel, berhenti kapan saja.",
    features: ["Semua materi premium", "Seluruh paket ujian", "Statistik belajar lengkap", "Pembahasan soal lengkap", "Tanpa iklan"],
    popular: true,
  },
  {
    id: "yearly", name: "Premium Tahunan", price: 399000, period: "/ tahun",
    description: "Lebih hemat untuk belajar sepanjang tahun.",
    features: ["Semua fitur Premium Bulanan", "Hemat dibanding bayar bulanan", "Prioritas fitur baru", "Sertifikat penyelesaian"],
    note: "Setara Rp33.250 / bulan",
  },
];
