"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { ProductForm } from "@/components/product-form";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";
import type { ProductDTO } from "@/lib/types";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const { data, loading, error } = useFetch<ProductDTO>(
    `/api/products/${params.id}`
  );

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
        title="تعديل المنتج"
        description={data ? `${data.name} — ${data.brand}` : undefined}
      />

      {loading && <PageLoader />}
      {error && (
        <Card className="p-6 text-center text-danger">
          تعذّر تحميل المنتج: {error}
        </Card>
      )}
      {data && !loading && <ProductForm initial={data} />}
    </div>
  );
}
