import clsx, { type ClassValue } from "clsx";

// دمج أصناف Tailwind بشكل شرطي
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
