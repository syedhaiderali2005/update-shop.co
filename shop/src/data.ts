// ─── Types ────────────────────────────────────────────────────────────────────
export type Page = "home" | "shop" | "product" | "cart" | "wishlist" | "orders";
export type AuthMode = "login" | "signup";

export interface Variant  { name: string; hex: string; image: string }
export interface Product  {
  id: number; dbId?: string; stock?: number; name: string; price: number; oldPrice?: number;
  rating: number; reviews: number; category: string; style: string;
  badge?: string; sizes: string[]; variants: Variant[]; desc: string;
}
export interface CartItem {
  key: string; id: number; dbId?: string; name: string; img: string;
  price: number; size: string; color: string; qty: number;
}
export interface Account { name: string; email: string }
export interface Order   {
  orderId: string; date: string; items: CartItem[];
  subtotal: number; discount: number; delivery: number; total: number; status: string;
}
export interface Filters  {
  category: string; style: string; color: string;
  size: string; maxPrice: number; sort: string;
}

// ─── Pexels CDN helper ────────────────────────────────────────────────────────
// w=480 → ~25 KB each image, loads in < 200 ms globally
const px = (id: number, w = 480) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

// ─── VERIFIED Pexels IDs — ALL unique, zero cross-category overlap ────────────

// ─── Hero & category banner images ───────────────────────────────────────────
export const HERO_IMG = `https://images.pexels.com/photos/9821886/pexels-photo-9821886.jpeg?auto=compress&cs=tinysrgb&w=1600`;

export const CAT_HEROES: Record<string, string> = {
  All:        HERO_IMG,
  "T-shirts": px(8159072,  1200),
  Shirts:     px(28967487, 1200),
  Jeans:      px(18533669, 1200),
  Shorts:     px(31152187, 1200),
  Hoodies:    px(19461584, 1200),
  Jackets:    px(13768643, 1200),
  Shoes:      px(19869753, 1200),
};

export const catBg: Record<string, string> = {
  "T-shirts": "#fff0ed",
  Shirts:     "#edf4ff",
  Jeans:      "#e9eef6",
  Shorts:     "#edfff4",
  Hoodies:    "#f3edff",
  Jackets:    "#f0f0f0",
  Shoes:      "#fff8ed",
};

// ─── Catalog ──────────────────────────────────────────────────────────────────
export const PRODUCTS: Product[] = [];

// ─── Static config ────────────────────────────────────────────────────────────
export const CATEGORIES = ["All","T-shirts","Shirts","Jeans","Shorts","Hoodies","Jackets","Shoes"];
export const CAT_ICONS: Record<string, string> = {
  All:"🛍️","T-shirts":"👕",Shirts:"👔",Jeans:"👖",
  Shorts:"🩳",Hoodies:"🧥",Jackets:"🧤",Shoes:"👟",
};
export const STYLES    = ["All","Casual","Formal","Party","Gym"];
export const SORT_OPTS = ["Most Popular","Price: Low–High","Price: High–Low","Newest","Top Rated"];
export const COLORS    = [
  { label:"Red",    hex:"#ef4444", match:["red","crimson","coral","cherry"] },
  { label:"Blue",   hex:"#3b82f6", match:["blue","cobalt","navy","indigo","denim","washed","raw"] },
  { label:"White",  hex:"#f3f4f6", match:["white","ivory","chalk","cream","off-white","beige"] },
  { label:"Black",  hex:"#111827", match:["black","jet","dark","charcoal","moto","bw","moody"] },
  { label:"Grey",   hex:"#6b7280", match:["grey","gray","slate","stone","silver","bearded"] },
  { label:"Green",  hex:"#22c55e", match:["green","sage","forest","olive","teal","park"] },
  { label:"Brown",  hex:"#92400e", match:["brown","tan","loafer","mustard","boot","warm"] },
  { label:"Yellow", hex:"#eab308", match:["yellow","orange","gold","amber","purple","colorful"] },
];
export const DEFAULT_FILTERS: Filters = {
  category:"All", style:"All", color:"", size:"", maxPrice:400, sort:"Most Popular",
};

export const money = (n: number) => `$${Math.round(n)}`;
export const off   = (p: Product) =>
  p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;

export function filterProducts(f: Filters, q: string, source: Product[] = []): Product[] {
  const s = q.trim().toLowerCase();
  return source.filter(p => {
    if (f.category !== "All" && p.category !== f.category) return false;
    if (f.style    !== "All" && p.style    !== f.style)    return false;
    if (f.size && !p.sizes.includes(f.size))               return false;
    if (p.price > f.maxPrice)                              return false;
    if (s && !`${p.name} ${p.category} ${p.style} ${p.desc}`.toLowerCase().includes(s)) return false;
    if (f.color) {
      const c = COLORS.find(c => c.label === f.color);
      if (c && !p.variants.some(v => c.match.some(t => v.name.toLowerCase().includes(t)))) return false;
    }
    return true;
  }).sort((a, b) => {
    if (f.sort === "Price: Low–High")  return a.price - b.price;
    if (f.sort === "Price: High–Low")  return b.price - a.price;
    if (f.sort === "Newest")           return b.id - a.id;
    if (f.sort === "Top Rated")        return b.rating - a.rating;
    return b.reviews - a.reviews;
  });
}

export function suggest(q: string) {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return [];
  return PRODUCTS.filter(p => `${p.name} ${p.category}`.toLowerCase().includes(s)).slice(0, 6);
}

export const BRANDS = ["VERSACE","ZARA","GUCCI","PRADA","Calvin Klein","H&M","RALPH LAUREN","TOMMY HILFIGER"];

export const TESTIMONIALS = [
  { name:"Sarah M.", stars:5, role:"Verified buyer",
    text:"Blown away by the quality. Every piece has exceeded my expectations — I keep coming back." },
  { name:"Alex K.",  stars:5, role:"Verified buyer",
    text:"Finding clothes that match my style used to be hard. SHOP.CO makes it effortless." },
  { name:"James L.", stars:5, role:"Verified buyer",
    text:"The selection is exceptional. Unique fashion pieces I can't find anywhere else." },
  { name:"Mia R.",   stars:5, role:"Verified buyer",
    text:"Delivery was quick, packaging felt premium and the fit was exactly as described." },
  { name:"Omar P.",  stars:5, role:"Verified buyer",
    text:"Fabrics feel far better than the price suggests. SHOP.CO is my default wardrobe store." },
];

export const FAQS = [
  { q:"How long does delivery take?",        a:"Standard delivery 3-5 working days. Express next-day available before 4pm." },
  { q:"Can I return an item?",               a:"Yes — 30 days from delivery, unworn with tags attached. Full refund guaranteed." },
  { q:"How do I choose the right size?",     a:"Use the size guide on each product page. Between sizes? Size up for a relaxed fit." },
  { q:"What payment methods do you accept?", a:"All major cards, Apple Pay, Google Pay and PayPal at checkout." },
  { q:"Do you offer free shipping?",         a:"Yes — free standard shipping on all orders over $200." },
];
