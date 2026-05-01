"use client";

import * as React from "react";
import { ConvexReactClient, useQuery } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { usePathname } from "next/navigation";
import { SupportChatWidget, SupportConvexProvider } from "launchthat-plugin-support";
import { HostProvider } from "~/context/HostContext";
import { env } from "~/env";
import { swwfdSupportConvexBindings } from "~/lib/plugins/supportConvexBindings";
import { api } from "../../convex/_generated/api";

interface ProvidersProps {
  children: React.ReactNode;
  host: string;
}

const SWWFD_SUPPORT_ORGANIZATION_ID = "swwfd";

export function Providers({ children, host }: ProvidersProps) {
  const convexClient = React.useMemo(
    () => new ConvexReactClient(String(env.NEXT_PUBLIC_CONVEX_URL)),
    [],
  );

  return (
    <HostProvider host={host}>
      <ConvexAuthNextjsProvider client={convexClient}>
        {children}
        <SupportWidgetBridge />
      </ConvexAuthNextjsProvider>
    </HostProvider>
  );
}

function SupportWidgetBridge() {
  const pathname = usePathname();
  const isMondayUserRoute =
    pathname === "/monday/user" || pathname.startsWith("/monday/user/");
  const getSupportOptionRef = (api as any).plugins.support.options
    .getSupportOption as any;

  const widgetEnabledRaw = useQuery(
    getSupportOptionRef,
    isMondayUserRoute
      ? {
          organizationId: SWWFD_SUPPORT_ORGANIZATION_ID,
          key: "supportWidgetEnabled",
        }
      : "skip",
  ) as unknown;
  const widgetKeyRaw = useQuery(
    getSupportOptionRef,
    isMondayUserRoute
      ? {
          organizationId: SWWFD_SUPPORT_ORGANIZATION_ID,
          key: "supportWidgetKey",
        }
      : "skip",
  ) as unknown;

  const widgetEnabled =
    typeof widgetEnabledRaw === "boolean" ? widgetEnabledRaw : true;
  const widgetKey = typeof widgetKeyRaw === "string" ? widgetKeyRaw : null;
  const shouldShowWidget =
    isMondayUserRoute && widgetEnabled && Boolean(widgetKey);

  if (!shouldShowWidget) {
    return null;
  }

  return (
    <SupportConvexProvider bindings={swwfdSupportConvexBindings}>
      <SupportChatWidget
        organizationId={SWWFD_SUPPORT_ORGANIZATION_ID}
        tenantName="SWWFD"
        widgetKey={widgetKey}
        transportMode="convex"
        defaultContact={null}
        bubbleVariant="flush-right-square"
      />
    </SupportConvexProvider>
  );
}
