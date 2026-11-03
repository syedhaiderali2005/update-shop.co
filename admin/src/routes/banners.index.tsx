import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AdminShell";
import { useStore } from "@/lib/store";
import { apiRequest } from "@/lib/api";
export const Route = createFileRoute("/banners/")({ component: BannersPage });
type Banner = {
  _id: string;
  title: string;
  subtitle?: string;
  image: string;
  link?: string;
  active: boolean;
  sortOrder: number;
};
const empty = { title: "", subtitle: "", image: "", link: "", sortOrder: "0" };
function BannersPage() {
  const { token } = useStore();
  const [items, setItems] = useState<Banner[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = () =>
    apiRequest<{ items: Banner[] }>("/admin/banners", { token })
      .then((d) => setItems(d.items || []))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not load banners"))
      .finally(() => setLoading(false));
  // The request should rerun when the authenticated token changes.
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...form, sortOrder: Number(form.sortOrder), active: true };
      if (!/^https?:\/\/.+/i.test(form.image)) throw new Error("Enter a valid HTTP(S) image URL");
      if (editing)
        await apiRequest(`/admin/banners/${editing}`, {
          token,
          method: "PATCH",
          body: JSON.stringify(body),
        });
      else
        await apiRequest("/admin/banners", { token, method: "POST", body: JSON.stringify(body) });
      toast.success("Banner saved");
      setForm(empty);
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    try {
      await apiRequest(`/admin/banners/${id}`, { token, method: "DELETE" });
      toast.success("Banner deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };
  return (
    <div className="space-y-5">
      <PageHeader title="Banners" items={[{ label: "Store settings" }, { label: "Banners" }]} />
      <form onSubmit={save} className="card-panel grid gap-3 p-5 md:grid-cols-2">
        <input
          required
          placeholder="Banner title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="rounded-lg bg-secondary px-3 py-2 text-sm"
        />
        <input
          placeholder="Subtitle"
          value={form.subtitle}
          onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          className="rounded-lg bg-secondary px-3 py-2 text-sm"
        />
        <input
          required
          type="url"
          placeholder="Image URL"
          value={form.image}
          onChange={(e) => setForm({ ...form, image: e.target.value })}
          className="rounded-lg bg-secondary px-3 py-2 text-sm"
        />
        <input
          placeholder="Destination link"
          value={form.link}
          onChange={(e) => setForm({ ...form, link: e.target.value })}
          className="rounded-lg bg-secondary px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder="Sort order"
          value={form.sortOrder}
          onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
          className="rounded-lg bg-secondary px-3 py-2 text-sm"
        />
        <button
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          {busy ? "Saving…" : editing ? "Update banner" : "Add banner"}
        </button>
      </form>
      <section className="card-panel p-5">
        {loading ? (
          "Loading banners…"
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">No banners yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((b) => (
              <article key={b._id} className="overflow-hidden rounded-xl border border-border">
                <img src={b.image} alt={b.title} className="h-40 w-full object-cover" />
                <div className="p-4">
                  <h3 className="font-semibold">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.subtitle}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        setEditing(b._id);
                        setForm({
                          title: b.title,
                          subtitle: b.subtitle || "",
                          image: b.image,
                          link: b.link || "",
                          sortOrder: String(b.sortOrder || 0),
                        });
                      }}
                      className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm"
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </button>
                    <button
                      onClick={() => void remove(b._id)}
                      className="inline-flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
