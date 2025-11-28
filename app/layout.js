import "./globals.css";
import "./animations.css";
import { ClientProviders } from "@/lib/providers/ClientProviders";

export const metadata = { title: "Let'sQueeeze", description: "Quiz buzzer temps réel" };

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning data-theme="dark">
      <body className="min-h-screen">
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
