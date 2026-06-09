import { createContext, useContext, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useListMyBusinesses } from '@workspace/api-client-react';
import type { BusinessSummary } from '@workspace/api-client-react';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';

interface DashboardContextValue {
  business: BusinessSummary | null;
  businessId: string | null;
  businessSlug: string | null;
  isLoading: boolean;
  refetch: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isOnboarding = location.pathname === '/dashboard/onboarding';

  const { data, isLoading, refetch } = useListMyBusinesses(
    { marketplace: MARKETPLACE_SLUG },
    { query: { queryKey: ['listMyBusinesses', MARKETPLACE_SLUG] } },
  );

  const businesses = data?.data ?? [];
  const business = businesses[0] ?? null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!business && !isOnboarding) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-muted p-4">
            <PlusCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold">No business yet</h2>
          <p className="text-muted-foreground">
            Create your business profile to start managing your listing, hours,
            contacts, and more.
          </p>
          <Button asChild size="lg">
            <Link to="/dashboard/onboarding">Create your business</Link>
          </Button>
        </div>
      </div>
    );
  }

  const value: DashboardContextValue = {
    business,
    businessId: business?.id ?? null,
    businessSlug: business?.slug ?? null,
    isLoading,
    refetch,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used inside DashboardProvider');
  return ctx;
}
