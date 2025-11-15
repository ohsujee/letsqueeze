import "./globals.css";
import "./animations.css";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";
import { ToastProvider } from "@/lib/contexts/ToastContext";

export const metadata = { title: "Let'sQueeeze", description: "Quiz buzzer temps réel" };

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning data-theme="dark">
      <body className="min-h-screen">
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
