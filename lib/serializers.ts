import type {
  Brand,
  Product,
  ProductVariant,
  Sale,
  SaleItem,
} from "@prisma/client";
import type { BranchValue, CategoryValue } from "./constants";
import type { BrandDTO, ProductDTO, SaleDTO, VariantDTO } from "./types";

export function toBrandDTO(b: Brand): BrandDTO {
  return { id: b.id, name: b.name, category: b.category as CategoryValue };
}

export function toVariantDTO(v: ProductVariant): VariantDTO {
  return {
    id: v.id,
    productId: v.productId,
    size: v.size,
    quantity: v.quantity,
    minQuantity: v.minQuantity,
    branch: v.branch as BranchValue,
    price: v.price,
  };
}

type ProductWithVariants = Product & { variants: ProductVariant[] };

export function toProductDTO(
  p: ProductWithVariants,
  soldCount?: number
): ProductDTO {
  const variants = p.variants.map(toVariantDTO);
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category as CategoryValue,
    description: p.description,
    sku: p.sku,
    barcode: p.barcode,
    images: p.images,
    variants,
    totalQuantity: variants.reduce((sum, v) => sum + v.quantity, 0),
    ...(soldCount !== undefined ? { soldCount } : {}),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

type SaleItemWithRefs = SaleItem & {
  product: { name: string; brand: string };
  variant: { size: string };
};
type SaleWithItems = Sale & { items: SaleItemWithRefs[] };

export function toSaleDTO(s: SaleWithItems): SaleDTO {
  return {
    id: s.id,
    saleNumber: s.saleNumber,
    branch: s.branch as BranchValue,
    totalAmount: s.totalAmount,
    discountType: s.discountType,
    discountValue: s.discountValue,
    finalAmount: s.finalAmount,
    customerName: s.customerName,
    customerPhone: s.customerPhone,
    customerNotes: s.customerNotes,
    paymentMethod: s.paymentMethod as SaleDTO["paymentMethod"],
    transferMethod: (s.transferMethod as SaleDTO["transferMethod"]) ?? null,
    invoiceNotes: s.invoiceNotes,
    paidAmount: s.paidAmount,
    remainingAmount: s.remainingAmount,
    status: s.status as SaleDTO["status"],
    cancellationReason: s.cancellationReason,
    createdAt: s.createdAt.toISOString(),
    items: s.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      variantId: it.variantId,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      subtotal: it.subtotal,
      productName: it.product.name,
      brand: it.product.brand,
      size: it.variant.size,
    })),
    itemsCount: s.items.reduce((sum, it) => sum + it.quantity, 0),
  };
}
