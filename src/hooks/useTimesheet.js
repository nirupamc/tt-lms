import { useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/**
 * Timesheet tracking hook
 * Automatically tracks user learning sessions using visibility API and sendBeacon
 * Uses useRef to store session_id to avoid unnecessary re-renders
 */
export function useTimesheet() {
  const { user } = useAuth();
  const sessionIdRef = useRef(null);
  const isActiveRef = useRef(false);

  /**
   * Start a new timesheet session
   */
  const startSession = useCallback(async () => {
    if (!user?.id || isActiveRef.current) return;

    try {
      const { data, error } = await supabase.rpc("start_session", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Failed to start timesheet session:", error);
        return;
      }

      sessionIdRef.current = data;
      isActiveRef.current = true;

      console.log("Timesheet session started:", data);
    } catch (error) {
      console.error("Error starting timesheet session:", error);
    }
  }, [user?.id]);

  /**
   * End the current timesheet session
   */
  const endSession = useCallback(async () => {
    if (!sessionIdRef.current || !isActiveRef.current) return;

    try {
      const { data, error } = await supabase.rpc("end_session", {
        p_session_id: sessionIdRef.current,
      });

      if (error) {
        console.error("Failed to end timesheet session:", error);
        return;
      }

      console.log("Timesheet session ended:", data);

      sessionIdRef.current = null;
      isActiveRef.current = false;
    } catch (error) {
      console.error("Error ending timesheet session:", error);
    }
  }, []);

  /**
   * End session using sendBeacon (for beforeunload)
   */
  const endSessionBeacon = useCallback(() => {
    if (!sessionIdRef.current || !isActiveRef.current) return;

    try {
      // Get the JWT token for authentication
      const token = localStorage.getItem(
        "sb-" +
          supabase.supabaseUrl.split("//")[1].split(".")[0] +
          "-auth-token",
      );
      let accessToken = null;

      if (token) {
        try {
          const parsed = JSON.parse(token);
          accessToken = parsed.access_token;
        } catch (e) {
          console.warn("Could not parse auth token for beacon");
        }
      }

      // Prepare beacon data
      const beaconData = JSON.stringify({
        session_id: sessionIdRef.current,
        user_id: user?.id,
        timestamp: new Date().toISOString(),
      });

      // Get Supabase Edge Function URL
      const edgeFunctionUrl = `${supabase.supabaseUrl}/functions/v1/end-session`;

      // Send beacon with auth header if available
      const success = navigator.sendBeacon(
        edgeFunctionUrl,
        new Blob([beaconData], {
          type: "application/json",
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {},
        }),
      );

      if (success) {
        console.log("Timesheet session ended via beacon");
        sessionIdRef.current = null;
        isActiveRef.current = false;
      } else {
        console.warn("Failed to send beacon for timesheet session");
      }
    } catch (error) {
      console.error("Error ending session with beacon:", error);
    }
  }, [user?.id]);

  /**
   * Handle visibility change events
   */
  const handleVisibilityChange = useCallback(() => {
    if (!user?.id) return;

    if (document.hidden) {
      // Page is hidden - end current session
      endSession();
    } else {
      // Page is visible - start new session (with small delay to avoid rapid switches)
      setTimeout(() => {
        if (!document.hidden && user?.id) {
          startSession();
        }
      }, 100);
    }
  }, [user?.id, startSession, endSession]);

  /**
   * Handle beforeunload events (tab closing, navigation)
   */
  const handleBeforeUnload = useCallback(
    (event) => {
      endSessionBeacon();
    },
    [endSessionBeacon],
  );

  // Set up event listeners
  useEffect(() => {
    if (!user?.id) {
      // User not logged in - clean up any existing session
      if (sessionIdRef.current) {
        endSession();
      }
      return;
    }

    // Start initial session when user logs in
    startSession();

    // Set up visibility change listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Set up beforeunload listener
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      // Clean up event listeners
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // End current session on unmount
      if (sessionIdRef.current) {
        endSession();
      }
    };
  }, [
    user?.id,
    startSession,
    endSession,
    handleVisibilityChange,
    handleBeforeUnload,
  ]);

  // Return useful state and methods for debugging/monitoring
  return {
    isActive: isActiveRef.current,
    sessionId: sessionIdRef.current,
    startSession,
    endSession,
  };
}

export default useTimesheet;
