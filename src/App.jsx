import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { BadgeProvider } from "@/context/BadgeContext";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import AdminLayout from "@/components/AdminLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useTimesheet } from "@/hooks/useTimesheet";
import { AnimatePresence } from "framer-motion";

// Pages
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import CoursesPage from "@/pages/CoursesPage";
import CourseDetailPage from "@/pages/CourseDetailPage";
import ModuleViewerPage from "@/pages/ModuleViewerPage";
import TimesheetPage from "@/pages/TimesheetPage";
import ProfilePage from "@/pages/ProfilePage";

// Admin Pages
import AdminOverviewPage from "@/pages/admin/AdminOverviewPage";
import EmployeeMonitorPage from "@/pages/admin/EmployeeMonitorPage";
import CourseBuilderPage from "@/pages/admin/CourseBuilderPage";
import ReviewQueuePage from "@/pages/admin/ReviewQueuePage";
import AdminTimesheetsPage from "@/pages/admin/AdminTimesheetsPage";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";

// Timesheet tracking component
function TimesheetTracker() {
  useTimesheet(); // Hook runs for all authenticated pages
  return null; // No UI needed
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route 
          path="/" 
          element={
            <ErrorBoundary title="Homepage Error">
              <HomePage />
            </ErrorBoundary>
          } 
        />
        <Route 
          path="/login" 
          element={
            <ErrorBoundary title="Login Error">
              <LoginPage />
            </ErrorBoundary>
          } 
        />

        {/* Protected routes - requires authentication */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <ErrorBoundary title="Dashboard Error">
                <DashboardPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        {/* Courses catalog - protected */}
        <Route
          path="/courses"
          element={
            <ProtectedRoute>
              <ErrorBoundary title="Courses Error">
                <CoursesPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        {/* Course detail - protected */}
        <Route
          path="/courses/:courseId"
          element={
            <ProtectedRoute>
              <ErrorBoundary title="Course Detail Error">
                <CourseDetailPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        {/* Module viewer - protected (legacy route for backwards compat) */}
        <Route
          path="/module/:moduleId"
          element={
            <ProtectedRoute>
              <ErrorBoundary title="Module Viewer Error">
                <ModuleViewerPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        {/* Module viewer within course context */}
        <Route
          path="/learn/:courseId/module/:moduleId"
          element={
            <ProtectedRoute>
              <ErrorBoundary title="Module Viewer Error">
                <ModuleViewerPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        {/* Timesheet page - protected */}
        <Route
          path="/my-timesheet"
          element={
            <ProtectedRoute>
              <ErrorBoundary title="Timesheet Error">
                <TimesheetPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        {/* Profile page - protected */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ErrorBoundary title="Profile Error">
                <ProfilePage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        {/* Admin routes - requires admin role */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <ErrorBoundary title="Admin Panel Error">
                <AdminLayout />
              </ErrorBoundary>
            </AdminRoute>
          }
        >
          <Route 
            index 
            element={
              <ErrorBoundary title="Admin Overview Error">
                <AdminOverviewPage />
              </ErrorBoundary>
            } 
          />
          <Route 
            path="employees" 
            element={
              <ErrorBoundary title="Employee Monitor Error">
                <EmployeeMonitorPage />
              </ErrorBoundary>
            } 
          />
          <Route 
            path="courses" 
            element={
              <ErrorBoundary title="Course Builder Error">
                <CourseBuilderPage />
              </ErrorBoundary>
            } 
          />
          <Route 
            path="review" 
            element={
              <ErrorBoundary title="Review Queue Error">
                <ReviewQueuePage />
              </ErrorBoundary>
            } 
          />
          <Route 
            path="timesheets" 
            element={
              <ErrorBoundary title="Admin Timesheets Error">
                <AdminTimesheetsPage />
              </ErrorBoundary>
            } 
          />
          <Route 
            path="settings" 
            element={
              <ErrorBoundary title="Admin Settings Error">
                <AdminSettingsPage />
              </ErrorBoundary>
            } 
          />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary title="Application Error" showDetails={import.meta.env.DEV}>
      <BrowserRouter>
        <AuthProvider>
          <BadgeProvider>
            <TimesheetTracker />
            <AnimatedRoutes />
            {/* Global toast notifications */}
            <Toaster />
          </BadgeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
