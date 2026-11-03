import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — Berry Admin" },
      {
        name: "description",
        content: "Sign in to the Berry admin panel to manage products and orders.",
      },
      { property: "og:title", content: "Sign In — Berry Admin" },
      { property: "og:description", content: "Sign in to the Berry admin panel." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useStore();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          setLoading(true);
          void login(email, password)
            .then(() => navigate({ to: "/" }))
            .catch((e: Error) => setError(e.message))
            .finally(() => setLoading(false));
        }}
        className="card-panel w-full max-w-md p-8"
      >
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">
            B
          </span>
          <span className="text-xl font-bold tracking-wide">BERRY</span>
        </div>
        <h1 className="text-center text-2xl font-bold text-primary">Hi, Welcome Back</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter your credentials to continue
        </p>

        <label className="mt-8 block rounded-xl border border-border bg-background px-4 py-2.5">
          <span className="text-xs text-muted-foreground">Email Address</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            required
          />
        </label>

        <label className="mt-4 flex items-center rounded-xl border border-border bg-background px-4 py-2.5">
          <span className="flex-1">
            <span className="text-xs text-muted-foreground">Password</span>
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
              required
            />
          </span>
          <button type="button" onClick={() => setShow((s) => !s)} aria-label="Toggle password">
            {show ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </label>

        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>

        <div className="mt-6 border-t border-border pt-4 text-center text-sm font-semibold">
          Don&apos;t have an account?
        </div>
      </form>
    </div>
  );
}
