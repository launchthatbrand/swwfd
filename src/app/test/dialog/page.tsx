"use client";

// import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../../components/ui/dialog";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@launchthatapp/ui/dialog";

import { Button } from "@launchthatapp/ui/button";

export default function TestDialogPage() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>
              This is a simple test dialog to check centering.
            </DialogDescription>
          </DialogHeader>
          <p>If this is centered on the screen, the dialog works correctly.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
