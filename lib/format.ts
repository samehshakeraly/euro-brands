import { CURRENCY } from "./constants";

// تنسيق الأرقام والعملة والتواريخ بالعربية

const numberFormatter = new Intl.NumberFormat("ar-EG", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatNumber(value: number): string {
  if (Number.isNaN(value) || value == null) return "0";
  return numberFormatter.format(value);
}

export function formatCurrency(value: number): string {
  return `${formatNumber(value)} ${CURRENCY}`;
}

const dateFormatter = new Intl.DateTimeFormat("ar-EG", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ar-EG", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(date: string | Date): string {
  return dateFormatter.format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return dateTimeFormatter.format(new Date(date));
}

// رقم الفاتورة بصيغة #000123
export function formatSaleNumber(n: number): string {
  return `#${String(n).padStart(6, "0")}`;
}
