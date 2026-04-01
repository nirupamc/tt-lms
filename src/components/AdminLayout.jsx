import { Outlet, NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, BookOpen, ClipboardCheck, LayoutDashboard, LogOut, Clock, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
  { name: "Employees", href: "/admin/employees", icon: Users },
  { name: "Course Builder", href: "/admin/courses", icon: BookOpen },
  { name: "Review Queue", href: "/admin/review", icon: ClipboardCheck },
  { name: "Timesheets", href: "/admin/timesheets", icon: Clock },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 dark:bg-slate-950 border-r border-slate-800">
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            <p className="text-sm text-slate-400 mt-1">TanTech Upskill</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = item.exact
                ? location.pathname === item.href
                : location.pathname.startsWith(item.href);
              
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`
                    relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }
                  `}
                >
                  {({ isActive: isActiveLink }) => (
                    <>
                      <item.icon className="w-5 h-5" />
                      <span>{item.name}</span>
                      {isActiveLink && (
                        <motion.div
                          layoutId="activeNavIndicator"
                          className="absolute inset-0 bg-indigo-600 rounded-lg -z-10"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-slate-800">
            <div className="mb-3 px-2">
              <p className="text-sm font-medium text-white">{user?.user_metadata?.full_name}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
              onClick={signOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="pl-64">
        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
