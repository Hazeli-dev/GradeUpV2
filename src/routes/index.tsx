
import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { supabase } from "@/lib/supabase";

// Layouts
import { PublicLayout } from "@/layouts/public-layout";
import { AuthLayout } from "@/layouts/auth-layout";
import { StudentLayout } from "@/layouts/student-layout";
import { AdminLayout } from "@/layouts/admin-layout";

// Halaman Publik
import HomePage from "@/pages/public/home-page";
import AboutPage from "@/pages/public/about-page";
import FeaturesPage from "@/pages/public/features-page";
import PublicCoursesPage from "@/pages/public/public-courses-page";
import PublicExamsPage from "@/pages/public/public-exams-page";
import PricingPage from "@/pages/public/pricing-page";
import FaqPage from "@/pages/public/faq-page";
import ContactPage from "@/pages/public/contact-page";

// Halaman Auth
import LoginPage from "@/pages/auth/login-page";
import RegisterPage from "@/pages/auth/register-page";
import ForgotPasswordPage from "@/pages/auth/forgot-password-page";
import ResetPasswordPage from "@/pages/auth/reset-password-page";
import VerifyEmailPage from "@/pages/auth/verify-email-page";

// Halaman Student
import StudentOverviewPage from "@/pages/student/overview-page";
import StudentCoursesPage from "@/pages/student/courses-page";
import StudentCollectionsPage from "@/pages/student/collections-page";
import CourseDetailPage from "@/pages/student/course-detail-page";
import LessonLearningPage from "@/pages/student/lesson-learning-page";
import StudentExamsPage from "@/pages/student/exams-page";
import ExamDetailPage from "@/pages/student/exam-detail-page";
import ExamAttemptPage from "@/pages/student/exam-attempt-page";
import StudentLearningSchedulePage from "@/pages/student/learning-schedule-page";
import ResultsPage from "@/pages/student/results-page";
import ResultDetailPage from "@/pages/student/result-detail-page";
import AchievementsPage from "@/pages/student/achievements-page";
import StatisticsPage from "@/pages/student/statistics-page";
import ActivityPage from "@/pages/student/activity-page";
import StudentSettingsPage from "@/pages/student/settings-page";

// GradeUp Games
import StudentGamesPage from "@/pages/student/games-page";
import CariKataPage from "@/pages/student/games/cari-kata-page";
import DetektifSainsPage from "@/pages/student/games/detektif-sains-page";

// Halaman Admin
import AdminOverviewPage from "@/pages/admin/overview-page";
import AdminUsersPage from "@/pages/admin/users-page";
import AdminCoursesPage from "@/pages/admin/courses-page";
import AdminCategoriesPage from "@/pages/admin/categories-page";
import AdminExamsPage from "@/pages/admin/exams-page";
import AdminQuestionsPage from "@/pages/admin/questions-page";
import AdminTransactionsPage from "@/pages/admin/transactions-page";
import AdminPremiumPlansPage from "@/pages/admin/premium-plans-page";
import AdminPromoManagementPage from "@/pages/admin/promo-management-page";
import AdminReportsPage from "@/pages/admin/reports-page";
import AdminAnnouncementsPage from "@/pages/admin/announcements-page";
import AdminSettingsPage from "@/pages/admin/settings-page";
import ChatManagementPage from "@/pages/admin/chat-management-page";

// 404
import NotFoundPage from "@/pages/not-found-page";

type AccessState =
  | { status: "loading" }
  | { status: "allowed"; role: string }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

// Proteksi halaman berdasarkan sesi Supabase dan role profil.
function ProtectedRoute({
  allowedRole,
}: {
  allowedRole: "admin" | "student";
}) {
  const location = useLocation();

  const [access, setAccess] = useState<AccessState>({
    status: "loading",
  });

  useEffect(() => {
    let active = true;
    let requestId = 0;

    async function checkAccess(session: {
      user: { id: string };
    } | null) {
      const currentRequest = ++requestId;

      if (!session?.user) {
        if (active && currentRequest === requestId) {
          setAccess({ status: "unauthenticated" });
        }
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) throw error;

        if (!profile) {
          throw new Error("Profil pengguna tidak ditemukan.");
        }

        const role = String(profile.role || "student").toLowerCase();

        if (active && currentRequest === requestId) {
          setAccess({
            status: "allowed",
            role,
          });
        }
      } catch (error: unknown) {
        if (active && currentRequest === requestId) {
          setAccess({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Gagal memeriksa hak akses akun.",
          });
        }
      }
    }

    // Dengarkan perubahan sesi login dan logout.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void checkAccess(session);
    });

    // Periksa sesi yang sudah tersimpan.
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;

      if (error) {
        setAccess({
          status: "error",
          message: error.message,
        });
        return;
      }

      void checkAccess(data.session);
    });

    return () => {
      active = false;
      requestId++;
      subscription.unsubscribe();
    };
  }, []);

  if (access.status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">
          Memeriksa sesi akun GradeUp...
        </p>
      </div>
    );
  }

  if (access.status === "unauthenticated") {
    const redirectPath =
      location.pathname + location.search;

    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(redirectPath)}`}
        replace
      />
    );
  }

  if (access.status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-bold">
          Gagal Memeriksa Akun
        </h2>

        <p className="max-w-md text-sm text-muted-foreground">
          {access.message}
        </p>

        <Link
          to="/login"
          className="font-semibold text-primary hover:underline"
        >
          Kembali ke Login
        </Link>
      </div>
    );
  }

  if (allowedRole === "student" && access.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (allowedRole === "admin" && access.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Route Publik */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/courses" element={<PublicCoursesPage />} />
        <Route path="/exams" element={<PublicExamsPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      {/* Route Auth */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Route>

      {/* Route Student */}
      <Route element={<ProtectedRoute allowedRole="student" />}>
        <Route
          path="/dashboard/exams/:examId/attempt"
          element={<ExamAttemptPage />}
        />

        <Route path="/dashboard" element={<StudentLayout />}>
          <Route index element={<StudentOverviewPage />} />

          {/* Materi Belajar */}
          <Route path="courses" element={<StudentCoursesPage />} />
          <Route path="collections" element={<StudentCollectionsPage />} />
          <Route path="courses/:courseId" element={<CourseDetailPage />} />
          <Route
            path="courses/:courseId/learn/:lessonId"
            element={<LessonLearningPage />}
          />

          {/* GradeUp Games */}
          <Route path="games" element={<StudentGamesPage />} />
          <Route
            path="games/cari-kata"
            element={<CariKataPage />}
          />
          <Route
            path="games/detektif-sains"
            element={<DetektifSainsPage />}
          />

          {/* Paket Ujian */}
          <Route path="exams" element={<StudentExamsPage />} />
          <Route path="exams/:examId" element={<ExamDetailPage />} />

          {/* Jadwal Belajar */}
          <Route
            path="learning-schedule"
            element={<StudentLearningSchedulePage />}
          />

          {/* Hasil Belajar */}
          <Route path="results" element={<ResultsPage />} />
          <Route path="results/:resultId" element={<ResultDetailPage />} />

          {/* Pengembangan Siswa */}
          <Route path="achievements" element={<AchievementsPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="activity" element={<ActivityPage />} />

          {/* Pengaturan */}
          <Route path="settings" element={<StudentSettingsPage />} />
        </Route>
      </Route>

      {/* Route Admin */}
      <Route element={<ProtectedRoute allowedRole="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="exams" element={<AdminExamsPage />} />
          <Route path="questions" element={<AdminQuestionsPage />} />
          <Route path="transactions" element={<AdminTransactionsPage />} />

          {/* Manajemen Premium */}
          <Route
            path="premium-plans"
            element={<AdminPremiumPlansPage />}
          />
          <Route
            path="promos"
            element={<AdminPromoManagementPage />}
          />

          {/* Laporan dan Pengumuman */}
          <Route path="reports" element={<AdminReportsPage />} />
          <Route
            path="announcements"
            element={<AdminAnnouncementsPage />}
          />
          <Route path="chats" element={<ChatManagementPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
