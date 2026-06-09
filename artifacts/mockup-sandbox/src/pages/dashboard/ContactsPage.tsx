import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListBusinessContacts,
  useCreateBusinessContact,
  useUpdateBusinessContact,
  useDeleteBusinessContact,
  BusinessContactInputContactType,
} from '@workspace/api-client-react';
import type { BusinessContact, BusinessContactInput } from '@workspace/api-client-react';
import { useDashboard } from '@/providers/DashboardProvider';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
  Phone,
  MessageCircle,
  Mail,
  Globe,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Music,
  HelpCircle,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react';

const CONTACT_TYPES = Object.values(BusinessContactInputContactType);

const TYPE_ICON: Record<string, React.ElementType> = {
  phone: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  website: Globe,
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  tiktok: Music,
  youtube: Youtube,
  other: HelpCircle,
};

const TYPE_LABEL: Record<string, string> = {
  phone: 'Phone',
  whatsapp: 'WhatsApp',
  email: 'Email',
  website: 'Website',
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'Twitter / X',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  other: 'Other',
};

interface ContactFormState {
  contactType: string;
  value: string;
  isPrimary: boolean;
  displayOrder: number;
}

const emptyForm = (): ContactFormState => ({
  contactType: 'phone',
  value: '',
  isPrimary: false,
  displayOrder: 0,
});

function contactToForm(c: BusinessContact): ContactFormState {
  return {
    contactType: c.contactType,
    value: c.value,
    isPrimary: c.isPrimary ?? false,
    displayOrder: c.displayOrder ?? 0,
  };
}

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const { businessId } = useDashboard();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<BusinessContact | null>(null);
  const [form, setForm] = useState<ContactFormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<BusinessContact | null>(null);

  const contactsQK = ['businessContacts', businessId];

  const { data: contactsData, isLoading } = useListBusinessContacts(
    businessId ?? '',
    { marketplace: MARKETPLACE_SLUG },
    { query: { enabled: !!businessId, queryKey: contactsQK } },
  );

  const contacts = (contactsData?.data ?? []).sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  );

  const createContact = useCreateBusinessContact();
  const updateContact = useUpdateBusinessContact();
  const deleteContact = useDeleteBusinessContact();

  function openAdd() {
    setEditingContact(null);
    setForm(emptyForm());
    setSheetOpen(true);
  }

  function openEdit(c: BusinessContact) {
    setEditingContact(c);
    setForm(contactToForm(c));
    setSheetOpen(true);
  }

  function handleSave() {
    if (!businessId) return;

    const input: BusinessContactInput = {
      contactType: form.contactType as BusinessContactInput['contactType'],
      value: form.value.trim(),
      isPrimary: form.isPrimary,
      displayOrder: form.displayOrder,
    };

    if (!input.value) {
      toast.error('Value is required');
      return;
    }

    if (editingContact) {
      updateContact.mutate(
        {
          businessId,
          contactId: editingContact.id,
          data: input,
          params: { marketplace: MARKETPLACE_SLUG },
        },
        {
          onSuccess: () => {
            toast.success('Contact updated');
            queryClient.invalidateQueries({ queryKey: contactsQK });
            setSheetOpen(false);
          },
          onError: (err) => {
            const e = err as { message?: string };
            toast.error(e.message ?? 'Failed to update contact');
          },
        },
      );
    } else {
      createContact.mutate(
        {
          businessId,
          data: input,
          params: { marketplace: MARKETPLACE_SLUG },
        },
        {
          onSuccess: () => {
            toast.success('Contact added');
            queryClient.invalidateQueries({ queryKey: contactsQK });
            setSheetOpen(false);
          },
          onError: (err) => {
            const e = err as { message?: string };
            toast.error(e.message ?? 'Failed to add contact');
          },
        },
      );
    }
  }

  function handleDelete() {
    if (!businessId || !deleteTarget) return;
    deleteContact.mutate(
      {
        businessId,
        contactId: deleteTarget.id,
        params: { marketplace: MARKETPLACE_SLUG },
      },
      {
        onSuccess: () => {
          toast.success('Contact deleted');
          queryClient.invalidateQueries({ queryKey: contactsQK });
          setDeleteTarget(null);
        },
        onError: (err) => {
          const e = err as { message?: string };
          toast.error(e.message ?? 'Failed to delete contact');
        },
      },
    );
  }

  const isSaving = createContact.isPending || updateContact.isPending;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Contacts</h1>
            <p className="text-sm text-muted-foreground">
              Manage how customers can reach you
            </p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add contact
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <Phone className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No contacts yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your phone number, email, or social links
            </p>
            <Button className="mt-4" onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add contact
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {contacts.map((c) => {
              const Icon = TYPE_ICON[c.contactType] ?? HelpCircle;
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-md border bg-card p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {TYPE_LABEL[c.contactType] ?? c.contactType}
                        </span>
                        {c.isPrimary && (
                          <Badge variant="secondary" className="text-xs">
                            Primary
                          </Badge>
                        )}
                      </div>
                      <p className="max-w-xs truncate text-sm text-muted-foreground">
                        {c.value}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(c)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingContact ? 'Edit contact' : 'Add contact'}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.contactType}
                onValueChange={(v) => setForm((f) => ({ ...f, contactType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABEL[t] ?? t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                type={
                  form.contactType === 'email'
                    ? 'email'
                    : form.contactType === 'website'
                      ? 'url'
                      : form.contactType === 'phone' || form.contactType === 'whatsapp'
                        ? 'tel'
                        : 'text'
                }
                placeholder={
                  form.contactType === 'email'
                    ? 'email@example.com'
                    : form.contactType === 'website'
                      ? 'https://'
                      : form.contactType === 'phone' || form.contactType === 'whatsapp'
                        ? '+234 800 000 0000'
                        : '@handle or URL'
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Display order</Label>
              <Input
                type="number"
                min={0}
                value={form.displayOrder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, displayOrder: parseInt(e.target.value, 10) || 0 }))
                }
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={form.isPrimary}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, isPrimary: !!checked }))
                }
              />
              <span className="text-sm">Mark as primary contact</span>
            </label>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving…' : editingContact ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{' '}
              <span className="font-medium">{deleteTarget?.value}</span> from your contacts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteContact.isPending}
            >
              {deleteContact.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
