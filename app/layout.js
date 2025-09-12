import "./globals.css";
export const metadata = { title: "Let’sQueeeze", description: "Quiz buzzer temps réel" };
export default function RootLayout({ children }) {
  return (<html lang="fr"><body className="min-h-screen">{children}</body></html>);
}
