import type {
  BranchValue,
  CategoryValue,
  DiscountTypeValue,
} from "./constants";

// الأنواع المشتركة بين الواجهة والـ API (نسخة قابلة للتسلسل JSON)

export interface VariantDTO {
  id: string;
  productId: string;
  size: string;
  quantity: number;
  minQuantity: number;
  branch: BranchValue;
  price: number;
}

export interface ProductDTO {
  id: string;
  name: string;
  brand: string;
  category: CategoryValue;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  images: string[];
  variants: VariantDTO[];
  totalQuantity: number;
  soldCount?: number; // إجمالي القطع المباعة (للترتيب بالأكثر مبيعاً)
  createdAt: string;
  updatedAt: string;
}

export interface BrandDTO {
  id: string;
  name: string;
  category: CategoryValue;
}

export interface BrandInput {
  name: string;
  category: CategoryValue;
}

// تنبيهات قلة المخزون (الكمية <= الحد الأدنى للمقاس)
export interface LowStockItem {
  id: string;
  productName: string;
  brand: string;
  branch: BranchValue;
  size: string;
  quantity: number;
  minQuantity: number;
}

export interface LowStockResponse {
  count: number;
  items: LowStockItem[];
}

export interface SaleItemDTO {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  productName: string;
  brand: string;
  size: string;
}

export interface SaleDTO {
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
  createdAt: string;
  items: SaleItemDTO[];
  itemsCount?: number;
}

// مدخلات إنشاء/تعديل المنتج
export interface VariantInput {
  id?: string; // موجود عند التعديل، غير موجود عند الإضافة
  size: string;
  quantity: number;
  minQuantity: number;
  branch: BranchValue;
  price: number;
}

export interface ProductInput {
  name: string;
  brand: string;
  category: CategoryValue;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  images: string[];
  variants: VariantInput[];
}

// استيراد الجرد من Excel
export interface ImportRow {
  name: string;
  brand: string;
  category: CategoryValue;
  branch: BranchValue;
  size: string;
  quantity: number;
  price: number;
}

export interface ImportResult {
  totalRows: number;
  newProducts: number;
  newVariants: number;
  updatedVariants: number;
}

// مدخلات إنشاء فاتورة
export interface SaleItemInput {
  variantId: string;
  quantity: number;
}

export interface SaleInput {
  branch: BranchValue;
  items: SaleItemInput[];
  discountType: DiscountTypeValue | null;
  discountValue: number;
  customerName?: string | null;
  customerPhone?: string | null;
  customerNotes?: string | null;
}

// إحصائيات لوحة التحكم
export interface DashboardStats {
  todaySales: number;
  todaySalesCount: number;
  rangeSales: number;
  rangeSalesCount: number;
  branchComparison: { branch: BranchValue; total: number; count: number }[];
  topProduct: { name: string; brand: string; quantity: number } | null;
  lowStockCount: number;
  dailySales: { date: string; total: number }[];
  categoryBreakdown: { category: CategoryValue; total: number }[];
  recentSales: SaleDTO[];
}

// رؤية ذكية واحدة (من Gemini أو القواعد)
export interface Insight {
  title: string;
  description: string;
  type: "success" | "warning" | "danger";
  category: string;
}

export interface InsightsResponse {
  insights: Insight[];
  source: "ai" | "rules";
  generatedAt: string;
}

// بيانات صفحة التقارير
export interface ReportsData {
  totalSales: number;
  invoicesCount: number;
  itemsSold: number;
  avgInvoice: number;
  byBranch: { branch: BranchValue; total: number; count: number }[];
  byCategory: { category: CategoryValue; total: number; qty: number }[];
  dailySales: { date: string; total: number }[];
  topProducts: {
    name: string;
    brand: string;
    qty: number;
    revenue: number;
  }[];
  lowStock: {
    id: string;
    productName: string;
    brand: string;
    size: string;
    branch: BranchValue;
    quantity: number;
  }[];
}
