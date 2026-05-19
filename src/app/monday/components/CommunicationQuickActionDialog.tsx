"use client";

import { useEffect, useState } from "react";
import { Button } from "@launchthatapp/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@launchthatapp/ui/dialog";
import { Input } from "@launchthatapp/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@launchthatapp/ui/select";
import { Textarea } from "@launchthatapp/ui/textarea";

type CommunicationMethodOption = "Email" | "Text" | "Phone Call";

interface CommunicationQuickActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel: string;
  defaultMethod: CommunicationMethodOption;
  isSubmitting: boolean;
  onSubmit: (values: {
    body: string;
    methodOfCommunication: CommunicationMethodOption;
    date: string;
    time: string;
  }) => Promise<void>;
}

const toDateOnly = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toTimeOnly = (value: Date) => {
  const hour = String(value.getHours()).padStart(2, "0");
  const minute = String(value.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
};

export const CommunicationQuickActionDialog = ({
  open,
  onOpenChange,
  actionLabel,
  defaultMethod,
  isSubmitting,
  onSubmit,
}: CommunicationQuickActionDialogProps) => {
  const [methodOfCommunication, setMethodOfCommunication] =
    useState<CommunicationMethodOption>(defaultMethod);
  const [date, setDate] = useState(toDateOnly(new Date()));
  const [time, setTime] = useState(toTimeOnly(new Date()));
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    setMethodOfCommunication(defaultMethod);
    setDate(toDateOnly(now));
    setTime(toTimeOnly(now));
    setBody("");
  }, [defaultMethod, open]);

  const handleSubmit = async () => {
    const normalizedBody = body.trim();
    if (!normalizedBody) return;
    await onSubmit({
      body: normalizedBody,
      methodOfCommunication,
      date,
      time,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{actionLabel}</DialogTitle>
          <DialogDescription>
            Log this communication with date/time and notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Method</label>
            <Select
              value={methodOfCommunication}
              onValueChange={(value) =>
                setMethodOfCommunication(value as CommunicationMethodOption)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="Text">Text</SelectItem>
                <SelectItem value="Phone Call">Phone Call</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={date}
                max={toDateOnly(new Date())}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Time</label>
              <Input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Comments</label>
            <Textarea
              rows={4}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Add notes about this communication..."
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={isSubmitting || body.trim().length === 0}
          >
            {isSubmitting ? "Saving..." : "Save Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
