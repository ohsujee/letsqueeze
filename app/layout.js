import "./globals.css";
import "./animations.css";
import { ClientProviders } from "@/lib/providers/ClientProviders";

export const metadata = {
  title: "Gigglz",
  description: "Jeux de soirée entre amis - Quiz, Blindtest, Alibi et plus"
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // Permet l'accès aux safe-area-inset-*
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning data-theme="dark">
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
