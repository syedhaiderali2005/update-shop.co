import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AdminShell";
import { useStore } from "@/lib/store";
import { apiRequest } from "@/lib/api";
export const Route = createFileRoute("/orders/")({ component: OrdersPage });
type Order = {
  _id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  total: number;
  paymentMethod: string;
  user?: { name: string; email: string };
  items: Array<{ product: string; name: string; price: number; quantity: number }>;
};
const statuses = ["Placed", "Processing", "Shipped", "Delivered", "Cancelled"];
function OrdersPage() {
  const { token } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try {
      const d = await apiRequest("/admin/orders", { token });
      setOrders(d.items || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load orders");
    } finally {
      setLoading(false);
    }
  };
  // The request should rerun when the authenticated token changes.
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  const list = useMemo(
    () =>
      orders.filter(
        (o) =>
          (o.orderNumber + o.user?.name + o.user?.email).toLowerCase().includes(q.toLowerCase()) &&
          (status === "All" || o.status === status),
      ),
    [orders, q, status],
  );
  const remove = async (id: string) => {
    if (!window.confirm("Delete this order record?")) return;
    try {
      await apiRequest(`/admin/orders/${id}`, { token, method: "DELETE" });
      setOrders((current) => current.filter((order) => order._id !== id));
      toast.success("Order deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  };
  const update = async (id: string, next: string) => {
    try {
      const d = await apiRequest(`/admin/orders/${id}`, {
        token,
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setOrders((p) => p.map((o) => (o._id === id ? { ...o, ...d.order } : o)));
      toast.success("Order status updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };
  return (
    <div className="space-y-5">
      <PageHeader title="Orders" items={[{ label: "Orders" }]} />
      <section className="card-panel p-4 md:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search order or customer"
            className="w-full rounded-lg bg-secondary px-3 py-2 text-sm sm:max-w-xs"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg bg-secondary px-3 py-2 text-sm"
          >
            <option>All</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {loading ? (
          <p className="p-8 text-center">Loading orders…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3">Order</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o._id} className="border-b border-border/70">
                    <td className="p-3 font-semibold">{o.orderNumber || o._id.slice(-8)}</td>
                    <td className="p-3">{o.user?.name || o.user?.email || "Customer"}</td>
                    <td className="p-3">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">{o.paymentMethod}</td>
                    <td className="p-3">
                      <select
                        value={o.status}
                        onChange={(e) => void update(o._id, e.target.value)}
                        className="rounded-lg bg-secondary px-2 py-1.5"
                      >
                        {statuses.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-right font-semibold">${Number(o.total).toFixed(2)}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => void remove(o._id)}
                        className="rounded-lg bg-destructive/10 p-2 text-destructive"
                        aria-label="Delete order"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && (
              <p className="p-8 text-center text-muted-foreground">No orders found.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
