"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Pencil, Trash2, Package, X } from "lucide-react";
import toast from "react-hot-toast";
import { useFetch } from "@/lib/use-fetch";
import { apiDelete } from "@/lib/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { CategoryBadge, StockBadge, Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ProductDTO } from "@/lib/types";
import {
  BRANCHES,
  BRANCH_LABELS,
  CATEGORIES,
  CATEGORY_LABELS,
  type BranchValue,
} from "@/lib/constants";
import { formatNumber } from "@/lib/format";

interface Filters {
  search: string;
  branch: string;
  category: string;
  brand: string;
  size: string;
}

const EMPTY_FILTERS: Filters = {
  search: "",
  branch: "",
  category: "",
  brand: "",
  size: "",
};

export default function InventoryPage() {
  const { data, loading, error, refetch } =
    useFetch<ProductDTO[]>("/api/products");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [toDelete, setToDelete] = useState<ProductDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const products = data ?? [];

  // خيارات الفلاتر المشتقة من البيانات
  const brands = useMemo(
    () => [...new Set(products.map((p) => p.brand))].sort(),
    [products]
  );
  const sizes = useMemo(
    () =>
      [
        ...new Set(products.flatMap((p) => p.variants.map((v) => v.size))),
      ].sort(),
    [products]
  );

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !`${p.name} ${p.brand}`.toLowerCase().includes(q)) return false;
      if (filters.category && p.category !== filters.category) return false;
      if (filters.brand && p.brand !== filters.brand) return false;
      const variantMatch = p.variants.some(
        (v) =>
          (!filters.branch || v.branch === filters.branch) &&
          (!filters.size || v.size === filters.size)
      );
      if ((filters.branch || filters.size) && !variantMatch) return false;
      return true;
    });
  }, [products, filters]);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/products/${toDelete.id}`);
      toast.success("تم حذف المنتج بنجاح");
      setToDelete(null);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر حذف المنتج");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="المخزون"
        description="إدارة المنتجات والكميات في الفرعين"
        actions={
          <Link href="/inventory/new" className="btn btn-primary">
            <Plus className="h-4 w-4" />
            إضافة منتج
          </Link>
        }
      />

      {/* شريط الفلاتر */}
      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="input pr-9"
              placeholder="بحث بالاسم أو البراند..."
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
            />
          </div>

          <select
            className="input"
            value={filters.branch}
            onChange={(e) =>
              setFilters((f) => ({ ...f, branch: e.target.value }))
            }
          >
            <option value="">كل الفروع</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {BRANCH_LABELS[b]}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={filters.category}
            onChange={(e) =>
              setFilters((f) => ({ ...f, category: e.target.value }))
            }
          >
            <option value="">كل الفئات</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={filters.brand}
            onChange={(e) =>
              setFilters((f) => ({ ...f, brand: e.target.value }))
            }
          >
            <option value="">كل البراندات</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={filters.size}
            onChange={(e) => setFilters((f) => ({ ...f, size: e.target.value }))}
          >
            <option value="">كل المقاسات</option>
            {sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            className="btn btn-ghost mt-3 h-8 px-2 text-xs"
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            <X className="h-4 w-4" />
            مسح الفلاتر
          </button>
        )}
      </Card>

      {loading && <PageLoader />}
      {error && (
        <Card className="p-6 text-center text-danger">
          تعذّر تحميل المنتجات: {error}
        </Card>
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title={
            products.length === 0
              ? "لا توجد منتجات بعد"
              : "لا توجد نتائج مطابقة"
          }
          description={
            products.length === 0
              ? "ابدأ بإضافة أول منتج إلى المخزون."
              : "جرّب تعديل الفلاتر أو كلمة البحث."
          }
          action={
            products.length === 0 ? (
              <Link href="/inventory/new" className="btn btn-primary">
                <Plus className="h-4 w-4" />
                إضافة منتج
              </Link>
            ) : undefined
          }
        />
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              branchFilter={filters.branch as BranchValue | ""}
              onDelete={() => setToDelete(product)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="حذف المنتج"
        message={`هل أنت متأكد من حذف "${toDelete?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function ProductCard({
  product,
  branchFilter,
  onDelete,
}: {
  product: ProductDTO;
  branchFilter: BranchValue | "";
  onDelete: () => void;
}) {
  const variants = branchFilter
    ? product.variants.filter((v) => v.branch === branchFilter)
    : product.variants;
  const totalQty = variants.reduce((s, v) => s + v.quantity, 0);
  const image = product.images[0];

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] w-full bg-[var(--surface-2)]">
        {image ? (
          // صور خارجية متنوعة — نستخدم img عادي لتجنب قيود النطاقات
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <Package className="h-10 w-10" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="font-bold leading-tight text-text">{product.name}</h3>
        </div>
        <p className="text-sm text-muted">{product.brand}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CategoryBadge category={product.category} />
          <StockBadge quantity={totalQty} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {BRANCHES.filter(
            (b) => !branchFilter || b === branchFilter
          ).map((b) => {
            const qty = product.variants
              .filter((v) => v.branch === b)
              .reduce((s, v) => s + v.quantity, 0);
            return (
              <Badge key={b} className="text-[11px]">
                {BRANCH_LABELS[b]}: {formatNumber(qty)}
              </Badge>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2 border-t pt-3">
          <Link
            href={`/inventory/${product.id}/edit`}
            className="btn btn-secondary h-9 flex-1 text-xs"
          >
            <Pencil className="h-4 w-4" />
            تعديل
          </Link>
          <button
            onClick={onDelete}
            className="btn btn-ghost h-9 w-9 !px-0 text-danger hover:bg-[rgba(217,83,79,0.12)]"
            aria-label="حذف"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
