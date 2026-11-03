import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CreditCard, Minus, Plus, ShoppingCart, Trash2, Building2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getProduct, money, useStore } from "@/lib/store";
import { PageHeader } from "@/components/AdminShell";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Berry Admin" },
      {
        name: "description",
        content: "Review your cart, add billing details and place the order.",
      },
      { property: "og:title", content: "Checkout — Berry Admin" },
      { property: "og:description", content: "Review your cart and place the order." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { cart, setQty, removeFromCart, cartTotal, clearCart, addOrder } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [payment, setPayment] = useState("Credit Card");
  const shipping = cart.length ? 20 : 0;
  const tax = +(cartTotal * 0.05).toFixed(2);

  const steps = [
    { label: "User Profile", sub: "Product Added", icon: ShoppingCart },
    { label: "Billing Address", sub: "Billing Information", icon: Building2 },
    { label: "Payment", sub: "Add & Update Card", icon: CreditCard },
  ];

  return (
    <>
      <PageHeader title="Checkout" items={[{ label: "E-commerce" }, { label: "Checkout" }]} />

      <div className="card-panel p-5 md:p-7">
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setStep(i)}
              className={`flex items-start gap-3 rounded-xl p-4 text-left ${i === step ? "bg-secondary" : ""}`}
            >
              <s.icon
                className={`h-5 w-5 ${i === step ? "text-foreground" : "text-muted-foreground"}`}
              />
              <span>
                <span
                  className={`block text-sm font-semibold ${i === step ? "" : "text-muted-foreground"}`}
                >
                  {s.label}
                </span>
                <span className="block text-xs text-primary">{s.sub}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-8">
          {cart.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingCart className="mx-auto h-20 w-20 text-muted-foreground" />
              <h2 className="mt-6 text-3xl font-bold">Cart is Empty</h2>
              <p className="mt-2 text-muted-foreground">
                Look like you have no items in your shopping cart.
              </p>
              <Link
                to="/products"
                className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground"
              >
                Browse Products
              </Link>
            </div>
          ) : step === 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-background text-left text-muted-foreground">
                    <tr>
                      <th className="rounded-l-lg p-3">Product</th>
                      <th className="p-3">ID</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Quantity</th>
                      <th className="rounded-r-lg p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((line) => {
                      const p = getProduct(line.productId)!;
                      return (
                        <tr key={line.productId} className="border-b border-border">
                          <td className="p-3">
                            <Link
                              to="/products/$id"
                              params={{ id: p.id }}
                              className="flex items-center gap-3"
                            >
                              <img
                                src={p.image}
                                alt={p.name}
                                width={800}
                                height={800}
                                loading="lazy"
                                className="h-11 w-11 rounded-lg object-cover"
                              />
                              <span className="font-medium">{p.name}</span>
                            </Link>
                          </td>
                          <td className="p-3 text-muted-foreground">{p.sku}</td>
                          <td className="p-3">{money(p.price)}</td>
                          <td className="p-3">
                            <div className="flex w-fit items-center rounded-lg border border-border">
                              <button
                                onClick={() => setQty(p.id, line.qty - 1)}
                                className="px-2 py-1.5"
                                aria-label="Decrease"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-9 text-center">{line.qty}</span>
                              <button
                                onClick={() => setQty(p.id, line.qty + 1)}
                                className="px-2 py-1.5"
                                aria-label="Increase"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => removeFromCart(p.id)}
                              className="text-destructive"
                              aria-label="Remove"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex justify-end rounded-xl bg-background p-5 text-lg font-bold">
                Total : &nbsp;{money(cartTotal + shipping + tax)}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={clearCart}
                  className="rounded-xl px-5 py-2.5 font-semibold text-destructive"
                >
                  Clear Cart
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="rounded-xl bg-primary px-6 py-2.5 font-semibold text-primary-foreground"
                >
                  Next
                </button>
              </div>
            </>
          ) : step === 1 ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep(2);
              }}
              className="grid gap-4 md:grid-cols-2"
            >
              {[
                ["First Name", "Joseph William"],
                ["Email", "john.doe@example.com"],
                ["Address", "123 Main Street"],
                ["City", "New York"],
                ["Pin Code", "100011"],
                ["Country", "US"],
              ].map(([label, ph]) => (
                <label key={label} className="text-sm">
                  <span className="mb-1 block font-medium">
                    {label} <span className="text-destructive">*</span>
                  </span>
                  <input
                    required
                    defaultValue={ph}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-primary"
                  />
                </label>
              ))}
              <div className="md:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="rounded-xl px-5 py-2.5 font-semibold"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-6 py-2.5 font-semibold text-primary-foreground"
                >
                  Continue to Payment
                </button>
              </div>
            </form>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-3">
                {["Credit Card", "PayPal", "Cash on Delivery"].map((m) => (
                  <label
                    key={m}
                    className={`flex items-center gap-3 rounded-xl border p-4 ${payment === m ? "border-primary" : "border-border"}`}
                  >
                    <input
                      type="radio"
                      name="pay"
                      checked={payment === m}
                      onChange={() => setPayment(m)}
                      className="h-4 w-4 accent-[var(--primary)]"
                    />
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{m}</span>
                  </label>
                ))}
              </div>
              <div className="card-panel h-fit p-5">
                <h3 className="mb-4 font-semibold">Order Summary</h3>
                {[
                  ["Subtotal", cartTotal],
                  ["Shipping", shipping],
                  ["Tax", tax],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between py-1.5 text-sm">
                    <span className="text-muted-foreground">{k}</span>
                    <span>{money(v as number)}</span>
                  </div>
                ))}
                <div className="mt-3 flex justify-between border-t border-border pt-3 text-lg font-bold">
                  <span>Total</span>
                  <span>{money(cartTotal + shipping + tax)}</span>
                </div>
                <button
                  onClick={() => {
                    const id = addOrder({
                      userId: "u1",
                      status: "Pending",
                      items: cart.map((l) => ({ productId: l.productId, qty: l.qty })),
                      shipping,
                      tax,
                      payment,
                    });
                    clearCart();
                    toast.success(`Order #${id} placed`);
                    navigate({ to: "/orders/$id", params: { id } });
                  }}
                  className="mt-5 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground"
                >
                  Place Order
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
