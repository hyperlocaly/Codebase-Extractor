import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthVerifyEmail } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const hasSubmitted = useRef(false);

  const verifyMutation = useAuthVerifyEmail();

  useEffect(() => {
    if (!token || hasSubmitted.current) return;
    hasSubmitted.current = true;
    verifyMutation.mutate({ data: { token } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Invalid link</h2>
              <p className="text-sm text-muted-foreground">
                This verification link is missing a token. Please use the link
                from your email exactly as sent.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link to="/">Go home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (verifyMutation.isPending || verifyMutation.isIdle) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Verifying your email…
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (verifyMutation.isSuccess) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Email verified!</h2>
              <p className="text-sm text-muted-foreground">
                Your email has been confirmed. You now have full access to
                Fashion Nigeria.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link to="/">
                Continue to Fashion Nigeria
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const status = verifyMutation.error?.status;
  const isExpired = status === 400 || status === 404;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              {isExpired ? 'Link expired' : 'Verification failed'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isExpired
                ? 'This verification link has expired or already been used. Sign in to request a new one.'
                : 'Something went wrong. Please try again or contact support.'}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <Button asChild>
              <Link to="/login">Sign in to resend</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">Go home</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
