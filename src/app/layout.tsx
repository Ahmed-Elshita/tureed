import "../styles/globals.css";

// Root layout is intentionally minimal — locale, <html dir>, and fonts
// are set in app/[locale]/layout.tsx once we know the active language.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
