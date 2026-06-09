"use client";

import { useCallback, useEffect, useState } from "react";

export const useSupportSessionState = (
  initialThreadId?: string,
  basePath?: string,
) => {
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(
    initialThreadId,
  );

  useEffect(() => {
    setActiveThreadId((prev) => prev ?? initialThreadId);
  }, [initialThreadId]);

  const syncHistory = useCallback(
    (threadId: string) => {
      if (typeof window === "undefined" || !basePath) {
        return;
      }
      const url = new URL(window.location.href);
      const targetPath = basePath ?? url.pathname;
      url.pathname = targetPath;
      url.searchParams.set("threadId", threadId);
      url.searchParams.delete("sessionId");
      window.history.replaceState(null, "", url.toString());
    },
    [basePath],
  );

  const handleSelectConversation = useCallback(
    (threadId: string) => {
      setActiveThreadId(threadId);
      syncHistory(threadId);
    },
    [syncHistory],
  );

  return {
    activeSessionId: activeThreadId,
    setActiveSessionId: setActiveThreadId,
    handleSelectConversation,
  };
};
