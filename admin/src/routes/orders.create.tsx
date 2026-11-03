import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { PageHeader } from "@/components/AdminShell";
import { money, products, users, useStore, type OrderItem } from "@/lib/store";

export const Route = createFileRoute("/orders/create")({
  head: () => ({
    meta: [
      { title: "Create Order — Berry Admin" },
      { name: "description", content: "Create a new customer order and add products to it." },
      { property: "og:title", content: "Create Order — Berry Admin" },
      {
        property: "og:description",
        content: "Create a new customer order and add products to it.",
      },
    ],
  }),
  component: CreateOrder,
});

function CreateOrder() {
  const { addOrder } = useStore();
  const navigate = useNavigate();
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [payment, setPayment] = useState("Credit Card");
  const [status, setStatus] = useState<"Pending" | "Shipped" | "Delivered" | "Cancelled">(
    "Pending",
  );
  const [items, setItems] = useState<OrderItem[]>([]);

  const setQty = (productId: string, delta: number) =>
    setItems((prev) => {
      const found = prev.find((i) => i.productId === productId);
      if (!found) return delta > 0 ? [...prev, { productId, qty: 1 }] : prev;
      const qty = found.qty + delta;
      return qty <= 0
        ? prev.filter((i) => i.productId !== productId)
        : prev.map((i) => (i.productId === productId ? { ...i, qty } : i));
    });

  const subtotal = items.reduce(
    (s, i) => s + (products.find((p) => p.id === i.productId)?.price ?? 0) * i.qty,
    0,
  );
  const shipping = items.length ? 15 : 0;
  const tax = subtotal * 0.05;

  const submit = () => {
    if (items.length === 0) {
      toast.error("Add at least one product");
      return;
    }
    const id = addOrder({ userId, status, items, shipping, tax: Number(tax.toFixed(2)), payment });
    toast.success(`Order #${id} created`);
    navigate({ to: "/orders/$id", params: { id } });
  };

  return (
    <>
      <PageHeader
        title="Create Order"
        items={[{ label: "Orders", to: "/orders" }, { label: "Create" }]}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card-panel space-y-4 p-5 lg:col-span-2">
          <h2 className="text-base font-semibold">Products</h2>
          {products.map((p) => {
            const qty = items.find((i) => i.productId === p.id)?.qty ?? 0;
            return (
              <div key={p.id} className="flex items-center gap-4 rounded-xl bg-secondary p-3">
                <img
                  src={p.image}
                  alt={p.name}
                  className="h-14 w-14 rounded-lg object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{money(p.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQty(p.id, -1)}
                    className="rounded-lg bg-background p-2"
                    aria-label="Decrease"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                  <button
                    onClick={() => setQty(p.id, 1)}
                    className="rounded-lg bg-background p-2"
                    aria-label="Increase"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="card-panel h-fit space-y-4 p-5">
          <h2 className="text-base font-semibold">Order details</h2>
          <label className="block text-sm">
            <span className="text-muted-foreground">Customer</span>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 outline-none"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Payment</span>
            <select
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 outline-none"
            >
              {["Credit Card", "PayPal", "Cash on Delivery"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 outline-none"
            >
              {["Pending", "Shipped", "Delivered", "Cancelled"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>

          <div className="space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{money(shipping)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{money(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{money(subtotal + shipping + tax)}</span>
            </div>
          </div>

          <button
            onClick={submit}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Create Order
          </button>
        </div>
      </div>
    </>
  );
}
