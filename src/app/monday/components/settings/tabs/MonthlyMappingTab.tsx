"use client";

import type { Dispatch, SetStateAction } from "react";

import { Button } from "@launchthatapp/ui/button";
import { Input } from "@launchthatapp/ui/input";

import type { MondayPlatformSettings } from "../../../types";

export type MonthlyMappingTabProps = {
  platformSettingsDraft: MondayPlatformSettings;
  setPlatformSettingsDraft: Dispatch<SetStateAction<MondayPlatformSettings>>;
  monthlyWebhookUrl: string;
  hasUnsavedPlatformSettings: boolean;
  isSavingPlatformSettings: boolean;
  onReset: () => void;
  onSave: () => void | Promise<void>;
};

export const MonthlyMappingTab = ({
  platformSettingsDraft,
  setPlatformSettingsDraft,
  monthlyWebhookUrl,
  hasUnsavedPlatformSettings,
  isSavingPlatformSettings,
  onReset,
  onSave,
}: MonthlyMappingTabProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Monthly Board Mapping</p>
        <p className="text-muted-foreground text-sm">
          Configure which monthly board should sync by month/year.
        </p>
      </div>
      <div className="space-y-3 rounded-md border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Mappings</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const currentMonthKey = new Date()
                .toISOString()
                .slice(0, 7);
              setPlatformSettingsDraft((prev) => ({
                ...prev,
                monthlyBoardMappings: [
                  ...prev.monthlyBoardMappings,
                  { monthKey: currentMonthKey, boardId: "" },
                ],
              }));
            }}
          >
            Add row
          </Button>
        </div>
        {platformSettingsDraft.monthlyBoardMappings.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            No mappings yet. Add at least one month/year to board ID mapping.
          </p>
        ) : (
          <div className="space-y-2">
            {platformSettingsDraft.monthlyBoardMappings.map(
              (mapping, index) => (
                <div
                  key={`${mapping.monthKey}-${mapping.boardId}-${index}`}
                  className="grid gap-2 md:grid-cols-[180px_1fr_auto]"
                >
                  <Input
                    type="month"
                    value={mapping.monthKey}
                    onChange={(event) => {
                      const value = event.target.value;
                      setPlatformSettingsDraft((prev) => ({
                        ...prev,
                        monthlyBoardMappings:
                          prev.monthlyBoardMappings.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, monthKey: value }
                              : entry,
                          ),
                      }));
                    }}
                  />
                  <Input
                    value={mapping.boardId}
                    onChange={(event) => {
                      const value = event.target.value.trim();
                      setPlatformSettingsDraft((prev) => ({
                        ...prev,
                        monthlyBoardMappings:
                          prev.monthlyBoardMappings.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, boardId: value }
                              : entry,
                          ),
                      }));
                    }}
                    placeholder="Monthly board ID"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPlatformSettingsDraft((prev) => ({
                        ...prev,
                        monthlyBoardMappings:
                          prev.monthlyBoardMappings.filter(
                            (_, entryIndex) => entryIndex !== index,
                          ),
                      }));
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ),
            )}
          </div>
        )}
      </div>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
        <p className="text-xs font-semibold tracking-wide uppercase">
          Monthly Board Webhook URL
        </p>
        <p className="mt-1 break-all font-mono text-xs">
          {monthlyWebhookUrl}
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          Configure this URL as a webhook on each mapped monthly board.
          New monthly updates and subitem changes will sync to the linked
          contact in the API board.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={isSavingPlatformSettings || !hasUnsavedPlatformSettings}
          onClick={onReset}
        >
          Reset
        </Button>
        <Button
          size="sm"
          disabled={isSavingPlatformSettings || !hasUnsavedPlatformSettings}
          onClick={() => {
            void onSave();
          }}
        >
          {isSavingPlatformSettings ? "Saving..." : "Save mappings"}
        </Button>
      </div>
    </div>
  );
};
