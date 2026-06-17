"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Store,
  CheckCircle2,
  Package,
  RefreshCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import { useFetch } from "@/lib/use-fetch";
import { apiPost } from "@/lib/client";
import { Card } from "@/components/ui/card";
import { Spinner, PageLoader } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { calcDiscount } from "@/lib/sale-utils";
import { formatCurrency, formatNumber, formatSaleNumber } from "@/lib/format";
import {
  BRANCHES,
  BRANCH_LABELS,
  type BranchValue,
  type DiscountTypeValue,
} from "@/lib/constants";
import type { ProductDTO, SaleDTO } from "@/lib/types";

interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  brand: string;
  size: string;
  unitPrice: number;
  available: number;
  quantity: number;
}

const BRANCH_KEY = "eb-pos-branch";

export default function PosPage() {
  const [branch, setBranch] = useState<BranchValue | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(BRANCH_KEY) as BranchValue | null;
    if (stored && BRANCHES.includes(stored)) setBranch(stored);
    setReady(true);
  }, []);

  function chooseBranch(b: BranchValue) {
    setBranch(b);
    localStorage.setItem(BRANCH_KEY, b);
  }

  if (!ready) return <PageLoader />;

  if (!branch) {
    return <BranchPicker onPick={chooseBranch} />;
  }

  return <PosRegister branch={branch} onChangeBranch={() => setBranch(null)} />;
}

function BranchPicker({ onPick }: { onPick: (b: BranchValue) => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md p-8 text-center" tone="accent">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Store className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-extrabold text-text">اختر الفرع</h1>
        <p className="mt-1 text-sm text-muted">
          حدد الفرع الذي تعمل عليه لبدء جلسة البيع
        </p>
        <div className="mt-6 grid gap-3">
          {BRANCHES.map((b) => (
            <button
              key={b}
              onClick={() => onPick(b)}
              className="btn btn-secondary h-12 text-base hover:border-accent hover:text-accent"
            >
              {BRANCH_LABELS[b]}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PosRegister({
  branch,
  onChangeBranch,
}: {
  branch: BranchValue;
  onChangeBranch: () => void;
}) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<DiscountTypeValue | "NONE">(
    "NONE"
  );
  const [discountValue, setDiscountValue] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastSale, setLastSale] = useState<SaleDTO | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term]);

  const url = `/api/products?branch=${branch}${
    debounced ? `&search=${encodeURIComponent(debounced)}` : ""
  }`;
  const { data, loading, error, refetch } = useFetch<ProductDTO[]>(url);
  const results = data ?? [];

  // ---- عمليات السلة ----
  function addToCart(product: ProductDTO, variant: ProductDTO["variants"][0]) {
    if (variant.quantity <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.variantId === variant.id);
      if (existing) {
        if (existing.quantity >= variant.quantity) {
          toast.error("لا توجد كمية إضافية متاحة");
          return prev;
        }
        return prev.map((i) =>
          i.variantId === variant.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          variantId: variant.id,
          productId: product.id,
          productName: product.name,
          brand: product.brand,
          size: variant.size,
          unitPrice: variant.price,
          available: variant.quantity,
          quantity: 1,
        },
      ];
    });
  }

  function setQty(variantId: string, qty: number) {
    setCart((prev) =>
      prev.map((i) =>
        i.variantId === variantId
          ? { ...i, quantity: Math.min(Math.max(1, qty), i.available) }
          : i
      )
    );
  }

  function removeItem(variantId: string) {
    setCart((prev) => prev.filter((i) => i.variantId !== variantId));
  }

  function resetSale() {
    setCart([]);
    setDiscountType("NONE");
    setDiscountValue("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerNotes("");
  }

  // ---- الإجماليات ----
  const totalAmount = useMemo(
    () => cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    [cart]
  );
  const { discountAmount, finalAmount } = useMemo(
    () =>
      calcDiscount(
        totalAmount,
        discountType === "NONE" ? null : discountType,
        Number(discountValue) || 0
      ),
    [totalAmount, discountType, discountValue]
  );
  const itemsCount = cart.reduce((s, i) => s + i.quantity, 0);

  async function confirmSale() {
    if (cart.length === 0) return toast.error("الفاتورة فارغة");
    setSubmitting(true);
    try {
      const sale = await apiPost<SaleDTO>("/api/sales", {
        branch,
        items: cart.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        discountType: discountType === "NONE" ? null : discountType,
        discountValue: Number(discountValue) || 0,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        customerNotes: customerNotes || null,
      });
      setLastSale(sale);
      toast.success(`تم تسجيل الفاتورة ${formatSaleNumber(sale.saleNumber)}`);
      resetSale();
      refetch(); // تحديث الكميات المتاحة
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر تأكيد البيعة");
      refetch();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pb-24 md:pb-0">
      {/* رأس الصفحة: الفرع الحالي */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-text">نقطة البيع</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <Store className="h-4 w-4" />
            الفرع الحالي:{" "}
            <span className="font-bold text-accent">
              {BRANCH_LABELS[branch]}
            </span>
          </p>
        </div>
        <button onClick={onChangeBranch} className="btn btn-secondary h-9 text-xs">
          <RefreshCcw className="h-4 w-4" />
          تغيير الفرع
        </button>
      </div>

      {lastSale && (
        <Card className="mb-4 flex flex-col items-start gap-2 border-r-4 border-r-success p-4 sm:flex-row sm:items-center sm:gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
          <p className="text-sm text-text">
            تم تسجيل الفاتورة{" "}
            <span className="font-bold">
              {formatSaleNumber(lastSale.saleNumber)}
            </span>{" "}
            بنجاح بإجمالي {formatCurrency(lastSale.finalAmount)}.
          </p>
          <a
            href={`/sales/${lastSale.id}`}
            className="btn btn-ghost h-9 text-sm text-accent sm:mr-auto"
          >
            عرض الفاتورة
          </a>
        </Card>
      )}

      <div className="flex flex-col gap-4 md:flex-row">
        {/* البحث والنتائج (يسار) */}
        <div className="order-1 flex-1 md:order-2">
          <Card className="p-4">
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                autoFocus
                className="input pr-9"
                placeholder="ابحث عن منتج بالاسم أو البراند..."
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>

            {loading ? (
              <PageLoader label="جاري البحث..." />
            ) : error ? (
              <div className="rounded-lg border border-danger/40 bg-[rgba(217,83,79,0.08)] p-4 text-sm text-danger">
                <p className="font-bold">تعذّر تحميل المنتجات</p>
                <p className="mt-1 break-words">{error}</p>
                <button
                  onClick={refetch}
                  className="btn btn-secondary mt-3 h-9 text-xs"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : results.length === 0 ? (
              <EmptyState
                icon={<Package className="h-7 w-7" />}
                title="لا توجد منتجات"
                description={
                  debounced
                    ? `لا توجد منتجات مطابقة لـ "${debounced}" في هذا الفرع.`
                    : "لا توجد منتجات في هذا الفرع بعد."
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {results.map((product) => (
                  <SearchResult
                    key={product.id}
                    product={product}
                    cart={cart}
                    onAdd={addToCart}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* الفاتورة الحالية (يمين) */}
        <div className="order-2 w-full md:order-1 md:w-[400px] md:shrink-0">
          <Card className="p-4 md:sticky md:top-20" tone="accent">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold text-text">
                <ShoppingCart className="h-5 w-5 text-accent" />
                الفاتورة الحالية
              </h2>
              {cart.length > 0 && (
                <span className="badge bg-accent-soft text-accent nums">
                  {formatNumber(itemsCount)} قطعة
                </span>
              )}
            </div>

            {/* عناصر السلة */}
            {cart.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted">
                لم تتم إضافة منتجات بعد.
                <br />
                ابحث وأضف المنتجات من القائمة.
              </div>
            ) : (
              <div className="max-h-[40vh] space-y-2 overflow-y-auto pl-1">
                {cart.map((item) => (
                  <div
                    key={item.variantId}
                    className="rounded-lg border bg-bg p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text">
                          {item.productName}
                        </p>
                        <p className="text-xs text-muted">
                          مقاس {item.size} · {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.variantId)}
                        className="-mr-1 flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-[var(--surface-2)] hover:text-danger"
                        aria-label="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setQty(item.variantId, item.quantity - 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-md border text-muted hover:text-text"
                          aria-label="إنقاص"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          min={1}
                          max={item.available}
                          onChange={(e) =>
                            setQty(item.variantId, Number(e.target.value))
                          }
                          className="input h-10 w-16 px-1 text-center nums"
                        />
                        <button
                          onClick={() => setQty(item.variantId, item.quantity + 1)}
                          disabled={item.quantity >= item.available}
                          className="flex h-10 w-10 items-center justify-center rounded-md border text-muted hover:text-text disabled:opacity-30"
                          aria-label="زيادة"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-text nums">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* بيانات العميل */}
            <details className="mt-4 rounded-lg border">
              <summary className="cursor-pointer px-3 py-3 text-base font-medium text-text">
                بيانات العميل (اختياري)
              </summary>
              <div className="space-y-2 border-t p-3">
                <input
                  className="input"
                  placeholder="اسم العميل"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <input
                  className="input"
                  placeholder="رقم الهاتف"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
                <textarea
                  className="input min-h-[60px] resize-y"
                  placeholder="ملاحظات"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                />
              </div>
            </details>

            {/* الخصم */}
            <div className="mt-4">
              <label className="label">الخصم</label>
              <div className="flex gap-2">
                <select
                  className="input w-auto flex-shrink-0"
                  value={discountType}
                  onChange={(e) =>
                    setDiscountType(e.target.value as DiscountTypeValue | "NONE")
                  }
                >
                  <option value="NONE">بدون</option>
                  <option value="PERCENTAGE">نسبة %</option>
                  <option value="FIXED">مبلغ ثابت</option>
                </select>
                {discountType !== "NONE" && (
                  <input
                    type="number"
                    min={0}
                    className="input nums"
                    placeholder={discountType === "PERCENTAGE" ? "% النسبة" : "المبلغ"}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* الإجماليات */}
            <div className="mt-4 space-y-1.5 border-t pt-4 text-sm">
              <div className="flex justify-between text-muted">
                <span>الإجمالي</span>
                <span className="nums">{formatCurrency(totalAmount)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-warning">
                  <span>الخصم</span>
                  <span className="nums">- {formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-text">
                <span>الصافي</span>
                <span className="nums">{formatCurrency(finalAmount)}</span>
              </div>
            </div>

            <button
              onClick={confirmSale}
              disabled={submitting || cart.length === 0}
              className="btn btn-primary mt-4 hidden h-11 w-full text-base md:inline-flex"
            >
              {submitting ? (
                <Spinner className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              تأكيد البيعة
            </button>
          </Card>
        </div>
      </div>

      {/* شريط تأكيد ثابت أسفل الشاشة (للموبايل — يُستخدم بإبهام واحد) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-surface p-3 shadow-[0_-2px_12px_rgba(0,0,0,0.12)] md:hidden">
        <button
          onClick={confirmSale}
          disabled={submitting || cart.length === 0}
          className="btn btn-primary h-14 w-full justify-between text-base"
        >
          <span className="flex items-center gap-2">
            {submitting ? (
              <Spinner className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            تأكيد البيعة
          </span>
          <span className="flex items-center gap-2 nums">
            {cart.length > 0 && (
              <span className="rounded-md bg-white/20 px-2 py-0.5 text-sm">
                {formatNumber(itemsCount)}
              </span>
            )}
            {formatCurrency(finalAmount)}
          </span>
        </button>
      </div>
    </div>
  );
}

function SearchResult({
  product,
  cart,
  onAdd,
}: {
  product: ProductDTO;
  cart: CartItem[];
  onAdd: (p: ProductDTO, v: ProductDTO["variants"][0]) => void;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-[var(--surface-2)]">
          {product.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0]}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">
              <Package className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-text">{product.name}</p>
          <p className="text-xs text-muted">{product.brand}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {product.variants.map((v) => {
          const inCart = cart.find((c) => c.variantId === v.id)?.quantity ?? 0;
          const out = v.quantity <= 0;
          const maxed = inCart >= v.quantity;
          return (
            <button
              key={v.id}
              disabled={out || maxed}
              onClick={() => onAdd(product, v)}
              title={out ? "نفذت الكمية" : `المتاح: ${v.quantity}`}
              className={cn(
                "inline-flex min-h-[44px] min-w-[3.5rem] items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                out
                  ? "cursor-not-allowed text-muted line-through opacity-60"
                  : "hover:border-accent hover:bg-accent-soft hover:text-accent active:bg-accent-soft",
                inCart > 0 && !out && "border-accent bg-accent-soft text-accent"
              )}
            >
              <span className="nums">{v.size}</span>
              <span className="mr-1 text-xs text-muted nums">
                ({out ? "نفذ" : v.quantity})
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted nums">
        {formatCurrency(product.variants[0]?.price ?? 0)}
      </p>
    </div>
  );
}
