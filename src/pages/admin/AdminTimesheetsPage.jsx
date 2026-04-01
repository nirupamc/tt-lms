import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Calendar, 
  Download, 
  Users, 
  Clock, 
  Target, 
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Edit,
  Save,
  X,
  CalendarDays
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, subWeeks, addWeeks } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/useToast";

export default function AdminTimesheetsPage() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [dateRange, setDateRange] = useState('thisWeek');
  const [fromDate, setFromDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [toDate, setToDate] = useState(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [chartData, setChartData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [allEmployeesData, setAllEmployeesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTarget, setEditingTarget] = useState(null);
  const [tempTarget, setTempTarget] = useState('');
  const { toast } = useToast();

  // Load employees on mount
  useEffect(() => {
    loadEmployees();
  }, []);

  // Load data when employee or date range changes
  useEffect(() => {
    if (selectedEmployee) {
      loadEmployeeTimeData();
    }
    loadAllEmployeesData();
  }, [selectedEmployee, fromDate, toDate]);

  // Update date range when preset changes
  useEffect(() => {
    const today = new Date();
    switch (dateRange) {
      case 'thisWeek':
        setFromDate(startOfWeek(today, { weekStartsOn: 1 }));
        setToDate(endOfWeek(today, { weekStartsOn: 1 }));
        break;
      case 'lastWeek':
        const lastWeek = subWeeks(today, 1);
        setFromDate(startOfWeek(lastWeek, { weekStartsOn: 1 }));
        setToDate(endOfWeek(lastWeek, { weekStartsOn: 1 }));
        break;
      case 'thisMonth':
        setFromDate(startOfMonth(today));
        setToDate(endOfMonth(today));
        break;
    }
  }, [dateRange]);

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'employee')
        .order('full_name');

      if (error) throw error;

      setEmployees(data);
      if (data.length > 0) {
        setSelectedEmployee(data[0]);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive"
      });
    }
  };

  const loadEmployeeTimeData = async () => {
    if (!selectedEmployee) return;

    try {
      const { data, error } = await supabase.rpc('get_user_time_summary', {
        p_user_id: selectedEmployee.id,
        p_from: format(fromDate, 'yyyy-MM-dd'),
        p_to: format(toDate, 'yyyy-MM-dd')
      });

      if (error) throw error;

      setChartData(data.daily || []);
      setSummaryData(data);
    } catch (error) {
      console.error('Error loading time data:', error);
      toast({
        title: "Error",
        description: "Failed to load time data",
        variant: "destructive"
      });
    }
  };

  const loadAllEmployeesData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_user_time_summary', {
        p_from: format(fromDate, 'yyyy-MM-dd'),
        p_to: format(toDate, 'yyyy-MM-dd')
      });

      if (error) throw error;

      setAllEmployeesData(data || []);
    } catch (error) {
      console.error('Error loading all employees data:', error);
      toast({
        title: "Error",
        description: "Failed to load employee timesheet data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      const { data, error } = await supabase
        .from('timesheet_sessions')
        .select(`
          id,
          user_id,
          started_at,
          ended_at,
          duration_seconds,
          session_date,
          profiles!inner(full_name, email)
        `)
        .gte('session_date', format(fromDate, 'yyyy-MM-dd'))
        .lte('session_date', format(toDate, 'yyyy-MM-dd'))
        .not('ended_at', 'is', null);

      if (error) throw error;

      // Convert to CSV
      const headers = ['Date', 'Employee', 'Email', 'Start Time', 'End Time', 'Duration (hours)'];
      const csvData = [
        headers.join(','),
        ...data.map(session => [
          session.session_date,
          session.profiles.full_name,
          session.profiles.email,
          format(new Date(session.started_at), 'HH:mm:ss'),
          format(new Date(session.ended_at), 'HH:mm:ss'),
          (session.duration_seconds / 3600).toFixed(2)
        ].join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timesheet-${format(fromDate, 'yyyy-MM-dd')}-to-${format(toDate, 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Timesheet data exported successfully"
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: "Error",
        description: "Failed to export timesheet data",
        variant: "destructive"
      });
    }
  };

  const updateTarget = async (userId, newTarget) => {
    try {
      const { error } = await supabase
        .from('time_targets')
        .upsert({
          user_id: userId,
          weekly_hours_target: parseFloat(newTarget),
          created_by: null // Admin user ID would go here
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Weekly target updated successfully"
      });

      // Reload data
      loadAllEmployeesData();
      if (selectedEmployee?.id === userId) {
        loadEmployeeTimeData();
      }
    } catch (error) {
      console.error('Error updating target:', error);
      toast({
        title: "Error",
        description: "Failed to update weekly target",
        variant: "destructive"
      });
    }
  };

  const handleEditTarget = (employeeId, currentTarget) => {
    setEditingTarget(employeeId);
    setTempTarget(currentTarget.toString());
  };

  const handleSaveTarget = (employeeId) => {
    updateTarget(employeeId, tempTarget);
    setEditingTarget(null);
    setTempTarget('');
  };

  const handleCancelEdit = () => {
    setEditingTarget(null);
    setTempTarget('');
  };

  const formatHours = (seconds) => {
    if (!seconds) return '0h 0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Timesheet Management
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Monitor employee learning time and manage targets
            </p>
          </div>
          <Button onClick={exportCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center">
          <Select value={selectedEmployee?.id || ''} onValueChange={(value) => {
            const employee = employees.find(emp => emp.id === value);
            setSelectedEmployee(employee);
          }}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="lastWeek">Last Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-slate-600 dark:text-slate-400">
            {format(fromDate, 'MMM d')} - {format(toDate, 'MMM d, yyyy')}
          </div>
        </div>

        {/* Employee Detail Charts */}
        {selectedEmployee && summaryData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Summary Stats */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    {selectedEmployee.full_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Total Hours</p>
                    <p className="text-2xl font-bold">{formatHours(summaryData.total_seconds)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Daily Average</p>
                    <p className="text-xl font-semibold">{formatHours(summaryData.avg_daily_seconds)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Days Active</p>
                    <p className="text-xl font-semibold">{summaryData.days_active || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Weekly Target</p>
                    <p className="text-xl font-semibold">{summaryData.target_hours}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Target Status</p>
                    <Badge variant={summaryData.target_met_this_week ? 'default' : 'secondary'}>
                      {summaryData.target_met_this_week ? 'Met' : 'Not Met'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Time Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Daily Learning Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="timeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'MMM d')}
                    />
                    <YAxis 
                      tickFormatter={(seconds) => `${(seconds / 3600).toFixed(1)}h`}
                    />
                    <Tooltip 
                      labelFormatter={(date) => format(new Date(date), 'EEEE, MMM d')}
                      formatter={(seconds) => [formatHours(seconds), 'Learning Time']}
                    />
                    <Area
                      type="monotone"
                      dataKey="total_seconds"
                      stroke="#6366F1"
                      fillOpacity={1}
                      fill="url(#timeGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* All Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Employees Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[80px]" />
                    <Skeleton className="h-4 w-[80px]" />
                    <Skeleton className="h-4 w-[60px]" />
                    <Skeleton className="h-4 w-[80px]" />
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period Hours</TableHead>
                    <TableHead>Weekly Target</TableHead>
                    <TableHead>Current Streak</TableHead>
                    <TableHead>Target Met</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allEmployeesData.map((employee) => (
                    <TableRow key={employee.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{employee.full_name}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{employee.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatHours(employee.total_seconds)}</TableCell>
                      <TableCell>
                        {editingTarget === employee.user_id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.5"
                              value={tempTarget}
                              onChange={(e) => setTempTarget(e.target.value)}
                              className="w-20"
                            />
                            <span className="text-sm">h</span>
                            <Button
                              size="sm"
                              onClick={() => handleSaveTarget(employee.user_id)}
                              className="p-1 h-8 w-8"
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                              className="p-1 h-8 w-8"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{employee.target_hours}h</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditTarget(employee.user_id, employee.target_hours)}
                              className="p-1 h-8 w-8"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          🔥 {employee.current_streak || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.target_met_this_week ? 'default' : 'secondary'}>
                          {employee.target_met_this_week ? 'Met' : 'Not Met'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedEmployee({
                            id: employee.user_id,
                            full_name: employee.full_name
                          })}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}