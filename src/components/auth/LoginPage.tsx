import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  signInWithEmail,
  registerWithEmail,
  signInWithGoogle,
  createUserDocumentIfNeeded,
  getAuthErrorMessage,
} from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  if (user) return <Navigate to="/" replace />;

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
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        {/* Logo / brand */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl font-bold tracking-tight text-foreground">FieldFlow</span>
          <span className="text-sm text-muted-foreground">CRM for landscape professionals</span>
        </div>

        <Card className="w-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-xl">
              {isRegister ? 'Create your account' : 'Sign in to FieldFlow'}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {/* Google sign-in */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
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
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                <p className="text-sm text-destructive">{authError}</p>
              </div>
            )}

            {/* Email / password form */}
            {isRegister ? (
              <form
                onSubmit={registerForm.handleSubmit(handleRegister)}
                className="flex flex-col gap-3"
                onChange={clearError}
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="displayName">Full name</Label>
                  <Input
                    id="displayName"
                    placeholder="Jane Smith"
                    autoComplete="name"
                    className={registerForm.formState.errors.displayName ? 'border-destructive' : ''}
                    {...registerForm.register('displayName')}
                  />
                  {registerForm.formState.errors.displayName && (
                    <p className="text-xs text-destructive">
                      {registerForm.formState.errors.displayName.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={registerForm.formState.errors.email ? 'border-destructive' : ''}
                    {...registerForm.register('email')}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className={registerForm.formState.errors.password ? 'border-destructive' : ''}
                    {...registerForm.register('password')}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-xs text-destructive">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting || googleLoading}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create account
                </Button>
              </form>
            ) : (
              <form
                onSubmit={loginForm.handleSubmit(handleLogin)}
                className="flex flex-col gap-3"
                onChange={clearError}
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={loginForm.formState.errors.email ? 'border-destructive' : ''}
                    {...loginForm.register('email')}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Your password"
                    autoComplete="current-password"
                    className={loginForm.formState.errors.password ? 'border-destructive' : ''}
                    {...loginForm.register('password')}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-destructive">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting || googleLoading}>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
