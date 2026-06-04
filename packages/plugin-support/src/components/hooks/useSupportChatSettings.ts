import { useEffect, useState } from "react";

import type { SupportChatSettings } from "../../settings";
import { defaultSupportChatSettings } from "../../settings";
import { buildSupportApiUrl } from "./apiUrl";

interface UseSupportChatSettingsResult {
  settings: SupportChatSettings;
  isLoading: boolean;
}

export const useSupportChatSettings = (
  organizationId: string,
  settingsApiPath: string,
  widgetKey?: string | null,
  apiBaseUrl?: string | null,
): UseSupportChatSettingsResult => {
  const [settings, setSettings] = useState<SupportChatSettings>(
    defaultSupportChatSettings,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchSettings() {
      try {
        if (typeof widgetKey !== "string" || widgetKey.trim().length === 0) {
          setSettings(defaultSupportChatSettings);
          return;
        }
        const url = new URL(
          buildSupportApiUrl({
            path: settingsApiPath,
            apiBaseUrl,
          }),
        );
        url.searchParams.set("organizationId", organizationId);
        url.searchParams.set("widgetKey", widgetKey);
        const response = await fetch(url.toString());
        if (!response.ok) {
          const errorBody = (await response
            .json()
            .catch(() => null)) as { error?: unknown } | null;
          const message =
            typeof errorBody?.error === "string" && errorBody.error.trim().length > 0
              ? errorBody.error
              : "Failed to load support settings";
          throw new Error(message);
        }
        const data = await response.json();
        if (!cancelled) {
          setSettings({
            ...defaultSupportChatSettings,
            ...(data.settings ?? {}),
          });
        }
      } catch (error) {
        console.error("[support-chat] settings error", error);
        if (!cancelled) {
          setSettings(defaultSupportChatSettings);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void fetchSettings();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, organizationId, settingsApiPath, widgetKey]);

  return { settings, isLoading };
};
