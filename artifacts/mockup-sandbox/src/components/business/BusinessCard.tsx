import { Link } from 'react-router-dom';
import type { BusinessSummary } from '@workspace/api-client-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, Store, ArrowRight } from 'lucide-react';

interface BusinessCardProps {
  business: BusinessSummary;
}

function getStatusColor(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active': return 'default';
    case 'pending': return 'secondary';
    case 'inactive': return 'outline';
    default: return 'outline';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Active';
    case 'pending': return 'Pending Review';
    case 'inactive': return 'Inactive';
    case 'archived': return 'Archived';
    default: return status;
  }
}

export function BusinessCard({ business }: BusinessCardProps) {
  const initials = business.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold leading-snug">
            {business.name}
          </h3>
          <Badge
            variant={getStatusColor(business.status)}
            className="mt-0.5 h-4 px-1.5 text-[10px]"
          >
            {getStatusLabel(business.status)}
          </Badge>
        </div>
      </div>

      <CardContent className="flex-1 px-4 py-3">
        {business.tagline ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {business.tagline}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground/60">
            No description added yet.
          </p>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
        {business.whatsappNumber && (
          <a
            href={`https://wa.me/${business.whatsappNumber.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 dark:bg-green-950 dark:text-green-300"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircle className="h-3 w-3" />
            WhatsApp
          </a>
        )}
        {business.primaryPhone && (
          <a
            href={`tel:${business.primaryPhone}`}
            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="h-3 w-3" />
            Call
          </a>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 gap-1 px-2 text-xs"
          asChild
        >
          <Link to={`/business/${business.slug}`}>
            View
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function BusinessCardSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-3">
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <CardContent className="flex-1 space-y-2 px-4 py-3">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      </CardContent>
      <CardFooter className="border-t px-4 py-3">
        <div className="h-6 w-16 animate-pulse rounded bg-muted" />
      </CardFooter>
    </Card>
  );
}

export function BusinessCardEmpty() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/20 px-6 py-16 text-center">
      <Store className="mb-3 h-10 w-10 text-muted-foreground/40" />
      <h3 className="mb-1 text-base font-semibold text-foreground">
        No businesses yet
      </h3>
      <p className="mb-4 max-w-xs text-sm text-muted-foreground">
        Be the first to list your fashion or tailoring business on Fashion Nigeria.
      </p>
      <Button asChild size="sm">
        <Link to="/register">Get Started — It&apos;s Free</Link>
      </Button>
    </div>
  );
}
