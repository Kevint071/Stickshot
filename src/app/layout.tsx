import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE, themeAttribute } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stickshot",
  description: "Registro de práctica de rudimentos y récords de velocidad",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html
      lang="es"
      data-theme={themeAttribute(theme)}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* Extensiones del navegador (p. ej. ColorZilla) añaden atributos a <body>
          antes de hidratar; solo se ignoran los atributos de este elemento. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
