import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { useAuthLogout } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Store,
  Clock,
  Phone,
  Package,
  Wrench,
  Images,
  Newspaper,
  MapPin,
  Globe,
  ShieldCheck,
  Menu,
  LogOut,
  Scissors,
  ExternalLink,
  ChevronLeft,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { NotificationBell } from '@/components/NotificationBell';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/dashboard/profile', label: 'Business Profile', icon: Store },
  { to: '/dashboard/hours', label: 'Opening Hours', icon: Clock },
  { to: '/dashboard/contacts', label: 'Contacts', icon: Phone },
  { to: '/dashboard/products', label: 'Products', icon: Package },
  { to: '/dashboard/services', label: 'Services', icon: Wrench },
  { to: '/dashboard/portfolio', label: 'Portfolio', icon: Images },
  { to: '/dashboard/reviews', label: 'Reviews', icon: MessageSquare },
  { to: '/dashboard/updates', label: 'Updates', icon: Newspaper },
  { to: '/dashboard/branches', label: 'Branches', icon: MapPin },
  { to: '/dashboard/service-areas', label: 'Service Areas', icon: Globe },
  { to: '/dashboard/verification', label: 'Verification', icon: ShieldCheck },
];

function SidebarNav({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const logoutMutation = useAuthLogout();

  function handleLogout() {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        logout();
        navigate('/');
        toast.success('Signed out successfully');
      },
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Link
          to="/"
          onClick={onClose}
          className="flex items-center gap-2 font-semibold"
        >
          <Scissors className="h-5 w-5 text-primary" />
          <span>Fashion Nigeria</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="space-y-1 px-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-muted-foreground"
            asChild
          >
            <Link to="/" onClick={onClose}>
              <ExternalLink className="h-4 w-4" />
              View site
            </Link>
          </Button>
        </div>
      </nav>

      <div className="border-t p-4">
        <div className="mb-3 truncate">
          <p className="truncate text-sm font-medium">{user?.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-4 w-4" />
          {logoutMutation.isPending ? 'Signing out…' : 'Sign out'}
        </Button>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const { isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r bg-background lg:flex lg:flex-col">
        <SidebarNav />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <SidebarNav onClose={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <Button
            variant="ghost"
            size="sm"
            className="hidden gap-2 lg:flex"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <NotificationBell isAuthenticated={isAuthenticated} />
            <span className="text-xs text-muted-foreground">Dashboard</span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
