import { ok } from "@/lib/api";
import { MOCK_MODE } from "@/lib/mock-store";

export const dynamic = "force-dynamic";

// GET /api/preview-mode — هل التطبيق يعمل ببيانات تجريبية؟
export async function GET() {
  return ok({ mock: MOCK_MODE });
}
