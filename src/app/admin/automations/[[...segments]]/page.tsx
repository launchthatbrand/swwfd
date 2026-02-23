"use client";

import { useEffect } from "react";
import type { ComponentType } from "react";
import config from "~/activepieces.config";
import dynamic from "next/dynamic";

type ActivepiecesPageComponent = ComponentType<{
  config: unknown;
  getAuthToken: () => Promise<string | null>;
}>;

const ActivepiecesPage = dynamic(async () => {
  const mod = await import("@launchthatbrand/activepieces-ui");
  return mod.ActivepiecesPage as unknown as ActivepiecesPageComponent;
}, { ssr: false }) as unknown as ActivepiecesPageComponent;

const isTokenResponse = (value: unknown): value is { token: string } => {
  if (typeof value !== "object" || value === null) return false;
  if (!("token" in value)) return false;
  return typeof (value as { token?: unknown }).token === "string";
};

const getAuthToken = async (): Promise<string | null> => {
  const res = await fetch("/api/admin/activepieces-token", {
    method: "GET",
    headers: { "content-type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const json: unknown = await res.json();
  return isTokenResponse(json) ? json.token : null;
};

export default function AdminAutomationsPage() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("ap-hsl-vars");
    return () => {
      root.classList.remove("ap-hsl-vars");
    };
  }, []);

  return <ActivepiecesPage config={config as unknown} getAuthToken={getAuthToken} />;
}

