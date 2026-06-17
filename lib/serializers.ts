import type {
  ActivityLog,
  Brand,
  Product,
  ProductType,
  ProductVariant,
  Sale,
  SaleItem,
} from "@prisma/client";
import type { BranchValue, CategoryValue } from "./constants";
import type {
  ActivityLogDTO,
  BrandDTO,
  ProductDTO,
  ProductTypeDTO,
  SaleDTO,
  VariantDTO,
} from "./types";

export function toBrandDTO(b: Brand): BrandDTO {
  return { id: b.id, name: b.name, category: b.category as CategoryValue };
}

export function toActivityLogDTO(a: ActivityLog): ActivityLogDTO {
  return {
    id: a.id,
    userName: a.userName,
    userRole: a.userRole,
    action: a.action,
    details: a.details ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

export function toProductTypeDTO(t: ProductType): ProductTypeDTO {
  return {
    id: t.id,
    name: t.name,
    code: t.code,
    category: t.category as CategoryValue,
  };
}

export function toVariantDTO(v: ProductVariant): VariantDTO {
  return {
    id: v.id,
    productId: v.productId,
    size: v.size,
    color: v.color ?? null,
    sku: v.sku ?? null,
    quantity: v.quantity,
    minQuantity: v.minQuantity,
    branch: v.branch as BranchValue,
    price: v.price,
  };
}

type ProductWithVariants = Product & {
  variants: ProductVariant[];
  productType?: ProductType | null;
};

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
    productTypeId: p.productTypeId ?? null,
    productTypeName: p.productType?.name ?? null,
    productTypeCode: p.productType?.code ?? null,
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
  variant: { size: string; color?: string | null };
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
    cashierName: s.cashierName ?? null,
    paymentMethod: s.paymentMethod as SaleDTO["paymentMethod"],
    transferMethod: (s.transferMethod as SaleDTO["transferMethod"]) ?? null,
    invoiceNotes: s.invoiceNotes,
    paidAmount: s.paidAmount,
    remainingAmount: s.remainingAmount,
    status: s.status as SaleDTO["status"],
    cancellationReason: s.cancellationReason,
    isDelivery: s.isDelivery,
    orderSource: s.orderSource,
    deliveryMethod: (s.deliveryMethod as SaleDTO["deliveryMethod"]) ?? null,
    deliveryAddress: s.deliveryAddress,
    addressNotes: s.addressNotes,
    trackingNumber: s.trackingNumber,
    deliveryStatus: (s.deliveryStatus as SaleDTO["deliveryStatus"]) ?? null,
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
      color: it.variant.color ?? null,
    })),
    itemsCount: s.items.reduce((sum, it) => sum + it.quantity, 0),
  };
}
