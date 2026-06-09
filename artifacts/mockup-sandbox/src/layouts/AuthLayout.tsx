import { Link, Outlet } from 'react-router-dom';
import { Scissors } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="flex h-14 items-center border-b bg-background px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Scissors className="h-5 w-5 text-primary" />
          <span>Fashion Nigeria</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </main>

      <footer className="border-t bg-background py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Fashion Nigeria. All rights reserved.
      </footer>
    </div>
  );
}
