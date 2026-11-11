
import {
  BookOpenCheck,
  ClipboardCheck,
  LineChart,
  Timer,
  MessageSquareText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import type {
  FaqItem,
  PricingPlan,
  Testimonial,
} from "@/types";

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  detail: string;
}

// =====================================================
// FITUR GRADEUP
// =====================================================

export const features: Feature[] = [
  {
    icon: BookOpenCheck,
    title: "Materi Pembelajaran Terstruktur",
    description:
      "Pelajari berbagai materi berdasarkan jenjang, kategori, dan topik pembelajaran.",
    detail:
      "Materi disusun untuk membantu siswa belajar secara bertahap. Siswa dapat memilih topik yang ingin dipelajari dan mengembangkan pemahaman sebelum mengerjakan latihan.",
  },
  {
    icon: ClipboardCheck,
    title: "Simulasi dan Paket Ujian",
    description:
      "Berlatih melalui paket soal, ulangan harian, try out, dan simulasi ujian.",
    detail:
      "Paket ujian dilengkapi informasi jumlah soal, durasi pengerjaan, kategori, dan ketentuan ujian. Siswa dapat membiasakan diri mengerjakan soal secara lebih terarah.",
  },
  {
    icon: LineChart,
    title: "Evaluasi Hasil Belajar",
    description:
      "Ketahui perkembangan hasil latihan melalui nilai dan riwayat pengerjaan.",
    detail:
      "Hasil pengerjaan dapat membantu siswa mengevaluasi kemampuan, mengetahui kesalahan, dan menentukan materi yang perlu dipelajari kembali.",
  },
  {
    icon: Timer,
    title: "Latihan dengan Batas Waktu",
    description:
      "Biasakan diri mengatur waktu saat mengerjakan latihan dan simulasi ujian.",
    detail:
      "Latihan berwaktu membantu siswa membangun strategi pengerjaan soal, mengatur prioritas, dan menggunakan waktu dengan lebih efektif.",
  },
  {
    icon: MessageSquareText,
    title: "Pembahasan dan Evaluasi Soal",
    description:
      "Pelajari alasan di balik jawaban benar maupun kesalahan dalam pengerjaan.",
    detail:
      "Pembahasan soal membantu siswa memahami konsep dan proses penyelesaian. Ketersediaan pembahasan mengikuti pengaturan masing-masing paket ujian.",
  },
  {
    icon: ShieldCheck,
    title: "Pembelajaran Berbagai Jenjang",
    description:
      "Temukan latihan dan materi sesuai jenjang pendidikan yang tersedia.",
    detail:
      "Kategori dan tingkat pendidikan membantu siswa menemukan konten yang relevan dengan kebutuhannya. Ketersediaan materi mengikuti pengembangan konten GradeUp.",
  },
];

// =====================================================
// TESTIMONI
// =====================================================

export const testimonials: Testimonial[] = [
  {
    id: "ts-1",
    name: "Aulia R.",
    role: "Siswa SMA kelas 12",
    quote:
      "Tampilan try out-nya mirip ujian beneran. Setelah rutin latihan, saya jadi lebih tenang dan nilai matematika naik.",
  },
  {
    id: "ts-2",
    name: "Pak Hendra",
    role: "Orang tua siswa",
    quote:
      "Saya bisa melihat perkembangan anak lewat statistik belajarnya. Sederhana tapi sangat membantu.",
  },
  {
    id: "ts-3",
    name: "Bu Lestari",
    role: "Guru SD",
    quote:
      "Materi pecahan dan kuisnya menarik. Murid-murid saya jadi lebih semangat berlatih di rumah.",
  },
  {
    id: "ts-4",
    name: "Raka P.",
    role: "Siswa SMP kelas 9",
    quote:
      "Pembahasannya jelas, jadi saya paham kenapa jawaban saya salah. Streak harian bikin saya konsisten belajar.",
  },
];

// =====================================================
// PERTANYAAN YANG SERING DIAJUKAN (FAQ)
// =====================================================

export const faqs: FaqItem[] = [
  // ---------------------------------------------------
  // UMUM
  // ---------------------------------------------------

  {
    id: "f-1",
    category: "Umum",
    question: "Apa itu GradeUp?",
    answer:
      "GradeUp adalah platform pembelajaran digital yang membantu siswa belajar, berlatih soal, mengikuti simulasi ujian, dan mengevaluasi hasil belajar melalui satu platform.",
  },
  {
    id: "f-2",
    category: "Umum",
    question: "Apa tujuan utama GradeUp?",
    answer:
      "GradeUp bertujuan menyediakan pengalaman belajar yang lebih terarah melalui materi pembelajaran, latihan soal, paket ujian, dan evaluasi hasil pengerjaan. Dengan demikian, siswa dapat mengetahui perkembangan belajar dan memahami bagian yang perlu ditingkatkan.",
  },
  {
    id: "f-3",
    category: "Umum",
    question: "Untuk jenjang pendidikan apa GradeUp tersedia?",
    answer:
      "GradeUp dikembangkan untuk mendukung kebutuhan belajar berbagai jenjang pendidikan, termasuk SD, SMP, dan SMA. Ketersediaan materi serta paket ujian dapat dilihat berdasarkan kategori yang tersedia di platform.",
  },
  {
    id: "f-4",
    category: "Umum",
    question: "Apakah GradeUp dapat digunakan melalui ponsel?",
    answer:
      "Ya. GradeUp dapat diakses melalui browser pada ponsel, tablet, laptop, maupun komputer yang terhubung ke internet. Tampilan dapat menyesuaikan ukuran layar perangkat.",
  },
  {
    id: "f-5",
    category: "Umum",
    question: "Apakah GradeUp harus diinstal terlebih dahulu?",
    answer:
      "Tidak. Kamu dapat mengakses GradeUp langsung melalui browser dengan membuka situs resmi gradeup.web.id. Pastikan menggunakan browser yang telah diperbarui agar pengalaman penggunaan lebih optimal.",
  },
  {
    id: "f-6",
    category: "Umum",
    question: "Bagaimana cara mulai belajar di GradeUp?",
    answer:
      "Buka situs GradeUp, buat akun atau masuk menggunakan akun yang sudah terdaftar. Setelah berhasil masuk, jelajahi materi dan paket ujian yang tersedia, kemudian pilih aktivitas belajar sesuai kebutuhanmu.",
  },
  {
    id: "f-7",
    category: "Umum",
    question: "Apakah GradeUp menyediakan latihan persiapan TKA?",
    answer:
      "GradeUp mengembangkan latihan dan simulasi persiapan ujian, termasuk materi terkait TKA. Periksa kategori serta deskripsi setiap paket untuk mengetahui jenjang, cakupan materi, jumlah soal, dan ketentuan pengerjaannya.",
  },
  {
    id: "f-8",
    category: "Umum",
    question: "Apakah GradeUp dapat digunakan kapan saja?",
    answer:
      "GradeUp dapat diakses selama layanan tersedia dan perangkat terhubung ke internet. Namun, paket ujian yang memiliki jadwal hanya dapat dikerjakan sesuai waktu yang ditentukan.",
  },
  {
    id: "f-9",
    category: "Umum",
    question: "Apakah GradeUp cocok untuk persiapan ujian sekolah?",
    answer:
      "Ya. Latihan soal dan simulasi dapat membantu siswa membiasakan diri dengan berbagai bentuk pertanyaan, melatih pengelolaan waktu, serta mengevaluasi pemahaman sebelum menghadapi ujian.",
  },
  {
    id: "f-10",
    category: "Umum",
    question: "Apakah GradeUp terus diperbarui?",
    answer:
      "GradeUp dikembangkan secara bertahap untuk meningkatkan kualitas layanan, memperbaiki pengalaman pengguna, serta menambahkan materi dan fitur pembelajaran. Informasi terbaru dapat dilihat langsung melalui platform.",
  },

  // ---------------------------------------------------
  // AKUN
  // ---------------------------------------------------

  {
    id: "f-11",
    category: "Akun",
    question: "Bagaimana cara membuat akun GradeUp?",
    answer:
      "Buka halaman pendaftaran GradeUp, isi informasi yang diminta seperti nama, email, dan kata sandi, kemudian ikuti instruksi pendaftaran. Jika diminta melakukan verifikasi email, selesaikan proses tersebut sebelum masuk ke akun.",
  },
  {
    id: "f-12",
    category: "Akun",
    question: "Apakah pendaftaran akun GradeUp gratis?",
    answer:
      "Kamu dapat membuat akun untuk mulai menggunakan layanan GradeUp. Akses terhadap materi dan paket tertentu dapat mengikuti ketentuan akun Gratis maupun Premium.",
  },
  {
    id: "f-13",
    category: "Akun",
    question: "Bagaimana cara login ke akun GradeUp?",
    answer:
      "Buka halaman login, masukkan alamat email dan kata sandi yang digunakan saat pendaftaran, kemudian tekan tombol masuk. Pastikan informasi yang dimasukkan sudah benar.",
  },
  {
    id: "f-14",
    category: "Akun",
    question: "Bagaimana jika saya lupa kata sandi?",
    answer:
      "Gunakan fitur Lupa Kata Sandi pada halaman login jika tersedia. Masukkan email yang terdaftar dan ikuti petunjuk pemulihan yang dikirimkan ke email tersebut.",
  },
  {
    id: "f-15",
    category: "Akun",
    question: "Mengapa email pemulihan kata sandi belum diterima?",
    answer:
      "Periksa kembali alamat email yang dimasukkan, termasuk folder Spam atau Promosi. Tunggu beberapa saat karena pengiriman email dapat membutuhkan waktu. Jika belum diterima, hubungi tim GradeUp.",
  },
  {
    id: "f-16",
    category: "Akun",
    question: "Apakah saya dapat mengubah informasi profil?",
    answer:
      "Perubahan informasi profil bergantung pada fitur pengaturan yang tersedia di akun. Jika fitur pengeditan tersedia, buka halaman profil atau pengaturan akun untuk memperbarui informasi yang diizinkan.",
  },
  {
    id: "f-17",
    category: "Akun",
    question: "Apakah satu akun dapat digunakan di beberapa perangkat?",
    answer:
      "Akun dapat diakses melalui perangkat yang mendukung browser. Untuk menjaga keamanan dan keakuratan riwayat belajar, sebaiknya gunakan akun secara pribadi dan hindari berbagi informasi login.",
  },
  {
    id: "f-18",
    category: "Akun",
    question: "Mengapa saya tidak bisa masuk ke akun?",
    answer:
      "Pastikan email dan kata sandi sudah benar, koneksi internet stabil, serta akun dapat diakses. Jika lupa kata sandi, gunakan fitur pemulihan. Apabila masalah tetap terjadi, hubungi tim GradeUp.",
  },
  {
    id: "f-19",
    category: "Akun",
    question: "Bagaimana cara menjaga keamanan akun?",
    answer:
      "Gunakan kata sandi yang kuat dan tidak mudah ditebak. Jangan membagikan kata sandi, kode verifikasi, atau informasi pemulihan kepada orang lain. Selalu keluar dari akun jika menggunakan perangkat bersama.",
  },
  {
    id: "f-20",
    category: "Akun",
    question: "Bagaimana jika saya mengalami kendala pada akun?",
    answer:
      "Hubungi tim GradeUp melalui halaman Kontak. Jelaskan kendala yang dialami dan sertakan alamat email akun agar proses pemeriksaan dapat dilakukan dengan lebih mudah. Jangan mengirimkan kata sandi atau kode OTP.",
  },

  // ---------------------------------------------------
  // UJIAN
  // ---------------------------------------------------

  {
    id: "f-21",
    category: "Ujian",
    question: "Apa yang dimaksud dengan paket ujian di GradeUp?",
    answer:
      "Paket ujian adalah kumpulan soal yang disusun berdasarkan kategori, jenjang, mata pelajaran, atau tujuan pembelajaran tertentu. Setiap paket dapat memiliki jumlah soal, durasi, tingkat kesulitan, dan ketentuan pengerjaan yang berbeda.",
  },
  {
    id: "f-22",
    category: "Ujian",
    question: "Apa perbedaan latihan soal dan simulasi ujian?",
    answer:
      "Latihan soal berfokus pada penguatan pemahaman terhadap materi tertentu. Simulasi ujian memberikan pengalaman mengerjakan sejumlah soal dengan ketentuan seperti durasi dan sistem pengerjaan yang telah ditetapkan.",
  },
  {
    id: "f-23",
    category: "Ujian",
    question: "Bagaimana cara mengikuti ujian di GradeUp?",
    answer:
      "Masuk ke akun GradeUp, buka halaman ujian, pilih paket yang tersedia, lalu baca informasi mengenai jumlah soal, durasi, dan ketentuan pengerjaan. Tekan tombol mulai jika paket sudah dapat diakses.",
  },
  {
    id: "f-24",
    category: "Ujian",
    question: "Apakah setiap paket ujian memiliki batas waktu?",
    answer:
      "Durasi pengerjaan mengikuti pengaturan masing-masing paket. Sebelum memulai, periksa informasi waktu yang tersedia agar kamu dapat mengatur strategi pengerjaan dengan baik.",
  },
  {
    id: "f-25",
    category: "Ujian",
    question: "Mengapa paket ujian belum dapat dikerjakan?",
    answer:
      "Paket mungkin belum dipublikasikan, belum memasuki jadwal mulai, sudah melewati waktu pengerjaan, atau memerlukan akses tertentu. Periksa status dan informasi paket pada halaman ujian.",
  },
  {
    id: "f-26",
    category: "Ujian",
    question: "Bagaimana sistem penilaian ujian dilakukan?",
    answer:
      "Penilaian mengikuti konfigurasi masing-masing paket ujian. Hasil dapat mempertimbangkan jumlah jawaban benar, jumlah soal, dan ketentuan nilai yang ditetapkan oleh pengelola paket.",
  },
  {
    id: "f-27",
    category: "Ujian",
    question: "Apakah hasil ujian langsung muncul setelah selesai?",
    answer:
      "Hasil dapat ditampilkan setelah proses penyimpanan dan penilaian selesai. Waktu serta informasi hasil yang tersedia mengikuti pengaturan paket dan sistem GradeUp.",
  },
  {
    id: "f-28",
    category: "Ujian",
    question: "Di mana saya dapat melihat hasil ujian?",
    answer:
      "Buka halaman Hasil Belajar atau riwayat ujian pada akunmu. Jika fitur tersebut tersedia untuk paket yang dikerjakan, kamu dapat melihat informasi nilai dan ringkasan hasil pengerjaan.",
  },
  {
    id: "f-29",
    category: "Ujian",
    question: "Apakah saya dapat melihat jawaban yang benar dan pembahasan?",
    answer:
      "Pembahasan dapat ditampilkan setelah ujian selesai apabila fitur review diaktifkan pada paket tersebut. Informasi ini membantu kamu memahami jawaban yang benar dan alasan di balik penyelesaian soal.",
  },
  {
    id: "f-30",
    category: "Ujian",
    question: "Apakah saya dapat mengulang paket ujian?",
    answer:
      "Kesempatan mengulang bergantung pada pengaturan masing-masing paket. Periksa informasi percobaan atau ketentuan ujian sebelum memulai pengerjaan.",
  },
  {
    id: "f-31",
    category: "Ujian",
    question: "Apa yang terjadi jika waktu ujian habis?",
    answer:
      "Pada paket dengan batas waktu, sistem akan mengikuti ketentuan pengakhiran ujian yang telah ditetapkan. Pastikan jawaban telah disimpan sesuai mekanisme pengerjaan yang tersedia.",
  },
  {
    id: "f-32",
    category: "Ujian",
    question: "Apa yang harus dilakukan jika koneksi internet terputus saat ujian?",
    answer:
      "Periksa koneksi internet dan ikuti petunjuk pada halaman ujian ketika koneksi kembali tersedia. Status jawaban bergantung pada proses penyimpanan sistem. Jika terjadi masalah, segera hubungi tim GradeUp dan sertakan informasi paket serta waktu kejadian.",
  },
  {
    id: "f-33",
    category: "Ujian",
    question: "Apa manfaat melihat riwayat pengerjaan ujian?",
    answer:
      "Riwayat pengerjaan membantu siswa meninjau aktivitas belajar sebelumnya, melihat hasil yang tersimpan, dan mengevaluasi perkembangan kemampuan dari waktu ke waktu.",
  },
  {
    id: "f-34",
    category: "Ujian",
    question: "Apa itu XP dan level di GradeUp?",
    answer:
      "XP atau experience point merupakan poin pengalaman yang dapat diperoleh melalui aktivitas tertentu di GradeUp. Level menunjukkan perkembangan berdasarkan sistem pencapaian yang diterapkan pada platform.",
  },

  // ---------------------------------------------------
  // PEMBAYARAN
  // ---------------------------------------------------

  {
    id: "f-35",
    category: "Pembayaran",
    question: "Apa itu GradeUp Premium?",
    answer:
      "GradeUp Premium adalah pilihan berlangganan yang memberikan akses ke paket atau fitur khusus sesuai manfaat yang tercantum pada halaman Upgrade Premium.",
  },
  {
    id: "f-36",
    category: "Pembayaran",
    question: "Apa perbedaan akun Gratis dan Premium?",
    answer:
      "Akun Gratis dapat menggunakan fitur dan konten yang disediakan untuk pengguna reguler. Premium memberikan akses tambahan sesuai paket berlangganan yang dipilih. Periksa halaman Upgrade Premium untuk mengetahui rincian manfaatnya.",
  },
  {
    id: "f-37",
    category: "Pembayaran",
    question: "Apa saja pilihan paket GradeUp Premium?",
    answer:
      "GradeUp menyediakan pilihan paket bulanan, 3 bulan, 6 bulan, dan tahunan. Harga serta masa aktif setiap paket dapat dilihat pada halaman Upgrade Premium sebelum melakukan pembelian.",
  },
  {
    id: "f-38",
    category: "Pembayaran",
    question: "Bagaimana cara membeli GradeUp Premium?",
    answer:
      "Masuk ke akun GradeUp, buka halaman Upgrade Premium, pilih paket yang diinginkan, kemudian ikuti instruksi pembayaran yang tersedia. Pastikan memeriksa kembali paket dan nominal sebelum menyelesaikan transaksi.",
  },
  {
    id: "f-39",
    category: "Pembayaran",
    question: "Metode pembayaran apa yang tersedia?",
    answer:
      "Metode pembayaran mengikuti pilihan yang ditampilkan pada halaman checkout. Ketersediaan metode dapat bergantung pada konfigurasi layanan pembayaran GradeUp.",
  },
  {
    id: "f-40",
    category: "Pembayaran",
    question: "Bagaimana jika pembayaran berhasil tetapi Premium belum aktif?",
    answer:
      "Periksa kembali status transaksi dan tunggu proses konfirmasi pembayaran. Jika status sudah berhasil tetapi akses Premium belum aktif, hubungi tim GradeUp dengan menyertakan nomor invoice dan bukti transaksi. Hindari melakukan pembayaran ulang sebelum status transaksi diperiksa.",
  },
];

// =====================================================
// PAKET HARGA PREMIUM
// =====================================================

export const pricingPlans: PricingPlan[] = [
  {
    id: "free",
    name: "Gratis",
    price: 0,
    period: "selamanya",
    description: "Mulai belajar dan kenali fitur GradeUp tanpa biaya.",
    features: [
      "Akses fitur dasar yang tersedia",
      "Akses paket ujian gratis",
      "Riwayat hasil pengerjaan",
      "Evaluasi belajar sesuai fitur tersedia",
    ],
  },
  {
    id: "monthly",
    name: "Premium Bulanan",
    price: 15000,
    period: "/ bulan",
    description: "Akses Premium untuk kebutuhan belajar satu bulan.",
    features: [
      "Akses paket dan fitur Premium",
      "Pilihan latihan dan simulasi ujian Premium",
      "Evaluasi hasil belajar sesuai paket",
      "Pembahasan soal yang tersedia",
    ],
    popular: true,
  },
  {
    id: "quarterly",
    name: "Premium 3 Bulan",
    price: 40000,
    period: "/ 3 bulan",
    description: "Pilihan belajar lebih panjang dengan satu kali pembelian.",
    features: [
      "Masa aktif selama 3 bulan",
      "Akses paket dan fitur Premium",
      "Pilihan latihan dan simulasi ujian Premium",
      "Pembahasan soal yang tersedia",
    ],
    note: "Lebih hemat dibandingkan pembelian bulanan selama 3 bulan.",
  },
  {
    id: "semiannual",
    name: "Premium 6 Bulan",
    price: 75000,
    period: "/ 6 bulan",
    description: "Dukungan belajar jangka menengah dengan harga lebih hemat.",
    features: [
      "Masa aktif selama 6 bulan",
      "Akses paket dan fitur Premium",
      "Pilihan latihan dan simulasi ujian Premium",
      "Pembahasan soal yang tersedia",
    ],
    note: "Cocok untuk persiapan belajar selama satu semester.",
  },
  {
    id: "yearly",
    name: "Premium Tahunan",
    price: 145000,
    period: "/ tahun",
    description: "Pilihan berlangganan untuk perjalanan belajar sepanjang tahun.",
    features: [
      "Masa aktif selama 12 bulan",
      "Akses paket dan fitur Premium",
      "Pilihan latihan dan simulasi ujian Premium",
      "Pembahasan soal yang tersedia",
    ],
    note: "Pilihan paling hemat untuk penggunaan jangka panjang.",
  },
];
