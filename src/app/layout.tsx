import "~/app/styles.css";

import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata, Viewport } from "next";

import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Providers } from "./providers";
import StandardLayout from "@acme/ui/layout/StandardLayout";
import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider } from "@acme/ui/theme";
import { Toaster } from "@acme/ui/toast";
import { cn } from "@acme/ui";
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
                <TRPCReactProvider>
                  <StandardLayout
                    appName="SWWFD"
                    sidebar={showSidebar ? props.sidebar : undefined}
                    header={showHeader ? props.header : null}
                    footer={props.footer}
                    showSidebar={showSidebar}
                    sidebarOpenOnHover={true}
                    sidebarDefaultOpen={false}
                  >
                    {/* Next.js may insert an extra wrapper <div> around route segments.
                        Make our immediate children lay out in a column so that wrapper
                        stretches to full width (instead of sizing to its content). */}
                    <div className="flex min-w-0 flex-1 flex-col">
                      {props.children}
                    </div>
                  </StandardLayout>
                </TRPCReactProvider>
                <Toaster />
              </ThemeProvider>
            </Providers>
          ),
        })}
      </body>
    </html>
  );
}
