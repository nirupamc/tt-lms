import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Trophy, Award, Star } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export function BadgeShelf({ userId, showTitle = true, maxBadges = null }) {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  // Use current user if no userId provided
  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (!targetUserId) return;

    const loadBadges = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('user_badges')
          .select(`
            *,
            incentive_badges:badge_id (
              slug,
              label,
              description,
              icon_emoji,
              tier,
              badge_type
            )
          `)
          .eq('user_id', targetUserId)
          .order('awarded_at', { ascending: false });

        if (maxBadges) {
          query = query.limit(maxBadges);
        }

        const { data, error } = await query;

        if (error) throw error;

        setBadges(data.map(item => ({
          id: item.id,
          ...item.incentive_badges,
          awarded_at: item.awarded_at,
          context_json: item.context_json
        })));
      } catch (error) {
        console.error('Error loading badges:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBadges();
  }, [targetUserId, maxBadges]);

  if (loading) {
    return (
      <div className="space-y-4">
        {showTitle && <Skeleton className="h-6 w-32" />}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="text-center py-8">
        {showTitle && (
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Badge Collection
          </h3>
        )}
        <div className="text-slate-500 dark:text-slate-400">
          <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No badges earned yet</p>
          <p className="text-sm">Complete modules and quizzes to start earning badges!</p>
        </div>
      </div>
    );
  }

  const tierColors = {
    bronze: 'bg-amber-500',
    silver: 'bg-slate-400',
    gold: 'bg-yellow-500', 
    platinum: 'bg-slate-300'
  };

  const tierTextColors = {
    bronze: 'text-amber-700 bg-amber-100 border-amber-300',
    silver: 'text-slate-700 bg-slate-100 border-slate-300',
    gold: 'text-yellow-700 bg-yellow-100 border-yellow-300',
    platinum: 'text-slate-700 bg-slate-100 border-slate-300'
  };

  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Badge Collection
          </h3>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {badges.length} badge{badges.length !== 1 ? 's' : ''} earned
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {badges.map((badge, index) => (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            className="group relative"
          >
            <BadgeCard badge={badge} tierColors={tierColors} tierTextColors={tierTextColors} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function BadgeCard({ badge, tierColors, tierTextColors }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Card className={`cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg border-2 ${tierColors[badge.tier]}/20`}>
        <CardContent className="p-4 text-center space-y-2">
          {/* Badge icon */}
          <div className="text-4xl mb-2">
            {badge.icon_emoji}
          </div>
          
          {/* Badge name */}
          <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100 leading-tight">
            {badge.label}
          </h4>
          
          {/* Tier indicator */}
          <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${tierTextColors[badge.tier]}`}>
            {badge.tier.charAt(0).toUpperCase() + badge.tier.slice(1)}
          </div>
          
          {/* Date earned */}
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {formatDistanceToNow(new Date(badge.awarded_at), { addSuffix: true })}
          </div>
        </CardContent>
      </Card>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-sm rounded-lg shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{badge.icon_emoji}</span>
              <span className="font-medium">{badge.label}</span>
            </div>
            <p className="text-slate-300">{badge.description}</p>
            
            {badge.context_json && Object.keys(badge.context_json).length > 0 && (
              <div className="text-slate-400 text-xs">
                {badge.context_json.streak_weeks && (
                  <p>🔥 {badge.context_json.streak_weeks} week streak</p>
                )}
                {badge.context_json.skill_tag && (
                  <p>📚 {badge.context_json.skill_tag} skill</p>
                )}
                {badge.context_json.quiz_score && (
                  <p>🎯 {badge.context_json.quiz_score}% quiz score</p>
                )}
                {badge.context_json.duration_minutes && (
                  <p>⚡ {badge.context_json.duration_minutes.toFixed(1)} minutes</p>
                )}
              </div>
            )}
            
            <div className="text-slate-400 text-xs">
              <Calendar className="w-3 h-3 inline mr-1" />
              {format(new Date(badge.awarded_at), 'MMM d, yyyy')}
            </div>
          </div>
          
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
}

// Compact badge display for dashboard
export function RecentBadges({ className = "" }) {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const loadRecentBadges = async () => {
      try {
        const { data, error } = await supabase
          .from('user_badges')
          .select(`
            *,
            incentive_badges:badge_id (
              slug,
              label,
              icon_emoji,
              tier
            )
          `)
          .eq('user_id', user.id)
          .order('awarded_at', { ascending: false })
          .limit(3);

        if (error) throw error;

        setBadges(data.map(item => ({
          ...item.incentive_badges,
          awarded_at: item.awarded_at
        })));
      } catch (error) {
        console.error('Error loading recent badges:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecentBadges();
  }, [user]);

  if (loading) {
    return (
      <div className={`flex gap-2 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="w-8 h-6 rounded-full" />
        ))}
      </div>
    );
  }

  if (badges.length === 0) {
    return null;
  }

  const tierVariants = {
    bronze: 'bg-amber-100 text-amber-700 border-amber-300',
    silver: 'bg-slate-100 text-slate-700 border-slate-300', 
    gold: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    platinum: 'bg-slate-100 text-slate-700 border-slate-300'
  };

  return (
    <div className={`flex gap-2 items-center ${className}`}>
      {badges.map((badge, index) => (
        <motion.div
          key={`${badge.slug}-${badge.awarded_at}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Badge 
            variant="outline" 
            className={`text-xs px-2 py-1 border ${tierVariants[badge.tier]}`}
            title={`${badge.label} - ${formatDistanceToNow(new Date(badge.awarded_at), { addSuffix: true })}`}
          >
            <span className="mr-1">{badge.icon_emoji}</span>
            {badge.label}
          </Badge>
        </motion.div>
      ))}
    </div>
  );
}