import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { Heart, Minus, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getProduct, products, money, useStore } from "@/lib/store";
import { PageHeader } from "@/components/AdminShell";
import { Rating } from "./products.index";

export const Route = createFileRoute("/products/$id")({
  loader: ({ params }) => {
    const product = getProduct(params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Product not found — Berry Admin" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { product } = loaderData;
    return {
      meta: [
        { title: `${product.name} — Berry Admin` },
        {
          name: "description",
          content: `${product.subtitle} — ${money(product.price)} in the Berry store.`,
        },
        { property: "og:title", content: `${product.name} — Berry Admin` },
        { property: "og:description", content: product.subtitle },
      ],
    };
  },
  component: ProductDetail,
});

function ProductDetail() {
  const { product } = Route.useLoaderData();
  const { addToCart, wishlist, toggleWishlist } = useStore();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [color, setColor] = useState(product.colors[0]);
  const [size, setSize] = useState("None");
  const [tab, setTab] = useState<"description" | "reviews">("description");
  const others = products.filter((p) => p.id !== product.id).slice(0, 3);
  const liked = wishlist.includes(product.id);

  return (
    <>
      <PageHeader
        title="Product Details"
        items={[{ label: "Products", to: "/products" }, { label: product.name }]}
      />

      <div className="card-panel p-5 md:p-7">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <img
              src={product.image}
              alt={product.name}
              width={800}
              height={800}
              className="w-full rounded-xl object-cover"
            />
            <div className="mt-4 flex gap-3">
              {others.map((o) => (
                <Link key={o.id} to="/products/$id" params={{ id: o.id }}>
                  <img
                    src={o.image}
                    alt={o.name}
                    width={800}
                    height={800}
                    loading="lazy"
                    className="h-20 w-20 rounded-lg border border-border object-cover"
                  />
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-start justify-between">
              <span
                className={`rounded-md px-2 py-1 text-xs font-semibold ${product.stock > 0 ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}
              >
                {product.stock > 0 ? "In Stock" : "Out of Stock"}
              </span>
              <button
                onClick={() => toggleWishlist(product.id)}
                className="rounded-lg bg-secondary p-2.5"
                aria-label="Wishlist"
              >
                <Heart
                  className={`h-5 w-5 ${liked ? "fill-[var(--destructive)] text-[var(--destructive)]" : ""}`}
                />
              </button>
            </div>
            <h2 className="mt-3 text-2xl font-bold">
              {product.name}{" "}
              <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-xs">
                New
              </span>
            </h2>
            <p className="mt-2 text-primary">{product.subtitle}</p>
            <div className="mt-3">
              <Rating value={product.rating} count={product.reviews} />
            </div>
            <p className="mt-4 text-3xl font-bold">
              {money(product.price)}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                (Inclusive of all taxes)
              </span>
            </p>

            <div className="mt-6 space-y-5 border-t border-border pt-6">
              <div className="flex items-center gap-8">
                <span className="w-24 text-sm">
                  Colors<span className="text-destructive">*</span>
                </span>
                <div className="flex gap-3">
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      aria-label={`Color ${c}`}
                      className={`h-7 w-7 rounded-full ring-offset-2 ring-offset-[var(--card)] ${color === c ? "ring-2 ring-[var(--primary)]" : ""}`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-8">
                <span className="w-24 text-sm">
                  Size<span className="text-destructive">*</span>
                </span>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="rounded-lg bg-secondary px-4 py-2 text-sm outline-none"
                >
                  {["None", "S", "M", "L", "XL"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-8">
                <span className="w-24 text-sm">Quantity</span>
                <div className="flex items-center rounded-lg border border-border">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="px-3 py-2"
                    aria-label="Decrease"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 border-x border-border py-2 text-center">{qty}</span>
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    className="px-3 py-2"
                    aria-label="Increase"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
              <button
                onClick={() => {
                  addToCart(product.id, qty);
                  toast.success("Added to cart");
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-3 font-semibold"
              >
                <ShoppingCart className="h-5 w-5" /> Add To Cart
              </button>
              <button
                onClick={() => {
                  addToCart(product.id, qty);
                  navigate({ to: "/checkout" });
                }}
                className="rounded-xl bg-primary py-3 font-semibold text-primary-foreground"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <div className="flex gap-6 border-b border-border">
            {(["description", "reviews"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 text-sm font-semibold capitalize ${tab === t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
              >
                {t}
                {t === "reviews" && (
                  <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                    {product.reviews}
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab === "description" ? (
            <div className="grid gap-8 pt-6 md:grid-cols-2">
              <div>
                <h3 className="mb-4 font-bold">General</h3>
                {[
                  ["Type", "Hooded Neck, Paint Clothes"],
                  ["Sleeve", "Full"],
                  ["Fit", "Regular"],
                  ["SKU", product.sku],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-2 py-2 text-sm">
                    <span className="text-muted-foreground">{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="mb-4 font-bold">In The Box</h3>
                {[
                  ["Sales Package", "5 Items"],
                  ["Gift Box", "Yes"],
                  ["Plastic Wrapper", "Yes"],
                  ["Warranty", "1 Year"],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-2 py-2 text-sm">
                    <span className="text-muted-foreground">{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <ul className="space-y-4 pt-6">
              {[
                { n: "Joseph William", t: "Great quality, fast delivery." },
                { n: "Ayesha Khan", t: "Exactly as described, would buy again." },
                { n: "Maria Lopez", t: "Good value for the price." },
              ].map((r) => (
                <li key={r.n} className="rounded-xl bg-secondary p-4">
                  <p className="font-semibold">{r.n}</p>
                  <Rating value={5} />
                  <p className="mt-1 text-sm text-muted-foreground">{r.t}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
