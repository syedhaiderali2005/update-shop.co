import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AdminShell";
import { useStore } from "@/lib/store";
import { apiRequest } from "@/lib/api";

export const Route = createFileRoute("/products/")({ component: ProductsPage });
type Product = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  oldPrice?: number;
  categoryName: string;
  stock: number;
  image?: string;
  images?: string[];
  active: boolean;
  sku?: string;
  style?: string;
};
export function Rating({ value, count }: { value: number; count?: number }) {
  return (
    <span className="text-sm text-amber-500">
      {"★".repeat(Math.max(0, Math.min(5, Math.round(value))))}
      {"☆".repeat(5 - Math.max(0, Math.min(5, Math.round(value))))}
      {count !== undefined && <span className="ml-1 text-xs text-muted-foreground">({count})</span>}
    </span>
  );
}
const blank = {
  name: "",
  description: "",
  price: "",
  oldPrice: "",
  categoryName: "T-shirts",
  stock: "0",
  image: "",
  sku: "",
  style: "Casual",
};

function ProductsPage() {
  const { token } = useStore();
  const [items, setItems] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try {
      const d = await apiRequest("/admin/products", { token });
      setItems(d.items || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to load products");
    } finally {
      setLoading(false);
    }
  };
  // The request should rerun when the authenticated token changes.
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  const filtered = useMemo(
    () =>
      items.filter((p) =>
        (p.name + " " + p.categoryName + " " + (p.sku || ""))
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [items, query],
  );
  const startEdit = (p: Product) => {
    setEditing(p._id);
    setForm({
      name: p.name,
      description: p.description || "",
      price: String(p.price),
      oldPrice: p.oldPrice ? String(p.oldPrice) : "",
      categoryName: p.categoryName || "T-shirts",
      stock: String(p.stock),
      image: p.image || p.images?.[0] || "",
      sku: p.sku || "",
      style: p.style || "Casual",
    });
    setOpen(true);
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        ...form,
        price: Number(form.price),
        oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
        stock: Number(form.stock),
        images: form.image ? [form.image] : [],
      };
      if (
        !body.name.trim() ||
        !Number.isFinite(body.price) ||
        body.price < 0 ||
        !/^https?:\/\/.+/i.test(form.image)
      )
        throw new Error("Name, valid price and a working HTTP(S) image URL are required");
      if (editing)
        await apiRequest(`/admin/products/${editing}`, {
          token,
          method: "PATCH",
          body: JSON.stringify(body),
        });
      else
        await apiRequest("/admin/products", { token, method: "POST", body: JSON.stringify(body) });
      toast.success(editing ? "Product updated" : "Product created");
      setOpen(false);
      setEditing(null);
      setForm(blank);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await apiRequest(`/admin/products/${id}`, { token, method: "DELETE" });
      toast.success("Product deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };
  return (
    <div className="space-y-5">
      <PageHeader title="Products" items={[{ label: "Catalogue" }, { label: "Products" }]} />
      <section className="card-panel p-4 md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-secondary px-3 py-2">
            <Search className="h-4 w-4" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Search products…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setForm(blank);
              setOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Add product
          </button>
        </div>
        {loading ? (
          <p className="p-10 text-center text-muted-foreground">Loading products…</p>
        ) : filtered.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">
            No products found. Add your first product.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3">Product</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p._id} className="border-b border-border/70">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image || p.images?.[0]}
                          alt=""
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.sku || p._id.slice(-7)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{p.categoryName}</td>
                    <td className="p-3">${Number(p.price).toFixed(2)}</td>
                    <td className="p-3">{p.stock}</td>
                    <td className="p-3">{p.active ? "Active" : "Hidden"}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button
                          aria-label="Edit product"
                          onClick={() => startEdit(p)}
                          className="rounded-lg bg-secondary p-2"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="Delete product"
                          onClick={() => void remove(p._id)}
                          className="rounded-lg bg-destructive/10 p-2 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-3"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <form
            onSubmit={save}
            className="max-h-[92vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl bg-background p-5 shadow-2xl sm:p-7"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{editing ? "Edit product" : "Add product"}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                Product name
                <input
                  required
                  className="mt-1 w-full rounded-lg border bg-secondary px-3 py-2"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Price
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  className="mt-1 w-full rounded-lg border bg-secondary px-3 py-2"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Old price
                <input
                  min="0"
                  step="0.01"
                  type="number"
                  className="mt-1 w-full rounded-lg border bg-secondary px-3 py-2"
                  value={form.oldPrice}
                  onChange={(e) => setForm({ ...form, oldPrice: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Category
                <input
                  required
                  className="mt-1 w-full rounded-lg border bg-secondary px-3 py-2"
                  value={form.categoryName}
                  onChange={(e) => setForm({ ...form, categoryName: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Stock
                <input
                  required
                  min="0"
                  type="number"
                  className="mt-1 w-full rounded-lg border bg-secondary px-3 py-2"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Image URL
                <input
                  required
                  type="url"
                  className="mt-1 w-full rounded-lg border bg-secondary px-3 py-2"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                />
                {form.image && (
                  <img
                    src={form.image}
                    alt="Image preview"
                    className="mt-2 h-32 w-32 rounded-xl object-cover"
                    onError={(e) => {
                      e.currentTarget.style.opacity = ".25";
                    }}
                  />
                )}
              </label>
              <label className="text-sm">
                SKU
                <input
                  className="mt-1 w-full rounded-lg border bg-secondary px-3 py-2"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Style
                <input
                  className="mt-1 w-full rounded-lg border bg-secondary px-3 py-2"
                  value={form.style}
                  onChange={(e) => setForm({ ...form, style: e.target.value })}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Description
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded-lg border bg-secondary px-3 py-2"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
            </div>
            <button
              disabled={busy}
              className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Saving…" : editing ? "Save changes" : "Create product"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
