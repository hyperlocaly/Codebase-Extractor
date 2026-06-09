import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { useAuthLogout } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Scissors, Menu, LayoutDashboard, LogOut, LogIn, UserPlus, Store } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { toast } from 'sonner';
import { SearchBar } from '@/components/search/SearchBar';

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const logoutMutation = useAuthLogout();

  const displayName = user?.displayName ?? 'User';

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard" className="cursor-pointer">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            My Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/saved" className="cursor-pointer">
            <Store className="mr-2 h-4 w-4" />
            Saved Items
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-destructive focus:text-destructive"
          disabled={logoutMutation.isPending}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {logoutMutation.isPending ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function RootLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold">
            <Scissors className="h-5 w-5 text-primary" />
            <span className="hidden sm:inline">Fashion Nigeria</span>
          </Link>

          <nav className="hidden shrink-0 items-center gap-4 md:flex">
            <Link
              to="/directory"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Directory
            </Link>
          </nav>

          <div className="hidden flex-1 md:block" style={{ maxWidth: '420px' }}>
            <SearchBar placeholder="Search businesses…" className="w-full" />
          </div>

          <div className="ml-auto flex items-center gap-3">
            {!isLoading && (
              <>
                {isAuthenticated ? (
                  <UserMenu />
                ) : (
                  <div className="hidden items-center gap-2 sm:flex">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/login">
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign in
                      </Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link to="/register">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Register
                      </Link>
                    </Button>
                  </div>
                )}
              </>
            )}

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex flex-col gap-4 pt-6">
                  <Link
                    to="/"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 font-semibold"
                  >
                    <Scissors className="h-5 w-5 text-primary" />
                    Fashion Nigeria
                  </Link>
                  <SearchBar placeholder="Search…" className="w-full" />
                  <nav className="flex flex-col gap-3">
                    <Link
                      to="/directory"
                      onClick={() => setMobileOpen(false)}
                      className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Directory
                    </Link>
                    <Link
                      to="/search"
                      onClick={() => setMobileOpen(false)}
                      className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Search
                    </Link>
                  </nav>
                  {!isAuthenticated && (
                    <div className="flex flex-col gap-2 border-t pt-4">
                      <Button variant="outline" asChild>
                        <Link to="/login" onClick={() => setMobileOpen(false)}>
                          Sign in
                        </Link>
                      </Button>
                      <Button asChild>
                        <Link to="/register" onClick={() => setMobileOpen(false)}>
                          Register free
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-muted/40 py-8">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Scissors className="h-4 w-4 text-primary" />
              Fashion Nigeria
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Fashion Nigeria. Connecting customers with tailors and
              designers across Nigeria.
            </p>
            <nav className="flex gap-4 text-xs text-muted-foreground">
              <Link to="/directory" className="hover:text-foreground">
                Directory
              </Link>
              <Link to="/search" className="hover:text-foreground">
                Search
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
