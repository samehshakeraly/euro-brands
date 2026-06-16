import type { Metadata, Viewport } from "next";
import { Tajawal } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { ThemeProvider, themeInitScript } from "@/components/theme-provider";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Euro Brands — نظام إدارة المخزون والمبيعات",
  description:
    "نظام داخلي لإدارة المخزون والمبيعات لمتجر Euro Brands بفرعيه في المعادي.",
};

// عرض ملائم للهواتف مع إبقاء إمكانية التكبير اليدوي متاحة
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1e26" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-tajawal), sans-serif",
                direction: "rtl",
              },
              success: { iconTheme: { primary: "#3b9a6e", secondary: "#fff" } },
              error: { iconTheme: { primary: "#d9534f", secondary: "#fff" } },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
