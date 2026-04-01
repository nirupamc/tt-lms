import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timeline } from "@/components/Timeline";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { format } from "date-fns";

export default function EmployeeMonitorPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  
  // Drawer state for viewing employee timeline
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeProgress, setEmployeeProgress] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch all employees with progress
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_all_employee_progress");

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter employees by search term
  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return employees;

    const term = searchTerm.toLowerCase();
    return employees.filter(
      (emp) =>
        emp.full_name?.toLowerCase().includes(term) ||
        emp.email?.toLowerCase().includes(term)
    );
  }, [employees, searchTerm]);

  // Sort employees
  const sortedEmployees = useMemo(() => {
    if (!sortConfig.key) return filteredEmployees;

    const sorted = [...filteredEmployees].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (sortConfig.key === "percent_complete") {
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
      }

      if (sortConfig.key === "last_seen_at") {
        const dateA = new Date(aValue);
        const dateB = new Date(bValue);
        return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
      }

      return 0;
    });

    return sorted;
  }, [filteredEmployees, sortConfig]);

  // Handle sort
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Open employee timeline drawer
  const handleRowClick = async (employee) => {
    setSelectedEmployee(employee);
    setDrawerOpen(true);

    // Fetch employee's progress for timeline
    try {
      const { data, error } = await supabase.rpc("get_course_progress", {
        p_user_id: employee.user_id,
        p_course_id: null, // Get all courses
      });

      if (error) throw error;
      setEmployeeProgress(data || []);
    } catch (err) {
      console.error("Error fetching employee progress:", err);
    }
  };

  // Get sort icon
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4 ml-1" />;
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="w-4 h-4 ml-1" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1" />
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Employee Monitor</h1>
            <p className="text-muted-foreground mt-1">
              Track employee progress and learning activity
            </p>
          </div>
          <Button onClick={fetchEmployees} variant="outline">
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {employees.length > 0
                  ? Math.round(
                      employees.reduce((sum, e) => sum + (e.percent_complete || 0), 0) /
                        employees.length
                    )
                  : 0}
                %
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  employees.filter((e) => {
                    if (!e.last_seen_at) return false;
                    const lastSeen = new Date(e.last_seen_at);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return lastSeen > weekAgo;
                  }).length
                }
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-4"
      >
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : sortedEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <UsersIcon className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? "No employees found" : "No employees yet"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort("percent_complete")}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        % Complete
                        {getSortIcon("percent_complete")}
                      </button>
                    </TableHead>
                    <TableHead>Current Module</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort("last_seen_at")}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        Last Login
                        {getSortIcon("last_seen_at")}
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEmployees.map((employee) => (
                    <TableRow
                      key={employee.user_id}
                      onClick={() => handleRowClick(employee)}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium">
                        {employee.full_name || "N/A"}
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>
                        {employee.join_date
                          ? format(new Date(employee.join_date), "MMM d, yyyy")
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${employee.percent_complete || 0}%`,
                              }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              className="h-full bg-indigo-600"
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {employee.percent_complete || 0}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {employee.current_module_title ? (
                          <div>
                            <p className="text-sm font-medium">
                              {employee.current_module_title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {employee.current_course_title}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not started</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {employee.last_seen_at
                          ? format(new Date(employee.last_seen_at), "MMM d, yyyy")
                          : "Never"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Employee Timeline Drawer */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {selectedEmployee?.full_name}'s Progress
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedEmployee?.email}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Progress</p>
                <p className="text-2xl font-bold mt-1">
                  {selectedEmployee?.percent_complete || 0}%
                </p>
              </div>
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold mt-1">
                  {selectedEmployee?.completed_modules || 0}/
                  {selectedEmployee?.total_modules || 0}
                </p>
              </div>
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <p className="text-sm text-muted-foreground">Join Date</p>
                <p className="text-lg font-semibold mt-1">
                  {selectedEmployee?.join_date
                    ? format(new Date(selectedEmployee.join_date), "MMM d, yyyy")
                    : "N/A"}
                </p>
              </div>
            </div>

            {/* Timeline (Read-only) */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Learning Timeline</h3>
              {employeeProgress.length > 0 ? (
                <Timeline
                  progressList={employeeProgress}
                  currentModuleId={selectedEmployee?.current_module_id}
                  readOnly={true}
                />
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No progress data available
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
