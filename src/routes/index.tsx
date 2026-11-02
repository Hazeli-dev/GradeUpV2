import { Navigate, Outlet, Route, Routes } from "react-router-dom";

// 1. Import Layouts
import { PublicLayout } from "@/layouts/public-layout";
import { AuthLayout } from "@/layouts/auth-layout";
import { StudentLayout } from "@/layouts/student-layout";
import { AdminLayout } from "@/layouts/admin-layout";

// 2. Import Halaman Publik
import HomePage from "@/pages/public/home-page";
import AboutPage from "@/pages/public/about-page";
import FeaturesPage from "@/pages/public/features-page";
import PublicCoursesPage from "@/pages/public/public-courses-page";
import PublicExamsPage from "@/pages/public/public-exams-page";
import PricingPage from "@/pages/public/pricing-page";
import FaqPage from "@/pages/public/faq-page";
import ContactPage from "@/pages/public/contact-page";

// 3. Import Halaman Auth
import LoginPage from "@/pages/auth/login-page";
import RegisterPage from "@/pages/auth/register-page";
import ForgotPasswordPage from "@/pages/auth/forgot-password-page";
import ResetPasswordPage from "@/pages/auth/reset-password-page";
import VerifyEmailPage from "@/pages/auth/verify-email-page";

// 4. Import Halaman Student Dashboard
import StudentOverviewPage from "@/pages/student/overview-page";
import StudentCoursesPage from "@/pages/student/courses-page";
import CourseDetailPage from "@/pages/student/course-detail-page";
import StudentExamsPage from "@/pages/student/exams-page";
import ExamDetailPage from "@/pages/student/exam-detail-page";
import ExamAttemptPage from "@/pages/student/exam-attempt-page";
import ResultsPage from "@/pages/student/results-page";
import ResultDetailPage from "@/pages/student/result-detail-page";
import AchievementsPage from "@/pages/student/achievements-page"; // IMPORT HALAMAN PENCAPAIAN
import StatisticsPage from "@/pages/student/statistics-page";
import ActivityPage from "@/pages/student/activity-page";
import StudentSettingsPage from "@/pages/student/settings-page";

// 5. Import Halaman Admin Dashboard
import AdminOverviewPage from "@/pages/admin/overview-page";
import AdminUsersPage from "@/pages/admin/users-page";
import AdminCoursesPage from "@/pages/admin/courses-page";
import AdminCategoriesPage from "@/pages/admin/categories-page";
import AdminExamsPage from "@/pages/admin/exams-page";
import AdminQuestionsPage from "@/pages/admin/questions-page";
import AdminTransactionsPage from "@/pages/admin/transactions-page";
import AdminReportsPage from "@/pages/admin/reports-page";
import AdminSettingsPage from "@/pages/admin/settings-page";

// 6. Import 404
import NotFoundPage from "@/pages/not-found-page";

// Helper Guard Rute yang Aman & Fleksibel
function ProtectedRoute({ allowedRole }: { allowedRole: "admin" | "student" }) {
  let role = "student";

  try {
    // Cari key storage Supabase apapun yang tersimpan
    const sbKey = Object.keys(localStorage).find(
      (key) => key.startsWith("sb-") && key.endsWith("-auth-token")
    );
    const sessionData = sbKey ? localStorage.getItem(sbKey) : localStorage.getItem("supabase.auth.token");

    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      const user = parsed?.user || parsed;
      role = (
        user?.user_metadata?.role ||
        user?.app_metadata?.role ||
        user?.role ||
        "student"
      ).toLowerCase();
    }
  } catch (e) {
    role = "student";
  }

  if (allowedRole === "student" && role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (allowedRole === "admin" && role !== "admin") {
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

      {/* Ujian */}
      <Route path="/dashboard/exams/:examId/attempt" element={<ExamAttemptPage />} />

      {/* Route Student Dashboard */}
      <Route element={<ProtectedRoute allowedRole="student" />}>
        <Route path="/dashboard" element={<StudentLayout />}>
          <Route index element={<StudentOverviewPage />} />
          <Route path="courses" element={<StudentCoursesPage />} />
          <Route path="courses/:courseId" element={<CourseDetailPage />} />
          <Route path="exams" element={<StudentExamsPage />} />
          <Route path="exams/:examId" element={<ExamDetailPage />} />
          <Route path="results" element={<ResultsPage />} />
          <Route path="results/:resultId" element={<ResultDetailPage />} />
          <Route path="achievements" element={<AchievementsPage />} /> {/* RUTE PENCAPAIAN DITAMBAHKAN */}
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="settings" element={<StudentSettingsPage />} />
        </Route>
      </Route>

      {/* Route Admin Dashboard */}
      <Route element={<ProtectedRoute allowedRole="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="exams" element={<AdminExamsPage />} />
          <Route path="questions" element={<AdminQuestionsPage />} />
          <Route path="transactions" element={<AdminTransactionsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
