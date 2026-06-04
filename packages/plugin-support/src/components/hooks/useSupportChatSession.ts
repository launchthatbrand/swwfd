import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buildSupportApiUrl } from "./apiUrl";

const getStoredValue = (key: string) => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(key);
};

export const useSupportChatThread = (
  organizationId: string,
  threadApiPath: string,
  widgetKey?: string | null,
  apiBaseUrl?: string | null,
) => {
  const storageKey = useMemo(
    () => `support-thread-${organizationId}`,
    [organizationId],
  );
  const sessionKey = useMemo(
    () => `support-client-session-${organizationId}`,
    [organizationId],
  );

  const [threadId, setThreadId] = useState<string | null>(() => {
    const stored = getStoredValue(storageKey);
    if (stored) {
      return stored;
    }
    return null;
  });

  const [clientSessionId, setClientSessionId] = useState<string | null>(() => {
    const stored = getStoredValue(sessionKey);
    if (stored) {
      return stored;
    }
    return null;
  });
  const lastLookupKeyRef = useRef<string | null>(null);

  const persist = useCallback(
    (value: string) => {
      setThreadId(value);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, value);
      }
    },
    [storageKey],
  );

  const persistClientSessionId = useCallback(
    (value: string) => {
      setClientSessionId(value);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(sessionKey, value);
      }
    },
    [sessionKey],
  );

  useEffect(() => {
    const stored = getStoredValue(sessionKey);
    if (stored) {
      setClientSessionId(stored);
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const newId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    persistClientSessionId(newId);
  }, [persistClientSessionId, sessionKey]);

  useEffect(() => {
    const stored = getStoredValue(storageKey);
    if (stored) {
      setThreadId(stored);
      return;
    }
    if (!clientSessionId || threadId) return;
    // Lazy-thread mode: do not call /thread at widget boot.
    // Use session id as local key; backend creates canonical thread
    // on first user message or contact capture.
    persist(clientSessionId);
  }, [clientSessionId, persist, storageKey, threadId]);

  const resetThread = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem(sessionKey);
    }
    setThreadId(null);
    setClientSessionId(null);
  }, [sessionKey, storageKey]);

  useEffect(() => {
    const hasWidgetKey = typeof widgetKey === "string" && widgetKey.trim().length > 0;
    if (!hasWidgetKey || !clientSessionId) {
      return;
    }
    const lookupKey = `${organizationId}:${clientSessionId}`;
    if (lastLookupKeyRef.current === lookupKey) {
      return;
    }
    lastLookupKeyRef.current = lookupKey;

    const controller = new AbortController();
    const resolveThread = async () => {
      try {
        const url = new URL(
          buildSupportApiUrl({
            path: threadApiPath,
            apiBaseUrl: apiBaseUrl ?? null,
          }),
        );
        url.searchParams.set("organizationId", organizationId);
        url.searchParams.set("widgetKey", widgetKey);
        url.searchParams.set("clientSessionId", clientSessionId);

        const response = await fetch(url.toString(), {
          method: "GET",
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { threadId?: string };
        if (typeof data.threadId === "string" && data.threadId.trim().length > 0) {
          persist(data.threadId);
        }
      } catch {
        // Ignore background resolution errors and keep local session id fallback.
      }
    };

    void resolveThread();
    return () => controller.abort();
  }, [
    apiBaseUrl,
    clientSessionId,
    organizationId,
    persist,
    threadApiPath,
    widgetKey,
  ]);

  return { threadId, clientSessionId, resetThread, bindThreadId: persist };
};
