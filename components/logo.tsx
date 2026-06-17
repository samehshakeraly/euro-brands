import { LOGO_PATH } from "@/lib/auth";

// شعار Euro Brands — يدعم استبدال الصورة عبر تعديل LOGO_PATH في lib/auth.ts
export function Logo({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_PATH}
      alt="Euro Brands"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
