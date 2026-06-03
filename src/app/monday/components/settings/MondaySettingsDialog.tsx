"use client";

import type { ReactNode } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@launchthatapp/ui/dialog";

type MondaySettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export const MondaySettingsDialog = ({ open, onOpenChange, children }: MondaySettingsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Board Settings</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
};
