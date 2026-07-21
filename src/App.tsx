import { useEffect } from "react";
import { AuthProvider, useAuth } from "./lib/auth";
import { ToastProvider } from "./lib/toast";
import { useRouter, Link } from "./lib/router";
import { Logo, Spinner, Button } from "./components/ui";
import { LandingPage } from "./pages/LandingPage";
import { ParentRegisterPage, VerifyEmailPage, LoginPage } from "./pages/AuthPages";
import { SchoolRegisterPage } from "./pages/SchoolRegisterPage";
import { ApplyDiscoveryPage } from "./pages/ApplyDiscoveryPage";
import { ApplyToSchoolPage } from "./pages/ApplyToSchoolPage";
import { ParentPortalShell } from "./components/ParentPortalShell";
import { AdminPortalShell } from "./components/AdminPortalShell";
import { TeacherPortalShell } from "./components/TeacherPortalShell";
import { StudentPortalShell } from "./components/StudentPortalShell";
import { PlatformPortalShell } from "./components/PlatformPortalShell";
import { ParentDashboardPage } from "./pages/portal/ParentDashboardPage";
import { WardFormPage } from "./pages/portal/WardFormPage";
import { ApplicationsListPage } from "./pages/portal/ApplicationsListPage";
import { ApplicationDetailPage } from "./pages/portal/ApplicationDetailPage";
import { PaymentsPage } from "./pages/portal/PaymentsPage";
import { ResultsPage } from "./pages/portal/ResultsPage";
import { AttendancePage } from "./pages/portal/AttendancePage";
import { ComplaintsPage } from "./pages/portal/ComplaintsPage";
import { RequestsPage } from "./pages/portal/RequestsPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminApplicationsPage } from "./pages/admin/AdminApplicationsPage";
import { AdminApplicationDetailPage } from "./pages/admin/AdminApplicationDetailPage";
import { AdminStudentsPage } from "./pages/admin/AdminStudentsPage";
import { AdminPaymentsPage } from "./pages/admin/AdminPaymentsPage";
import { AdminClassesPage } from "./pages/admin/AdminClassesPage";
import { AdminComplaintsPage } from "./pages/admin/AdminComplaintsPage";
import { AdminRequestsPage } from "./pages/admin/AdminRequestsPage";
import { AdminSettingsPage } from "./pages/admin/AdminSettingsPage";
import { AdminTeachersPage } from "./pages/admin/AdminTeachersPage";
import { AdminAcademicPage } from "./pages/admin/AdminAcademicPage";
import { TeacherDashboardPage } from "./pages/teacher/TeacherDashboardPage";
import { TeacherAssignmentsPage } from "./pages/teacher/TeacherAssignmentsPage";
import { TeacherAttendancePage } from "./pages/teacher/TeacherAttendancePage";
import { TeacherCbtPage } from "./pages/teacher/TeacherCbtPage";
import { TeacherTimetablePage } from "./pages/teacher/TeacherTimetablePage";
import { TeacherResultsPage } from "./pages/teacher/TeacherResultsPage";
import { TeacherProfilePage } from "./pages/teacher/TeacherProfilePage";
import { StudentDashboardPage } from "./pages/student/StudentDashboardPage";
import { StudentAssignmentsPage } from "./pages/student/StudentAssignmentsPage";
import { StudentExamsPage } from "./pages/student/StudentExamsPage";
import { StudentResultsPage } from "./pages/student/StudentResultsPage";
import { StudentCalendarPage } from "./pages/student/StudentCalendarPage";
import { StudentClubsPage } from "./pages/student/StudentClubsPage";
import { StudentProfilePage } from "./pages/student/StudentProfilePage";
import { PlatformDashboardPage } from "./pages/platform/PlatformDashboardPage";
import { PlatformSchoolsPage } from "./pages/platform/PlatformSchoolsPage";
import { PlatformPaymentsPage } from "./pages/platform/PlatformPaymentsPage";
import { PlatformStudentsPage } from "./pages/platform/PlatformStudentsPage";
import { PlatformSettingsPage } from "./pages/platform/PlatformSettingsPage";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router />
      </ToastProvider>
    </AuthProvider>
  );
}

function Router() {
  const { route, navigate } = useRouter();
  const { user, loading } = useAuth();
  const path = route.path;

  useEffect(() => {
    if (loading) return;
    const isPortal = path.startsWith("/portal");
    const isAdmin = path.startsWith("/admin");
    const isTeacher = path.startsWith("/teacher");
    const isStudent = path.startsWith("/student");
    const isPlatform = path.startsWith("/platform");
    const isProtected = isPortal || isAdmin || isTeacher || isStudent || isPlatform;
    if (isProtected && !user) {
      navigate("/login?next=" + encodeURIComponent(path));
    }
    if (isPortal && user && user.userType !== "parent") goToPortal(user.userType, navigate);
    if (isAdmin && user && user.userType !== "school_admin") goToPortal(user.userType, navigate);
    if (isTeacher && user && user.userType !== "teacher") goToPortal(user.userType, navigate);
    if (isStudent && user && user.userType !== "student") goToPortal(user.userType, navigate);
    if (isPlatform && user && user.userType !== "platform_admin") goToPortal(user.userType, navigate);
  }, [path, user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-ink-50">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="text-brand-600" size={32} />
          <p className="text-sm text-ink-500">Loading Klasroom…</p>
        </div>
      </div>
    );
  }

  // Public routes
  if (path === "/" || path === "") return <LandingPage />;
  if (path === "/login") return <LoginPage />;
  if (path === "/register") return <ParentRegisterPage />;
  if (path === "/verify-email") return <VerifyEmailPage />;
  if (path === "/schools/register") return <SchoolRegisterPage />;
  if (path === "/apply") return <ApplyDiscoveryPage />;
  if (path.startsWith("/apply/")) return <ApplyToSchoolPage />;

  // Parent portal
  if (path.startsWith("/portal")) {
    if (!user || user.userType !== "parent") return <RedirectToLogin />;
    return (
      <ParentPortalShell>
        <ParentRoutes />
      </ParentPortalShell>
    );
  }

  // Admin portal
  if (path.startsWith("/admin")) {
    if (!user || user.userType !== "school_admin") return <RedirectToLogin />;
    return (
      <AdminPortalShell>
        <AdminRoutes />
      </AdminPortalShell>
    );
  }

  // Teacher portal
  if (path.startsWith("/teacher")) {
    if (!user || user.userType !== "teacher") return <RedirectToLogin />;
    return (
      <TeacherPortalShell>
        <TeacherRoutes />
      </TeacherPortalShell>
    );
  }

  // Student portal
  if (path.startsWith("/student")) {
    if (!user || user.userType !== "student") return <RedirectToLogin />;
    return (
      <StudentPortalShell>
        <StudentRoutes />
      </StudentPortalShell>
    );
  }

  // Platform portal (937 Ltd)
  if (path.startsWith("/platform")) {
    if (!user || user.userType !== "platform_admin") return <RedirectToLogin />;
    return (
      <PlatformPortalShell>
        <PlatformRoutes />
      </PlatformPortalShell>
    );
  }

  return <NotFound />;
}

function ParentRoutes() {
  const { route } = useRouter();
  const path = route.path;
  if (path === "/portal") return <ParentDashboardPage />;
  if (path === "/portal/wards/new") return <WardFormPage />;
  if (path === "/portal/applications") return <ApplicationsListPage />;
  if (path.startsWith("/portal/applications/")) return <ApplicationDetailPage />;
  if (path === "/portal/payments") return <PaymentsPage />;
  if (path === "/portal/results") return <ResultsPage />;
  if (path === "/portal/attendance") return <AttendancePage />;
  if (path === "/portal/complaints") return <ComplaintsPage />;
  if (path === "/portal/requests") return <RequestsPage />;
  return <NotFound />;
}

function AdminRoutes() {
  const { route } = useRouter();
  const path = route.path;
  if (path === "/admin") return <AdminDashboardPage />;
  if (path === "/admin/applications") return <AdminApplicationsPage />;
  if (path.startsWith("/admin/applications/")) return <AdminApplicationDetailPage />;
  if (path === "/admin/students") return <AdminStudentsPage />;
  if (path === "/admin/payments") return <AdminPaymentsPage />;
  if (path === "/admin/classes") return <AdminClassesPage />;
  if (path === "/admin/teachers") return <AdminTeachersPage />;
  if (path === "/admin/academic") return <AdminAcademicPage />;
  if (path === "/admin/complaints") return <AdminComplaintsPage />;
  if (path === "/admin/requests") return <AdminRequestsPage />;
  if (path === "/admin/settings") return <AdminSettingsPage />;
  return <NotFound />;
}

function TeacherRoutes() {
  const { route } = useRouter();
  const path = route.path;
  if (path === "/teacher") return <TeacherDashboardPage />;
  if (path === "/teacher/assignments") return <TeacherAssignmentsPage />;
  if (path === "/teacher/attendance") return <TeacherAttendancePage />;
  if (path === "/teacher/cbt") return <TeacherCbtPage />;
  if (path === "/teacher/timetable") return <TeacherTimetablePage />;
  if (path === "/teacher/results") return <TeacherResultsPage />;
  if (path === "/teacher/profile") return <TeacherProfilePage />;
  return <NotFound />;
}

function StudentRoutes() {
  const { route } = useRouter();
  const path = route.path;
  if (path === "/student") return <StudentDashboardPage />;
  if (path === "/student/assignments") return <StudentAssignmentsPage />;
  if (path === "/student/exams") return <StudentExamsPage />;
  if (path === "/student/results") return <StudentResultsPage />;
  if (path === "/student/calendar") return <StudentCalendarPage />;
  if (path === "/student/clubs") return <StudentClubsPage />;
  if (path === "/student/profile") return <StudentProfilePage />;
  return <NotFound />;
}

function PlatformRoutes() {
  const { route } = useRouter();
  const path = route.path;
  if (path === "/platform") return <PlatformDashboardPage />;
  if (path === "/platform/schools") return <PlatformSchoolsPage />;
  if (path === "/platform/payments") return <PlatformPaymentsPage />;
  if (path === "/platform/students") return <PlatformStudentsPage />;
  if (path === "/platform/settings") return <PlatformSettingsPage />;
  return <NotFound />;
}

function goToPortal(userType: string, navigate: (to: string) => void) {
  if (userType === "school_admin") navigate("/admin");
  else if (userType === "teacher") navigate("/teacher");
  else if (userType === "student") navigate("/student");
  else if (userType === "platform_admin") navigate("/platform");
  else navigate("/portal");
}

function RedirectToLogin() {
  return (
    <div className="min-h-screen grid place-items-center bg-ink-50 p-6">
      <div className="card p-8 text-center max-w-sm">
        <Logo size={40} withText />
        <p className="mt-5 text-sm text-ink-600">You need to sign in to view this page.</p>
        <Link to="/login" className="btn-primary mt-5 w-full justify-center">Go to sign in</Link>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-ink-50 p-6">
      <div className="text-center">
        <p className="text-6xl font-extrabold text-brand-700">404</p>
        <p className="mt-3 text-ink-600">This page doesn't exist.</p>
        <Link to="/" className="btn-primary mt-5"><Logo size={18} /> Home</Link>
      </div>
    </div>
  );
}
