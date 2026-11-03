import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingBag,
  ClipboardList,
  Users,
  LogOut,
  Bell,
  Tags,
  Images,
  Settings,
  Search,
  ChevronRight,
  Home,
  Menu,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: ShoppingBag },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/banners", label: "Banners", icon: Images },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/users", label: "Users", icon: Users },
] as const;

export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link to="/" className="text-primary">
        <Home className="h-4 w-4" />
      </Link>
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 opacity-60" />
          {it.to ? (
            <Link to={it.to} className="font-medium hover:text-primary">
              {it.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{it.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

export function PageHeader({
  title,
  items,
}: {
  title: string;
  items: { label: string; to?: string }[];
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 card-panel px-5 py-4">
      <h1 className="text-lg font-semibold">{title}</h1>
      <Breadcrumb items={items} />
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { logout } = useStore();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-sidebar px-4">
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg bg-secondary p-2 text-foreground lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/" className="flex items-center gap-2 pr-6">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">
            B
          </span>
          <span className="text-lg font-bold tracking-wide">BERRY</span>
        </Link>
        <div className="hidden flex-1 items-center gap-2 rounded-xl bg-secondary px-3 py-2 md:flex md:max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="rounded-lg bg-secondary p-2" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </button>

          <Link
            to="/login"
            onClick={logout}
            className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm"
          >
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Logout</span>
          </Link>
        </div>
      </header>

      <div className="flex">
        {open && (
          <button
            className="fixed inset-16 z-10 bg-black/40 lg:hidden"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
        )}
        <aside
          className={`${open ? "block" : "hidden"} fixed inset-y-16 left-0 z-20 w-60 shrink-0 border-r border-sidebar-border bg-sidebar p-4 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)]`}
        >
          <nav className="space-y-1">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-sidebar-accent font-semibold text-primary"
                      : "text-sidebar-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <Link
            to="/orders/create"
            onClick={() => setOpen(false)}
            className="mt-6 block rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground"
          >
            + Create Order
          </Link>
        </aside>

        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
