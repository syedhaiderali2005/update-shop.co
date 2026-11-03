import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AdminShell";
import { useStore } from "@/lib/store";
import { apiRequest } from "@/lib/api";
export const Route = createFileRoute("/categories/")({ component: CategoriesPage });
type Category = { _id: string; name: string; slug: string; description?: string; active: boolean };
const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
function CategoriesPage() {
  const { token } = useStore();
  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = () =>
    apiRequest("/admin/categories", { token })
      .then((d) => setItems(d.items || []))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not load categories"))
      .finally(() => setLoading(false));
  // The request should rerun when the authenticated token changes.
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const body = { name, slug: slugify(name), description };
      if (editing)
        await apiRequest(`/admin/categories/${editing}`, {
          token,
          method: "PATCH",
          body: JSON.stringify(body),
        });
      else
        await apiRequest("/admin/categories", {
          token,
          method: "POST",
          body: JSON.stringify(body),
        });
      setName("");
      setDescription("");
      setEditing(null);
      toast.success("Category saved");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      await apiRequest(`/admin/categories/${id}`, { token, method: "DELETE" });
      toast.success("Category deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };
  return (
    <div className="space-y-5">
      <PageHeader title="Categories" items={[{ label: "Catalogue" }, { label: "Categories" }]} />
      <form onSubmit={save} className="card-panel grid gap-3 p-5 sm:grid-cols-[1fr_1fr_auto]">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name"
          className="rounded-lg bg-secondary px-3 py-2 text-sm"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="rounded-lg bg-secondary px-3 py-2 text-sm"
        />
        <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" />
          {editing ? "Update" : "Add category"}
        </button>
      </form>
      <section className="card-panel p-5">
        {loading ? (
          <p className="p-6 text-center">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground">No categories created yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {items.map((c) => (
              <div key={c._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.slug}
                    {c.description ? ` · ${c.description}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(c._id);
                      setName(c.name);
                      setDescription(c.description || "");
                    }}
                    className="rounded-lg bg-secondary p-2"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => void remove(c._id)}
                    className="rounded-lg bg-destructive/10 p-2 text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
