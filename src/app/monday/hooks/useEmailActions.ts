import { useCallback, useState } from "react";
import { toast } from "@launchthatapp/ui/toast";

import { fetchMondayApi } from "../services/monday-api";
import type { MondayApiResponse } from "../types";

interface UseEmailActionsArgs {
  sessionToken: string | null;
}

export const useEmailActions = ({ sessionToken }: UseEmailActionsArgs) => {
  const [isConnectingOutlook, setIsConnectingOutlook] = useState(false);
  const [isDisconnectingOutlook, setIsDisconnectingOutlook] = useState(false);

  const connectOutlook = useCallback(async () => {
    if (!sessionToken) {
      toast.error("Missing Monday session token");
      return;
    }
    setIsConnectingOutlook(true);
    try {
      const data = await fetchMondayApi<
        MondayApiResponse<{ authorizeUrl?: string }>
      >("/api/monday/email/outlook/connect", { sessionToken });
      if (!data.ok || !data.authorizeUrl) {
        throw new Error(data.error ?? "Failed to initialize Outlook OAuth");
      }
      const popup = window.open(data.authorizeUrl, "_blank");
      if (!popup) {
        window.location.assign(data.authorizeUrl);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to initialize Outlook OAuth",
      );
    } finally {
      setIsConnectingOutlook(false);
    }
  }, [sessionToken]);

  const disconnectOutlook = useCallback(
    async (opts?: { onSuccess?: () => Promise<void> }) => {
      if (!sessionToken) {
        toast.error("Missing Monday session token");
        return;
      }
      setIsDisconnectingOutlook(true);
      try {
        const data = await fetchMondayApi<MondayApiResponse>(
          "/api/monday/email/outlook/disconnect",
          { sessionToken, method: "POST" },
        );
        if (!data.ok) {
          throw new Error(data.error ?? "Failed to disconnect Outlook");
        }
        toast.success("Outlook account disconnected");
        await opts?.onSuccess?.();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to disconnect Outlook",
        );
      } finally {
        setIsDisconnectingOutlook(false);
      }
    },
    [sessionToken],
  );

  return {
    isConnectingOutlook,
    isDisconnectingOutlook,
    connectOutlook,
    disconnectOutlook,
  };
};
