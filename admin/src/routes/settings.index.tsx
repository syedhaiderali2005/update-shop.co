import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AdminShell";
import { useStore } from "@/lib/store";
import { apiRequest } from "@/lib/api";
export const Route = createFileRoute("/settings/")({ component: SettingsPage });
type Setting = { _id: string; key: string; value: unknown };
function SettingsPage() {
  const { token } = useStore();
  const [items, setItems] = useState<Setting[]>([]);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = () =>
    apiRequest<{ items: Setting[] }>("/admin/settings", { token })
      .then((d) => setItems(d.items || []))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not load settings"))
      .finally(() => setLoading(false));
  // The request should rerun when the authenticated token changes.
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      let parsed: unknown = value;
      try {
        parsed = JSON.parse(value);
      } catch {
        parsed = value;
      }
      const body = { key, value: parsed };
      if (editing)
        await apiRequest(`/admin/settings/${editing}`, {
          token,
          method: "PATCH",
          body: JSON.stringify(body),
        });
      else
        await apiRequest("/admin/settings", { token, method: "POST", body: JSON.stringify(body) });
      toast.success("Setting saved");
      setKey("");
      setValue("");
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this setting?")) return;
    try {
      await apiRequest(`/admin/settings/${id}`, { token, method: "DELETE" });
      toast.success("Setting deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };
  return (
    <div className="space-y-5">
      <PageHeader title="Store Settings" items={[{ label: "Store settings" }]} />
      <form onSubmit={save} className="card-panel grid gap-3 p-5 md:grid-cols-[1fr_2fr_auto]">
        <input
          required
          disabled={!!editing}
          placeholder="Setting key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="rounded-lg bg-secondary px-3 py-2 text-sm"
        />
        <textarea
          required
          rows={2}
          placeholder='Value (text or JSON, e.g. "PKR")'
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-lg bg-secondary px-3 py-2 text-sm"
        />
        <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" />
          {editing ? "Update" : "Add setting"}
        </button>
      </form>
      <section className="card-panel p-5">
        {loading ? (
          "Loading settings…"
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">No custom settings yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {items.map((s) => (
              <div key={s._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{s.key}</p>
                  <pre className="max-w-2xl whitespace-pre-wrap break-all text-xs text-muted-foreground">
                    {JSON.stringify(s.value)}
                  </pre>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(s._id);
                      setKey(s.key);
                      setValue(
                        typeof s.value === "string" ? s.value : JSON.stringify(s.value, null, 2),
                      );
                    }}
                    className="rounded-lg bg-secondary p-2"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => void remove(s._id)}
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
