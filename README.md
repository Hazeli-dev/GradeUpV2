# GradeUp

Platform belajar berbasis ujian: materi, paket ujian, hasil, dan statistik belajar.
Repositori ini adalah **kerangka aplikasi (skeleton)** dengan data demo. Backend menyusul bertahap.

**Stack:** React 18 + Vite + TypeScript, Tailwind CSS, komponen gaya shadcn/ui (Radix), lucide-react, React Router DOM, Recharts, Sonner, persiapan Supabase.

## Menjalankan

```bash
npm install
cp .env.example .env   # opsional selama masih mode demo
npm run dev            # http://localhost:5173
npm run build          # type-check + build produksi ke dist/
npm run preview
```

## Area aplikasi dan route

| Area | Route |
| --- | --- |
| Publik | `/`, `/about`, `/features`, `/courses`, `/exams`, `/pricing`, `/faq`, `/contact` |
| Auth | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` |
| Siswa | `/dashboard`, `/dashboard/courses`, `/dashboard/courses/:courseId`, `/dashboard/exams`, `/dashboard/exams/:examId`, `/dashboard/exams/:examId/attempt`, `/dashboard/results`, `/dashboard/results/:resultId`, `/dashboard/statistics`, `/dashboard/activity`, `/dashboard/settings` |
| Admin | `/admin`, `/admin/users`, `/admin/courses`, `/admin/categories`, `/admin/exams`, `/admin/questions`, `/admin/transactions`, `/admin/reports`, `/admin/settings` |

Untuk mencoba area admin pada demo: masuk dengan email berawalan `admin` (mis. `admin@gradeup.id`) dengan kata sandi minimal 8 karakter.

## Struktur proyek

```
src/
  components/   ui/ (primitif), shared/ (kartu, state, modal), marketing/, auth/, admin/
  layouts/      public, auth, student, admin (+ sidebar-shell)
  pages/        public/, auth/, student/, admin/
  routes/       definisi route (lazy-loaded)
  hooks/        tema, guest gate, upgrade modal, useAsync
  services/     lapisan akses data (saat ini membaca src/data)
  data/         data demo (terpisah dari logika service)
  lib/          utils, klien Supabase
  types/ constants/ utils/
```

## Demo vs produksi

Semua halaman memakai **data demo** dan ditandai banner "Mode demo". Yang **belum** diimplementasikan:

- Supabase Auth dan database nyata (`src/services/auth.service.ts` hanya simulasi).
- **Kontrol akses berbasis peran.** `/dashboard` dan `/admin` saat ini terbuka tanpa login. Jangan deploy ke produksi dengan data sungguhan sebelum guard route dan RLS dipasang.
- Exam engine, penilaian otomatis, dan penyimpanan jawaban/hasil.
- CRUD permanen (admin) dan penyimpanan progres belajar.
- Langganan dan payment gateway.
- Analitik dan notifikasi produksi.

## Rencana integrasi Supabase

1. Buat proyek Supabase, isi `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
2. Ganti isi `src/services/*.ts` dengan query Supabase; komponen tidak perlu diubah.
3. Tambah guard route (`RequireAuth`) di `src/routes/index.tsx` dan Row Level Security di database.

Jangan menaruh `service_role` key di frontend.

## Deploy ke Vercel

1. Push ke repositori GitHub Anda sendiri.
2. Import di Vercel (preset Vite terdeteksi). `vercel.json` sudah mengatur SPA rewrite.
3. Tambahkan environment variable dari `.env.example` bila diperlukan.
