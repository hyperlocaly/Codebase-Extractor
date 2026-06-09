import { useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetBusiness,
  useUpdateBusiness,
  useSearchLocations,
} from '@workspace/api-client-react';
import { useDashboard } from '@/providers/DashboardProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120),
  tagline: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  locationId: z.string().optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  primaryPhone: z.string().max(20).optional(),
  primaryEmail: z.string().email('Enter a valid email').optional().or(z.literal('')),
  whatsappNumber: z.string().max(20).optional(),
  websiteUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { businessId, businessSlug } = useDashboard();
  const [locationQuery, setLocationQuery] = useState('');
  const [locationDisplay, setLocationDisplay] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  const debouncedLQ = useDebounce(locationQuery, 300);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  const { data: bizData, isLoading } = useGetBusiness(
    businessSlug ?? '',
    { marketplace: MARKETPLACE_SLUG },
    { query: { enabled: !!businessSlug, queryKey: ['getBusiness', businessSlug] } },
  );

  const updateBusiness = useUpdateBusiness();

  useEffect(() => {
    const detail = bizData?.data;
    if (!detail) return;
    reset({
      name: detail.name ?? '',
      tagline: detail.tagline ?? '',
      description: detail.description ?? '',
      locationId: detail.location?.id ?? '',
      addressLine1: detail.addressLine1 ?? '',
      addressLine2: detail.addressLine2 ?? '',
      primaryPhone: detail.primaryPhone ?? '',
      primaryEmail: detail.primaryEmail ?? '',
      whatsappNumber: detail.whatsappNumber ?? '',
      websiteUrl: detail.websiteUrl ?? '',
    });
    if (detail.location) {
      setLocationDisplay(detail.location.fullName ?? detail.location.name ?? '');
    }
  }, [bizData, reset]);

  const { data: locData } = useSearchLocations(
    { q: debouncedLQ, country: 'NG' },
    {
      query: {
        enabled: debouncedLQ.length >= 2,
        queryKey: ['searchLocations', debouncedLQ, 'NG'],
      },
    },
  );
  const locationOptions = (locData?.data ?? []) as Array<{
    id: string;
    name: string;
    fullName?: string | null;
  }>;

  function onSubmit(values: FormValues) {
    if (!businessId) return;
    updateBusiness.mutate(
      {
        id: businessId,
        data: {
          name: values.name,
          tagline: values.tagline || undefined,
          description: values.description || undefined,
          locationId: values.locationId || undefined,
          addressLine1: values.addressLine1 || undefined,
          addressLine2: values.addressLine2 || undefined,
          primaryPhone: values.primaryPhone || undefined,
          primaryEmail: values.primaryEmail || undefined,
          whatsappNumber: values.whatsappNumber || undefined,
          websiteUrl: values.websiteUrl || undefined,
        },
        params: { marketplace: MARKETPLACE_SLUG },
      },
      {
        onSuccess: () => {
          toast.success('Profile updated');
          queryClient.invalidateQueries({ queryKey: ['getBusiness', businessSlug] });
          reset(values);
        },
        onError: (err) => {
          const e = err as { message?: string };
          toast.error(e.message ?? 'Failed to update profile');
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      {blocker.state === 'blocked' && (
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes. Leave this page and discard them?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => blocker.reset?.()}>Stay</AlertDialogCancel>
              <AlertDialogAction onClick={() => blocker.proceed?.()}>
                Leave
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Business Profile</h1>
          <p className="text-sm text-muted-foreground">
            Update your public business information
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">
            Business name <span className="text-destructive">*</span>
          </Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tagline">Tagline</Label>
          <Input id="tagline" {...register('tagline')} placeholder="Short description" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" {...register('description')} rows={4} />
        </div>

        <div className="relative space-y-2">
          <Label>Location</Label>
          <Input
            value={locationDisplay || locationQuery}
            onChange={(e) => {
              setLocationQuery(e.target.value);
              setLocationDisplay('');
              setValue('locationId', '', { shouldDirty: true });
              setShowLocationDropdown(true);
            }}
            onFocus={() => setShowLocationDropdown(true)}
            onBlur={() => setTimeout(() => setShowLocationDropdown(false), 150)}
            placeholder="Search city or area…"
            autoComplete="off"
          />
          {showLocationDropdown && locationOptions.length > 0 && (
            <div className="absolute z-10 w-full rounded-md border bg-popover shadow-md">
              {locationOptions.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  onMouseDown={() => {
                    setValue('locationId', loc.id, { shouldDirty: true });
                    const display = loc.fullName ?? loc.name;
                    setLocationDisplay(display);
                    setLocationQuery('');
                    setShowLocationDropdown(false);
                  }}
                >
                  {loc.fullName ?? loc.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="addressLine1">Address line 1</Label>
          <Input id="addressLine1" {...register('addressLine1')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="addressLine2">Address line 2</Label>
          <Input id="addressLine2" {...register('addressLine2')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primaryPhone">Phone</Label>
            <Input id="primaryPhone" type="tel" {...register('primaryPhone')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsappNumber">WhatsApp</Label>
            <Input id="whatsappNumber" type="tel" {...register('whatsappNumber')} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="primaryEmail">Email</Label>
          <Input id="primaryEmail" type="email" {...register('primaryEmail')} />
          {errors.primaryEmail && (
            <p className="text-xs text-destructive">{errors.primaryEmail.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="websiteUrl">Website URL</Label>
          <Input id="websiteUrl" type="url" {...register('websiteUrl')} placeholder="https://" />
          {errors.websiteUrl && (
            <p className="text-xs text-destructive">{errors.websiteUrl.message}</p>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-background py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={!isDirty || updateBusiness.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!isDirty || updateBusiness.isPending}>
            {updateBusiness.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </>
  );
}
