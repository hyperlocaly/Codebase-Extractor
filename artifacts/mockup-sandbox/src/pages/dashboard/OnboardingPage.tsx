import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  useCreateBusiness,
  useListCategories,
  useSearchLocations,
} from '@workspace/api-client-react';
import { useDashboard } from '@/providers/DashboardProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Check, ChevronRight, ChevronLeft } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120),
  tagline: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  locationId: z.string().optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  categoryIds: z.array(z.string()).min(1, 'Select at least one category'),
  primaryPhone: z.string().max(20).optional(),
  primaryEmail: z.string().email('Enter a valid email').optional().or(z.literal('')),
  whatsappNumber: z.string().max(20).optional(),
  websiteUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

const STEPS = ['Basic Info', 'Location', 'Categories', 'Contacts'];

const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  0: ['name'],
  1: [],
  2: ['categoryIds'],
  3: [],
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { business, refetch } = useDashboard();
  const [step, setStep] = useState(0);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationDisplay, setLocationDisplay] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  const debouncedLQ = useDebounce(locationQuery, 300);

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { categoryIds: [] },
  });

  const categoryIds = watch('categoryIds');

  const createBusiness = useCreateBusiness();

  const { data: catData } = useListCategories({});
  const categories = (catData?.data ?? []) as Array<{ id: string; name: string; slug: string }>;

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

  if (business) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  async function handleNext() {
    const fields = STEP_FIELDS[step];
    const valid = fields.length === 0 ? true : await trigger(fields);
    if (valid) setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => s - 1);
  }

  async function onSubmit(values: FormValues) {
    createBusiness.mutate(
      {
        data: {
          name: values.name,
          tagline: values.tagline || undefined,
          description: values.description || undefined,
          locationId: values.locationId || undefined,
          addressLine1: values.addressLine1 || undefined,
          addressLine2: values.addressLine2 || undefined,
          categoryIds: values.categoryIds,
          primaryPhone: values.primaryPhone || undefined,
          primaryEmail: values.primaryEmail || undefined,
          whatsappNumber: values.whatsappNumber || undefined,
          websiteUrl: values.websiteUrl || undefined,
        },
        params: { marketplace: MARKETPLACE_SLUG },
      },
      {
        onSuccess: () => {
          toast.success('Business created!');
          refetch();
          navigate('/dashboard');
        },
        onError: (err) => {
          const e = err as { message?: string };
          toast.error(e.message ?? 'Failed to create business');
        },
      },
    );
  }

  return (
    <div className="mx-auto max-w-lg py-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">Create your business</h1>
        <p className="mt-1 text-muted-foreground">Set up your listing in a few simple steps</p>
      </div>

      <div className="mb-8 flex items-center justify-between">
        {STEPS.map((label, i) => (
          <div key={i} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium',
                  i < step
                    ? 'border-primary bg-primary text-primary-foreground'
                    : i === step
                      ? 'border-primary text-primary'
                      : 'border-muted text-muted-foreground',
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className="mt-1 hidden text-xs text-muted-foreground sm:block">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn('mx-2 h-0.5 flex-1', i < step ? 'bg-primary' : 'bg-muted')}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step]}</CardTitle>
            <CardDescription>
              {step === 0 && 'Tell us about your business'}
              {step === 1 && 'Where is your business located?'}
              {step === 2 && 'What type of business do you run?'}
              {step === 3 && 'How can customers reach you?'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Business name <span className="text-destructive">*</span>
                  </Label>
                  <Input id="name" {...register('name')} placeholder="e.g. Adunni Couture" />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    {...register('tagline')}
                    placeholder="A short phrase describing your business"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Tell customers about your business, what you do, and what makes you special…"
                    rows={4}
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="relative space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={locationDisplay || locationQuery}
                    onChange={(e) => {
                      setLocationQuery(e.target.value);
                      setLocationDisplay('');
                      setValue('locationId', '');
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
                            setValue('locationId', loc.id);
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
                  <Input
                    id="addressLine1"
                    {...register('addressLine1')}
                    placeholder="Street address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressLine2">Address line 2</Label>
                  <Input
                    id="addressLine2"
                    {...register('addressLine2')}
                    placeholder="Suite, floor, landmark…"
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <div className="space-y-2">
                {errors.categoryIds && (
                  <p className="text-xs text-destructive">{errors.categoryIds.message}</p>
                )}
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Loading categories…</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((cat) => (
                      <label
                        key={cat.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md border p-3 hover:bg-muted"
                      >
                        <Checkbox
                          checked={categoryIds.includes(cat.id)}
                          onCheckedChange={(checked) => {
                            const current = categoryIds;
                            if (checked) {
                              setValue('categoryIds', [...current, cat.id]);
                            } else {
                              setValue(
                                'categoryIds',
                                current.filter((id) => id !== cat.id),
                              );
                            }
                          }}
                        />
                        <span className="text-sm">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="primaryPhone">Phone number</Label>
                  <Input
                    id="primaryPhone"
                    type="tel"
                    {...register('primaryPhone')}
                    placeholder="+234 801 234 5678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsappNumber">WhatsApp number</Label>
                  <Input
                    id="whatsappNumber"
                    type="tel"
                    {...register('whatsappNumber')}
                    placeholder="+234 801 234 5678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primaryEmail">Email address</Label>
                  <Input
                    id="primaryEmail"
                    type="email"
                    {...register('primaryEmail')}
                    placeholder="hello@yourbusiness.com"
                  />
                  {errors.primaryEmail && (
                    <p className="text-xs text-destructive">{errors.primaryEmail.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website</Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    {...register('websiteUrl')}
                    placeholder="https://yourbusiness.com"
                  />
                  {errors.websiteUrl && (
                    <p className="text-xs text-destructive">{errors.websiteUrl.message}</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={step === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={handleNext}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={createBusiness.isPending}>
              {createBusiness.isPending ? 'Creating…' : 'Create business'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
