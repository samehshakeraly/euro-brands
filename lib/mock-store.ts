import {
  startOfDay,
  endOfDay,
  subDays,
  eachDayOfInterval,
  format,
  setHours,
} from "date-fns";
import { calcDiscount, round2 } from "./sale-utils";
import {
  BRANCHES,
  LOW_STOCK_THRESHOLD,
  type BranchValue,
  type CategoryValue,
  type DiscountTypeValue,
} from "./constants";
import { ValidationError } from "./validate";
import type {
  DashboardStats,
  ProductDTO,
  ProductInput,
  ReportsData,
  SaleDTO,
  SaleInput,
  VariantDTO,
} from "./types";

// "وضع المعاينة": يعمل تلقائياً عند غياب DATABASE_URL، أو يُفرض عبر MOCK_DATA=1
export const MOCK_MODE =
  !process.env.DATABASE_URL ||
  process.env.MOCK_DATA === "true" ||
  process.env.MOCK_DATA === "1";

// ----------------------------------------------------
//  النماذج الداخلية (قابلة للتعديل في الذاكرة)
// ----------------------------------------------------
interface MVariant {
  id: string;
  productId: string;
  size: string;
  quantity: number;
  branch: BranchValue;
  price: number;
}
interface MProduct {
  id: string;
  name: string;
  brand: string;
  category: CategoryValue;
  description: string | null;
  images: string[];
  variants: MVariant[];
  createdAt: Date;
  updatedAt: Date;
}
interface MItem {
  id: string;
  saleId: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}
interface MSale {
  id: string;
  saleNumber: number;
  branch: BranchValue;
  totalAmount: number;
  discountType: DiscountTypeValue | null;
  discountValue: number;
  finalAmount: number;
  customerName: string | null;
  customerPhone: string | null;
  customerNotes: string | null;
  createdAt: Date;
  items: MItem[];
}

interface Store {
  products: MProduct[];
  sales: MSale[];
  seq: number;
}

// ----------------------------------------------------
//  مولّد أرقام شبه عشوائي ثابت (لبيانات معاينة مستقرة)
// ----------------------------------------------------
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const IMG = (seed: string) =>
  `https://images.unsplash.com/${seed}?w=600&auto=format&fit=crop`;

// ----------------------------------------------------
//  بناء البيانات التجريبية
// ----------------------------------------------------
function buildStore(): Store {
  const store: Store = { products: [], sales: [], seq: 0 };
  const id = (p: string) => `${p}_${++store.seq}`;

  type VSpec = [size: string, branch: BranchValue, qty: number, price: number];
  const def = (
    name: string,
    brand: string,
    category: CategoryValue,
    description: string,
    image: string,
    specs: VSpec[]
  ): MProduct => {
    const pid = id("p");
    return {
      id: pid,
      name,
      brand,
      category,
      description,
      images: [image],
      createdAt: new Date(),
      updatedAt: new Date(),
      variants: specs.map(([size, branch, quantity, price]) => ({
        id: id("v"),
        productId: pid,
        size,
        quantity,
        branch,
        price,
      })),
    };
  };

  const H: BranchValue = "HADAYEK";
  const Z: BranchValue = "ZAHRAA";

  store.products = [
    def(
      "تيشيرت قطن كلاسيك",
      "Zara",
      "CLOTHES",
      "تيشيرت قطني مريح بقصة كلاسيكية مناسب للارتداء اليومي.",
      IMG("photo-1521572163474-6864f9cf17ab"),
      [
        ["S", H, 14, 350],
        ["M", H, 22, 350],
        ["L", H, 10, 350],
        ["XL", H, 3, 350],
        ["M", Z, 12, 350],
        ["L", Z, 8, 350],
        ["XL", Z, 0, 350],
      ]
    ),
    def(
      "قميص كاجوال مقلّم",
      "H&M",
      "CLOTHES",
      "قميص كاجوال بأكمام طويلة وخامة قطنية ناعمة.",
      IMG("photo-1602810318383-e386cc2a3ccf"),
      [
        ["M", H, 9, 480],
        ["L", H, 11, 480],
        ["XL", H, 6, 480],
        ["L", Z, 7, 480],
        ["2XL", Z, 2, 480],
      ]
    ),
    def(
      "هودي بقلنسوة",
      "Adidas",
      "CLOTHES",
      "هودي رياضي دافئ بقلنسوة وجيب أمامي.",
      IMG("photo-1556821840-3a63f95609a7"),
      [
        ["M", H, 8, 890],
        ["L", H, 5, 890],
        ["XL", H, 1, 890],
        ["M", Z, 6, 890],
        ["L", Z, 9, 890],
      ]
    ),
    def(
      "بنطلون جينز سليم",
      "Levi's",
      "PANTS",
      "بنطلون جينز بقصة سليم عصرية وخامة متينة.",
      IMG("photo-1542272604-787c3835535d"),
      [
        ["M", H, 7, 720],
        ["L", H, 12, 720],
        ["XL", H, 4, 720],
        ["L", Z, 9, 720],
        ["2XL", Z, 3, 720],
      ]
    ),
    def(
      "بنطلون تشينو",
      "Tommy Hilfiger",
      "PANTS",
      "بنطلون تشينو أنيق مناسب للإطلالات شبه الرسمية.",
      IMG("photo-1473966968600-fa801b869a1a"),
      [
        ["M", H, 5, 950],
        ["L", H, 6, 950],
        ["L", Z, 4, 950],
        ["XL", Z, 2, 950],
      ]
    ),
    def(
      "حذاء رياضي خفيف",
      "Nike",
      "SHOES",
      "حذاء رياضي خفيف الوزن مناسب للجري والمشي.",
      IMG("photo-1542291026-7eec264c27ff"),
      [
        ["41", H, 6, 1450],
        ["42", H, 10, 1450],
        ["43", H, 4, 1450],
        ["42", Z, 7, 1450],
        ["44", Z, 0, 1450],
      ]
    ),
    def(
      "حذاء كلاسيك جلد",
      "Clarks",
      "SHOES",
      "حذاء جلد طبيعي بتصميم كلاسيكي أنيق للمناسبات الرسمية.",
      IMG("photo-1449505278894-297fdb3edbc1"),
      [
        ["40", H, 5, 1850],
        ["41", H, 7, 1850],
        ["42", Z, 3, 1850],
        ["43", Z, 6, 1850],
      ]
    ),
    def(
      "حذاء جري احترافي",
      "Puma",
      "SHOES",
      "حذاء جري بنعل مرن يوفر دعماً ممتازاً للقدم.",
      IMG("photo-1608231387042-66d1773070a5"),
      [
        ["42", H, 8, 1650],
        ["43", H, 2, 1650],
        ["41", Z, 5, 1650],
        ["42", Z, 9, 1650],
      ]
    ),
    def(
      "عطر شرقي فاخر",
      "Lattafa",
      "PERFUMES",
      "عطر شرقي فاخر بمزيج من العود والمسك يدوم طويلاً.",
      IMG("photo-1592945403244-b3fbafd7f539"),
      [
        ["100ml", H, 18, 600],
        ["100ml", Z, 13, 600],
        ["50ml", H, 9, 400],
      ]
    ),
    def(
      "عطر خشبي منعش",
      "Armaf",
      "PERFUMES",
      "عطر خشبي منعش يناسب الاستخدام اليومي بثبات عالٍ.",
      IMG("photo-1541643600914-78b084683601"),
      [
        ["100ml", H, 15, 520],
        ["100ml", Z, 11, 520],
        ["50ml", Z, 2, 360],
      ]
    ),
  ];

  // ---- توليد فواتير على مدى آخر 30 يوماً ----
  const rng = makeRng(987654321);
  const now = new Date();
  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  const customers: [string, string][] = [
    ["أحمد محمد", "01001234567"],
    ["منى سعيد", "01122334455"],
    ["خالد عبد الله", "01098765432"],
    ["سارة إبراهيم", "01234567890"],
    ["", ""],
    ["", ""],
  ];

  const totalSalesToGenerate = 42;
  for (let i = 0; i < totalSalesToGenerate; i++) {
    // أول 5 فواتير تكون اليوم لإظهار "مبيعات اليوم"
    const dayOffset = i < 5 ? 0 : Math.floor(rng() * 30);
    const branch = pick(BRANCHES as unknown as BranchValue[]);

    // المقاسات المتاحة في هذا الفرع بكمية كافية
    const available: { product: MProduct; variant: MVariant }[] = [];
    for (const product of store.products) {
      for (const variant of product.variants) {
        if (variant.branch === branch && variant.quantity >= 3) {
          available.push({ product, variant });
        }
      }
    }
    if (available.length === 0) continue;

    const lineCount = 1 + Math.floor(rng() * 3);
    const items: MItem[] = [];
    const usedVariants = new Set<string>();
    let totalAmount = 0;

    const saleId = id("s");
    for (let l = 0; l < lineCount; l++) {
      const choice = pick(available);
      if (usedVariants.has(choice.variant.id)) continue;
      if (choice.variant.quantity < 1) continue;
      usedVariants.add(choice.variant.id);

      const qty = 1 + Math.floor(rng() * Math.min(2, choice.variant.quantity));
      const subtotal = round2(choice.variant.price * qty);
      totalAmount += subtotal;
      choice.variant.quantity -= qty; // خصم المخزون

      items.push({
        id: id("si"),
        saleId,
        productId: choice.product.id,
        variantId: choice.variant.id,
        quantity: qty,
        unitPrice: choice.variant.price,
        subtotal,
      });
    }
    if (items.length === 0) continue;

    totalAmount = round2(totalAmount);

    // خصم على ~ثلث الفواتير
    let discountType: DiscountTypeValue | null = null;
    let discountValue = 0;
    const r = rng();
    if (r < 0.2) {
      discountType = "PERCENTAGE";
      discountValue = pick([5, 10, 15]);
    } else if (r < 0.33) {
      discountType = "FIXED";
      discountValue = pick([50, 100]);
    }
    const { finalAmount } = calcDiscount(totalAmount, discountType, discountValue);

    const [cName, cPhone] = pick(customers);
    const created = setHours(
      subDays(now, dayOffset),
      9 + Math.floor(rng() * 11)
    );

    store.sales.push({
      id: saleId,
      saleNumber: store.sales.length + 1,
      branch,
      totalAmount,
      discountType,
      discountValue,
      finalAmount,
      customerName: cName || null,
      customerPhone: cPhone || null,
      customerNotes: null,
      createdAt: created,
      items,
    });
  }

  // ترتيب أرقام الفواتير حسب التاريخ (الأقدم = الأصغر)
  store.sales.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  store.sales.forEach((s, idx) => (s.saleNumber = idx + 1));

  return store;
}

// تخزين على globalThis ليبقى عبر إعادة التحميل الساخن (HMR)
const g = globalThis as unknown as { __ebMockStore?: Store };
const store: Store = g.__ebMockStore ?? (g.__ebMockStore = buildStore());
const nextId = (p: string) => `${p}_${++store.seq}`;

// ----------------------------------------------------
//  التحويل إلى DTO
// ----------------------------------------------------
function shapeVariant(v: MVariant): VariantDTO {
  return {
    id: v.id,
    productId: v.productId,
    size: v.size,
    quantity: v.quantity,
    branch: v.branch,
    price: v.price,
  };
}

function shapeProduct(
  p: MProduct,
  filter?: (v: MVariant) => boolean
): ProductDTO {
  const variants = (filter ? p.variants.filter(filter) : p.variants).map(
    shapeVariant
  );
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    description: p.description,
    images: p.images,
    variants,
    totalQuantity: variants.reduce((s, v) => s + v.quantity, 0),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function findVariant(
  variantId: string
): { product: MProduct; variant: MVariant } | null {
  for (const product of store.products) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
}

function shapeSale(s: MSale): SaleDTO {
  return {
    id: s.id,
    saleNumber: s.saleNumber,
    branch: s.branch,
    totalAmount: s.totalAmount,
    discountType: s.discountType,
    discountValue: s.discountValue,
    finalAmount: s.finalAmount,
    customerName: s.customerName,
    customerPhone: s.customerPhone,
    customerNotes: s.customerNotes,
    createdAt: s.createdAt.toISOString(),
    items: s.items.map((it) => {
      const ref = findVariant(it.variantId);
      return {
        id: it.id,
        productId: it.productId,
        variantId: it.variantId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        subtotal: it.subtotal,
        productName: ref?.product.name ?? "—",
        brand: ref?.product.brand ?? "",
        size: ref?.variant.size ?? "—",
      };
    }),
    itemsCount: s.items.reduce((sum, it) => sum + it.quantity, 0),
  };
}

// ----------------------------------------------------
//  عمليات المنتجات
// ----------------------------------------------------
export function mockListProducts(sp: URLSearchParams): ProductDTO[] {
  const search = sp.get("search")?.trim().toLowerCase();
  const branch = sp.get("branch") as BranchValue | null;
  const category = sp.get("category");
  const brand = sp.get("brand");
  const size = sp.get("size");
  const hasVariantFilter = !!(branch || size);

  const matchVariant = (v: MVariant) =>
    (!branch || v.branch === branch) && (!size || v.size === size);

  return store.products
    .filter((p) => {
      if (category && p.category !== category) return false;
      if (brand && p.brand !== brand) return false;
      if (search && !`${p.name} ${p.brand}`.toLowerCase().includes(search))
        return false;
      if (hasVariantFilter && !p.variants.some(matchVariant)) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((p) => shapeProduct(p, hasVariantFilter ? matchVariant : undefined));
}

export function mockGetProduct(id: string): ProductDTO | null {
  const p = store.products.find((x) => x.id === id);
  return p ? shapeProduct(p) : null;
}

export function mockCreateProduct(input: ProductInput): ProductDTO {
  const pid = nextId("p");
  const product: MProduct = {
    id: pid,
    name: input.name,
    brand: input.brand,
    category: input.category,
    description: input.description ?? null,
    images: input.images,
    createdAt: new Date(),
    updatedAt: new Date(),
    variants: input.variants.map((v) => ({
      id: nextId("v"),
      productId: pid,
      size: v.size,
      branch: v.branch,
      quantity: v.quantity,
      price: v.price,
    })),
  };
  store.products.unshift(product);
  return shapeProduct(product);
}

export function mockUpdateProduct(
  id: string,
  input: ProductInput
): ProductDTO | null {
  const product = store.products.find((x) => x.id === id);
  if (!product) return null;

  const keptIds = new Set(
    input.variants.map((v) => v.id).filter(Boolean) as string[]
  );
  const referenced = new Set(
    store.sales.flatMap((s) => s.items.map((it) => it.variantId))
  );

  // المقاسات المحذوفة: تُحذف ما لم تكن مرتبطة بفواتير (حينها تُصفّر)
  product.variants = product.variants.filter((v) => {
    if (keptIds.has(v.id)) return true;
    if (referenced.has(v.id)) {
      v.quantity = 0;
      return true;
    }
    return false;
  });

  for (const vi of input.variants) {
    const existing = vi.id
      ? product.variants.find((v) => v.id === vi.id)
      : undefined;
    if (existing) {
      existing.size = vi.size;
      existing.branch = vi.branch;
      existing.quantity = vi.quantity;
      existing.price = vi.price;
    } else {
      product.variants.push({
        id: nextId("v"),
        productId: product.id,
        size: vi.size,
        branch: vi.branch,
        quantity: vi.quantity,
        price: vi.price,
      });
    }
  }

  product.name = input.name;
  product.brand = input.brand;
  product.category = input.category;
  product.description = input.description ?? null;
  product.images = input.images;
  product.updatedAt = new Date();

  return shapeProduct(product);
}

export function mockDeleteProduct(
  id: string
): { ok: true } | { ok: false; status: number; error: string } {
  const product = store.products.find((x) => x.id === id);
  if (!product) return { ok: false, status: 404, error: "المنتج غير موجود" };

  const hasSales = store.sales.some((s) =>
    s.items.some((it) => it.productId === id)
  );
  if (hasSales)
    return {
      ok: false,
      status: 409,
      error:
        "لا يمكن حذف منتج مرتبط بفواتير سابقة. يمكنك تصفير كمياته بدلاً من ذلك.",
    };

  store.products = store.products.filter((x) => x.id !== id);
  return { ok: true };
}

// ----------------------------------------------------
//  عمليات الفواتير
// ----------------------------------------------------
export function mockListSales(sp: URLSearchParams): SaleDTO[] {
  const branch = sp.get("branch") as BranchValue | null;
  const from = sp.get("from") ? new Date(sp.get("from")!) : null;
  const to = sp.get("to") ? new Date(sp.get("to")!) : null;
  const search = sp.get("search")?.trim();
  const limit = Math.min(Number(sp.get("limit")) || 500, 1000);

  let list = [...store.sales];
  if (branch) list = list.filter((s) => s.branch === branch);
  if (from) list = list.filter((s) => s.createdAt >= from);
  if (to) list = list.filter((s) => s.createdAt <= to);

  if (search) {
    const num = Number(search.replace(/[#\s]/g, ""));
    const q = search.toLowerCase();
    list = list.filter(
      (s) =>
        (Number.isInteger(num) && s.saleNumber === num) ||
        (s.customerName ?? "").toLowerCase().includes(q) ||
        (s.customerPhone ?? "").includes(search)
    );
  }

  return list
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)
    .map(shapeSale);
}

export function mockGetSale(id: string): SaleDTO | null {
  const s = store.sales.find((x) => x.id === id);
  return s ? shapeSale(s) : null;
}

export function mockCreateSale(input: SaleInput): SaleDTO {
  const merged = new Map<string, number>();
  for (const it of input.items)
    merged.set(it.variantId, (merged.get(it.variantId) ?? 0) + it.quantity);

  let totalAmount = 0;
  const items: MItem[] = [];
  const saleId = nextId("s");

  for (const [variantId, qty] of merged.entries()) {
    const ref = findVariant(variantId);
    if (!ref) throw new ValidationError("أحد المنتجات لم يعد متاحاً في المخزون");
    if (ref.variant.branch !== input.branch)
      throw new ValidationError(
        `المنتج "${ref.product.name}" لا ينتمي للفرع المحدد`
      );
    if (ref.variant.quantity < qty)
      throw new ValidationError(
        `الكمية غير كافية من "${ref.product.name}" مقاس ${ref.variant.size} (المتاح: ${ref.variant.quantity})`
      );

    const subtotal = round2(ref.variant.price * qty);
    totalAmount += subtotal;
    items.push({
      id: nextId("si"),
      saleId,
      productId: ref.product.id,
      variantId,
      quantity: qty,
      unitPrice: ref.variant.price,
      subtotal,
    });
  }

  totalAmount = round2(totalAmount);
  const { finalAmount } = calcDiscount(
    totalAmount,
    input.discountType,
    input.discountValue
  );

  // خصم المخزون
  for (const [variantId, qty] of merged.entries()) {
    findVariant(variantId)!.variant.quantity -= qty;
  }

  const saleNumber =
    store.sales.reduce((max, s) => Math.max(max, s.saleNumber), 0) + 1;

  const sale: MSale = {
    id: saleId,
    saleNumber,
    branch: input.branch,
    totalAmount,
    discountType: input.discountType,
    discountValue: input.discountValue,
    finalAmount,
    customerName: input.customerName ?? null,
    customerPhone: input.customerPhone ?? null,
    customerNotes: input.customerNotes ?? null,
    createdAt: new Date(),
    items,
  };
  store.sales.push(sale);
  return shapeSale(sale);
}

// ----------------------------------------------------
//  لوحة التحكم والتقارير
// ----------------------------------------------------
function rangeBounds(sp: URLSearchParams, defaultDays: number) {
  const now = new Date();
  const from = sp.get("from")
    ? new Date(sp.get("from")!)
    : subDays(startOfDay(now), defaultDays);
  const to = sp.get("to") ? new Date(sp.get("to")!) : endOfDay(now);
  return { from, to, now };
}

export function mockDashboard(sp: URLSearchParams): DashboardStats {
  const { from, to, now } = rangeBounds(sp, 6);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const inRange = store.sales.filter(
    (s) => s.createdAt >= from && s.createdAt <= to
  );
  const today = store.sales.filter(
    (s) => s.createdAt >= todayStart && s.createdAt <= todayEnd
  );

  const branchMap = new Map<BranchValue, { total: number; count: number }>();
  for (const b of BRANCHES) branchMap.set(b, { total: 0, count: 0 });

  const dayBuckets = new Map<string, number>();
  for (const d of eachDayOfInterval({ start: from, end: to }))
    dayBuckets.set(format(d, "yyyy-MM-dd"), 0);

  const categoryMap = new Map<CategoryValue, number>();
  const productQty = new Map<string, { name: string; quantity: number }>();

  let rangeTotal = 0;
  for (const sale of inRange) {
    rangeTotal += sale.finalAmount;
    const b = branchMap.get(sale.branch)!;
    b.total += sale.finalAmount;
    b.count += 1;

    const key = format(sale.createdAt, "yyyy-MM-dd");
    if (dayBuckets.has(key))
      dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + sale.finalAmount);

    for (const item of sale.items) {
      const ref = findVariant(item.variantId);
      const cat = ref?.product.category ?? "CLOTHES";
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + item.subtotal);
      const cur = productQty.get(item.productId) ?? {
        name: ref?.product.name ?? "—",
        quantity: 0,
      };
      cur.quantity += item.quantity;
      productQty.set(item.productId, cur);
    }
  }

  let topProduct: DashboardStats["topProduct"] = null;
  let topQty = 0;
  for (const [, v] of productQty)
    if (v.quantity > topQty) {
      topQty = v.quantity;
      topProduct = { name: v.name, brand: "", quantity: v.quantity };
    }

  const lowStockCount = store.products.reduce(
    (n, p) =>
      n + p.variants.filter((v) => v.quantity <= LOW_STOCK_THRESHOLD).length,
    0
  );

  const recentSales = [...store.sales]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10)
    .map(shapeSale);

  return {
    todaySales: round2(today.reduce((s, x) => s + x.finalAmount, 0)),
    todaySalesCount: today.length,
    rangeSales: round2(rangeTotal),
    rangeSalesCount: inRange.length,
    branchComparison: [...branchMap.entries()].map(([branch, v]) => ({
      branch,
      total: round2(v.total),
      count: v.count,
    })),
    topProduct,
    lowStockCount,
    dailySales: [...dayBuckets.entries()].map(([date, total]) => ({
      date,
      total: round2(total),
    })),
    categoryBreakdown: [...categoryMap.entries()].map(([category, total]) => ({
      category,
      total: round2(total),
    })),
    recentSales,
  };
}

export function mockReports(sp: URLSearchParams): ReportsData {
  const { from, to } = rangeBounds(sp, 29);
  const inRange = store.sales.filter(
    (s) => s.createdAt >= from && s.createdAt <= to
  );

  const branchMap = new Map<BranchValue, { total: number; count: number }>();
  for (const b of BRANCHES) branchMap.set(b, { total: 0, count: 0 });

  const categoryMap = new Map<CategoryValue, { total: number; qty: number }>();
  const productMap = new Map<
    string,
    { name: string; brand: string; qty: number; revenue: number }
  >();

  const dayBuckets = new Map<string, number>();
  for (const d of eachDayOfInterval({ start: from, end: to }))
    dayBuckets.set(format(d, "yyyy-MM-dd"), 0);

  let totalSales = 0;
  let itemsSold = 0;

  for (const sale of inRange) {
    totalSales += sale.finalAmount;
    const b = branchMap.get(sale.branch)!;
    b.total += sale.finalAmount;
    b.count += 1;

    const key = format(sale.createdAt, "yyyy-MM-dd");
    if (dayBuckets.has(key))
      dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + sale.finalAmount);

    for (const item of sale.items) {
      itemsSold += item.quantity;
      const ref = findVariant(item.variantId);
      const cat = ref?.product.category ?? "CLOTHES";
      const c = categoryMap.get(cat) ?? { total: 0, qty: 0 };
      c.total += item.subtotal;
      c.qty += item.quantity;
      categoryMap.set(cat, c);

      const p = productMap.get(item.productId) ?? {
        name: ref?.product.name ?? "—",
        brand: ref?.product.brand ?? "",
        qty: 0,
        revenue: 0,
      };
      p.qty += item.quantity;
      p.revenue += item.subtotal;
      productMap.set(item.productId, p);
    }
  }

  const lowStock = store.products
    .flatMap((p) =>
      p.variants
        .filter((v) => v.quantity <= LOW_STOCK_THRESHOLD)
        .map((v) => ({
          id: v.id,
          productName: p.name,
          brand: p.brand,
          size: v.size,
          branch: v.branch,
          quantity: v.quantity,
        }))
    )
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 100);

  return {
    totalSales: round2(totalSales),
    invoicesCount: inRange.length,
    itemsSold,
    avgInvoice: inRange.length ? round2(totalSales / inRange.length) : 0,
    byBranch: [...branchMap.entries()].map(([branch, v]) => ({
      branch,
      total: round2(v.total),
      count: v.count,
    })),
    byCategory: [...categoryMap.entries()].map(([category, v]) => ({
      category,
      total: round2(v.total),
      qty: v.qty,
    })),
    dailySales: [...dayBuckets.entries()].map(([date, total]) => ({
      date,
      total: round2(total),
    })),
    topProducts: [...productMap.values()]
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)
      .map((p) => ({ ...p, revenue: round2(p.revenue) })),
    lowStock,
  };
}

// صورة بديلة (Data URI) لزر الرفع في وضع المعاينة — بدون اتصال شبكة
export function mockUploadUrl(): string {
  const colors = ["6c63ff", "3b9a6e", "c9851a", "4f9cf9"];
  const c = colors[Math.floor(Math.random() * colors.length)];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='450'><rect width='100%' height='100%' fill='%23${c}'/><text x='50%' y='50%' fill='white' font-family='sans-serif' font-size='48' font-weight='bold' text-anchor='middle' dominant-baseline='middle'>EB</text></svg>`;
  return `data:image/svg+xml;utf8,${svg}`;
}
