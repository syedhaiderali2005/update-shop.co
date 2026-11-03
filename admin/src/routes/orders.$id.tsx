import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/AdminShell";
import { getProduct, getUser, money, orderSubtotal, orderTotal, useStore } from "@/lib/store";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order details — Berry Admin" },
      {
        name: "description",
        content: "Full breakdown of an order: items, customer, totals and status.",
      },
      { property: "og:title", content: "Order details — Berry Admin" },
      {
        property: "og:description",
        content: "Full breakdown of an order: items, customer, totals and status.",
      },
    ],
  }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const { orders, updateOrder, removeOrder } = useStore();
  const navigate = useNavigate();
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <>
        <PageHeader
          title="Order not found"
          items={[{ label: "Orders", to: "/orders" }, { label: id }]}
        />
        <div className="card-panel p-8 text-center text-muted-foreground">
          This order doesn't exist.{" "}
          <Link to="/orders" className="text-primary">
            Back to orders
          </Link>
        </div>
      </>
    );
  }

  const user = getUser(order.userId);

  return (
    <>
      <PageHeader
        title={`Order #${order.id}`}
        items={[{ label: "Orders", to: "/orders" }, { label: `#${order.id}` }]}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card-panel p-5 lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold">Items</h2>
          <div className="space-y-3">
            {order.items.map((it) => {
              const p = getProduct(it.productId);
              if (!p) return null;
              return (
                <div
                  key={it.productId}
                  className="flex items-center gap-4 rounded-xl bg-secondary p-3"
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    className="h-14 w-14 rounded-lg object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/products/$id"
                      params={{ id: p.id }}
                      className="truncate text-sm font-semibold hover:text-primary"
                    >
                      {p.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {money(p.price)} × {it.qty}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{money(p.price * it.qty)}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{money(orderSubtotal(order))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{money(order.shipping)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{money(order.tax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{money(orderTotal(order))}</span>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card-panel p-5">
            <h2 className="mb-3 text-base font-semibold">Customer</h2>
            {user && (
              <div className="space-y-1 text-sm">
                <Link
                  to="/users/$id"
                  params={{ id: user.id }}
                  className="font-semibold text-primary"
                >
                  {user.name}
                </Link>
                <p className="text-muted-foreground">{user.email}</p>
                <p className="text-muted-foreground">{user.phone}</p>
                <p className="text-muted-foreground">
                  {user.address}, {user.city}, {user.country}
                </p>
              </div>
            )}
          </div>

          <div className="card-panel space-y-3 p-5">
            <h2 className="text-base font-semibold">Manage</h2>
            <label className="block text-sm">
              <span className="text-muted-foreground">Status</span>
              <select
                value={order.status}
                onChange={(e) => {
                  updateOrder(order.id, { status: e.target.value as typeof order.status });
                  toast.success("Status updated");
                }}
                className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 outline-none"
              >
                {["Pending", "Shipped", "Delivered", "Cancelled"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Payment</span>
              <select
                value={order.payment}
                onChange={(e) => {
                  updateOrder(order.id, { payment: e.target.value });
                  toast.success("Payment updated");
                }}
                className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 outline-none"
              >
                {["Credit Card", "PayPal", "Cash on Delivery"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <button
              onClick={() => {
                removeOrder(order.id);
                toast.success("Order deleted");
                navigate({ to: "/orders" });
              }}
              className="w-full rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground"
            >
              Delete Order
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
