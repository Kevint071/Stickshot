import type { Metadata, Viewport } from "next";
import { Archivo, Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { MotionProvider } from "@/components/motion-provider";
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

// Display expandida (eje wdth) para titulares y cifras grandes: el aire de
// panel de instrumento que Geist sola no da.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "Stickshot",
  description:
    "Metrónomo, registro de práctica de rudimentos y récords de velocidad",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2efe9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0a09" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html
      lang="es"
      data-theme={themeAttribute(theme)}
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* Extensiones del navegador (p. ej. ColorZilla, Dark Reader) añaden atributos
          a <html> y <body> antes de hidratar; solo se ignoran los atributos de
          estos elementos. */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
