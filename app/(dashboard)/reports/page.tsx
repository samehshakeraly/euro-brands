import { redirect } from "next/navigation";

// تم دمج صفحة التقارير ضمن /dashboard — إعادة التوجيه دائماً
export default function ReportsPage(): never {
  redirect("/dashboard");
}
