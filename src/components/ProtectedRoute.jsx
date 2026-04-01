import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { SkeletonFade } from "@/components/animations/index";
import { Skeleton } from "@/components/ui/skeleton";

// Full page loading skeleton
function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-64 rounded-xl mb-6" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <div>
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Protected route - requires authentication
export function ProtectedRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <SkeletonFade
        isLoading={true}
        skeleton={<PageSkeleton />}
      >
        {null}
      </SkeletonFade>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login, preserving the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect admins away from employee routes to admin dashboard
  if (isAdmin && (location.pathname === '/dashboard' || location.pathname === '/')) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

// Admin route - requires admin role
export function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <SkeletonFade
        isLoading={true}
        skeleton={<PageSkeleton />}
      >
        {null}
      </SkeletonFade>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    // Non-admin users are redirected to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
