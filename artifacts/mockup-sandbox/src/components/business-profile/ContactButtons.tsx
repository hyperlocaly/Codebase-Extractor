import type { GetBusiness200, ListBusinessContacts200 } from '@workspace/api-client-react';
import {
  ExternalLink,
  Facebook,
  Globe,
  Instagram,
  Mail,
  MessageCircle,
  Phone,
  Twitter,
  Youtube,
} from 'lucide-react';

type BusinessDetail = NonNullable<GetBusiness200['data']>;
type Contact = NonNullable<ListBusinessContacts200['data']>[number];

interface ContactButtonsProps {
  business: BusinessDetail;
  contacts: Contact[];
}

interface ContactAction {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  className: string;
}

function buildContactActions(business: BusinessDetail, contacts: Contact[]): ContactAction[] {
  const actions: ContactAction[] = [];
  const seen = new Set<string>();

  const add = (action: ContactAction) => {
    if (!seen.has(action.key)) {
      seen.add(action.key);
      actions.push(action);
    }
  };

  const whatsapp =
    contacts.find((c) => c.contactType === 'whatsapp')?.value ?? business.whatsappNumber;
  if (whatsapp) {
    const num = whatsapp.replace(/\D/g, '');
    add({
      key: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/${num}`,
      icon: <MessageCircle className="h-4 w-4" />,
      className:
        'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-950 dark:text-green-300',
    });
  }

  const phone =
    contacts.find((c) => c.contactType === 'phone')?.value ?? business.primaryPhone;
  if (phone) {
    add({
      key: 'phone',
      label: 'Call',
      href: `tel:${phone}`,
      icon: <Phone className="h-4 w-4" />,
      className:
        'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300',
    });
  }

  const email =
    contacts.find((c) => c.contactType === 'email')?.value ?? business.primaryEmail;
  if (email) {
    add({
      key: 'email',
      label: 'Email',
      href: `mailto:${email}`,
      icon: <Mail className="h-4 w-4" />,
      className:
        'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-300',
    });
  }

  const website =
    contacts.find((c) => c.contactType === 'website')?.value ?? business.websiteUrl;
  if (website) {
    add({
      key: 'website',
      label: 'Website',
      href: website.startsWith('http') ? website : `https://${website}`,
      icon: <Globe className="h-4 w-4" />,
      className:
        'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-950 dark:text-violet-300',
    });
  }

  const socialMap: Record<string, { label: string; icon: React.ReactNode; base: string; className: string }> = {
    instagram: {
      label: 'Instagram',
      icon: <Instagram className="h-4 w-4" />,
      base: 'https://instagram.com/',
      className:
        'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100 dark:bg-pink-950 dark:text-pink-300',
    },
    facebook: {
      label: 'Facebook',
      icon: <Facebook className="h-4 w-4" />,
      base: 'https://facebook.com/',
      className:
        'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300',
    },
    twitter: {
      label: 'Twitter/X',
      icon: <Twitter className="h-4 w-4" />,
      base: 'https://twitter.com/',
      className:
        'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-300',
    },
    youtube: {
      label: 'YouTube',
      icon: <Youtube className="h-4 w-4" />,
      base: 'https://youtube.com/',
      className:
        'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950 dark:text-red-300',
    },
    tiktok: {
      label: 'TikTok',
      icon: <ExternalLink className="h-4 w-4" />,
      base: 'https://tiktok.com/@',
      className:
        'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-300',
    },
  };

  for (const contact of contacts) {
    const meta = socialMap[contact.contactType];
    if (meta) {
      const href = contact.value.startsWith('http')
        ? contact.value
        : `${meta.base}${contact.value.replace('@', '')}`;
      add({
        key: contact.contactType,
        label: meta.label,
        href,
        icon: meta.icon,
        className: meta.className,
      });
    }
  }

  return actions;
}

export function ContactButtons({ business, contacts }: ContactButtonsProps) {
  const actions = buildContactActions(business, contacts);

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <a
            key={action.key}
            href={action.href}
            target={action.href.startsWith('tel:') || action.href.startsWith('mailto:') ? undefined : '_blank'}
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${action.className}`}
          >
            {action.icon}
            {action.label}
          </a>
        ))}
      </div>
    </div>
  );
}
