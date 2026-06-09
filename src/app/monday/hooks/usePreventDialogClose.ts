import { useCallback } from "react";
import type { DialogContent } from "@launchthatapp/ui/dialog";
import type { ComponentProps } from "react";

type DialogContentDismissProps = Pick<
  ComponentProps<typeof DialogContent>,
  "onInteractOutside" | "onEscapeKeyDown"
>;

/**
 * Prevents Radix dialog dismiss on outside click and Escape — useful when nested
 * popovers/selects would otherwise close the parent dialog.
 */
export const usePreventDialogClose = (): DialogContentDismissProps => {
  const onInteractOutside = useCallback<
    NonNullable<DialogContentDismissProps["onInteractOutside"]>
  >((event) => {
    event.preventDefault();
  }, []);

  const onEscapeKeyDown = useCallback<
    NonNullable<DialogContentDismissProps["onEscapeKeyDown"]>
  >((event) => {
    event.preventDefault();
  }, []);

  return { onInteractOutside, onEscapeKeyDown };
};
