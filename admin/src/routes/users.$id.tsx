import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/AdminShell";
import { getUser, money, orderTotal, useStore } from "@/lib/store";

export const Route = createFileRoute("/users/$id")({
  head: () => ({
    meta: [
      { title: "User profile — Berry Admin" },
      {
        name: "description",
        content: "Customer profile with contact information and order history.",
      },
      { property: "og:title", content: "User profile — Berry Admin" },
      {
        property: "og:description",
        content: "Customer profile with contact information and order history.",
      },
    ],
  }),
  component: UserDetail,
});

function UserDetail() {
  const { id } = Route.useParams();
  const { orders } = useStore();
  const user = getUser(id);

  if (!user) {
    return (
      <>
        <PageHeader
          title="User not found"
          items={[{ label: "Users", to: "/users" }, { label: id }]}
        />
        <div className="card-panel p-8 text-center text-muted-foreground">
          This user doesn't exist.{" "}
          <Link to="/users" className="text-primary">
            Back to users
          </Link>
        </div>
      </>
    );
  }

  const userOrders = orders.filter((o) => o.userId === user.id);

  return (
    <>
      <PageHeader
        title={user.name}
        items={[{ label: "Users", to: "/users" }, { label: user.name }]}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card-panel h-fit p-6 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
            {user.name.charAt(0)}
          </div>
          <p className="mt-3 text-lg font-semibold">{user.name}</p>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
          <span
            className={`mt-2 inline-block rounded-md px-2 py-0.5 text-xs ${
              user.status === "Active"
                ? "bg-primary/20 text-primary"
                : "bg-destructive/20 text-destructive"
            }`}
          >
            {user.status}
          </span>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
            <div>
              <p className="font-bold">{user.orders}</p>
              <p className="text-xs text-muted-foreground">Orders</p>
            </div>
            <div>
              <p className="font-bold">{money(user.spent)}</p>
              <p className="text-xs text-muted-foreground">Spent</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <div className="card-panel p-5">
            <h2 className="mb-4 text-base font-semibold">Details</h2>
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              {[
                ["Email", user.email],
                ["Phone", user.phone],
                ["Role", user.role],
                ["City", user.city],
                ["Country", user.country],
                ["Address", user.address],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card-panel p-5">
            <h2 className="mb-4 text-base font-semibold">Order history</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-background text-left text-muted-foreground">
                  <tr>
                    <th className="rounded-l-lg p-3">Order</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="rounded-r-lg p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {userOrders.map((o) => (
                    <tr key={o.id} className="border-b border-border last:border-0">
                      <td className="p-3">
                        <Link to="/orders/$id" params={{ id: o.id }} className="text-primary">
                          #{o.id}
                        </Link>
                      </td>
                      <td className="p-3 text-muted-foreground">{o.date}</td>
                      <td className="p-3">{o.status}</td>
                      <td className="p-3 text-right font-semibold">{money(orderTotal(o))}</td>
                    </tr>
                  ))}
                  {userOrders.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        No orders yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
