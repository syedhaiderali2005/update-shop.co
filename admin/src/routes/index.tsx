import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Boxes, IndianRupee, PackageCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AdminShell";
import { useStore } from "@/lib/store";
import { apiRequest } from "@/lib/api";
export const Route = createFileRoute("/")({ component: Dashboard });
type Stats = {
  products: number;
  customers: number;
  orders: number;
  revenue: number;
  lowStock: number;
};
function Dashboard() {
  const { token } = useStore();
  const [stats, setStats] = useState<Stats>({
    products: 0,
    customers: 0,
    orders: 0,
    revenue: 0,
    lowStock: 0,
  });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiRequest("/admin/stats", { token })
      .then(setStats)
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Could not load dashboard statistics"),
      )
      .finally(() => setLoading(false));
  }, [token]);
  const cards = [
    {
      label: "Total Revenue",
      value: `$${stats.revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: IndianRupee,
    },
    { label: "Products", value: stats.products, icon: Boxes },
    { label: "Customers", value: stats.customers, icon: Users },
    { label: "Orders", value: stats.orders, icon: PackageCheck },
  ];
  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" items={[{ label: "Overview" }]} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c, i) => (
          <article
            key={c.label}
            className="card-panel animate-in fade-in slide-in-from-bottom-2 p-5"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <span className="rounded-xl bg-secondary p-2 text-primary">
                <c.icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-5 text-2xl font-bold">{loading ? "—" : c.value}</p>
          </article>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="card-panel p-5">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Inventory alert</h2>
          </div>
          <p className="mt-4 text-3xl font-bold">{loading ? "—" : stats.lowStock}</p>
          <p className="text-sm text-muted-foreground">Products with 5 or fewer units in stock</p>
          <Link
            to="/products"
            className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Manage inventory
          </Link>
        </article>
        <article className="card-panel p-5">
          <div className="flex items-center gap-3">
            <PackageCheck className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Store management</h2>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Manage the catalogue and review customer orders. Changes are saved to the shared MongoDB
            database and appear on the customer storefront after its next catalogue refresh.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/products"
              className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold"
            >
              Products
            </Link>
            <Link to="/orders" className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold">
              Orders
            </Link>
            <Link to="/users" className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold">
              Customers
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
