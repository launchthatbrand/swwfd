"use client";

import { Button } from "@launchthatapp/ui/button";
import { Calendar } from "@launchthatapp/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@launchthatapp/ui/popover";

export type DatePickerPopoverProps = {
  /** ISO date string (`YYYY-MM-DD`) or empty string when unset. */
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toDateOnlyLocal: (date: Date) => string;
  placeholder?: string;
  /** When false, calendar popover renders inline (needed inside modal dialogs). */
  portal?: boolean;
  disabled?: boolean;
  showClear?: boolean;
};

export const DatePickerPopover = ({
  value,
  onChange,
  open,
  onOpenChange,
  toDateOnlyLocal,
  placeholder = "Select date",
  portal = false,
  disabled = false,
  showClear = true,
}: DatePickerPopoverProps) => {
  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-9 flex-1 justify-start font-normal"
            disabled={disabled}
          >
            {value || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start" portal={portal}>
          <Calendar
            mode="single"
            selected={value ? new Date(`${value}T00:00:00`) : undefined}
            onSelect={(date) => {
              if (!date) return;
              onChange(toDateOnlyLocal(date));
              onOpenChange(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {showClear ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange("")}
          disabled={disabled || !value}
        >
          Clear
        </Button>
      ) : null}
    </div>
  );
};
