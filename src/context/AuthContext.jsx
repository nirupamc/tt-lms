import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
} from "react";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext(null);

const initialState = {
  user: null,
  profile: null,
  session: null,
  loading: true,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case "SET_SESSION":
      return {
        ...state,
        session: action.payload.session,
        user: action.payload.session?.user ?? null,
      };
    case "SET_PROFILE":
      return {
        ...state,
        profile: action.payload,
      };
    case "SET_LOADING":
      return {
        ...state,
        loading: action.payload,
      };
    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    case "CLEAR_AUTH":
      return {
        ...initialState,
        loading: false,
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Fetch user profile from profiles table
  const fetchProfile = useCallback(async (userId) => {
    try {
      console.log("AuthContext: Fetching profile for user:", userId);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );
      
      // Direct profile query with timeout
      const profilePromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]);

      if (error) {
        console.error("Profile fetch error:", error);
        throw error;
      }
      
      console.log("AuthContext: Profile fetched successfully:", { role: data.role, email: data.email });
      dispatch({ type: "SET_PROFILE", payload: data });
      return data;
    } catch (error) {
      console.error("AuthContext: Profile fetch failed:", error);
      
      // For authentication flow, don't block if profile fetch fails
      if (error.message === 'Profile fetch timeout') {
        console.warn("Profile fetch timed out, continuing with limited access");
        dispatch({ type: "SET_PROFILE", payload: null });
      } else {
        dispatch({ type: "SET_PROFILE", payload: null });
      }
      return null;
    }
  }, []);

  // Update last_seen_at on login
  const updateLastSeen = useCallback(async (userId) => {
    try {
      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", userId);
    } catch (error) {
      console.error("Error updating last_seen_at:", error);
    }
  }, []);

  // Sign up with email, password, and full name
  const signUp = useCallback(async (email, password, fullName) => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;

      // Create profile entry
      if (authData.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: authData.user.id,
          email: email,
          full_name: fullName,
          role: "employee",
          join_date: new Date().toISOString().split("T")[0],
        });

        if (profileError) {
          console.error("Profile creation error:", profileError);
          // Don't throw - auth user is created, profile might exist from trigger
        }
      }

      return { data: authData, error: null };
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error.message });
      return { data: null, error };
    }
  }, []);

  // Sign in with email and password
  const signIn = useCallback(
    async (email, password) => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        console.log("AuthContext: Attempting sign in for:", email);
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("AuthContext: Sign in error:", error);
          throw error;
        }
        
        console.log("AuthContext: Sign in successful, user:", data.user.id);

        dispatch({ type: "SET_LOADING", payload: false });
        return { data, profile: null, error: null };
      } catch (error) {
        dispatch({ type: "SET_ERROR", payload: error.message });
        return { data: null, profile: null, error };
      }
    },
    [updateLastSeen, fetchProfile],
  );

  // Sign out
  const signOut = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      dispatch({ type: "CLEAR_AUTH" });
      return { error: null };
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error.message });
      return { error };
    }
  }, []);

  // Initialize auth state and listen for changes
  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      console.log("AuthContext: Initializing auth...");
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        console.log("AuthContext: Session retrieved:", session?.user?.email || "No session");
        dispatch({ type: "SET_SESSION", payload: { session } });

        if (session?.user) {
          await fetchProfile(session.user.id);
          await updateLastSeen(session.user.id);
        } else {
          dispatch({ type: "SET_PROFILE", payload: null });
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        dispatch({ type: "SET_ERROR", payload: error.message });
      } finally {
        console.log("AuthContext: Setting loading to false");
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      dispatch({ type: "SET_SESSION", payload: { session } });

      if (session?.user) {
        await fetchProfile(session.user.id);

        if (event === "SIGNED_IN") {
          await updateLastSeen(session.user.id);
        }
      } else {
        dispatch({ type: "SET_PROFILE", payload: null });
      }
      
      // Ensure loading is set to false after auth state change
      dispatch({ type: "SET_LOADING", payload: false });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, updateLastSeen]);

  const value = {
    ...state,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!state.session,
    isAdmin: state.profile?.role === "admin",
    isEmployee: state.profile?.role === "employee",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
