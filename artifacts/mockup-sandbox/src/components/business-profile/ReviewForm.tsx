import { useState, useEffect } from 'react';
import { useCreateReview, useUpdateReview, useAuthMe } from '@workspace/api-client-react';
import type { ReviewSummary } from '@workspace/api-client-react';
import { Star, LogIn, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { MARKETPLACE_SLUG } from '@/lib/constants';

type ReviewWithResponse = ReviewSummary & { ownerResponse?: unknown };

interface ReviewFormProps {
  businessId: string;
  onSuccess?: () => void;
  hasExistingReview?: boolean;
  editingReview?: ReviewWithResponse | null;
  onEditRequest?: () => void;
  onCancel?: () => void;
}

function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          className="rounded p-0.5"
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              s <= (hovered || value)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-muted text-muted-foreground/30'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewForm({
  businessId,
  onSuccess,
  hasExistingReview,
  editingReview,
  onEditRequest,
  onCancel,
}: ReviewFormProps) {
  const { data: meData } = useAuthMe();
  const isAuthenticated = !!(meData as any)?.data;

  const isEditing = !!editingReview;

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (editingReview) {
      setRating(editingReview.rating ?? 0);
      setTitle(editingReview.title ?? '');
      setBody(editingReview.body ?? '');
      setIsAnonymous(editingReview.isAnonymous ?? false);
      setFormError('');
    }
  }, [editingReview]);

  const { mutate: createReview, isPending: isCreating } = useCreateReview();
  const { mutate: updateReview, isPending: isUpdating } = useUpdateReview();
  const isPending = isCreating || isUpdating;

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-muted/20 py-8 text-center">
        <LogIn className="h-7 w-7 text-muted-foreground/40" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Sign in to write a review</p>
          <p className="text-xs text-muted-foreground">
            Share your experience with this business.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (hasExistingReview && !isEditing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <p className="text-sm text-muted-foreground">You have already reviewed this business.</p>
        </div>
        {onEditRequest && (
          <Button size="sm" variant="outline" onClick={onEditRequest} className="shrink-0 gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Edit review
          </Button>
        )}
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (rating === 0) {
      setFormError('Please select a star rating.');
      return;
    }

    if (isEditing && editingReview) {
      updateReview(
        {
          id: editingReview.id,
          params: { marketplace: MARKETPLACE_SLUG },
          data: {
            rating,
            title: title.trim() || undefined,
            body: body.trim() || undefined,
          },
        },
        {
          onSuccess: () => {
            toast.success('Review updated!');
            onSuccess?.();
            onCancel?.();
          },
          onError: (err: any) => {
            setFormError(err?.message ?? 'Failed to update review. Please try again.');
          },
        },
      );
    } else {
      createReview(
        {
          params: { marketplace: MARKETPLACE_SLUG },
          data: {
            businessId,
            rating,
            title: title.trim() || undefined,
            body: body.trim() || undefined,
            isAnonymous,
          },
        },
        {
          onSuccess: () => {
            setRating(0);
            setTitle('');
            setBody('');
            setIsAnonymous(false);
            toast.success('Review submitted successfully!');
            onSuccess?.();
          },
          onError: (err: any) => {
            setFormError(err?.message ?? 'Failed to submit review. Please try again.');
          },
        },
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold">
        {isEditing ? 'Edit your review' : 'Write a review'}
      </h3>
      <div className="space-y-1.5">
        <Label>Rating</Label>
        <StarRatingInput value={rating} onChange={setRating} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="review-title">
          Title <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="review-title"
          placeholder="Summarise your experience"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="review-body">
          Review <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="review-body"
          placeholder="Tell others about your experience…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={3000}
        />
      </div>
      {!isEditing && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="anonymous"
            checked={isAnonymous}
            onCheckedChange={(v) => setIsAnonymous(!!v)}
          />
          <Label htmlFor="anonymous" className="cursor-pointer font-normal text-muted-foreground text-xs">
            Post anonymously
          </Label>
        </div>
      )}
      {formError && (
        <p className="text-xs text-destructive">{formError}</p>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending || rating === 0}>
          {isPending
            ? isEditing ? 'Saving…' : 'Submitting…'
            : isEditing ? 'Save changes' : 'Submit review'}
        </Button>
        {isEditing && onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
