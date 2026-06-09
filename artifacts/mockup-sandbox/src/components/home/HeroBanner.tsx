import { Link } from 'react-router-dom';
import { useMarketplace } from '@/providers/MarketplaceProvider';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/AuthProvider';
import { Search, Store } from 'lucide-react';

export function HeroBanner() {
  const { marketplace, isLoading } = useMarketplace();
  const { user } = useAuth();

  const name = marketplace?.name ?? 'Fashion Nigeria';
  const tagline =
    marketplace?.tagline ??
    'Find the best tailors and fashion designers near you.';

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-primary/80 text-primary-foreground">
      <div className="absolute inset-0 -z-10 opacity-10">
        <svg
          className="h-full w-full"
          viewBox="0 0 800 400"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="hero-grid"
              x="0"
              y="0"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="800" height="400" fill="url(#hero-grid)" />
        </svg>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        {isLoading ? (
          <div className="space-y-4">
            <div className="mx-auto h-10 w-64 animate-pulse rounded-lg bg-primary-foreground/20 sm:mx-0" />
            <div className="mx-auto h-5 w-80 animate-pulse rounded-lg bg-primary-foreground/10 sm:mx-0" />
            <div className="flex gap-3 pt-2">
              <div className="h-10 w-28 animate-pulse rounded-lg bg-primary-foreground/20" />
              <div className="h-10 w-32 animate-pulse rounded-lg bg-primary-foreground/10" />
            </div>
          </div>
        ) : (
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
              {name}
            </h1>
            <p className="mt-3 text-base text-primary-foreground/80 sm:mt-4 sm:text-xl">
              {tagline}
            </p>

            <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
              <Button
                size="lg"
                variant="secondary"
                className="gap-2 font-semibold"
                asChild
              >
                <Link to="/directory">
                  <Search className="h-4 w-4" />
                  Browse Directory
                </Link>
              </Button>

              {!user && (
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground font-semibold"
                  asChild
                >
                  <Link to="/register">
                    <Store className="h-4 w-4" />
                    List Your Business
                  </Link>
                </Button>
              )}

              {user && (
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground font-semibold"
                  asChild
                >
                  <Link to="/dashboard">
                    <Store className="h-4 w-4" />
                    My Business
                  </Link>
                </Button>
              )}
            </div>

            {marketplace?.country?.name && (
              <p className="mt-5 text-xs text-primary-foreground/50">
                Serving {marketplace.country.name}
                {marketplace.currency?.code
                  ? ` · Prices in ${marketplace.currency.code}`
                  : ''}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
