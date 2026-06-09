import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthRegister } from '@workspace/api-client-react';
import { useAuth } from '@/providers/AuthProvider';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, CheckCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const registerSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name must be 80 characters or less'),
  email: z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
  ];

  if (!password) return null;

  const score = checks.filter((c) => c.pass).length;
  const strengthLabel =
    score === 0 ? 'Weak' : score === 1 ? 'Weak' : score === 2 ? 'Fair' : 'Strong';
  const strengthColor =
    score <= 1
      ? 'bg-destructive'
      : score === 2
        ? 'bg-yellow-500'
        : 'bg-green-500';

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              score >= i ? strengthColor : 'bg-muted',
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Strength: <span className="font-medium">{strengthLabel}</span>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  });

  const password = form.watch('password');

  const registerMutation = useAuthRegister({
    mutation: {
      onSuccess(res) {
        login(res.data.accessToken);
        setRegistered(true);
        toast.success('Account created! Welcome to Fashion Nigeria.');
      },
      onError(err: unknown) {
        const status = (err as { status?: number; data?: unknown }).status;
        if (status === 409) {
          form.setError('email', {
            message: 'An account with this email already exists',
          });
        } else if (status === 400) {
          const errData = (err as { data?: { error?: { details?: Record<string, string[]> } } }).data;
          const details = errData?.error?.details;
          if (details) {
            Object.entries(details).forEach(([field, messages]) => {
              if (
                field === 'email' ||
                field === 'password' ||
                field === 'displayName'
              ) {
                form.setError(field as keyof RegisterFormValues, {
                  message: Array.isArray(messages) ? messages[0] : String(messages),
                });
              }
            });
          } else {
            toast.error('Invalid details. Please check your information.');
          }
        } else {
          toast.error('Registration failed. Please try again.');
        }
      },
    },
  });

  function onSubmit(values: RegisterFormValues) {
    registerMutation.mutate({ data: values });
  }

  if (registered) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Account created!</h2>
              <p className="text-sm text-muted-foreground">
                Check your email for a verification link to unlock all features.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Verification email sent to{' '}
                <strong>{form.getValues('email')}</strong>
              </span>
            </div>
            <Button asChild className="w-full">
              <Link to="/">Continue to Fashion Nigeria</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>
          Join Fashion Nigeria — free forever for consumers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Amara Okafor"
                      autoComplete="name"
                      disabled={registerMutation.isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      disabled={registerMutation.isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                      disabled={registerMutation.isPending}
                      {...field}
                    />
                  </FormControl>
                  <PasswordStrength password={password} />
                  <FormDescription>
                    Use a mix of letters, numbers, and symbols.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create account
            </Button>
          </form>
        </Form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          By registering you agree to our terms of service.
        </p>

        <div className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
