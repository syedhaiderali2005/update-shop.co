import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Product = {
  id: string;
  sku: string;
  name: string;
  subtitle: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  category: string;
  image: string;
  stock: number;
  colors: string[];
};

export const products: Product[] = [];

export type User = {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  status: "Active" | "Inactive";
  city: string;
  country: string;
  address: string;
  orders: number;
  spent: number;
};

export const users: User[] = [];

export type OrderItem = { productId: string; qty: number };
export type Order = {
  id: string;
  userId: string;
  date: string;
  status: "Delivered" | "Pending" | "Shipped" | "Cancelled";
  items: OrderItem[];
  shipping: number;
  tax: number;
  payment: string;
};

const initialOrders: Order[] = [];

export const getProduct = (id: string) => products.find((p) => p.id === id);
export const getUser = (id: string) => users.find((u) => u.id === id);
export const orderSubtotal = (o: Order) =>
  o.items.reduce((s, i) => s + (getProduct(i.productId)?.price ?? 0) * i.qty, 0);
export const orderTotal = (o: Order) => orderSubtotal(o) + o.shipping + o.tax;
export const money = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type CartLine = { productId: string; qty: number };

type StoreValue = {
  cart: CartLine[];
  cartCount: number;
  cartTotal: number;
  addToCart: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  orders: Order[];
  addOrder: (o: Omit<Order, "id" | "date">) => string;
  updateOrder: (id: string, patch: Partial<Order>) => void;
  removeOrder: (id: string) => void;
  loggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  token: string;
};

const StoreContext = createContext<StoreValue | null>(null);

function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [key]);
  useEffect(() => {
    if (hydrated) localStorage.setItem(key, JSON.stringify(value));
  }, [key, value, hydrated]);
  return [value, setValue] as const;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = usePersisted<CartLine[]>("berry.cart", []);
  const [wishlist, setWishlist] = usePersisted<string[]>("berry.wishlist", []);
  const [orders, setOrders] = usePersisted<Order[]>("berry.orders", initialOrders);
  const [token, setToken] = usePersisted<string>("berry.token", "");
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    if (!token) {
      setLoggedIn(false);
      return;
    }
    fetch(`${import.meta.env["VITE_API_URL"] || "http://localhost:4000/api"}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Session expired");
        const d = await r.json();
        if (d.user?.role !== "admin") throw new Error("Admin access only");
        setLoggedIn(true);
      })
      .catch(() => {
        setToken("");
        setLoggedIn(false);
      });
  }, [token, setToken]);

  const value = useMemo<StoreValue>(() => {
    const cartTotal = cart.reduce((s, l) => s + (getProduct(l.productId)?.price ?? 0) * l.qty, 0);
    return {
      cart,
      cartCount: cart.reduce((s, l) => s + l.qty, 0),
      cartTotal,
      addToCart: (productId, qty = 1) =>
        setCart((c) =>
          c.some((l) => l.productId === productId)
            ? c.map((l) => (l.productId === productId ? { ...l, qty: l.qty + qty } : l))
            : [...c, { productId, qty }],
        ),
      setQty: (productId, qty) =>
        setCart((c) =>
          qty <= 0
            ? c.filter((l) => l.productId !== productId)
            : c.map((l) => (l.productId === productId ? { ...l, qty } : l)),
        ),
      removeFromCart: (productId) => setCart((c) => c.filter((l) => l.productId !== productId)),
      clearCart: () => setCart([]),
      wishlist,
      toggleWishlist: (productId) =>
        setWishlist((w) =>
          w.includes(productId) ? w.filter((x) => x !== productId) : [...w, productId],
        ),
      orders,
      addOrder: (o) => {
        const id = String(Math.floor(700000 + Math.random() * 299999));
        setOrders((prev) => [{ ...o, id, date: new Date().toISOString().slice(0, 10) }, ...prev]);
        return id;
      },
      updateOrder: (id, patch) =>
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o))),
      removeOrder: (id) => setOrders((prev) => prev.filter((o) => o.id !== id)),
      loggedIn,
      token,
      login: async (email, password) => {
        const response = await fetch(
          `${import.meta.env["VITE_API_URL"] || "http://localhost:4000/api"}/auth/login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Login failed");
        if (data.user?.role !== "admin")
          throw new Error("This account is not authorized for the Admin Panel.");
        setToken(data.token);
        setLoggedIn(true);
      },
      logout: () => {
        setToken("");
        setLoggedIn(false);
      },
    };
  }, [
    cart,
    wishlist,
    orders,
    loggedIn,
    token,
    setCart,
    setWishlist,
    setOrders,
    setLoggedIn,
    setToken,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
