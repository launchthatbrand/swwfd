import "~/app/styles.css";

import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata, Viewport } from "next";

import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Providers } from "./providers";
import StandardLayout from "@launchthatapp/ui/layout/StandardLayout";

import { ThemeProvider } from "@launchthatapp/ui/theme";
import { Toaster } from "@launchthatapp/ui/toast";
import { cn } from "@launchthatapp/ui";
import { env } from "~/env";
import { headers } from "next/headers";


export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "SWWFD | Job Search Platform",
  description: "Search and apply for jobs.",
  openGraph: {
    title: "SWWFD | Job Search Platform",
    description: "Search and apply for jobs.",
    url: env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    siteName: "SWWFD",
  },
  twitter: {
    card: "summary_large_image",
    site: "@launchthat",
    creator: "@launchthat",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default async function RootLayout(props: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  header: React.ReactNode;
  footer: React.ReactNode;
}) {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const pathnameHeader = headerList.get("x-pathname");
  const pathname =
    typeof pathnameHeader === "string" && pathnameHeader.length > 0
      ? pathnameHeader
      : "/";
  const hasPathnameHeader = Boolean(pathnameHeader && pathnameHeader.length > 0);

  const segments = pathname
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const firstSegment = segments[0] ?? "";

  const fallbackShowSidebar = props.sidebar !== null;
  const fallbackShowHeader = props.header !== null;

  let showHeader = fallbackShowHeader;
  let showSidebar = fallbackShowSidebar;
  if (hasPathnameHeader) {
    showHeader = true;
    showSidebar = firstSegment === "admin" || firstSegment === "dashboard";
    if (
      firstSegment === "sign-in" ||
      firstSegment === "sign-up" ||
      firstSegment === "checkout"
    ) {
      showHeader = false;
      showSidebar = false;
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "bg-background text-foreground min-h-screen overflow-hidden font-sans antialiased",
          geistSans.variable,
          geistMono.variable,
        )}
      >
        {await ConvexAuthNextjsServerProvider({
          children: (
            <Providers host={host}>
              <ThemeProvider>
                <StandardLayout
                    appName="SWWFD"
                    sidebar={showSidebar ? props.sidebar : undefined}
                    header={showHeader ? props.header : null}
                    footer={props.footer}
                    showSidebar={showSidebar}
                    className={cn(
                      "shadow-[-12px_0_10px_-3px_rgba(0,0,0,0.3)] max-h-screen dark:shadow-[0_4px_6px_-1px_rgba(255,255,255,0.15),0_2px_4px_-2px_rgba(255,255,255,0.1)] rounded-3xl!",
                      showSidebar ? "ml-0!" : "m-2!",
                    )}
                    sidebarOpenOnHover={true}
                    sidebarDefaultOpen={false}
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      {props.children}
                    </div>
                  </StandardLayout>
                <Toaster />
              </ThemeProvider>
            </Providers>
          ),
        })}
      </body>
    </html>
  );
}
