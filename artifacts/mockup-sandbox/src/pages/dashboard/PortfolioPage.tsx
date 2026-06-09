import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListPortfolios,
  useCreatePortfolio,
  useUpdatePortfolio,
  useDeletePortfolio,
  useAddPortfolioItem,
  useUpdatePortfolioItem,
  useDeletePortfolioItem,
  usePresignBusinessMediaUpload,
  useAttachBusinessMedia,
  useListBusinessMedia,
  useDeleteBusinessMedia,
  getListPortfoliosQueryKey,
  getListBusinessMediaQueryKey,
  ListPortfoliosStatus,
} from '@workspace/api-client-react';
import type {
  Portfolio,
  PortfolioItem,
  PortfolioCollection,
  PresignBusinessMediaUpload200,
} from '@workspace/api-client-react';
import { useDashboard } from '@/providers/DashboardProvider';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Images,
  Pencil,
  Trash2,
  Plus,
  Upload,
  X,
  Search,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ImageOff,
  RefreshCw,
  AlertCircle,
  Library,
} from 'lucide-react';

interface CollectionFormState {
  title: string;
  description: string;
  featuredImage: string;
  status: 'draft' | 'published';
}

interface ItemFormState {
  mediaUrl: string;
  caption: string;
  description: string;
  externalUrl: string;
}

interface MediaRecord {
  id: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  purpose: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

function emptyCollectionForm(): CollectionFormState {
  return { title: '', description: '', featuredImage: '', status: 'draft' };
}

function emptyItemForm(): ItemFormState {
  return { mediaUrl: '', caption: '', description: '', externalUrl: '' };
}

function collectionToForm(c: Portfolio): CollectionFormState {
  return {
    title: c.title ?? '',
    description: c.description ?? '',
    featuredImage: c.featuredImage ?? '',
    status: (c.status as 'draft' | 'published') ?? 'draft',
  };
}

function itemToForm(item: PortfolioItem): ItemFormState {
  return {
    mediaUrl: item.mediaUrl ?? '',
    caption: item.caption ?? '',
    description: item.description ?? '',
    externalUrl: item.externalUrl ?? '',
  };
}

function ImageUploadField({
  label,
  imageUrl,
  localPreview,
  onUrlChange,
  onFileSelect,
  onClear,
}: {
  label: string;
  imageUrl: string;
  localPreview: string | null;
  onUrlChange: (url: string) => void;
  onFileSelect: (file: File) => void;
  onClear: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewSrc = localPreview ?? (imageUrl || null);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {previewSrc && (
        <div className="relative inline-block">
          <img
            src={previewSrc}
            alt="Preview"
            className="h-28 w-28 rounded-lg border object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={imageUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="Paste image URL…"
          className="flex-1 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Browse
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function CollectionLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-16" />
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((j) => (
              <Skeleton key={j} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ItemTile({
  item,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  item: PortfolioItem;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const src = item.thumbnailUrl ?? item.mediaUrl;
  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
      {src ? (
        <img
          src={src}
          alt={item.caption ?? 'Portfolio item'}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageOff className="h-6 w-6 text-muted-foreground/30" />
        </div>
      )}
      <div className="absolute inset-0 flex flex-col justify-between bg-black/0 p-1 opacity-0 transition-opacity duration-150 group-hover:bg-black/40 group-hover:opacity-100">
        <div className="flex justify-end gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="flex h-6 w-6 items-center justify-center rounded bg-white/80 text-gray-700 disabled:opacity-30 hover:bg-white"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="flex h-6 w-6 items-center justify-center rounded bg-white/80 text-gray-700 disabled:opacity-30 hover:bg-white"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex justify-between gap-0.5">
          {item.externalUrl && (
            <a
              href={item.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-6 w-6 items-center justify-center rounded bg-white/80 text-gray-700 hover:bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <div className="ml-auto flex gap-0.5">
            <button
              type="button"
              onClick={onEdit}
              className="flex h-6 w-6 items-center justify-center rounded bg-white/80 text-gray-700 hover:bg-white"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex h-6 w-6 items-center justify-center rounded bg-destructive/90 text-white hover:bg-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
      {item.caption && (
        <div className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-0.5 text-xs text-white">
          {item.caption}
        </div>
      )}
    </div>
  );
}

function CollectionCard({
  collection,
  onEdit,
  onDelete,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onMoveItemUp,
  onMoveItemDown,
}: {
  collection: PortfolioCollection;
  onEdit: () => void;
  onDelete: () => void;
  onAddItem: () => void;
  onEditItem: (item: PortfolioItem) => void;
  onDeleteItem: (item: PortfolioItem) => void;
  onMoveItemUp: (item: PortfolioItem) => void;
  onMoveItemDown: (item: PortfolioItem) => void;
}) {
  const items = collection.items ?? [];
  const isPublished = collection.status === 'published';

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold truncate">{collection.title}</span>
            <Badge
              variant={isPublished ? 'default' : 'secondary'}
              className="shrink-0 text-xs"
            >
              {isPublished ? (
                <><Eye className="mr-1 h-3 w-3" />Published</>
              ) : (
                <><EyeOff className="mr-1 h-3 w-3" />Draft</>
              )}
            </Badge>
            <span className="text-xs text-muted-foreground shrink-0">
              {items.length} {items.length === 1 ? 'image' : 'images'}
            </span>
          </div>
          {collection.description && (
            <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
              {collection.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((item, idx) => (
            <ItemTile
              key={item.id}
              item={item}
              isFirst={idx === 0}
              isLast={idx === items.length - 1}
              onEdit={() => onEditItem(item)}
              onDelete={() => onDeleteItem(item)}
              onMoveUp={() => onMoveItemUp(item)}
              onMoveDown={() => onMoveItemDown(item)}
            />
          ))}
          <button
            type="button"
            onClick={onAddItem}
            className="aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs">Add</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/20 py-8">
          <Images className="h-6 w-6 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">No images yet</p>
          <Button variant="outline" size="sm" onClick={onAddItem}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add first image
          </Button>
        </div>
      )}
    </div>
  );
}

function MediaLibrarySection({
  businessId,
  mediaRecords,
  isLoading,
  isError,
  onRefetch,
  onDeleteMedia,
}: {
  businessId: string;
  mediaRecords: MediaRecord[];
  isLoading: boolean;
  isError: boolean;
  onRefetch: () => void;
  onDeleteMedia: (record: MediaRecord) => void;
}) {
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Library className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Media Library</span>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Library className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Media Library</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive flex-1">Failed to load media.</p>
          <Button variant="outline" size="sm" onClick={onRefetch}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (mediaRecords.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Library className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Media Library</span>
          <span className="text-xs text-muted-foreground">· 0 files</span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed bg-muted/10 py-8 text-center">
          <Images className="h-7 w-7 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">
            No uploaded media yet. Add images to collections above to build your library.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Library className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Media Library</span>
        <span className="text-xs text-muted-foreground">· {mediaRecords.length} {mediaRecords.length === 1 ? 'file' : 'files'}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
        {mediaRecords.map((record) => (
          <div
            key={record.id}
            className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
          >
            <img
              src={record.storageKey}
              alt={record.fileName}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-muted/60 opacity-0 group-hover:opacity-0">
              <ImageOff className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <div className="absolute inset-0 hidden group-hover:flex flex-col items-center justify-between bg-black/50 p-1">
              <button
                type="button"
                onClick={() => onDeleteMedia(record)}
                className="ml-auto flex h-6 w-6 items-center justify-center rounded bg-destructive/90 text-white hover:bg-destructive"
                title="Delete media"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <p className="w-full truncate text-center text-xs text-white/80 px-0.5">
                {record.fileName}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const queryClient = useQueryClient();
  const { businessId } = useDashboard();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');

  const [collectionSheetOpen, setCollectionSheetOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Portfolio | null>(null);
  const [collectionForm, setCollectionForm] = useState<CollectionFormState>(emptyCollectionForm());
  const [featuredPreview, setFeaturedPreview] = useState<string | null>(null);
  const [featuredPendingFile, setFeaturedPendingFile] = useState<File | null>(null);

  const [itemSheetOpen, setItemSheetOpen] = useState(false);
  const [itemTargetCollection, setItemTargetCollection] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>(emptyItemForm());
  const [itemPreview, setItemPreview] = useState<string | null>(null);
  const [itemPendingFile, setItemPendingFile] = useState<File | null>(null);

  const [deleteCollection, setDeleteCollection] = useState<Portfolio | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ item: PortfolioItem; collectionId: string } | null>(null);
  const [deleteMediaRecord, setDeleteMediaRecord] = useState<MediaRecord | null>(null);

  const portfolioQK = getListPortfoliosQueryKey(businessId ?? '', {
    marketplace: MARKETPLACE_SLUG,
    status: ListPortfoliosStatus.all,
  });

  const mediaQK = getListBusinessMediaQueryKey(businessId ?? '', {
    marketplace: MARKETPLACE_SLUG,
    purpose: 'gallery',
  });

  const { data: portfoliosData, isLoading, isError, refetch } = useListPortfolios(
    businessId ?? '',
    { marketplace: MARKETPLACE_SLUG, status: ListPortfoliosStatus.all },
    { query: { enabled: !!businessId, queryKey: portfolioQK } },
  );

  const {
    data: mediaData,
    isLoading: isMediaLoading,
    isError: isMediaError,
    refetch: refetchMedia,
  } = useListBusinessMedia(
    businessId ?? '',
    { marketplace: MARKETPLACE_SLUG, purpose: 'gallery' },
    { query: { enabled: !!businessId, queryKey: mediaQK } },
  );

  const createCollection = useCreatePortfolio();
  const updateCollection = useUpdatePortfolio();
  const deleteCollection_ = useDeletePortfolio();
  const addItem = useAddPortfolioItem();
  const updateItem_ = useUpdatePortfolioItem();
  const deleteItem_ = useDeletePortfolioItem();
  const presign = usePresignBusinessMediaUpload();
  const attach = useAttachBusinessMedia();
  const deleteMedia_ = useDeleteBusinessMedia();

  const allCollections: PortfolioCollection[] = (portfoliosData?.data ?? []) as PortfolioCollection[];
  const mediaRecords: MediaRecord[] = ((mediaData as any)?.data ?? []) as MediaRecord[];

  const filteredCollections = allCollections.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function invalidatePortfolio() {
    queryClient.invalidateQueries({ queryKey: portfolioQK });
  }

  function invalidateMedia() {
    queryClient.invalidateQueries({ queryKey: mediaQK });
  }

  async function uploadMediaFile(file: File, purpose: 'gallery' | 'logo' | 'banner' = 'gallery'): Promise<string> {
    if (!businessId) throw new Error('No business selected');

    const presignResult = await presign.mutateAsync({
      businessId,
      data: { fileName: file.name, mimeType: file.type, purpose },
      params: { marketplace: MARKETPLACE_SLUG },
    });

    const presignData = (presignResult as PresignBusinessMediaUpload200 & { data?: { uploadUrl?: string; storageKey?: string } })?.data ?? presignResult as any;
    const uploadUrl: string = presignData?.uploadUrl ?? '';
    const storageKey: string = presignData?.storageKey ?? '';

    if (!storageKey) throw new Error('Presign did not return a storage key');

    if (uploadUrl && !uploadUrl.includes('storage.example.com')) {
      try {
        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });
      } catch {
        // In dev the URL is a stub — continue to attach regardless
      }
    }

    await attach.mutateAsync({
      businessId,
      data: {
        storageKey,
        fileName: file.name,
        mimeType: file.type,
        purpose,
      },
      params: { marketplace: MARKETPLACE_SLUG },
    });

    invalidateMedia();
    return storageKey;
  }

  async function resolveImageUrl(pendingFile: File | null, existingUrl: string): Promise<string> {
    if (pendingFile) {
      try {
        return await uploadMediaFile(pendingFile);
      } catch {
        toast.error('Image upload failed. Using URL if provided.');
      }
    }
    return existingUrl;
  }

  function openAddCollection() {
    setEditingCollection(null);
    setCollectionForm(emptyCollectionForm());
    setFeaturedPreview(null);
    setFeaturedPendingFile(null);
    setCollectionSheetOpen(true);
  }

  function openEditCollection(c: Portfolio) {
    setEditingCollection(c);
    setCollectionForm(collectionToForm(c));
    setFeaturedPreview(null);
    setFeaturedPendingFile(null);
    setCollectionSheetOpen(true);
  }

  async function handleSaveCollection() {
    if (!businessId || !collectionForm.title.trim()) {
      toast.error('Title is required.');
      return;
    }
    try {
      const featuredImage = await resolveImageUrl(featuredPendingFile, collectionForm.featuredImage);
      const payload = {
        title: collectionForm.title.trim(),
        description: collectionForm.description || undefined,
        featuredImage: featuredImage || undefined,
        status: collectionForm.status,
        sortOrder: editingCollection?.sortOrder ?? allCollections.length,
      };

      if (editingCollection) {
        await updateCollection.mutateAsync({
          businessId,
          id: editingCollection.id,
          data: payload,
          params: { marketplace: MARKETPLACE_SLUG },
        });
        toast.success('Collection updated.');
      } else {
        await createCollection.mutateAsync({
          businessId,
          data: { title: payload.title, description: payload.description, featuredImage: payload.featuredImage, sortOrder: payload.sortOrder },
          params: { marketplace: MARKETPLACE_SLUG },
        });
        toast.success('Collection created.');
      }

      invalidatePortfolio();
      setCollectionSheetOpen(false);
      if (featuredPreview) URL.revokeObjectURL(featuredPreview);
    } catch {
      toast.error('Failed to save collection. Please try again.');
    }
  }

  async function handleDeleteCollection() {
    if (!deleteCollection || !businessId) return;
    try {
      await deleteCollection_.mutateAsync({
        businessId,
        id: deleteCollection.id,
        params: { marketplace: MARKETPLACE_SLUG },
      });
      toast.success('Collection deleted.');
      invalidatePortfolio();
    } catch {
      toast.error('Failed to delete collection.');
    } finally {
      setDeleteCollection(null);
    }
  }

  function openAddItem(collectionId: string) {
    setItemTargetCollection(collectionId);
    setEditingItem(null);
    setItemForm(emptyItemForm());
    setItemPreview(null);
    setItemPendingFile(null);
    setItemSheetOpen(true);
  }

  function openEditItem(item: PortfolioItem, collectionId: string) {
    setItemTargetCollection(collectionId);
    setEditingItem(item);
    setItemForm(itemToForm(item));
    setItemPreview(null);
    setItemPendingFile(null);
    setItemSheetOpen(true);
  }

  async function handleSaveItem() {
    if (!businessId || !itemTargetCollection) return;
    if (!editingItem && !itemForm.mediaUrl && !itemPendingFile) {
      toast.error('Please provide an image.');
      return;
    }
    try {
      const mediaUrl = await resolveImageUrl(itemPendingFile, itemForm.mediaUrl);
      const payload = {
        mediaUrl: mediaUrl || itemForm.mediaUrl,
        caption: itemForm.caption || undefined,
        description: itemForm.description || undefined,
        externalUrl: itemForm.externalUrl || undefined,
      };

      if (editingItem) {
        await updateItem_.mutateAsync({
          businessId,
          id: itemTargetCollection,
          itemId: editingItem.id,
          data: { caption: payload.caption, description: payload.description, externalUrl: payload.externalUrl },
          params: { marketplace: MARKETPLACE_SLUG },
        });
        toast.success('Item updated.');
      } else {
        await addItem.mutateAsync({
          businessId,
          id: itemTargetCollection,
          data: payload,
          params: { marketplace: MARKETPLACE_SLUG },
        });
        toast.success('Image added.');
      }

      invalidatePortfolio();
      setItemSheetOpen(false);
      if (itemPreview) URL.revokeObjectURL(itemPreview);
    } catch {
      toast.error('Failed to save image. Please try again.');
    }
  }

  async function handleDeleteItem() {
    if (!deleteItem || !businessId) return;
    try {
      await deleteItem_.mutateAsync({
        businessId,
        id: deleteItem.collectionId,
        itemId: deleteItem.item.id,
        params: { marketplace: MARKETPLACE_SLUG },
      });
      toast.success('Image removed.');
      invalidatePortfolio();
    } catch {
      toast.error('Failed to remove image.');
    } finally {
      setDeleteItem(null);
    }
  }

  async function handleDeleteMedia() {
    if (!deleteMediaRecord || !businessId) return;
    try {
      await deleteMedia_.mutateAsync({
        businessId,
        mediaId: deleteMediaRecord.id,
        params: { marketplace: MARKETPLACE_SLUG },
      });
      toast.success('Media file deleted.');
      invalidateMedia();
    } catch {
      toast.error('Failed to delete media file.');
    } finally {
      setDeleteMediaRecord(null);
    }
  }

  async function handleMoveItem(item: PortfolioItem, collectionId: string, direction: 'up' | 'down') {
    if (!businessId) return;
    const collection = allCollections.find((c) => c.id === collectionId);
    if (!collection) return;
    const items = [...(collection.items ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const idx = items.findIndex((i) => i.id === item.id);
    if (direction === 'up' && idx <= 0) return;
    if (direction === 'down' && idx >= items.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const newOrder = item.sortOrder ?? idx;
    const swapOrder = items[swapIdx].sortOrder ?? swapIdx;

    try {
      await Promise.all([
        updateItem_.mutateAsync({
          businessId,
          id: collectionId,
          itemId: item.id,
          data: { sortOrder: swapOrder },
          params: { marketplace: MARKETPLACE_SLUG },
        }),
        updateItem_.mutateAsync({
          businessId,
          id: collectionId,
          itemId: items[swapIdx].id,
          data: { sortOrder: newOrder },
          params: { marketplace: MARKETPLACE_SLUG },
        }),
      ]);
      invalidatePortfolio();
    } catch {
      toast.error('Failed to reorder images.');
    }
  }

  const isSavingCollection = createCollection.isPending || updateCollection.isPending || presign.isPending || attach.isPending;
  const isSavingItem = addItem.isPending || updateItem_.isPending || presign.isPending || attach.isPending;

  if (!businessId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">No business selected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            Showcase your work with image collections
          </p>
        </div>
        <Button onClick={openAddCollection}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Collection
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search collections…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <CollectionLoadingSkeleton />}

      {isError && (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed py-12 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load portfolio</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      )}

      {!isLoading && !isError && filteredCollections.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-muted/10 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Images className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">
              {searchQuery || statusFilter !== 'all'
                ? 'No collections match your filters'
                : 'No portfolio collections yet'}
            </p>
            <p className="text-sm text-muted-foreground">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter'
                : 'Create a collection to showcase your work'}
            </p>
          </div>
          {!searchQuery && statusFilter === 'all' && (
            <Button onClick={openAddCollection}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create First Collection
            </Button>
          )}
        </div>
      )}

      {!isLoading && !isError && filteredCollections.length > 0 && (
        <div className="space-y-4">
          {filteredCollections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onEdit={() => openEditCollection(collection)}
              onDelete={() => setDeleteCollection(collection)}
              onAddItem={() => openAddItem(collection.id)}
              onEditItem={(item) => openEditItem(item, collection.id)}
              onDeleteItem={(item) => setDeleteItem({ item, collectionId: collection.id })}
              onMoveItemUp={(item) => handleMoveItem(item, collection.id, 'up')}
              onMoveItemDown={(item) => handleMoveItem(item, collection.id, 'down')}
            />
          ))}
        </div>
      )}

      <MediaLibrarySection
        businessId={businessId}
        mediaRecords={mediaRecords}
        isLoading={isMediaLoading}
        isError={isMediaError}
        onRefetch={() => refetchMedia()}
        onDeleteMedia={(record) => setDeleteMediaRecord(record)}
      />

      {/* Collection Form Sheet */}
      <Sheet open={collectionSheetOpen} onOpenChange={setCollectionSheetOpen}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingCollection ? 'Edit Collection' : 'New Collection'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="c-title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="c-title"
                value={collectionForm.title}
                onChange={(e) => setCollectionForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Bridal Gowns 2024"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-desc">Description</Label>
              <Textarea
                id="c-desc"
                value={collectionForm.description}
                onChange={(e) => setCollectionForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe this collection…"
                rows={3}
              />
            </div>

            <ImageUploadField
              label="Featured image"
              imageUrl={collectionForm.featuredImage}
              localPreview={featuredPreview}
              onUrlChange={(url) => setCollectionForm((f) => ({ ...f, featuredImage: url }))}
              onFileSelect={(file) => {
                if (featuredPreview) URL.revokeObjectURL(featuredPreview);
                setFeaturedPreview(URL.createObjectURL(file));
                setFeaturedPendingFile(file);
                setCollectionForm((f) => ({ ...f, featuredImage: '' }));
              }}
              onClear={() => {
                if (featuredPreview) URL.revokeObjectURL(featuredPreview);
                setFeaturedPreview(null);
                setFeaturedPendingFile(null);
                setCollectionForm((f) => ({ ...f, featuredImage: '' }));
              }}
            />

            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select
                value={collectionForm.status}
                onValueChange={(v) => setCollectionForm((f) => ({ ...f, status: v as 'draft' | 'published' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <span className="flex items-center gap-2">
                      <EyeOff className="h-3.5 w-3.5" /> Draft (hidden)
                    </span>
                  </SelectItem>
                  <SelectItem value="published">
                    <span className="flex items-center gap-2">
                      <Eye className="h-3.5 w-3.5" /> Published (visible)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={handleSaveCollection}
                disabled={isSavingCollection || !collectionForm.title.trim()}
              >
                {isSavingCollection ? 'Saving…' : editingCollection ? 'Save Changes' : 'Create Collection'}
              </Button>
              <Button variant="outline" onClick={() => setCollectionSheetOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Item Form Sheet */}
      <Sheet open={itemSheetOpen} onOpenChange={setItemSheetOpen}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingItem ? 'Edit Image' : 'Add Image'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {!editingItem && (
              <ImageUploadField
                label="Image *"
                imageUrl={itemForm.mediaUrl}
                localPreview={itemPreview}
                onUrlChange={(url) => setItemForm((f) => ({ ...f, mediaUrl: url }))}
                onFileSelect={(file) => {
                  if (itemPreview) URL.revokeObjectURL(itemPreview);
                  setItemPreview(URL.createObjectURL(file));
                  setItemPendingFile(file);
                  setItemForm((f) => ({ ...f, mediaUrl: '' }));
                }}
                onClear={() => {
                  if (itemPreview) URL.revokeObjectURL(itemPreview);
                  setItemPreview(null);
                  setItemPendingFile(null);
                  setItemForm((f) => ({ ...f, mediaUrl: '' }));
                }}
              />
            )}

            {editingItem && (
              <div className="space-y-1">
                <Label>Current image</Label>
                <div className="h-28 w-28 overflow-hidden rounded-lg border">
                  {editingItem.thumbnailUrl ?? editingItem.mediaUrl ? (
                    <img
                      src={editingItem.thumbnailUrl ?? editingItem.mediaUrl}
                      alt="Current"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <ImageOff className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  To replace, delete and re-add this image.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="i-caption">Caption</Label>
              <Input
                id="i-caption"
                value={itemForm.caption}
                onChange={(e) => setItemForm((f) => ({ ...f, caption: e.target.value }))}
                placeholder="Short caption…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="i-desc">Description</Label>
              <Textarea
                id="i-desc"
                value={itemForm.description}
                onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="More detail about this image…"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="i-link">External link</Label>
              <Input
                id="i-link"
                value={itemForm.externalUrl}
                onChange={(e) => setItemForm((f) => ({ ...f, externalUrl: e.target.value }))}
                placeholder="https://…"
                type="url"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={handleSaveItem}
                disabled={isSavingItem || (!editingItem && !itemForm.mediaUrl && !itemPendingFile)}
              >
                {isSavingItem ? 'Saving…' : editingItem ? 'Save Changes' : 'Add Image'}
              </Button>
              <Button variant="outline" onClick={() => setItemSheetOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Collection Dialog */}
      <AlertDialog open={!!deleteCollection} onOpenChange={(o) => !o && setDeleteCollection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteCollection?.title}&rdquo; and all its images.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteCollection}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Item Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove image?</AlertDialogTitle>
            <AlertDialogDescription>
              This image will be permanently removed from the collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteItem}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Media Dialog */}
      <AlertDialog open={!!deleteMediaRecord} onOpenChange={(o) => !o && setDeleteMediaRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete media file?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteMediaRecord?.fileName}&rdquo; will be permanently deleted from your media
              library. Portfolio items using this file will lose their image.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteMedia}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
