import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListBusinessUpdates,
  useCreateBusinessUpdate,
  usePatchBusinessUpdate,
  useDeleteBusinessUpdate,
  getListBusinessUpdatesQueryKey,
} from '@workspace/api-client-react';
import type {
  BusinessUpdateItem,
  CreateBusinessUpdateBodyUpdateType,
  PatchBusinessUpdateBodyStatus,
  PatchBusinessUpdateBodyUpdateType,
} from '@workspace/api-client-react';
import { useDashboard } from '@/providers/DashboardProvider';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Newspaper,
  Pencil,
  Trash2,
  Plus,
  Search,
  Tag,
  Megaphone,
  CalendarDays,
  Clock,
} from 'lucide-react';

type UpdateType = CreateBusinessUpdateBodyUpdateType;
type UpdateStatus = PatchBusinessUpdateBodyStatus;

interface UpdateFormState {
  title: string;
  body: string;
  updateType: UpdateType;
  publishNow: boolean;
  expiresAt: string;
}

const emptyForm = (): UpdateFormState => ({
  title: '',
  body: '',
  updateType: 'news',
  publishNow: true,
  expiresAt: '',
});

function updateToForm(u: BusinessUpdateItem): UpdateFormState {
  return {
    title: u.title,
    body: u.body,
    updateType: u.updateType as UpdateType,
    publishNow: u.status === 'published',
    expiresAt: u.expiresAt ? u.expiresAt.slice(0, 10) : '',
  };
}

const TYPE_CONFIG: Record<UpdateType, { label: string; color: string; icon: React.ReactNode }> = {
  news: {
    label: 'News',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    icon: <Newspaper className="h-3 w-3" />,
  },
  offer: {
    label: 'Offer',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    icon: <Tag className="h-3 w-3" />,
  },
  event: {
    label: 'Event',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    icon: <CalendarDays className="h-3 w-3" />,
  },
  announcement: {
    label: 'Announcement',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    icon: <Megaphone className="h-3 w-3" />,
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
  published: { label: 'Published', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  archived: { label: 'Archived', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

function TypeBadge({ type }: { type: UpdateType }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.news;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function timeAgo(date: string | undefined | null): string {
  if (!date) return '';
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface UpdateFormProps {
  form: UpdateFormState;
  onChange: (f: UpdateFormState) => void;
  isEdit: boolean;
}

function UpdateFormFields({ form, onChange, isEdit }: UpdateFormProps) {
  const set = <K extends keyof UpdateFormState>(k: K, v: UpdateFormState[K]) =>
    onChange({ ...form, [k]: v });

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="u-title">Title *</Label>
        <Input
          id="u-title"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="e.g. Summer Sale — 20% Off All Items"
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground text-right">{form.title.length}/200</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="u-body">Body *</Label>
        <Textarea
          id="u-body"
          value={form.body}
          onChange={(e) => set('body', e.target.value)}
          placeholder="What would you like to share with your customers?"
          rows={5}
          maxLength={5000}
        />
        <p className="text-xs text-muted-foreground text-right">{form.body.length}/5000</p>
      </div>

      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={form.updateType} onValueChange={(v) => set('updateType', v as UpdateType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TYPE_CONFIG) as UpdateType[]).map((t) => (
              <SelectItem key={t} value={t}>
                <span className="flex items-center gap-2">
                  {TYPE_CONFIG[t].icon}
                  {TYPE_CONFIG[t].label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isEdit && (
        <div className="space-y-1.5">
          <Label htmlFor="u-expires">Expiry date (optional)</Label>
          <Input
            id="u-expires"
            type="date"
            value={form.expiresAt}
            onChange={(e) => set('expiresAt', e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
          />
          <p className="text-xs text-muted-foreground">Leave blank to never expire.</p>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <p className="text-sm font-medium">
            {isEdit ? 'Published' : 'Publish immediately'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isEdit
              ? 'Toggle to publish or revert to draft'
              : 'Off = save as draft'}
          </p>
        </div>
        <Switch
          checked={form.publishNow}
          onCheckedChange={(v) => set('publishNow', v)}
        />
      </div>
    </div>
  );
}

interface UpdateRowProps {
  update: BusinessUpdateItem;
  onEdit: (u: BusinessUpdateItem) => void;
  onDelete: (u: BusinessUpdateItem) => void;
  onToggleStatus: (u: BusinessUpdateItem) => void;
  isTogglingId: string | null;
}

function UpdateRow({ update, onEdit, onDelete, onToggleStatus, isTogglingId }: UpdateRowProps) {
  const isToggling = isTogglingId === update.id;
  const isPublished = update.status === 'published';

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-start sm:gap-4">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={update.updateType as UpdateType} />
          <StatusBadge status={update.status} />
          {update.expiresAt && new Date(update.expiresAt) < new Date() && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
              <Clock className="h-3 w-3" />
              Expired
            </span>
          )}
        </div>
        <p className="text-sm font-semibold leading-snug">{update.title}</p>
        <p className="line-clamp-2 text-sm text-muted-foreground">{update.body}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground/70">
          <span>{timeAgo(update.createdAt)}</span>
          {update.publishedAt && <span>Published {formatDate(update.publishedAt)}</span>}
          {update.expiresAt && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              Expires {formatDate(update.expiresAt)}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => onToggleStatus(update)}
          disabled={isToggling}
        >
          {isToggling ? '…' : isPublished ? 'Unpublish' : 'Publish'}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => onEdit(update)}
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(update)}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function UpdatesPage() {
  const { businessId } = useDashboard();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<UpdateType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'published' | 'archived'>('all');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BusinessUpdateItem | null>(null);
  const [form, setForm] = useState<UpdateFormState>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);

  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const pendingDeletions = useRef<Record<string, { item: BusinessUpdateItem; timer: ReturnType<typeof setTimeout> }>>({});

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const listParams = {
    marketplace: MARKETPLACE_SLUG,
    limit: 100,
  };

  const { data, isLoading, isError, refetch } = useListBusinessUpdates(
    businessId ?? '',
    listParams,
    {
      query: {
        enabled: !!businessId,
        queryKey: getListBusinessUpdatesQueryKey(businessId ?? '', listParams),
      },
    },
  );

  const { mutateAsync: createUpdate } = useCreateBusinessUpdate();
  const { mutateAsync: patchUpdate } = usePatchBusinessUpdate();
  const { mutateAsync: deleteUpdate } = useDeleteBusinessUpdate();

  const invalidate = () =>
    qc.invalidateQueries({
      queryKey: getListBusinessUpdatesQueryKey(businessId ?? '', listParams),
    });

  const allUpdates: BusinessUpdateItem[] = (data?.data ?? []) as BusinessUpdateItem[];

  const filtered = allUpdates.filter((u) => {
    if (hiddenIds.has(u.id)) return false;
    if (filterType !== 'all' && u.updateType !== filterType) return false;
    if (filterStatus !== 'all' && u.status !== filterStatus) return false;
    if (search && !u.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function openCreate() {
    setEditTarget(null);
    setForm(emptyForm());
    setSheetOpen(true);
  }

  function openEdit(u: BusinessUpdateItem) {
    setEditTarget(u);
    setForm(updateToForm(u));
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!businessId || !form.title.trim() || !form.body.trim()) return;
    setIsSaving(true);
    try {
      if (editTarget) {
        await patchUpdate({
          businessId,
          updateId: editTarget.id,
          data: {
            title: form.title.trim(),
            body: form.body.trim(),
            updateType: form.updateType as PatchBusinessUpdateBodyUpdateType,
            status: (form.publishNow ? 'published' : 'draft') as PatchBusinessUpdateBodyStatus,
          },
          params: { marketplace: MARKETPLACE_SLUG },
        });
        toast.success('Update saved');
      } else {
        await createUpdate({
          businessId,
          data: {
            title: form.title.trim(),
            body: form.body.trim(),
            updateType: form.updateType,
            publishNow: form.publishNow,
            ...(form.expiresAt ? { expiresAt: new Date(form.expiresAt).toISOString() } : {}),
          },
          params: { marketplace: MARKETPLACE_SLUG },
        });
        toast.success('Update created');
      }
      setSheetOpen(false);
      await invalidate();
    } catch {
      toast.error('Failed to save update. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleStatus(u: BusinessUpdateItem) {
    if (!businessId) return;
    const newStatus: PatchBusinessUpdateBodyStatus = u.status === 'published' ? 'draft' : 'published';
    setTogglingId(u.id);
    try {
      await patchUpdate({
        businessId,
        updateId: u.id,
        data: { status: newStatus },
        params: { marketplace: MARKETPLACE_SLUG },
      });
      toast.success(newStatus === 'published' ? 'Published' : 'Moved to draft');
      await invalidate();
    } catch {
      toast.error('Failed to update status.');
    } finally {
      setTogglingId(null);
    }
  }

  function handleSoftDelete(update: BusinessUpdateItem) {
    if (!businessId) return;
    setHiddenIds((prev) => new Set([...prev, update.id]));
    const timer = setTimeout(() => {
      if (!pendingDeletions.current[update.id]) return;
      delete pendingDeletions.current[update.id];
      deleteUpdate({
        businessId: businessId!,
        updateId: update.id,
        params: { marketplace: MARKETPLACE_SLUG },
      })
        .then(() => invalidate())
        .catch(() => {
          toast.error('Failed to delete update.');
          setHiddenIds((prev) => {
            const next = new Set(prev);
            next.delete(update.id);
            return next;
          });
        });
    }, 5000);
    pendingDeletions.current[update.id] = { item: update, timer };
    toast(`"${update.title}" deleted`, {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(pendingDeletions.current[update.id]?.timer);
          delete pendingDeletions.current[update.id];
          setHiddenIds((prev) => {
            const next = new Set(prev);
            next.delete(update.id);
            return next;
          });
        },
      },
    });
  }

  const publishedCount = allUpdates.filter((u) => u.status === 'published').length;
  const draftCount = allUpdates.filter((u) => u.status === 'draft').length;

  if (!businessId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center px-4">
        <Newspaper className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          No business found. Create your business first.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Updates</h1>
          <p className="text-sm text-muted-foreground">
            Share news, offers, events, and announcements with your customers.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="mr-1.5 h-4 w-4" />
          New update
        </Button>
      </div>

      {allUpdates.length > 0 && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{publishedCount}</span> published
          </span>
          <span>
            <span className="font-semibold text-foreground">{draftCount}</span> draft
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search updates…"
            className="pl-8 text-sm h-8"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={filterType}
            onValueChange={(v) => setFilterType(v as typeof filterType)}
          >
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {(Object.keys(TYPE_CONFIG) as UpdateType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_CONFIG[t].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}
          >
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed py-12 text-center">
          <Newspaper className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Failed to load updates.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed py-14 text-center">
          <Newspaper className="h-9 w-9 text-muted-foreground/30" />
          {allUpdates.length === 0 ? (
            <>
              <p className="text-sm font-medium text-muted-foreground">No updates yet.</p>
              <p className="text-xs text-muted-foreground/70">
                Post news, offers, and events to keep customers informed.
              </p>
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create your first update
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No updates match your filters.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <UpdateRow
              key={u.id}
              update={u}
              onEdit={openEdit}
              onDelete={handleSoftDelete}
              onToggleStatus={handleToggleStatus}
              isTogglingId={togglingId}
            />
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editTarget ? 'Edit update' : 'New update'}</SheetTitle>
          </SheetHeader>
          <UpdateFormFields form={form} onChange={setForm} isEdit={!!editTarget} />
          <div className="mt-6 flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || !form.title.trim() || !form.body.trim()}
              className="flex-1"
            >
              {isSaving ? 'Saving…' : editTarget ? 'Save changes' : 'Create update'}
            </Button>
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
