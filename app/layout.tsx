import type { Metadata, Viewport } from "next";
import "@fontsource/sora/500.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@fontsource/sora/800.css";
import "./globals.css";
import Header from "@/components/Header";

const site = process.env.NEXT_PUBLIC_SITE_URL || "https://moona.ng";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "Moona: every guest list, handled", template: "%s · Moona" },
  description: "Beautiful invitations, RSVPs, approvals, check-in and who's bringing what. For launches, retreats, committee meetings, birthdays and every gathering in between.",
  icons: { icon: "/icon.png", apple: "/apple-icon.png" },
  openGraph: { siteName: "Moona", type: "website", locale: "en_NG" },
};
export const viewport: Viewport = { themeColor: "#12042A", width: "device-width", initialScale: 1, viewportFit: "cover" };

// Sets Day/Night before first paint so there is no flash.
const modeScript = `try{var p=localStorage.getItem("moona-mode")||"auto";var d=p==="auto"?(matchMedia("(prefers-color-scheme: light)").matches?"day":"night"):p;document.documentElement.dataset.mode=d;}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" data-font="sora" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: modeScript }} /></head>
      <body>
        <Header />
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
