import React, {
  createContext, useCallback, useContext, useEffect,
  useMemo, useRef, useState,
} from "react";
import {
  BRANDS, CAT_HEROES, CAT_ICONS, COLORS, DEFAULT_FILTERS, FAQS,
  HERO_IMG, SORT_OPTS, STYLES, TESTIMONIALS, catBg,
  filterProducts, money, off,
  type Account, type AuthMode, type CartItem, type Filters,
  type Order, type Product, type Variant,
} from "./data";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
async function authRequest(path: string, body: Record<string, string>) {
  const response = await fetch(`${API_BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Authentication failed");
  return payload;
}

// ─── Local storage helpers ────────────────────────────────────────────────────
const ls = {
  get<T>(k: string, fb: T): T {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
  },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

// ─── Context ──────────────────────────────────────────────────────────────────
type Toast = { id: number; msg: string; ok: boolean };
interface Ctx {
  page: string; nav: (p: string) => void;
  activeProduct: Product | null; openProduct: (p: Product) => void;
  quickProduct: Product | null; setQuickProduct: (p: Product | null) => void;
  cart: CartItem[]; addToCart: (p: Product, v: Variant, size: string, qty?: number) => void;
  updateQty: (key: string, qty: number) => void; removeLine: (key: string) => void;
  cartOpen: boolean; setCartOpen: (b: boolean) => void;
  cartCount: number; cartTotal: number;
  wishlist: Set<number>; toggleWish: (id: number) => void;
  account: Account | null; setAccount: (a: Account | null) => void;
  authOpen: boolean; authMode: AuthMode; openAuth: (m?: AuthMode) => void; closeAuth: () => void;
  orders: Order[]; placeOrder: (discount: number, addr: string) => Promise<void>;
  filters: Filters; setFilters: (f: Filters) => void; resetFilters: () => void;
  query: string; setQuery: (s: string) => void;
  openShop: (cat?: string, style?: string) => void;
  toasts: Toast[]; toast: (msg: string, ok?: boolean) => void;
  recent: number[];
  catalog: Product[]; catalogLoading: boolean; catalogError: string; refreshCatalog: () => Promise<void>;
  banners: Array<{_id:string;title:string;subtitle?:string;image:string;link?:string}>;
}
const C = createContext<Ctx>(null!);
const useApp = () => useContext(C);

function AppProvider({ children }: { children: React.ReactNode }) {
  const [page, _nav]              = useState("home");
  const [activeProduct, setAP]   = useState<Product | null>(null);
  const [quickProduct, setQP]    = useState<Product | null>(null);
  const [cart, setCart]           = useState<CartItem[]>(() => ls.get("sc_cart",  []));
  const [cartOpen, setCartOpen]   = useState(false);
  const [wishArr, setWishArr]     = useState<number[]>(() => ls.get("sc_wish",  []));
  const [account, setAccRaw]      = useState<Account | null>(() => ls.get("sc_acct", null));
  const [authOpen, setAuthOpen]   = useState(false);
  const [authMode, setAuthMode]   = useState<AuthMode>("login");
  const [orders, setOrders]       = useState<Order[]>(() => ls.get("sc_orders", []));
  const [filters, setFiltersRaw]  = useState<Filters>(DEFAULT_FILTERS);
  const [query, setQuery]         = useState("");
  const [toasts, setToasts]       = useState<Toast[]>([]);
  const [recent, setRecent]       = useState<number[]>(() => ls.get("sc_recent", []));
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [banners, setBanners] = useState<Array<{_id:string;title:string;subtitle?:string;image:string;link?:string}>>([]);
  const refreshCatalog = useCallback(async () => {
    setCatalogLoading(true); setCatalogError("");
    try {
      const response = await fetch(`${API_BASE}/products?limit=100&page=1`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to load products");
      const pages = Math.min(Number(payload.pages || 1), 50);
      const rest = await Promise.all(Array.from({length: Math.max(0, pages - 1)}, (_, i) => fetch(`${API_BASE}/products?limit=100&page=${i + 2}`).then(async r => { const d=await r.json(); if(!r.ok) throw new Error(d.message || "Unable to load products"); return d.items || []; })));
      const source = [...(payload.items || []), ...rest.flat()];
      const mapped: Product[] = source.map((item: any) => {
        const images: string[] = Array.isArray(item.images) && item.images.length ? item.images : item.image ? [item.image] : [];
        const variants = Array.isArray(item.variants) && item.variants.length
          ? item.variants.map((v: any, i: number) => ({ name: v.name || `Variant ${i+1}`, hex: v.hex || "#777777", image: v.image || images[i] || images[0] || "" }))
          : images.map((image, i) => ({ name: `Style ${i+1}`, hex: ["#333333", "#888888", "#c9b89a"][i % 3], image }));
        const numericId = Number.parseInt(String(item._id).slice(-7), 16) || 1;
        return { id: numericId, dbId: String(item._id), stock: Number(item.stock || 0), name: item.name, price: Number(item.price), oldPrice: item.oldPrice ? Number(item.oldPrice) : undefined,
          rating: Number(item.rating || 0), reviews: Number(item.reviews || 0), category: item.categoryName || "Other", style: item.style || "Casual",
          badge: item.badge || undefined, sizes: item.sizes?.length ? item.sizes : ["S","M","L","XL"], variants: variants.length ? variants : [{name:"Default",hex:"#777777",image:""}], desc: item.description || "" };
      });
      setCatalog(mapped);
    } catch (e) { setCatalogError(e instanceof Error ? e.message : "Unable to load products"); }
    finally { setCatalogLoading(false); }
  }, []);
  useEffect(() => { void refreshCatalog(); }, [refreshCatalog]);
  useEffect(() => {
    fetch(`${API_BASE}/banners`).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message||"Unable to load banners");setBanners(d.items||[])}).catch(()=>setBanners([]));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("sc_token");
    if (!token) { setAccRaw(null); return; }
    fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => { if (!r.ok) throw new Error("Session expired"); const d = await r.json(); if (d.user?.role !== "customer") throw new Error("Customer account required"); setAccRaw({ name: d.user.name, email: d.user.email });
        fetch(`${API_BASE}/orders/mine`, { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.ok?r.json():Promise.reject()).then(data=>setOrders((data.items||[]).map((o:any)=>({orderId:o.orderNumber||String(o._id),date:new Date(o.createdAt).toLocaleDateString(),items:(o.items||[]).map((i:any)=>({key:String(i.product),id:catalog.find(p=>p.dbId===String(i.product))?.id||0,name:i.name,img:i.image,price:i.price,size:i.size||"",color:i.variant||"",qty:i.quantity})),subtotal:o.subtotal,discount:0,delivery:o.shipping,total:o.total,status:o.status})))) .catch(()=>{});
      })
      .catch(() => { localStorage.removeItem("sc_token"); setAccRaw(null); });
  }, []);

  useEffect(() => { ls.set("sc_cart",    cart);   }, [cart]);
  useEffect(() => { ls.set("sc_wish",    wishArr); }, [wishArr]);
  useEffect(() => { ls.set("sc_orders",  orders);  }, [orders]);
  useEffect(() => { ls.set("sc_recent",  recent);  }, [recent]);
  useEffect(() => { if (account) ls.set("sc_acct", account); else localStorage.removeItem("sc_acct"); }, [account]);

  const nav = useCallback((p: string) => {
    _nav(p); setCartOpen(false); setQP(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const wishlist   = useMemo(() => new Set(wishArr), [wishArr]);
  const cartCount  = useMemo(() => cart.reduce((s,i) => s+i.qty, 0), [cart]);
  const cartTotal  = useMemo(() => cart.reduce((s,i) => s+i.price*i.qty, 0), [cart]);

  const toast = useCallback((msg: string, ok = true) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, {id,msg,ok}]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200);
  }, []);

  const addToCart = useCallback((p: Product, v: Variant, size: string, qty = 1) => {
    if (p.stock !== undefined && p.stock < 1) { toast("This product is out of stock.", false); return; }
    const key = `${p.id}-${v.name}-${size}`;
    setCart(prev => {
      const ex = prev.find(i => i.key === key);
      if (ex) return prev.map(i => i.key===key ? {...i, qty:Math.min(p.stock ?? ex.qty+qty, i.qty+qty)} : i);
      return [...prev, {key, id:p.id, dbId:p.dbId, name:p.name, img:v.image, price:p.price, size, color:v.name, qty:Math.min(qty, p.stock ?? qty)}];
    });
    setCartOpen(true);
    toast(`${p.name} added to your bag 🛍`);
  }, [toast]);

  const updateQty = useCallback((key: string, qty: number) => {
    setCart(prev => prev.map(item => {
      if (item.key !== key) return item;
      const stock = catalog.find(product => product.id === item.id)?.stock;
      return { ...item, qty: Math.max(1, Math.min(qty, stock ?? qty)) };
    }));
  }, [catalog]);
  const removeLine  = useCallback((key: string) => {
    setCart(p => p.filter(i => i.key!==key));
    toast("Removed from bag", false);
  }, [toast]);

  const toggleWish  = useCallback((id: number) => {
    setWishArr(p => {
      const has = p.includes(id);
      toast(has ? "Removed from wishlist" : "Saved to wishlist ❤️", !has);
      return has ? p.filter(x=>x!==id) : [...p,id];
    });
  }, [toast]);

  const openProduct = useCallback((p: Product) => {
    setAP(p); nav("product");
    setRecent(prev => [p.id, ...prev.filter(x=>x!==p.id)].slice(0,8));
  }, [nav]);

  const openAuth  = useCallback((m: AuthMode = "login") => { setAuthMode(m); setAuthOpen(true); }, []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);
  const setAccount = useCallback((a: Account | null) => {
    setAccRaw(a);
    if (!a) { localStorage.removeItem("sc_token"); localStorage.removeItem("sc_acct"); }
    if (a) toast(`Welcome back, ${a.name}! 👋`);
  }, [toast]);

  const openShop = useCallback((cat = "All", style = "All") => {
    setFiltersRaw({...DEFAULT_FILTERS, category:cat, style});
    setQuery(""); nav("shop");
  }, [nav]);

  const setFilters   = useCallback((f: Filters) => setFiltersRaw(f), []);
  const resetFilters = useCallback(() => { setFiltersRaw(DEFAULT_FILTERS); setQuery(""); }, []);

  const placeOrder = useCallback(async (discount: number, addr: string) => {
    void discount;
    if (!account) { openAuth("login"); return; }
    const token = localStorage.getItem("sc_token");
    if (!token) { openAuth("login"); return; }
    try {
      const lines = cart.map(line => {
        const dbId = line.dbId || catalog.find(p => p.id === line.id)?.dbId;
        if (!dbId) throw new Error(`Product ${line.name} is no longer available`);
        return { productId: dbId, quantity: line.qty, size: line.size, variant: line.color };
      });
      const response = await fetch(`${API_BASE}/orders`, { method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`}, body:JSON.stringify({items:lines,address:addr,paymentMethod:"Cash on Delivery"}) });
      const payload = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(payload.message || "Order could not be placed");
      const o = payload.order;
      const order: Order = { orderId:o.orderNumber || String(o._id), date:new Date(o.createdAt || Date.now()).toLocaleDateString(), items:cart, subtotal:o.subtotal, discount:0, delivery:o.shipping, total:o.total, status:o.status || "Placed" };
      setOrders(prev => [order, ...prev]); setCart([]); nav("orders");
      await refreshCatalog(); toast("Order placed successfully. Thank you for shopping with us.");
    } catch (error) { toast(error instanceof Error ? error.message : "Order failed", false); }
  }, [account, cart, catalog, nav, openAuth, refreshCatalog, toast]);

  return (
    <C.Provider value={{
      page, nav, activeProduct, openProduct, quickProduct, setQuickProduct:setQP,
      cart, addToCart, updateQty, removeLine, cartOpen, setCartOpen, cartCount, cartTotal,
      wishlist, toggleWish, account, setAccount, authOpen, authMode, openAuth, closeAuth,
      orders, placeOrder, filters, setFilters, resetFilters, query, setQuery,
      openShop, toasts, toast, recent, catalog, catalogLoading, catalogError, refreshCatalog, banners,
    }}>
      {children}
    </C.Provider>
  );
}

// ─── Image component ──────────────────────────────────────────────────────────
function Img({ src, alt, cls="", eager=false }:
  { src:string; alt:string; cls?:string; eager?:boolean }) {
  const [ok,  setOk]  = useState(false);
  const [err, setErr] = useState(false);
  useEffect(() => { setOk(false); setErr(false); }, [src]);
  return (
    <div className={`img-wrap ${cls}`} aria-label={alt}>
      {!ok && !err && <div className="img-skel" />}
      {err
        ? <div className="img-err"><span>SHOP.CO</span></div>
        : <img src={src} alt={alt} loading={eager?"eager":"lazy"} decoding="async"
            onLoad={() => setOk(true)} onError={() => setErr(true)}
            style={{ opacity: ok ? 1 : 0, transition:"opacity .35s ease" }} />}
    </div>
  );
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function Stars({ v, sm=false }: { v:number; sm?:boolean }) {
  return (
    <div className="stars" data-sm={sm||undefined}>
      {[1,2,3,4,5].map(i =>
        <span key={i} className={i<=Math.round(v) ? "star on" : "star"}>★</span>
      )}
      <span className="stars-n">{v}/5</span>
    </div>
  );
}

// ─── Qty Stepper ──────────────────────────────────────────────────────────────
function QtyCtrl({ qty, onChange, size="md" }: { qty:number; onChange:(n:number)=>void; size?:"sm"|"md" }) {
  return (
    <div className={`qty qty-${size}`}>
      <button onClick={() => onChange(qty-1)} disabled={qty<=1} aria-label="decrease">−</button>
      <span>{qty}</span>
      <button onClick={() => onChange(qty+1)} aria-label="increase">+</button>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ p, i=0, compact=false }: { p:Product; i?:number; compact?:boolean }) {
  const { openProduct, addToCart, toggleWish, wishlist, setQuickProduct } = useApp();
  const [vi, setVi] = useState(0);
  const v = p.variants[vi];
  const d = off(p);
  const wished = wishlist.has(p.id);

  return (
    <article className={`pc ${compact?"pc-compact":""}`} style={{"--delay":`${Math.min(i*.07,.4)}s`} as React.CSSProperties}>
      {/* Image area */}
      <div className="pc-media" style={{ background: catBg[p.category] ?? "#f0eeed" }}
        onClick={() => openProduct(p)}>
        <Img src={v.image} alt={p.name} cls="pc-img" eager={i<4} />

        {/* Overlays */}
        {p.badge && <span className="pc-badge">{p.badge}</span>}
        {d>0 && <span className="pc-disc">-{d}%</span>}

        <button className={`pc-heart ${wished?"active":""}`}
          onClick={e => { e.stopPropagation(); toggleWish(p.id); }}
          aria-label="Wishlist">
          {wished ? "❤️" : "🤍"}
        </button>

        {/* Hover actions */}
        <div className="pc-actions">
          <button className="pc-atb-hover" disabled={p.stock===0} onClick={e => { e.stopPropagation(); addToCart(p, v, p.sizes[0]); }}>
            {p.stock===0 ? "Out of Stock" : "Add to Bag"}
          </button>
          <button className="pc-qv" onClick={e => { e.stopPropagation(); setQuickProduct(p); }}
            aria-label="Quick view">👁</button>
        </div>
      </div>

      {/* Colour swatches */}
      <div className="pc-swatches">
        {p.variants.map((vv,idx) => (
          <button key={vv.name} className={`sw-dot ${vi===idx?"act":""}`}
            style={{ background: vv.hex }} onClick={() => setVi(idx)} aria-label={vv.name} />
        ))}
      </div>

      {/* Info */}
      <button className="pc-name" onClick={() => openProduct(p)}>{p.name}</button>
      <Stars v={p.rating} sm />
      <div className="pc-price-row">
        <span className="pc-price">{money(p.price)}</span>
        {p.oldPrice && <s className="pc-old">{money(p.oldPrice)}</s>}
        {d>0 && <span className="badge-sale">-{d}%</span>}
      </div>

      {/* Mobile CTA */}
      <button className="pc-atb-mob" disabled={p.stock===0} onClick={() => addToCart(p, v, p.sizes[0])}>
        {p.stock===0 ? "Out of Stock" : "Add to Bag"}
      </button>
    </article>
  );
}

function Grid({ products, cols=4 }: { products:Product[]; cols?:number }) {
  if (!products.length)
    return (
      <div className="empty">
        <div className="empty-ico">🛍️</div>
        <h3>No products found</h3>
        <p>Try different filters or search term.</p>
      </div>
    );
  return (
    <div className="grid" style={{"--cols":cols} as React.CSSProperties} key={products.map(p=>p.id).join()}>
      {products.map((p,i) => <ProductCard key={p.id} p={p} i={i} />)}
    </div>
  );
}



// ─── Header ───────────────────────────────────────────────────────────────────
function Header() {
  const { page, nav, cartCount, wishlist, openShop, openAuth, account,
    setAccount, setCartOpen, query, setQuery, openProduct, catalog } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [srchOpen, setSrchOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const sugg = useMemo(() => query.trim().length < 2 ? [] : catalog.filter(p => `${p.name} ${p.category}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0,6), [query, catalog]);
  const categoryOptions = useMemo(() => ["All", ...Array.from(new Set(catalog.map(p=>p.category)))], [catalog]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn, { passive:true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  useEffect(() => {
    document.body.style.overflow = (menuOpen || srchOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen, srchOpen]);

  const go = (p: string) => { nav(p); setMenuOpen(false); };

  return (
    <>
      {/* Announcement */}
      <div className="topbar">
        <span>Discover new arrivals and everyday essentials at SHOP.CO</span>
        <button onClick={() => openAuth("signup")}>Sign Up →</button>
      </div>

      {/* Main header */}
      <header className={`hdr ${scrolled?"condensed":""}`}>
        <div className="hdr-wrap">
          <button className="burger" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <span/><span/><span/>
          </button>

          <button className="logo" onClick={() => go("home")}>SHOP.CO</button>

          <nav className="hdr-nav">
            {["T-shirts","Shirts","Jeans","Hoodies","Jackets","Shoes"].map(c => (
              <button key={c} className="nav-link" onClick={() => openShop(c)}>{c}</button>
            ))}
            <button className="nav-link nav-sale" onClick={() => openShop("All","Party")}>Sale 🔥</button>
          </nav>

          {/* Desktop search */}
          <div className="hdr-srch-wrap">
            <div className="hdr-srch">
              <span className="srch-ic">🔍</span>
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search products…" aria-label="Search"
                onKeyDown={e => { if (e.key==="Enter") openShop(); }} />
              {query && <button className="srch-clr" onClick={() => setQuery("")} aria-label="Clear">✕</button>}
            </div>
            {sugg.length > 0 && (
              <ul className="srch-drop">
                {sugg.map(p => (
                  <li key={p.id}>
                    <button onClick={() => { openProduct(p); setQuery(""); }}>
                      <img src={p.variants[0].image} alt={p.name} width={38} height={48} loading="lazy" />
                      <div><strong>{p.name}</strong><em>{p.category}</em></div>
                      <b>{money(p.price)}</b>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="hdr-icons">
            <button className="icon-btn mob-srch" onClick={() => { setSrchOpen(true); }} aria-label="Search">🔍</button>
            <button className={`icon-btn ${page==="wishlist"?"active":""}`}
              onClick={() => go("wishlist")} aria-label="Wishlist">
              🤍{wishlist.size > 0 && <sup>{wishlist.size}</sup>}
            </button>
            <button className="icon-btn cart-ic" onClick={() => setCartOpen(true)} aria-label="Cart">
              🛍{cartCount > 0 && <sup>{cartCount}</sup>}
            </button>
            <div className="acct-wrap">
              <button className="icon-btn" onClick={() => account ? setAcctOpen(s=>!s) : openAuth("login")} aria-label="Account">
                👤
              </button>
              {acctOpen && account && (
                <div className="acct-drop" onMouseLeave={() => setAcctOpen(false)}>
                  <p>Signed in as<strong>{account.name}</strong></p>
                  <button onClick={() => { go("orders"); setAcctOpen(false); }}>📦 My Orders</button>
                  <button onClick={() => { go("wishlist"); setAcctOpen(false); }}>❤️ Wishlist ({wishlist.size})</button>
                  <button className="sign-out" onClick={() => { setAccount(null); setAcctOpen(false); }}>🚪 Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="overlay" onClick={() => setMenuOpen(false)}>
          <aside className="drawer" onClick={e => e.stopPropagation()}>
            <div className="drw-top">
              <span className="logo">SHOP.CO</span>
              <button onClick={() => setMenuOpen(false)} className="drw-close" aria-label="Close">✕</button>
            </div>
            <div className="drw-srch">
              <span>🔍</span>
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search…" onKeyDown={e => { if(e.key==="Enter") { openShop(); setMenuOpen(false); } }} />
            </div>
            <p className="drw-lbl">Browse Categories</p>
            {categoryOptions.map((c,i) => (
              <button key={c} className="drw-link" style={{"--di":`${i*.04}s`} as React.CSSProperties}
                onClick={() => { openShop(c==="All"?undefined:c); setMenuOpen(false); }}>
                <span>{CAT_ICONS[c]} {c==="All"?"All Products":c}</span><span>›</span>
              </button>
            ))}
            <div className="drw-foot">
              {account
                ? <>
                    <button className="btn btn-ghost" onClick={() => { go("orders"); setMenuOpen(false); }}>📦 Orders</button>
                    <button className="btn btn-ghost" onClick={() => { setAccount(null); setMenuOpen(false); }}>Sign Out</button>
                  </>
                : <>
                    <button className="btn btn-dark" onClick={() => { openAuth("login"); setMenuOpen(false); }}>Login</button>
                    <button className="btn btn-ghost" onClick={() => { openAuth("signup"); setMenuOpen(false); }}>Sign Up</button>
                  </>}
            </div>
          </aside>
        </div>
      )}

      {/* Mobile search */}
      {srchOpen && (
        <div className="overlay" onClick={() => setSrchOpen(false)}>
          <div className="mob-srch-panel" onClick={e => e.stopPropagation()}>
            <div className="mob-srch-inner">
              <span>🔍</span>
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search products…"
                onKeyDown={e => { if(e.key==="Enter") { openShop(); setSrchOpen(false); } }} />
              <button onClick={() => setSrchOpen(false)} aria-label="Close">✕</button>
            </div>
            {sugg.length > 0 && (
              <ul className="mob-sugg">
                {sugg.map(p => (
                  <li key={p.id}>
                    <button onClick={() => { openProduct(p); setSrchOpen(false); setQuery(""); }}>
                      <img src={p.variants[0].image} alt={p.name} width={40} height={50} loading="lazy"/>
                      <span>{p.name}</span>
                      <b>{money(p.price)}</b>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Cart Drawer ──────────────────────────────────────────────────────────────
function CartDrawer() {
  const { cartOpen, setCartOpen, cart, cartTotal, updateQty, removeLine, nav, account, openAuth } = useApp();
  const delivery = cartTotal > 200 ? 0 : 15;
  useEffect(() => { document.body.style.overflow = cartOpen?"hidden":""; return () => { document.body.style.overflow=""; }; }, [cartOpen]);
  if (!cartOpen) return null;
  return (
    <div className="overlay" onClick={() => setCartOpen(false)}>
      <aside className="cart-drw" onClick={e => e.stopPropagation()}>
        <div className="cd-hd">
          <h2>Your Bag <span>{cart.reduce((s,i)=>s+i.qty,0)} item{cart.reduce((s,i)=>s+i.qty,0)!==1?"s":""}</span></h2>
          <button onClick={() => setCartOpen(false)} aria-label="Close">✕</button>
        </div>

        {cart.length === 0
          ? <div className="cd-empty"><div className="empty-ico">🛍️</div><p>Your bag is empty</p>
              <button className="btn btn-dark" onClick={() => { setCartOpen(false); nav("shop"); }}>Shop Now →</button>
            </div>
          : <>
            <div className="cd-list">
              {cart.map(item => (
                <div key={item.key} className="cd-item">
                  <img src={item.img} alt={item.name} width={72} height={90} loading="lazy" />
                  <div className="cdi-body">
                    <p className="cdi-nm">{item.name}</p>
                    <p className="cdi-meta">{item.color} · {item.size}</p>
                    <div className="cdi-row">
                      <QtyCtrl qty={item.qty} onChange={n => updateQty(item.key,n)} size="sm" />
                      <strong>{money(item.price*item.qty)}</strong>
                    </div>
                  </div>
                  <button className="cdi-del" onClick={() => removeLine(item.key)} aria-label="Remove">🗑</button>
                </div>
              ))}
            </div>
            <div className="cd-ft">
              <div className="cd-sums">
                <div><span>Subtotal</span><span>{money(cartTotal)}</span></div>
                <div><span>Delivery</span><span>{delivery===0?"🎉 Free":money(delivery)}</span></div>
                <div className="cd-tot"><strong>Total</strong><strong>{money(cartTotal+delivery)}</strong></div>
              </div>
              <button className="btn btn-dark btn-full" onClick={() => { setCartOpen(false); account ? nav("cart") : openAuth("login"); }}>
                {account ? "Proceed to Checkout →" : "Login to Checkout →"}
              </button>
              <button className="btn btn-ghost btn-full" onClick={() => { setCartOpen(false); nav("shop"); }}>
                Continue Shopping
              </button>
            </div>
          </>}
      </aside>
    </div>
  );
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────
function AuthModal() {
  const { authOpen, authMode, closeAuth, openAuth, setAccount } = useApp();
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [err, setErr]     = useState("");
  const [loading, setLd]  = useState(false);

  useEffect(() => { setErr(""); setName(""); setEmail(""); setPass(""); setLd(false); }, [authMode, authOpen]);
  if (!authOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (authMode==="signup" && name.trim().length<2) return setErr("Please enter your full name.");
    if (!email.includes("@")) return setErr("Please enter a valid email address.");
    if (pass.length<8) return setErr("Password must be at least 8 characters.");
    setLd(true);
    try {
      const data = await authRequest(authMode === "login" ? "/auth/login" : "/auth/register", authMode === "login" ? { email, password: pass } : { name: name.trim(), email, password: pass });
      if (data.user?.role !== "customer") throw new Error("Please use a customer account on the SHOP.CO website.");
      localStorage.setItem("sc_token", data.token);
      setAccount({ name: data.user.name, email: data.user.email });
      closeAuth();
    } catch (error) { setErr(error instanceof Error ? error.message : "Unable to authenticate. Please try again."); }
    finally { setLd(false); }
  };

  return (
    <div className="overlay overlay-c" onClick={closeAuth}>
      <div className="modal auth-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-x" onClick={closeAuth} aria-label="Close">✕</button>
        <div className="logo sm">SHOP.CO</div>
        <h2 className="modal-title">{authMode==="login" ? "Welcome Back 👋" : "Create Account"}</h2>
        <p className="modal-sub">{authMode==="login"
          ? "Sign in to access your bag, wishlist and orders."
          : "Join SHOP.CO for faster checkout and exclusive access."}</p>

        <form onSubmit={submit} className="auth-form">
          {authMode==="signup" && (
            <label className="field">
              <span>👤</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" type="text" />
            </label>
          )}
          <label className="field">
            <span>✉️</span><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" type="email" />
          </label>
          <label className="field">
            <span>🔒</span><input value={pass} onChange={e=>setPass(e.target.value)} placeholder="Password" type="password" />
          </label>
          {err && <p className="auth-err">{err}</p>}
          <button type="submit" className={`btn btn-dark btn-full btn-lg ${loading?"loading":""}`} disabled={loading}>
            {loading ? <span className="spinner" /> : authMode==="login" ? "Login" : "Create Account"}
          </button>
        </form>
        <p className="auth-swap">
          {authMode==="login" ? "New to SHOP.CO? " : "Already have an account? "}
          <button onClick={() => openAuth(authMode==="login"?"signup":"login")}>
            {authMode==="login" ? "Sign up free" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Quick View ───────────────────────────────────────────────────────────────
function QuickView() {
  const { quickProduct, setQuickProduct, addToCart, openProduct, wishlist, toggleWish } = useApp();
  const [vi, setVi]     = useState(0);
  const [size, setSize] = useState("");
  const p = quickProduct;
  useEffect(() => { if(p) { setVi(0); setSize(p.sizes[0]); } }, [p]);
  if (!p) return null;
  const v = p.variants[vi]; const d = off(p);
  return (
    <div className="overlay overlay-c" onClick={() => setQuickProduct(null)}>
      <div className="modal qv-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-x" onClick={() => setQuickProduct(null)} aria-label="Close">✕</button>
        <div className="qv-grid">
          <div className="qv-img" style={{ background: catBg[p.category]??"#f0eeed" }}>
            <Img src={v.image} alt={p.name} cls="fill" eager />
            {d>0 && <span className="qv-d">-{d}%</span>}
          </div>
          <div className="qv-info">
            <p className="qv-cat">{p.category} · {p.style}</p>
            <h2>{p.name}</h2>
            <Stars v={p.rating} />
            <div className="price-row lg">
              <strong>{money(p.price)}</strong>
              {p.oldPrice && <s>{money(p.oldPrice)}</s>}
              {d>0 && <span className="badge-sale">-{d}%</span>}
            </div>
            <p className="qv-desc">{p.desc}</p>

            <div className="sel-block">
              <p className="sel-lbl">Colour: <b>{v.name}</b></p>
              <div className="sw-row">
                {p.variants.map((vv,idx) => (
                  <button key={vv.name} className={`sw ${vi===idx?"act":""}`}
                    style={{background:vv.hex}} onClick={() => setVi(idx)} aria-label={vv.name}>
                    {vi===idx && <span className="sw-chk">✓</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="sel-block">
              <p className="sel-lbl">Size</p>
              <div className="sz-row">
                {p.sizes.map(s => (
                  <button key={s} className={`sz-btn ${size===s?"act":""}`} onClick={() => setSize(s)}>{s}</button>
                ))}
              </div>
            </div>
            <div className="qv-btns">
              <button className="btn btn-dark" style={{flex:1}} onClick={() => { addToCart(p,v,size); setQuickProduct(null); }}>
                Add to Bag — {money(p.price)}
              </button>
              <button className={`heart-btn ${wishlist.has(p.id)?"red":""}`} onClick={() => toggleWish(p.id)} aria-label="Wishlist">
                {wishlist.has(p.id) ? "❤️" : "🤍"}
              </button>
            </div>
            <button className="btn btn-ghost btn-full" onClick={() => { openProduct(p); setQuickProduct(null); }}>
              View Full Details →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Newsletter ───────────────────────────────────────────────────────────────
function Newsletter() {
  const { toast } = useApp();
  const [email, setEmail] = useState("");
  const [done, setDone]   = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setDone(true); toast("You're subscribed! 🎉 Welcome to the club.");
  };
  return (
    <section className="nl">
      <div className="nl-inner">
        <div className="nl-txt">
          <p className="nl-eye">✨ EXCLUSIVE MEMBER ACCESS</p>
          <h2 className="nl-h">Stay Up To Date<br/>With Our Latest Offers</h2>
        </div>
        <form onSubmit={submit} className="nl-form">
          <div className="nl-field">
            <span>✉️</span>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="Enter your email address" />
          </div>
          <button type="submit" className="btn btn-white nl-btn">
            {done ? "✓ You're subscribed!" : "Subscribe to Newsletter"}
          </button>
        </form>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const { openShop, nav } = useApp();
  return (
    <footer className="footer" id="footer">
      <div className="ft-inner">
        <div className="ft-brand">
          <button className="logo" onClick={() => nav("home")}>SHOP.CO</button>
          <p>We have clothes that suit your style and which you are proud to wear. From women to men.</p>
          <div className="ft-social">
            {["𝕏","f","in","▶","📷"].map(s => <button key={s} className="so-btn" aria-label={s}>{s}</button>)}
          </div>
        </div>
        {[
          { h:"Company",  ls:["About","Features","Works","Career"] },
          { h:"Help",     ls:["Customer Support","Delivery Details","Terms & Conditions","Privacy Policy"] },
          { h:"FAQ",      ls:["Account","Manage Deliveries","Orders","Payments"] },
          { h:"Resources",ls:["Free eBooks","Dev Tutorial","How to Blog","Youtube"] },
        ].map(col => (
          <div key={col.h} className="ft-col">
            <h4>{col.h}</h4>
            {col.ls.map(l => <button key={l} onClick={() => openShop()}>{l}</button>)}
          </div>
        ))}
      </div>
      <div className="ft-bot">
        <p>SHOP.CO © 2000-{new Date().getFullYear()}. All Rights Reserved</p>
        <div className="pay-btns">
          {["VISA","MC","PayPal","GPay","Apple Pay"].map(b => <span key={b}>{b}</span>)}
        </div>
      </div>
    </footer>
  );
}

// ─── Toast stack ──────────────────────────────────────────────────────────────
function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.ok?"t-ok":"t-info"}`}>{t.msg}</div>
      ))}
    </div>
  );
}

function BackTop() {
  const [show, setShow] = useState(false);
  useEffect(() => { const fn = () => setShow(window.scrollY>700); window.addEventListener("scroll",fn,{passive:true}); return ()=>window.removeEventListener("scroll",fn); }, []);
  if (!show) return null;
  return <button className="btt" onClick={() => window.scrollTo({top:0,behavior:"smooth"})} aria-label="Back to top">↑</button>;
}

function TabBar() {
  const { page, nav, cartCount, wishlist, setCartOpen } = useApp();
  return (
    <nav className="tab-bar">
      {([["home","🏠","Home"],["shop","🔍","Shop"],["wishlist","🤍","Saved"],["cart","🛍","Bag"]] as const).map(([key, ic, lbl]) => (
        <button key={key} className={`tb-btn ${page===key?"act":""}`}
          onClick={() => key==="cart" ? setCartOpen(true) : nav(key)}>
          <span className="tb-ic">
            {ic}
            {key==="wishlist" && wishlist.size > 0 && <sup>{wishlist.size}</sup>}
            {key==="cart"     && cartCount > 0      && <sup>{cartCount}</sup>}
          </span>
          <span className="tb-lbl">{lbl}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage() {
  const { openShop, catalog, catalogLoading, catalogError, banners } = useApp();
  const categoryOptions = useMemo(() => ["All", ...Array.from(new Set(catalog.map(p=>p.category)))], [catalog]);
  const newArrivals = useMemo(() => [...catalog].sort((a,b) => b.id-a.id).slice(0,4), [catalog]);
  const topSelling  = useMemo(() => [...catalog].sort((a,b) => b.reviews-a.reviews).slice(0,4), [catalog]);
  const [revI, setRevI] = useState(0);
  const [counter, setCounter] = useState({ categories:0, products:0, returns:0 });

  useEffect(() => {
    let f: number;
    const start = performance.now();
    const targets = { categories: new Set(catalog.map(p=>p.category)).size, products: catalog.length, returns:30 };
    const animate = (now: number) => {
      const p = Math.min((now-start)/1400, 1);
      const ease = 1-Math.pow(1-p,3);
      setCounter({
        categories: Math.round(targets.categories * ease),
        products: Math.round(targets.products * ease),
        returns: Math.round(targets.returns * ease),
      });
      if (p < 1) f = requestAnimationFrame(animate);
    };
    const ob = new IntersectionObserver(([e]) => { if(e.isIntersecting) { f=requestAnimationFrame(animate); ob.disconnect(); } });
    const el = document.getElementById("stats");
    if (el) ob.observe(el);
    return () => { cancelAnimationFrame(f); ob.disconnect(); };
  }, [catalog]);

  return (
    <main className="fade-in">
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="hero">
        <Img src={banners[0]?.image || HERO_IMG} alt="SHOP.CO hero" cls="hero-bg" eager />
        <div className="hero-shade" />
        <span className="hs hs1" aria-hidden>✦</span>
        <span className="hs hs2" aria-hidden>✦</span>

        <div className="hero-inner">
          <p className="hero-brand">SHOP.CO</p>
          <h1 className="hero-h1">{banners[0]?.title || <>Find Clothes<br/>That Match<br/>Your Style</>}</h1>
          <p className="hero-sub">{banners[0]?.subtitle || "Browse our diverse range of meticulously crafted garments, designed to bring out your individuality."}</p>
          <button className="btn btn-dark hero-cta" onClick={() => openShop()}>Shop Now →</button>

          <div className="hero-stats" id="stats">
            <div><strong>{counter.categories.toLocaleString()}</strong><span>Live Categories</span></div>
            <div className="hs-div"/>
            <div><strong>{counter.products.toLocaleString()}+</strong><span>High-Quality Products</span></div>
            <div className="hs-div"/>
            <div><strong>{counter.returns} Days</strong><span>Return Window</span></div>
          </div>
        </div>
      </section>

      {/* ── Brand ticker ───────────────────────────────────────────────────── */}
      <div className="ticker-wrap" aria-label="Featured brands">
        <div className="ticker">
          {[...BRANDS,...BRANDS].map((b,i) => <span key={i}>{b}</span>)}
        </div>
      </div>

      {/* ── Category pills ─────────────────────────────────────────────────── */}
      <div className="cat-strip">
        <div className="cat-pills">
          {categoryOptions.slice(1).map(c => (
            <button key={c} className="cat-pill" onClick={() => openShop(c)}>
              <span>{CAT_ICONS[c]}</span>{c}
            </button>
          ))}
        </div>
      </div>

      {catalogError && <p className="wrap" role="alert">{catalogError}</p>}
      {catalogLoading && <p className="wrap">Loading products…</p>}
      {/* ── New Arrivals ────────────────────────────────────────────────────── */}
      <section className="wrap section">
        <div className="sec-hd">
          <h2 className="sec-title">New Arrivals</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => openShop()}>View All →</button>
        </div>
        <Grid products={newArrivals} cols={4} />
      </section>

      <div className="section-div" />

      {/* ── Top Selling ─────────────────────────────────────────────────────── */}
      <section className="wrap section">
        <div className="sec-hd">
          <h2 className="sec-title">Top Selling</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => openShop()}>View All →</button>
        </div>
        <Grid products={topSelling} cols={4} />
      </section>

      {/* ── Browse by Style ─────────────────────────────────────────────────── */}
      <section className="wrap section">
        <h2 className="sec-title tc">Browse by Dress Style</h2>
        <div className="style-grid">
          {[
            { label:"Casual",  bg:CAT_HEROES["T-shirts"], cl:"st-casual" },
            { label:"Formal",  bg:CAT_HEROES["Shirts"],   cl:"st-formal" },
            { label:"Party",   bg:CAT_HEROES["Jackets"],  cl:"st-party" },
            { label:"Gym",     bg:CAT_HEROES["Hoodies"],  cl:"st-gym" },
          ].map(s => (
            <button key={s.label} className={`st-card ${s.cl}`}
              onClick={() => openShop("All", s.label)}
              style={{ backgroundImage:`url(${s.bg})` }}>
              <span className="st-label">{s.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────────── */}
      <section className="wrap section">
        <div className="rev-hd">
          <h2 className="sec-title">Our Happy Customers</h2>
          <div className="rev-nav">
            <button onClick={() => setRevI(i => clamp(i-1,0,TESTIMONIALS.length-3))} aria-label="Previous">‹</button>
            <button onClick={() => setRevI(i => clamp(i+1,0,TESTIMONIALS.length-3))} aria-label="Next">›</button>
          </div>
        </div>
        <div className="rev-track">
          {TESTIMONIALS.map((t,i) => (
            <div key={t.name} className={`rev-card ${i===revI+1?"highlight":""}`}>
              <div className="rev-stars">{"★".repeat(t.stars)}</div>
              <p className="rev-name">{t.name}<span className="verified">✓ Verified</span></p>
              <p className="rev-role">{t.role}</p>
              <p className="rev-txt">"{t.text}"</p>
            </div>
          ))}
        </div>
      </section>

      <Newsletter />
    </main>
  );
}

// ─── SHOP PAGE ────────────────────────────────────────────────────────────────
function ShopPage() {
  const { filters, setFilters, resetFilters, query, setQuery, catalog } = useApp();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pg, setPg] = useState(1);
  const PER = 9;

  const results = useMemo(() => filterProducts(filters, query, catalog), [filters, query, catalog]);
  useEffect(() => setPg(1), [filters, query]);
  const pageCount = Math.max(1, Math.ceil(results.length/PER));
  const visible   = results.slice((pg-1)*PER, pg*PER);

  const chips = useMemo(() => {
    const c: {lbl:string; clear:()=>void}[] = [];
    if (filters.category!=="All") c.push({lbl:filters.category, clear:()=>setFilters({...filters,category:"All"})});
    if (filters.style!=="All")    c.push({lbl:filters.style,    clear:()=>setFilters({...filters,style:"All"})});
    if (filters.color)            c.push({lbl:filters.color,    clear:()=>setFilters({...filters,color:""})});
    if (filters.size)             c.push({lbl:`Size: ${filters.size}`,    clear:()=>setFilters({...filters,size:""})});
    if (filters.maxPrice<350)     c.push({lbl:`Under $${filters.maxPrice}`,clear:()=>setFilters({...filters,maxPrice:350})});
    if (query.trim())             c.push({lbl:`"${query.trim()}"`,         clear:()=>setQuery("")});
    return c;
  }, [filters, query, setFilters, setQuery]);

  const hero = CAT_HEROES[filters.category] ?? CAT_HEROES.All;
  const heading = query.trim() ? `"${query.trim()}"` : filters.category==="All" ? "All Products" : filters.category;

  return (
    <main className="fade-in">
      {/* Category banner */}
      <div className="shop-banner">
        <Img src={hero} alt={heading} cls="sb-img" eager />
        <div className="sb-over">
          <p>{CAT_ICONS[filters.category] ?? "🛍️"} SHOP.CO COLLECTION</p>
          <h1>{heading.toUpperCase()}</h1>
          <span>{results.length} curated products</span>
        </div>
      </div>

      <div className="shop-wrap">
        {/* Filter sidebar */}
        <aside className="sb-panel">
          <FilterSidebar filters={filters} setFilters={setFilters} resetFilters={resetFilters} onApply={() => {}} />
        </aside>

        <section className="shop-main">
          {/* Toolbar */}
          <div className="sh-bar">
            <div>
              <h1 className="sh-h">{heading}</h1>
              <p className="sh-count">Showing {visible.length ? (pg-1)*PER+1 : 0}–{(pg-1)*PER+visible.length} of {results.length}</p>
            </div>
            <div className="sh-tools">
              <button className="btn btn-ghost btn-sm filter-open-btn" onClick={() => setSheetOpen(true)}>⚙ Filters</button>
              <select value={filters.sort} onChange={e => setFilters({...filters,sort:e.target.value})} className="sort-sel">
                {SORT_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Active chips */}
          {chips.length > 0 && (
            <div className="chips">
              {chips.map(c => <button key={c.lbl} className="chip" onClick={c.clear}>{c.lbl} ✕</button>)}
              <button className="chip chip-clear" onClick={() => { resetFilters(); }}>Clear all</button>
            </div>
          )}

          <Grid products={visible} cols={3} />

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" disabled={pg===1} onClick={() => setPg(p=>p-1)}>← Prev</button>
              <div className="pg-nums">
                {Array.from({length:pageCount},(_,i)=>i+1).map(n => (
                  <button key={n} className={`pg-btn ${n===pg?"act":""}`} onClick={() => setPg(n)}>{n}</button>
                ))}
              </div>
              <button className="btn btn-ghost btn-sm" disabled={pg===pageCount} onClick={() => setPg(p=>p+1)}>Next →</button>
            </div>
          )}
        </section>
      </div>

      {/* Mobile filter sheet */}
      {sheetOpen && (
        <div className="overlay" onClick={() => setSheetOpen(false)}>
          <div className="filter-sheet" onClick={e => e.stopPropagation()}>
            <div className="fs-hd">
              <h3>Filters</h3>
              <button onClick={() => setSheetOpen(false)} aria-label="Close">✕</button>
            </div>
            <FilterSidebar filters={filters} setFilters={setFilters} resetFilters={resetFilters}
              onApply={() => setSheetOpen(false)} mobile />
          </div>
        </div>
      )}
      <Newsletter />
    </main>
  );
}

function FilterSidebar({ filters, setFilters, resetFilters, onApply, mobile=false }:
  { filters:Filters; setFilters:(f:Filters)=>void; resetFilters:()=>void; onApply:()=>void; mobile?:boolean }) {
  const { catalog } = useApp();
  const categoryOptions = useMemo(() => ["All", ...Array.from(new Set(catalog.map(p=>p.category)))], [catalog]);
  const [open, setOpen] = useState<string[]>(["Category","Price","Color","Size"]);
  const tog = (s: string) => setOpen(p => p.includes(s) ? p.filter(x=>x!==s) : [...p,s]);
  const isO = (s: string) => open.includes(s);
  const allSizes = useMemo(() => [...new Set(filters.category!=="All"
    ? (filters.category==="Jeans"||filters.category==="Shoes")
        ? catalog.filter(p=>p.category===filters.category).flatMap(p=>p.sizes)
        : catalog.filter(p=>p.category===filters.category).flatMap(p=>p.sizes)
    : catalog.flatMap(p=>p.sizes)
  )], [filters.category, catalog]);

  return (
    <div className={`fsb ${mobile?"fsb-mob":""}`}>
      <div className="fsb-hd">
        <h3>Filters</h3>
        <button className="fsb-rst" onClick={resetFilters}>Reset all</button>
      </div>

      {/* Category */}
      <div className="fsb-sect">
        <button className="fsb-sh" onClick={() => tog("Category")}>Category <span>{isO("Category")?"▲":"▼"}</span></button>
        {isO("Category") && (
          <div className="fsb-opts">
            {categoryOptions.map(c => (
              <button key={c} className={`fsb-opt ${filters.category===c?"act":""}`}
                onClick={() => setFilters({...filters,category:c})}>
                {CAT_ICONS[c]} {c==="All"?"All Products":c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Style */}
      <div className="fsb-sect">
        <button className="fsb-sh" onClick={() => tog("Style")}>Dress Style <span>{isO("Style")?"▲":"▼"}</span></button>
        {isO("Style") && (
          <div className="fsb-opts">
            {STYLES.map(s => (
              <button key={s} className={`fsb-opt ${filters.style===s?"act":""}`}
                onClick={() => setFilters({...filters,style:s})}>
                {s==="All"?"All Styles":s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Price */}
      <div className="fsb-sect">
        <button className="fsb-sh" onClick={() => tog("Price")}>Price Range <span>{isO("Price")?"▲":"▼"}</span></button>
        {isO("Price") && (
          <div className="fsb-price">
            <div className="pr-labels"><span>$80</span><span className="pr-val">${filters.maxPrice}</span></div>
            <input type="range" min={80} max={350} step={5} value={filters.maxPrice}
              onChange={e => setFilters({...filters,maxPrice:+e.target.value})} className="range-sl" />
          </div>
        )}
      </div>

      {/* Colors */}
      <div className="fsb-sect">
        <button className="fsb-sh" onClick={() => tog("Color")}>Color <span>{isO("Color")?"▲":"▼"}</span></button>
        {isO("Color") && (
          <div className="color-grid">
            {COLORS.map(c => (
              <button key={c.label} className={`col-btn ${filters.color===c.label?"act":""}`}
                style={{background:c.hex}} onClick={() => setFilters({...filters,color:filters.color===c.label?"":c.label})}
                aria-label={c.label} title={c.label}>
                {filters.color===c.label && <span className={c.label==="White"||c.label==="Yellow"?"chk-dk":"chk-lt"}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Size */}
      <div className="fsb-sect">
        <button className="fsb-sh" onClick={() => tog("Size")}>Size <span>{isO("Size")?"▲":"▼"}</span></button>
        {isO("Size") && (
          <div className="sz-wrap">
            {allSizes.map(s => (
              <button key={s} className={`sz-btn ${filters.size===s?"act":""}`}
                onClick={() => setFilters({...filters,size:filters.size===s?"":s})}>{s}</button>
            ))}
          </div>
        )}
      </div>

      {mobile && <button className="btn btn-dark btn-full" style={{marginTop:16}} onClick={onApply}>Show Products</button>}
    </div>
  );
}

// ─── PRODUCT PAGE ─────────────────────────────────────────────────────────────
function ProductPage() {
  const { activeProduct: p, addToCart, toggleWish, wishlist, openShop, catalog } = useApp();
  const [vi, setVi]     = useState(0);
  const [size, setSize] = useState("");
  const [qty, setQty]   = useState(1);
  const [tab, setTab]   = useState("details");
  const [faq, setFaq]   = useState<number|null>(null);
  const [zoom, setZoom] = useState<{x:number,y:number}|null>(null);

  useEffect(() => { if(p) { setVi(0); setSize(p.sizes[0]); setQty(1); setTab("details"); } }, [p]);
  const related = useMemo(() =>
    p ? catalog.filter(x=>x.category===p.category&&x.id!==p.id).slice(0,4) : [], [p, catalog]);
  if (!p) return null;
  const v = p.variants[vi]; const d = off(p);

  return (
    <main className="fade-in wrap">
      {/* Breadcrumb */}
      <nav className="bc">
        <button onClick={() => openShop()}>Home</button>›
        <button onClick={() => openShop(p.category)}>{p.category}</button>›
        <span>{p.name}</span>
      </nav>

      <div className="pd-grid">
        {/* Thumbs */}
        <div className="pd-thumbs">
          {p.variants.map((vv,i) => (
            <button key={vv.name} className={`pd-thumb ${vi===i?"act":""}`}
              onClick={() => setVi(i)} style={{background:catBg[p.category]??"#f0eeed"}}
              aria-label={vv.name}>
              <img src={vv.image} alt={vv.name} loading="lazy" />
            </button>
          ))}
        </div>

        {/* Main image with zoom */}
        <div className="pd-hero" style={{background:catBg[p.category]??"#f0eeed"}}
          onMouseMove={e => {
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x:((e.clientX-r.left)/r.width)*100, y:((e.clientY-r.top)/r.height)*100 });
          }}
          onMouseLeave={() => setZoom(null)}>
          <img src={v.image} alt={`${p.name} – ${v.name}`} loading="eager" decoding="async"
            style={{ transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : "center",
              transform: zoom ? "scale(1.65)" : "scale(1)", transition:"transform .3s ease" }} />
          {d>0 && <span className="pd-disc">-{d}%</span>}
        </div>

        {/* Info */}
        <div className="pd-info">
          <div className="pd-top">
            <h1 className="pd-nm">{p.name}</h1>
            <button className={`heart-btn ${wishlist.has(p.id)?"red":""}`}
              onClick={() => toggleWish(p.id)} aria-label="Wishlist">
              {wishlist.has(p.id)?"❤️":"🤍"}
            </button>
          </div>
          <Stars v={p.rating} />
          <div className="price-row lg">
            <strong>{money(p.price)}</strong>
            {p.oldPrice && <s>{money(p.oldPrice)}</s>}
            {d>0 && <span className="badge-sale">-{d}%</span>}
          </div>
          <p className="pd-desc">{p.desc}</p>

          <div className="sel-block">
            <p className="sel-lbl">Colour: <b>{v.name}</b></p>
            <div className="sw-row">
              {p.variants.map((vv,i) => (
                <button key={vv.name} className={`sw ${vi===i?"act":""}`}
                  style={{background:vv.hex}} onClick={() => setVi(i)} aria-label={vv.name}>
                  {vi===i && <span className="sw-chk">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="sel-block">
            <p className="sel-lbl">Size</p>
            <div className="sz-row">
              {p.sizes.map(s => (
                <button key={s} className={`sz-btn ${size===s?"act":""}`}
                  onClick={() => setSize(s)}>{s}</button>
              ))}
            </div>
          </div>

          <div className="pd-actions">
            <QtyCtrl qty={qty} onChange={n=>setQty(Math.min(n,p.stock||1))} />
            <button className="btn btn-dark pd-atb" disabled={p.stock===0} onClick={() => addToCart(p,v,size,qty)}>
              {p.stock===0 ? "Out of Stock" : `Add to Bag — ${money(p.price*qty)}`}
            </button>
          </div>
          <button className="btn btn-ghost btn-full pd-buy" disabled={p.stock===0} onClick={() => addToCart(p,v,size,qty)}>
            Buy Now
          </button>
          <div className="perks">
            <p>🚚 Free delivery on orders over $200</p>
            <p>↩ 30-day easy returns</p>
            <p>🛡 2-year quality guarantee</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <div className="tab-hds">
          {[["details","Product Details"],["reviews",`Reviews (${p.reviews})`],["faqs","FAQs"]].map(([k,l]) => (
            <button key={k} className={`tab-hd ${tab===k?"act":""}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <div className="tab-body">
          {tab==="details" && (
            <div className="tab-det">
              <p>{p.desc} Designed with an enduring silhouette in premium, comfortable material.</p>
              <dl>
                {[["Category",p.category],["Style",p.style],["Colours",p.variants.map(v=>v.name).join(", ")],["Sizes",p.sizes.join(", ")]].map(([dt,dd]) => (
                  <div key={dt}><dt>{dt}</dt><dd>{dd}</dd></div>
                ))}
              </dl>
            </div>
          )}
          {tab==="reviews" && (
            <div className="tab-rev">
              <div className="rv-hd2">
                <h3>All Reviews <small>({p.reviews})</small></h3>
                <button className="btn btn-dark btn-sm">Write a Review</button>
              </div>
              <div className="rv-grid">
                {TESTIMONIALS.slice(0,4).map(t => (
                  <blockquote key={t.name} className="rv-card">
                    <Stars v={t.stars} />
                    <p className="rv-nm">{t.name} <span className="verified">✓ Verified</span></p>
                    <p>"{t.text}"</p>
                    <time>August 2024</time>
                  </blockquote>
                ))}
              </div>
            </div>
          )}
          {tab==="faqs" && (
            <div className="faq-list">
              {FAQS.map((f,i) => (
                <div key={f.q} className={`faq-item ${faq===i?"open":""}`}>
                  <button onClick={() => setFaq(faq===i?null:i)}>
                    {f.q}<span>{faq===i?"−":"+"}</span>
                  </button>
                  {faq===i && <p>{f.a}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="section">
          <h2 className="sec-title tc">You Might Also Like</h2>
          <Grid products={related} cols={4} />
          <div className="sec-more">
            <button className="btn btn-ghost" onClick={() => openShop(p.category)}>View All {p.category} →</button>
          </div>
        </section>
      )}

      <Newsletter />
    </main>
  );
}

// ─── CART PAGE ────────────────────────────────────────────────────────────────
function CartPage() {
  const { cart, cartTotal, updateQty, removeLine, nav, account, openAuth, placeOrder, toast } = useApp();
  const [addr, setAddr] = useState("");
  const disc = 0;
  const del = cartTotal > 200 ? 0 : 15;

  return (
    <main className="fade-in wrap">
      <h1 className="page-h">Your Cart</h1>
      {cart.length === 0
        ? <div className="empty"><div className="empty-ico">🛍️</div><h3>Your bag is empty</h3>
            <p>Add something you love from our latest collection.</p>
            <button className="btn btn-dark" onClick={() => nav("shop")}>Start Shopping →</button>
          </div>
        : <div className="cart-lay">
          {/* Lines */}
          <div className="cart-lines">
            {cart.map(item => (
              <div key={item.key} className="cl">
                <img src={item.img} alt={item.name} width={116} height={136} loading="lazy" />
                <div className="cl-body">
                  <div className="cl-top">
                    <div>
                      <h3>{item.name}</h3>
                      <p>Size: <b>{item.size}</b> · Colour: <b>{item.color}</b></p>
                    </div>
                    <button className="cl-del" onClick={() => removeLine(item.key)} aria-label="Remove">🗑</button>
                  </div>
                  <div className="cl-bot">
                    <strong>{money(item.price*item.qty)}</strong>
                    <QtyCtrl qty={item.qty} onChange={n => updateQty(item.key,n)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <aside className="os">
            <h2>Order Summary</h2>
            <div className="os-rows">
              <div><span>Subtotal</span><span>{money(cartTotal)}</span></div>
              
              <div><span>Delivery</span><span>{del===0 ? "🎉 Free" : money(del)}</span></div>
            </div>
            <div className="os-tot"><strong>Total</strong><strong>{money(cartTotal-disc+del)}</strong></div>



            {account && (
              <div className="addr-wrap">
                <label className="addr-lbl">Delivery Address <span>*</span></label>
                <input value={addr} onChange={e=>setAddr(e.target.value)} placeholder="Enter your full address" />
              </div>
            )}

            <button className="btn btn-dark btn-full btn-lg" onClick={() => {
              if (!account) { openAuth("login"); return; }
              if (!addr.trim()) { toast("Please enter your delivery address", false); return; }
              placeOrder(disc, addr);
            }}>
              {account ? "Place Order →" : "Login to Checkout →"}
            </button>
            <p className="os-note">Shipping is free on orders over $200.</p>
          </aside>
        </div>}
      <Newsletter />
    </main>
  );
}

// ─── WISHLIST ─────────────────────────────────────────────────────────────────
function WishlistPage() {
  const { wishlist, nav, catalog } = useApp();
  const items = useMemo(() => catalog.filter(p => wishlist.has(p.id)), [wishlist, catalog]);
  return (
    <main className="fade-in wrap">
      <h1 className="page-h">My Wishlist {items.length>0 && <span className="cnt-badge">{items.length}</span>}</h1>
      {items.length===0
        ? <div className="empty"><div className="empty-ico">🤍</div><h3>Nothing saved yet</h3>
            <p>Tap ♡ on any product to save it here.</p>
            <button className="btn btn-dark" onClick={() => nav("shop")}>Discover Products →</button>
          </div>
        : <Grid products={items} cols={4} />}
      <Newsletter />
    </main>
  );
}

// ─── ORDERS ───────────────────────────────────────────────────────────────────
function OrdersPage() {
  const { orders, nav } = useApp();
  const STEPS = ["Order Placed","Packed","In Transit","Delivered"];
  return (
    <main className="fade-in wrap">
      <h1 className="page-h">My Orders</h1>
      {orders.length===0
        ? <div className="empty"><div className="empty-ico">📦</div><h3>No orders yet</h3>
            <p>Once you place an order it will appear here.</p>
            <button className="btn btn-dark" onClick={() => nav("shop")}>Shop Now →</button>
          </div>
        : <div className="orders-list">
          {orders.map(o => (
            <div key={o.orderId} className="ord-card">
              <div className="ord-hd">
                <div>
                  <p className="ord-id">Order {o.orderId}</p>
                  <h3>Placed on {o.date}</h3>
                </div>
                <span className="ord-status">✓ {o.status}</span>
              </div>
              <div className="ord-track">
                {STEPS.map((s,i) => (
                  <div key={s} className={`trk-step ${i===0?"done":""}`}>
                    <span className="trk-dot" />
                    <p>{s}</p>
                  </div>
                ))}
              </div>
              <div className="ord-items">
                {o.items.map(item => (
                  <div key={item.key} className="oi">
                    <img src={item.img} alt={item.name} width={54} height={64} loading="lazy" />
                    <div><p className="oi-nm">{item.name}</p><p className="oi-meta">{item.color} · {item.size} · ×{item.qty}</p></div>
                  </div>
                ))}
              </div>
              <div className="ord-ft"><span>Total paid</span><strong>{money(o.total)}</strong></div>
            </div>
          ))}
        </div>}
      <Newsletter />
    </main>
  );
}

// ─── Router with page transitions ────────────────────────────────────────────
function Router() {
  const { page } = useApp();
  const [cur, setCur]   = useState(page);
  const [exit, setExit] = useState(false);
  const pending = useRef(page);

  useEffect(() => {
    if (page === cur) return;
    pending.current = page;
    setExit(true);
    const t = setTimeout(() => {
      setCur(pending.current);
      setExit(false);
    }, 220);
    return () => clearTimeout(t);
  }, [page, cur]);

  return (
    <div className={`router ${exit ? "r-exit" : "r-enter"}`} key={cur}>
      {cur==="home"     && <HomePage />}
      {cur==="shop"     && <ShopPage />}
      {cur==="product"  && <ProductPage />}
      {cur==="cart"     && <CartPage />}
      {cur==="wishlist" && <WishlistPage />}
      {cur==="orders"   && <OrdersPage />}
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <Header />
      <CartDrawer />
      <AuthModal />
      <QuickView />
      <Router />
      <Footer />
      <Toasts />
      <BackTop />
      <TabBar />
    </AppProvider>
  );
}
