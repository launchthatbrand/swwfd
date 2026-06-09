"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import { Input } from "@launchthatapp/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@launchthatapp/ui/popover";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "~/lib/utils";

interface MultiSelectOption {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  defaultValue?: string[];
  onValueChange?: (values: string[]) => void;
  placeholder?: string;
  disablePortal?: boolean;
  popoverSide?: "top" | "right" | "bottom" | "left";
  popoverAvoidCollisions?: boolean;
  className?: string;
  disabled?: boolean;
}

export const MultiSelect = ({
  options,
  defaultValue = [],
  onValueChange,
  placeholder = "Select options",
  disablePortal = false,
  popoverSide = "bottom",
  popoverAvoidCollisions = true,
  className,
  disabled = false,
}: MultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedValues, setSelectedValues] = useState<string[]>(defaultValue);

  useEffect(() => {
    setSelectedValues(defaultValue);
  }, [defaultValue]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalizedSearch) ||
        option.value.toLowerCase().includes(normalizedSearch),
    );
  }, [options, searchTerm]);

  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedSet.has(option.value)),
    [options, selectedSet],
  );

  const commitValues = (nextValues: string[]) => {
    setSelectedValues(nextValues);
    onValueChange?.(nextValues);
  };

  const handleToggleOption = (value: string) => {
    if (selectedSet.has(value)) {
      commitValues(selectedValues.filter((item) => item !== value));
      return;
    }
    commitValues([...selectedValues, value]);
  };

  const handleClear = () => {
    commitValues([]);
  };

  const handleSelectAll = () => {
    commitValues(options.map((option) => option.value));
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("h-auto min-h-9 w-full justify-between px-3 py-2", className)}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {selectedOptions.length > 0 ? (
              <>
                {selectedOptions.slice(0, 2).map((option) => (
                  <Badge key={option.value} variant="secondary" className="max-w-full truncate">
                    {option.label}
                  </Badge>
                ))}
                {selectedOptions.length > 2 ? (
                  <Badge variant="secondary">+{selectedOptions.length - 2} more</Badge>
                ) : null}
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-64 p-2"
        align="start"
        side={popoverSide}
        avoidCollisions={popoverAvoidCollisions}
        portal={!disablePortal}
      >
        <div className="space-y-2">
          <div className="relative">
            <Input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
              }}
              placeholder="Search options..."
              className="pr-8"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div
            className="max-h-56 space-y-1 overflow-y-auto overscroll-contain pr-1"
            onWheel={(event) => {
              event.stopPropagation();
            }}
            onTouchMove={(event) => {
              event.stopPropagation();
            }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = selectedSet.has(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                      isSelected ? "bg-accent/60" : "",
                    )}
                    onClick={() => {
                      handleToggleOption(option.value);
                    }}
                  >
                    <span
                      className={cn(
                        "border-input bg-background flex h-4 w-4 items-center justify-center rounded-[3px] border",
                        isSelected ? "bg-primary border-primary text-primary-foreground" : "",
                      )}
                    >
                      {isSelected ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })
            ) : (
              <p className="text-muted-foreground px-2 py-3 text-sm">No results found.</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={handleSelectAll}
              disabled={options.length === 0}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={handleClear}
              disabled={selectedValues.length === 0}
            >
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
