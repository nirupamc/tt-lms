import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { Loader2, Mail, Lock, User, ArrowRight, ArrowLeft, Building2, MapPin, ShieldCheck, GraduationCap } from "lucide-react";
import { ANIMATION_CONFIG } from "@/lib/animations";
import { RippleButton } from "@/components/animations/interactive";
import { SkeletonFade } from "@/components/animations/index";

// Two-tab toggle for Employee/Admin access
function AccessToggle({ activeTab, onChange }) {
  return (
    <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 mb-6">
      <button
        type="button"
        onClick={() => onChange('employee')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
          activeTab === 'employee'
            ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <GraduationCap className="w-4 h-4" />
        Employee
      </button>
      <button
        type="button"
        onClick={() => onChange('admin')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
          activeTab === 'admin'
            ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <ShieldCheck className="w-4 h-4" />
        Admin
      </button>
    </div>
  );
}

// Floating label input wrapper with animation
function AnimatedInput({ icon: Icon, label, id, ...props }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <motion.div 
        className="relative"
        whileFocus={{ scale: 1.01 }}
        transition={{ duration: 0.15 }}
      >
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id={id}
          className="pl-10 h-11 transition-all focus:scale-[1.01] focus:ring-2 focus:ring-primary/20"
          {...props}
        />
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  const [accessType, setAccessType] = useState('employee'); // 'employee' | 'admin'
  const [isLogin, setIsLogin] = useState(true);
  const [signupStep, setSignupStep] = useState(1); // 1 = credentials, 2 = profile/address
  
  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || "/dashboard";

  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error, profile } = await signIn(email, password);
      if (error) {
        toast({
          variant: "destructive",
          title: "Sign in failed",
          description: error.message,
        });
      } else {
        // Redirect based on actual user role from database
        const isAdmin = profile?.role === 'admin';
        
        // Validate access type matches role
        if (accessType === 'admin' && !isAdmin) {
          toast({
            variant: "destructive",
            title: "Access denied",
            description: "You don't have admin privileges.",
          });
          setIsLoading(false);
          return;
        }

        toast({
          variant: "success",
          title: "Welcome back!",
          description: isAdmin ? "Admin access granted." : "You have successfully signed in.",
        });
        
        // Redirect admins to /admin, employees to dashboard
        navigate(isAdmin ? '/admin' : from, { replace: true });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupStep1 = (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || password.length < 6) {
      toast({
        variant: "destructive",
        title: "Invalid credentials",
        description: "Please enter a valid email and password (min 6 characters).",
      });
      return;
    }
    setSignupStep(2);
  };

  const handleSignupStep2 = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please enter your full name.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast({
          variant: "destructive",
          title: "Sign up failed",
          description: error.message,
        });
      } else {
        toast({
          variant: "success",
          title: "Account created!",
          description: "Welcome to TanTech Upskill. Let's start learning!",
        });
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSignupStep(1);
    setEmail("");
    setPassword("");
    setFullName("");
    setDepartment("");
    setAddress("");
  };

  return (
    <motion.div 
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={ANIMATION_CONFIG.pageVariants.transition}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center pb-2">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="mx-auto mb-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">TT</span>
              </div>
            </motion.div>

            <CardTitle className="text-2xl font-bold tracking-tight">
              {isLogin ? "Welcome back" : (signupStep === 1 ? "Create an account" : "Complete your profile")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isLogin
                ? "Sign in to continue your learning journey"
                : (signupStep === 1 ? "Step 1: Enter your credentials" : "Step 2: Tell us about yourself")}
            </CardDescription>
          </CardHeader>

          {/* Access type toggle (Employee / Admin) */}
          {isLogin && <div className="px-6"><AccessToggle activeTab={accessType} onChange={setAccessType} /></div>}

          <AnimatePresence mode="wait">
            {isLogin ? (
              /* LOGIN FORM */
              <motion.form
                key="login"
                onSubmit={handleSignIn}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <CardContent className="space-y-4">
                  <AnimatedInput
                    icon={Mail}
                    label="Corporate Email"
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <AnimatedInput
                    icon={Lock}
                    label="Password"
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    minLength={6}
                  />
                </CardContent>

                <CardFooter className="flex flex-col space-y-4">
                  <RippleButton
                    type="submit"
                    className="w-full h-11 text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md flex items-center justify-center gap-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </RippleButton>

                  <div className="text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => { setIsLogin(false); resetForm(); }}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign up
                    </button>
                  </div>
                </CardFooter>
              </motion.form>
            ) : signupStep === 1 ? (
              /* SIGNUP STEP 1: Credentials */
              <motion.form
                key="signup-step1"
                onSubmit={handleSignupStep1}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CardContent className="space-y-4">
                  <AnimatedInput
                    icon={Mail}
                    label="Corporate Email"
                    id="signup-email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <AnimatedInput
                    icon={Lock}
                    label="Password"
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">Password must be at least 6 characters</p>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4">
                  <RippleButton
                    type="submit"
                    className="w-full h-11 text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md flex items-center justify-center gap-2"
                  >
                    <span>Continue</span>
                    <ArrowRight className="h-4 w-4" />
                  </RippleButton>

                  <div className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => { setIsLogin(true); resetForm(); }}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </div>
                </CardFooter>
              </motion.form>
            ) : (
              /* SIGNUP STEP 2: Profile */
              <motion.form
                key="signup-step2"
                onSubmit={handleSignupStep2}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CardContent className="space-y-4">
                  <AnimatedInput
                    icon={User}
                    label="Full Name"
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <AnimatedInput
                    icon={Building2}
                    label="Department (optional)"
                    id="department"
                    type="text"
                    placeholder="Engineering"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={isLoading}
                  />
                  <AnimatedInput
                    icon={MapPin}
                    label="Location (optional)"
                    id="address"
                    type="text"
                    placeholder="City, Country"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={isLoading}
                  />
                </CardContent>

                <CardFooter className="flex flex-col space-y-4">
                  <div className="flex gap-3 w-full">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSignupStep(1)}
                      className="flex items-center gap-2"
                      disabled={isLoading}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <RippleButton
                      type="submit"
                      className="flex-1 h-11 text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md flex items-center justify-center gap-2"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <span>Create Account</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </RippleButton>
                  </div>
                </CardFooter>
              </motion.form>
            )}
          </AnimatePresence>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to TanTech's Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </motion.div>
  );
}
