import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, Calendar, MapPin, Edit, Save, X, Trophy, Clock, Target } from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeShelf } from "@/components/BadgeShelf";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/useToast";

// Common timezone options
const timezones = [
  { value: 'UTC', label: 'UTC (GMT+0)' },
  { value: 'America/New_York', label: 'Eastern Time (GMT-5/-4)' },
  { value: 'America/Chicago', label: 'Central Time (GMT-6/-5)' },
  { value: 'America/Denver', label: 'Mountain Time (GMT-7/-6)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (GMT-8/-7)' },
  { value: 'Europe/London', label: 'British Time (GMT+0/+1)' },
  { value: 'Europe/Paris', label: 'Central European Time (GMT+1/+2)' },
  { value: 'Asia/Tokyo', label: 'Japan Time (GMT+9)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (GMT+10/+11)' }
];

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    timezone: 'UTC'
  });

  // Load profile data into form
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        timezone: profile.timezone || 'UTC'
      });
    }
  }, [profile]);

  // Load user stats
  useEffect(() => {
    if (!user) return;

    const loadUserStats = async () => {
      try {
        // Get badge count
        const { data: badgeData, error: badgeError } = await supabase
          .from('user_badges')
          .select('id')
          .eq('user_id', user.id);

        if (badgeError) throw badgeError;

        // Get completed modules count
        const { data: progressData, error: progressError } = await supabase
          .from('progress')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'completed');

        if (progressError) throw progressError;

        // Get current streak
        const { data: streakData, error: streakError } = await supabase
          .from('weekly_streaks')
          .select('current_streak, longest_streak')
          .eq('user_id', user.id)
          .single();

        if (streakError && streakError.code !== 'PGRST116') {
          throw streakError;
        }

        setStats({
          badgeCount: badgeData.length,
          completedModules: progressData.length,
          currentStreak: streakData?.current_streak || 0,
          longestStreak: streakData?.longest_streak || 0
        });
      } catch (error) {
        console.error('Error loading user stats:', error);
      }
    };

    loadUserStats();
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          timezone: formData.timezone
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setEditing(false);
      
      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: profile?.full_name || '',
      timezone: profile?.timezone || 'UTC'
    });
    setEditing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              My Profile
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Manage your account settings and view your learning achievements
            </p>
          </div>

          {/* Profile Info Card */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              {!editing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={loading}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name
                  </label>
                  {editing ? (
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <div className="p-2 text-slate-900 dark:text-slate-100">
                      {profile?.full_name || 'Not set'}
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <div className="p-2 text-slate-600 dark:text-slate-400">
                    {user?.email}
                  </div>
                </div>

                {/* Join Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Joined
                  </label>
                  <div className="p-2 text-slate-600 dark:text-slate-400">
                    {profile?.join_date ? format(new Date(profile.join_date), 'MMMM d, yyyy') : 'Unknown'}
                  </div>
                </div>

                {/* Timezone */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Timezone
                  </label>
                  {editing ? (
                    <Select
                      value={formData.timezone}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 text-slate-600 dark:text-slate-400">
                      {timezones.find(tz => tz.value === (profile?.timezone || 'UTC'))?.label || 'UTC'}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-4 text-center">
                <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats ? stats.badgeCount : <Skeleton className="h-8 w-8 mx-auto" />}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Badges</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Target className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats ? stats.completedModules : <Skeleton className="h-8 w-8 mx-auto" />}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Modules</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="w-8 h-8 mx-auto mb-2 text-2xl">🔥</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats ? stats.currentStreak : <Skeleton className="h-8 w-8 mx-auto" />}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Week Streak</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="w-8 h-8 mx-auto mb-2 text-2xl">🏆</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats ? stats.longestStreak : <Skeleton className="h-8 w-8 mx-auto" />}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Best Streak</div>
              </CardContent>
            </Card>
          </div>

          {/* Badge Shelf */}
          <Card className="max-w-6xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Achievement Showcase
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BadgeShelf showTitle={false} />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}