import { useEffect, useState } from "react";

import type { HelpdeskArticle } from "../supportChat/types";
import { buildSupportApiUrl } from "./apiUrl";

interface UseHelpdeskArticlesResult {
  articles: HelpdeskArticle[];
  isLoading: boolean;
}

export const useHelpdeskArticles = (
  apiPath: string,
  organizationId: string,
  widgetKey?: string | null,
  apiBaseUrl?: string | null,
  limit = 6,
): UseHelpdeskArticlesResult => {
  const [articles, setArticles] = useState<HelpdeskArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!organizationId || typeof window === "undefined") {
      return;
    }
    const widgetKeyValue =
      typeof widgetKey === "string" ? widgetKey.trim() : "";
    if (widgetKeyValue.length === 0) {
      setArticles([]);
      return;
    }

    let cancelled = false;

    async function loadArticles() {
      setIsLoading(true);
      try {
        const url = new URL(
          buildSupportApiUrl({
            path: apiPath,
            apiBaseUrl,
          }),
        );
        url.searchParams.set("organizationId", organizationId);
        url.searchParams.set("widgetKey", widgetKeyValue);
        url.searchParams.set("view", "helpdesk");
        url.searchParams.set("limit", String(limit));
        const response = await fetch(url.toString());
        if (!response.ok) {
          const errorBody = (await response
            .json()
            .catch(() => null)) as { error?: unknown } | null;
          const message =
            typeof errorBody?.error === "string" && errorBody.error.trim().length > 0
              ? errorBody.error
              : "Failed to load helpdesk articles";
          throw new Error(message);
        }
        const data: { articles?: HelpdeskArticle[] } = await response.json();
        if (!cancelled) {
          setArticles(data.articles ?? []);
        }
      } catch (error) {
        console.error("[support-chat] failed to load helpdesk articles", error);
        if (!cancelled) {
          setArticles([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadArticles();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, apiPath, organizationId, limit, widgetKey]);

  return { articles, isLoading };
};
