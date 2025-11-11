import "./globals.css";
import "./animations.css";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";

export const metadata = { title: "Let'sQueeeze", description: "Quiz buzzer temps réel" };

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning data-theme="dark">
      <body className="min-h-screen">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
