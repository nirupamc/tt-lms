import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/useToast";
import confetti from "canvas-confetti";

const BadgeContext = createContext();

export function BadgeProvider({ children }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recentBadges, setRecentBadges] = useState([]);
  const [showBadgeModal, setShowBadgeModal] = useState(null);
  const seenBadges = useRef(new Set());

  useEffect(() => {
    if (!user) return;

    // Subscribe to new badge awards for the current user
    const subscription = supabase
      .channel('user_badges_changes')
      .on(
        'postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_badges',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          // Get full badge details
          const { data: badgeData, error } = await supabase
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
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('Error fetching badge details:', error);
            return;
          }

          const badge = badgeData.incentive_badges;
          const badgeId = payload.new.id;

          // Prevent duplicate notifications
          if (seenBadges.current.has(badgeId)) {
            return;
          }
          seenBadges.current.add(badgeId);

          // Add to recent badges
          setRecentBadges(prev => [{
            id: badgeId,
            ...badge,
            awarded_at: badgeData.awarded_at,
            context_json: badgeData.context_json
          }, ...prev].slice(0, 3));

          // Show appropriate notification based on tier
          if (badge.tier === 'gold' || badge.tier === 'platinum') {
            // Full-screen modal for premium badges
            setShowBadgeModal({
              id: badgeId,
              ...badge,
              awarded_at: badgeData.awarded_at,
              context_json: badgeData.context_json
            });
            
            // Trigger confetti for premium badges
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: badge.tier === 'platinum' ? ['#E5E7EB', '#9CA3AF', '#6B7280'] : ['#FDE047', '#FACC15', '#EAB308']
            });
          } else {
            // Toast notification for bronze/silver badges
            toast({
              title: `🎉 Badge Earned!`,
              description: (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{badge.icon_emoji}</span>
                  <div>
                    <p className="font-medium">{badge.label}</p>
                    <p className="text-sm text-muted-foreground">{badge.description}</p>
                  </div>
                </div>
              ),
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, toast]);

  // Load initial recent badges
  useEffect(() => {
    if (!user) return;
    
    const loadRecentBadges = async () => {
      const { data, error } = await supabase
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
        .eq('user_id', user.id)
        .order('awarded_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error loading recent badges:', error);
        return;
      }

      setRecentBadges(data.map(item => ({
        id: item.id,
        ...item.incentive_badges,
        awarded_at: item.awarded_at,
        context_json: item.context_json
      })));
    };

    loadRecentBadges();
  }, [user]);

  const value = {
    recentBadges,
    showBadgeModal,
    setShowBadgeModal
  };

  return (
    <BadgeContext.Provider value={value}>
      {children}
      
      {/* Premium Badge Modal */}
      {showBadgeModal && (
        <PremiumBadgeModal 
          badge={showBadgeModal} 
          onClose={() => setShowBadgeModal(null)} 
        />
      )}
    </BadgeContext.Provider>
  );
}

export const useBadges = () => {
  const context = useContext(BadgeContext);
  if (!context) {
    throw new Error('useBadges must be used within a BadgeProvider');
  }
  return context;
};

// Premium badge announcement modal
function PremiumBadgeModal({ badge, onClose }) {
  const tierColors = {
    bronze: 'from-amber-500 to-amber-600',
    silver: 'from-slate-400 to-slate-500', 
    gold: 'from-yellow-400 to-yellow-500',
    platinum: 'from-slate-300 to-slate-400'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative max-w-md w-full mx-4">
        {/* Animated background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${tierColors[badge.tier]} opacity-20 rounded-xl blur-xl animate-pulse`} />
        
        {/* Modal content */}
        <div className="relative bg-white dark:bg-slate-900 rounded-xl p-8 text-center shadow-2xl border">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            ✕
          </button>
          
          {/* Badge icon */}
          <div className="text-8xl mb-4 animate-bounce">
            {badge.icon_emoji}
          </div>
          
          {/* Badge details */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {badge.label}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {badge.description}
            </p>
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${tierColors[badge.tier]} text-white`}>
              {badge.tier.charAt(0).toUpperCase() + badge.tier.slice(1)} Badge
            </div>
          </div>
          
          {/* Context info */}
          {badge.context_json && Object.keys(badge.context_json).length > 0 && (
            <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm">
              {badge.context_json.streak_weeks && (
                <p>🔥 {badge.context_json.streak_weeks} week streak!</p>
              )}
              {badge.context_json.skill_tag && (
                <p>📚 Mastered {badge.context_json.skill_tag}</p>
              )}
            </div>
          )}
          
          <button
            onClick={onClose}
            className="mt-6 w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  );
}