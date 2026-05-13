import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Kanban } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  signInWithEmail,
  registerWithEmail,
  signInWithGoogle,
  createUserDocumentIfNeeded,
  getAuthErrorMessage,
} from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

// --- Zod schemas ---

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const registerSchema = z.object({
  displayName: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

// --- Component ---

export function LoginPage() {
  const { user } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  });

  // If already authenticated, redirect to app root
  if (user) return <Navigate to="/pipeline" replace />;

  function clearError() {
    setAuthError(null);
  }

  function getFirebaseCode(err: unknown): string {
    if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string') {
      return (err as { code: string }).code;
    }
    return 'unknown';
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setAuthError(null);
    try {
      const { result, credential } = await signInWithGoogle();
      const accessToken = credential?.accessToken ?? null;
      await createUserDocumentIfNeeded(result.user, accessToken);
    } catch (err: unknown) {
      const code = getFirebaseCode(err);
      if (code !== 'auth/popup-closed-by-user') {
        setAuthError(getAuthErrorMessage(code));
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleLogin(values: LoginFormValues) {
    setAuthError(null);
    try {
      await signInWithEmail(values.email, values.password);
    } catch (err: unknown) {
      setAuthError(getAuthErrorMessage(getFirebaseCode(err)));
    }
  }

  async function handleRegister(values: RegisterFormValues) {
    setAuthError(null);
    try {
      const result = await registerWithEmail(values.email, values.password, values.displayName);
      await createUserDocumentIfNeeded(result.user);
    } catch (err: unknown) {
      setAuthError(getAuthErrorMessage(getFirebaseCode(err)));
    }
  }

  function toggleMode() {
    setIsRegister((prev) => !prev);
    setAuthError(null);
    loginForm.reset();
    registerForm.reset();
  }

  const activeForm = isRegister ? registerForm : loginForm;
  const isSubmitting = activeForm.formState.isSubmitting;

  return (
    <div className="flex min-h-screen">
      {/* Brand Panel (left side) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background photo */}
        <img
          src="/images/auth-bg.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Green overlay for brand color */}
        <div className="absolute inset-0 bg-primary/80" />
        {/* Topographic pattern overlay */}
        <svg
          className="absolute inset-0 w-full h-full text-primary-foreground pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="auth-topo" width="300" height="250" patternUnits="userSpaceOnUse">
              <path d="M0 60 Q75 30 150 55 T300 50" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.08" />
              <path d="M0 100 Q60 75 130 95 T300 90" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.06" />
              <path d="M0 140 Q90 110 180 135 T300 130" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.08" />
              <path d="M0 180 Q50 160 120 178 T300 170" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.05" />
              <path d="M0 215 Q80 195 160 210 T300 205" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.06" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-topo)" />
        </svg>

        <div className="relative flex flex-col justify-center px-12 xl:px-16">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <Kanban className="h-6 w-6 text-primary-foreground" />
            <span className="font-heading text-xl font-bold text-primary-foreground tracking-tight">
              FieldFlow
            </span>
          </Link>
          <h1 className="font-heading text-4xl xl:text-5xl font-bold text-primary-foreground leading-tight">
            Manage your landscape projects with clarity
          </h1>
          <p className="mt-4 text-lg text-primary-foreground/70 max-w-md leading-relaxed">
            A visual pipeline built for how landscape architects actually work —
            from first lead through final installation.
          </p>
        </div>
      </div>

      {/* Form Panel (right side) */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        {/* Mobile-only brand header */}
        <div className="lg:hidden flex flex-col items-center gap-1 mb-8">
          <Link to="/" className="flex items-center gap-2">
            <Kanban className="h-5 w-5 text-primary" />
            <span className="font-heading text-2xl font-bold tracking-tight text-foreground">
              FieldFlow
            </span>
          </Link>
          <span className="text-sm text-muted-foreground">CRM for landscape professionals</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h2 className="font-heading text-2xl font-bold tracking-tight">
              {isRegister ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isRegister
                ? 'Start managing your landscape projects today'
                : 'Sign in to your FieldFlow account'}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Google sign-in */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || isSubmitting}
            >
              {googleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Continue with Google
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            {/* Error banner */}
            {authError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                <p className="text-sm text-destructive">{authError}</p>
              </div>
            )}

            {/* Email / password form */}
            {isRegister ? (
              <form
                onSubmit={registerForm.handleSubmit(handleRegister)}
                className="flex flex-col gap-4"
                onChange={clearError}
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="displayName" className="text-xs font-medium">Full name</Label>
                  <Input
                    id="displayName"
                    placeholder="Jane Smith"
                    autoComplete="name"
                    className={`h-11 ${registerForm.formState.errors.displayName ? 'border-destructive' : ''}`}
                    {...registerForm.register('displayName')}
                  />
                  {registerForm.formState.errors.displayName && (
                    <p className="text-xs text-destructive">
                      {registerForm.formState.errors.displayName.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="register-email" className="text-xs font-medium">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={`h-11 ${registerForm.formState.errors.email ? 'border-destructive' : ''}`}
                    {...registerForm.register('email')}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="register-password" className="text-xs font-medium">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className={`h-11 ${registerForm.formState.errors.password ? 'border-destructive' : ''}`}
                    {...registerForm.register('password')}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-xs text-destructive">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full h-11" disabled={isSubmitting || googleLoading}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create account
                </Button>
              </form>
            ) : (
              <form
                onSubmit={loginForm.handleSubmit(handleLogin)}
                className="flex flex-col gap-4"
                onChange={clearError}
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="login-email" className="text-xs font-medium">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={`h-11 ${loginForm.formState.errors.email ? 'border-destructive' : ''}`}
                    {...loginForm.register('email')}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="login-password" className="text-xs font-medium">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Your password"
                    autoComplete="current-password"
                    className={`h-11 ${loginForm.formState.errors.password ? 'border-destructive' : ''}`}
                    {...loginForm.register('password')}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-destructive">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full h-11" disabled={isSubmitting || googleLoading}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign in
                </Button>
              </form>
            )}

            {/* Toggle login / register */}
            <p className="text-center text-sm text-muted-foreground">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={toggleMode}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {isRegister ? 'Sign in' : 'Create one'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
