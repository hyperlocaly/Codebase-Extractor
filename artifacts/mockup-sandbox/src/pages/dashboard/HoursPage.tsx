import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useGetBusinessHours, useUpsertBusinessHours } from '@workspace/api-client-react';
import { useDashboard } from '@/providers/DashboardProvider';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface HourRow {
  dayOfWeek: number;
  isClosed: boolean;
  opensAt: string;
  closesAt: string;
}

function defaultHours(): HourRow[] {
  return DAY_NAMES.map((_, i) => ({
    dayOfWeek: i,
    isClosed: i === 0 || i === 6,
    opensAt: '09:00',
    closesAt: '18:00',
  }));
}

export default function HoursPage() {
  const queryClient = useQueryClient();
  const { businessId } = useDashboard();
  const [hours, setHours] = useState<HourRow[]>(defaultHours);

  const { data: hoursData, isLoading } = useGetBusinessHours(
    businessId ?? '',
    { marketplace: MARKETPLACE_SLUG },
    { query: { enabled: !!businessId, queryKey: ['businessHours', businessId] } },
  );

  const upsertHours = useUpsertBusinessHours();

  useEffect(() => {
    const apiHours = hoursData?.data;
    if (!apiHours) return;
    setHours(
      DAY_NAMES.map((_, i) => {
        const found = apiHours.find((h) => h.dayOfWeek === i);
        return {
          dayOfWeek: i,
          isClosed: found ? found.isClosed : true,
          opensAt: found?.opensAt ?? '09:00',
          closesAt: found?.closesAt ?? '18:00',
        };
      }),
    );
  }, [hoursData]);

  function updateRow(index: number, patch: Partial<HourRow>) {
    setHours((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function handleSave() {
    if (!businessId) return;

    const payload = hours.map((row) => ({
      dayOfWeek: row.dayOfWeek,
      isClosed: row.isClosed,
      opensAt: row.isClosed ? null : row.opensAt || null,
      closesAt: row.isClosed ? null : row.closesAt || null,
    }));

    upsertHours.mutate(
      {
        businessId,
        data: { hours: payload },
        params: { marketplace: MARKETPLACE_SLUG },
      },
      {
        onSuccess: () => {
          toast.success('Hours saved');
          queryClient.invalidateQueries({ queryKey: ['businessHours', businessId] });
        },
        onError: (err) => {
          const e = err as { message?: string };
          toast.error(e.message ?? 'Failed to save hours');
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Opening Hours</h1>
        <p className="text-sm text-muted-foreground">
          Set your weekly schedule. Times are in local time.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="grid grid-cols-[140px_80px_1fr_1fr] gap-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span>Day</span>
            <span>Closed</span>
            <span>Opens at</span>
            <span>Closes at</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {hours.map((row, i) => (
            <div
              key={row.dayOfWeek}
              className="grid grid-cols-[140px_80px_1fr_1fr] items-center gap-4 rounded-md border p-3"
            >
              <span className="font-medium">{DAY_NAMES[row.dayOfWeek]}</span>

              <div className="flex items-center gap-2">
                <Switch
                  checked={row.isClosed}
                  onCheckedChange={(checked) => updateRow(i, { isClosed: checked })}
                  id={`closed-${i}`}
                />
                <Label htmlFor={`closed-${i}`} className="text-xs text-muted-foreground">
                  {row.isClosed ? 'Yes' : 'No'}
                </Label>
              </div>

              <Input
                type="time"
                value={row.opensAt}
                onChange={(e) => updateRow(i, { opensAt: e.target.value })}
                disabled={row.isClosed}
                className="disabled:opacity-40"
              />

              <Input
                type="time"
                value={row.closesAt}
                onChange={(e) => updateRow(i, { closesAt: e.target.value })}
                disabled={row.isClosed}
                className="disabled:opacity-40"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={upsertHours.isPending}>
          {upsertHours.isPending ? 'Saving…' : 'Save hours'}
        </Button>
      </div>
    </div>
  );
}
