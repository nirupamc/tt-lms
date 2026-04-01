import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="w-8 h-8" />
          </div>
        </div>
      </header>

      {/* Main content skeleton */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Welcome section */}
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>

          {/* Progress card */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5" />
                <Skeleton className="h-6 w-32" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-3 w-full" />
              </div>
              <div className="pt-4 border-t">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-10 w-48" />
              </div>
            </CardContent>
          </Card>

          {/* Timeline skeleton */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Timeline header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <Skeleton className="h-4 w-48" />
                  <div className="flex gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <Skeleton className="w-3 h-3 rounded-full" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Desktop timeline */}
                <div className="hidden sm:block">
                  <div className="flex gap-2 overflow-x-auto pb-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <Skeleton key={i} className="w-10 h-10 rounded-full flex-shrink-0" />
                    ))}
                  </div>
                </div>
                {/* Mobile timeline */}
                <div className="sm:hidden space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-8 w-12" />
                    </div>
                    <Skeleton className="w-10 h-10 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Two-column layout */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Enrolled courses */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="w-5 h-5" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Skills earned */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="w-5 h-5" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-16 rounded-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent badges */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5" />
                <Skeleton className="h-6 w-32" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <Skeleton className="w-8 h-8 rounded mb-2" />
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export function ModuleViewerSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Sidebar skeleton */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-md sticky top-8">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded">
                      <Skeleton className="w-6 h-6 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content skeleton */}
          <div className="lg:col-span-9">
            <div className="space-y-6">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20" />
                <span>/</span>
                <Skeleton className="h-4 w-32" />
              </div>

              {/* Module header */}
              <div>
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-5 w-96" />
              </div>

              {/* Video skeleton */}
              <Card className="border-0 shadow-md">
                <CardContent className="p-0">
                  <Skeleton className="w-full aspect-video rounded-t-lg" />
                </CardContent>
              </Card>

              {/* Content skeleton */}
              <Card className="border-0 shadow-md">
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <Skeleton className="h-6 w-48" />
                    
                    {/* Paragraph skeletons */}
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>

                    {/* Code block skeleton */}
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className={`h-4 mb-2 ${i === 2 ? 'w-1/2' : i === 4 ? 'w-3/4' : 'w-full'}`} />
                      ))}
                    </div>

                    {/* More content */}
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action buttons */}
              <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminTableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="space-y-4">
      {/* Table header skeleton */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="hidden md:grid grid-cols-6 gap-4 font-medium">
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
          
          {/* Table rows skeleton - desktop */}
          <div className="hidden md:block space-y-3 mt-4">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="grid grid-cols-6 gap-4 py-3 border-t">
                {Array.from({ length: cols }).map((_, j) => (
                  <Skeleton key={j} className={`h-4 ${j === 0 ? 'w-24' : j === 1 ? 'w-32' : 'w-16'}`} />
                ))}
              </div>
            ))}
          </div>

          {/* Mobile card layout skeleton */}
          <div className="md:hidden space-y-3 mt-4">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="p-4 border rounded-lg space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex justify-between text-sm">
                  <div>
                    <Skeleton className="h-3 w-20 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div>
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}