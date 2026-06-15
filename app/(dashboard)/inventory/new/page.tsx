import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ProductForm } from "@/components/product-form";

export default function NewProductPage() {
  return (
    <div>
      <Link
        href="/inventory"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-text"
      >
        <ArrowRight className="h-4 w-4" />
        رجوع إلى المخزون
      </Link>
      <PageHeader
        title="إضافة منتج جديد"
        description="أدخل بيانات المنتج والمقاسات والكميات لكل فرع"
      />
      <ProductForm />
    </div>
  );
}
