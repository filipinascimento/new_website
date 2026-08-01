import type { Metadata } from "next";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import "./globals.css";

const themeScript = `
(() => {
  try {
    const saved = localStorage.getItem('filipi-theme');
    const theme = saved === 'light' || saved === 'dark'
      ? saved
      : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (_) {}
})();`;

const assetRoot = process.env.GITHUB_PAGES === "true" ? "/new_website" : "";
const socialImage = "https://filipinascimento.github.io/new_website/og.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://filipinascimento.github.io/new_website/"),
  title: {
    default: "Filipi Nascimento Silva · Network science, AI, and visualization",
    template: "%s · Filipi Nascimento Silva",
  },
  description:
    "Research, publications, software, and teaching by Filipi Nascimento Silva, Research Assistant Professor at Northwestern University.",
  authors: [{ name: "Filipi Nascimento Silva", url: "https://filipinascimento.github.io" }],
  icons: {
    icon: `${assetRoot}/profile.jpg`,
    apple: `${assetRoot}/profile.jpg`,
  },
  openGraph: {
    type: "website",
    title: "Filipi Nascimento Silva",
    description: "Research on networks, scientific change, and usable computational tools.",
    url: "https://filipinascimento.github.io/new_website/",
    siteName: "Filipi Nascimento Silva",
    images: [
      {
        url: socialImage,
        width: 1200,
        height: 630,
        alt: "Filipi Nascimento Silva — I study how knowledge moves",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Filipi Nascimento Silva",
    description: "Research on networks, scientific change, and usable computational tools.",
    images: [socialImage],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
