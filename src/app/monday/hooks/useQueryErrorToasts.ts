import { useEffect } from "react";
import { toast } from "@launchthatapp/ui/toast";

/**
 * Shows a toast.error whenever any of the provided errors is set.
 * Replaces ~10 identical useEffect blocks that each do the same thing.
 *
 * @param entries Array of [error, shouldShow] tuples.
 *   `shouldShow` defaults to `true`; set to `false` to skip (e.g. staticMode, dialog closed).
 *
 * IMPORTANT: The number and order of entries must be stable across renders (React hooks rules).
 */
export const useQueryErrorToast = (
  error: Error | null,
  shouldShow: boolean,
) => {
  useEffect(() => {
    if (!shouldShow) return;
    if (!error) return;
    const message =
      error instanceof Error ? error.message : "Unknown loading error";
    toast.error(message);
  }, [error, shouldShow]);
};
