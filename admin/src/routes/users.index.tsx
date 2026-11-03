import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Mail, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AdminShell";
import { useStore } from "@/lib/store";
import { apiRequest } from "@/lib/api";
export const Route = createFileRoute("/users/")({ component: UsersPage });
type User = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  active: boolean;
  createdAt: string;
};
function UsersPage() {
  const { token } = useStore();
  const [users, setUsers] = useState<User[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiRequest("/admin/users", { token })
      .then((d) => setUsers(d.items || []))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not load users"))
      .finally(() => setLoading(false));
  }, [token]);

  const remove = async (u: User) => {
    if (!window.confirm(`Delete ${u.name}'s account?`)) return;
    try {
      await apiRequest(`/admin/users/${u._id}`, { token, method: "DELETE" });
      setUsers((current) => current.filter((x) => x._id !== u._id));
      toast.success("User deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };
  const list = useMemo(
    () => users.filter((u) => (u.name + u.email + u.role).toLowerCase().includes(q.toLowerCase())),
    [users, q],
  );
  const toggle = async (u: User) => {
    try {
      const d = await apiRequest(`/admin/users/${u._id}`, {
        token,
        method: "PATCH",
        body: JSON.stringify({ active: !u.active }),
      });
      setUsers((p) => p.map((x) => (x._id === u._id ? { ...x, ...d.user } : x)));
      toast.success("Customer status updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };
  return (
    <div className="space-y-5">
      <PageHeader title="Customers & Users" items={[{ label: "Users" }]} />
      <section className="card-panel p-4 md:p-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search users"
          className="mb-4 w-full rounded-lg bg-secondary px-3 py-2 text-sm sm:max-w-xs"
        />
        {loading ? (
          <p className="p-8 text-center">Loading users…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((u) => (
              <article key={u._id} className="rounded-xl bg-secondary p-5 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  {u.name?.charAt(0) || "U"}
                </div>
                <h3 className="mt-3 font-semibold">{u.name}</h3>
                <p className="text-xs text-muted-foreground">{u.role}</p>
                <p className="mt-2 text-xs">{u.active ? "Active" : "Inactive"}</p>
                <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                  <p className="flex items-center justify-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    {u.email}
                  </p>
                  <p className="flex items-center justify-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    {u.phone || "Not provided"}
                  </p>
                </div>
                <button
                  onClick={() => void toggle(u)}
                  className="mt-4 w-full rounded-lg bg-background px-3 py-2 text-sm font-semibold"
                >
                  {u.active ? "Deactivate account" : "Activate account"}
                </button>
              </article>
            ))}
          </div>
        )}
        {!loading && list.length === 0 && (
          <p className="p-8 text-center text-muted-foreground">No users found.</p>
        )}
      </section>
    </div>
  );
}
