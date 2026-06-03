"use client";

import type { Dispatch, SetStateAction } from "react";

import { Button } from "@launchthatapp/ui/button";
import { Input } from "@launchthatapp/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@launchthatapp/ui/select";
import { Textarea } from "@launchthatapp/ui/textarea";
import { toast } from "@launchthatapp/ui/toast";

import { uniqueSorted } from "../../../helpers";
import type { MondayEmailSystemTag, MondayPlatformSettings } from "../../../types";

const EMAIL_TEMPLATE_TAG_KEY_PATTERN = /^[a-z][a-z0-9_.-]*$/;

const parseDelimitedList = (value: string) => {
  return uniqueSorted(
    value
      .split(/[\s,;\n]+/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );
};

export type PlatformBoardColumnOption = {
  id: string;
  title: string;
  type: string;
  label: string;
};

export type PlatformSettingsTabProps = {
  masterAdminUserId: string;
  platformSettingsDraft: MondayPlatformSettings;
  setPlatformSettingsDraft: Dispatch<SetStateAction<MondayPlatformSettings>>;
  hasUnsavedPlatformSettings: boolean;
  isSavingPlatformSettings: boolean;
  onReset: () => void;
  onSave: () => void | Promise<void>;
  platformBoardColumnOptions: PlatformBoardColumnOption[];
  isLoadingPlatformBoardColumns: boolean;
  platformBoardColumnsError: Error | null;
  newEmailSystemTagKey: string;
  setNewEmailSystemTagKey: Dispatch<SetStateAction<string>>;
  newEmailSystemTagColumnId: string;
  setNewEmailSystemTagColumnId: Dispatch<SetStateAction<string>>;
  normalizeEmailSystemTags: (values: MondayEmailSystemTag[]) => MondayEmailSystemTag[];
};

export const PlatformSettingsTab = ({
  masterAdminUserId,
  platformSettingsDraft,
  setPlatformSettingsDraft,
  hasUnsavedPlatformSettings,
  isSavingPlatformSettings,
  onReset,
  onSave,
  platformBoardColumnOptions,
  isLoadingPlatformBoardColumns,
  platformBoardColumnsError,
  newEmailSystemTagKey,
  setNewEmailSystemTagKey,
  newEmailSystemTagColumnId,
  setNewEmailSystemTagColumnId,
  normalizeEmailSystemTags,
}: PlatformSettingsTabProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Platform Settings</p>
        <p className="text-muted-foreground text-sm">
          Manage role assignments for settings access.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-md border p-4">
          <p className="text-sm font-medium">Admin User IDs</p>
          <p className="text-muted-foreground text-xs">
            One user ID per line. Admins can modify feature flags and admin
            tools.
          </p>
          <Textarea
            value={platformSettingsDraft.adminUserIds.join("\n")}
            onChange={(event) => {
              setPlatformSettingsDraft((prev) => ({
                ...prev,
                adminUserIds: parseDelimitedList(event.target.value),
              }));
            }}
            rows={8}
            className="font-mono text-xs"
            placeholder={"53441186\n38959704"}
          />
        </div>
        <div className="space-y-2 rounded-md border p-4">
          <p className="text-sm font-medium">Employee User IDs</p>
          <p className="text-muted-foreground text-xs">
            Optional reference list for employee role assignments.
          </p>
          <Textarea
            value={platformSettingsDraft.employeeUserIds.join("\n")}
            onChange={(event) => {
              setPlatformSettingsDraft((prev) => ({
                ...prev,
                employeeUserIds: parseDelimitedList(event.target.value),
              }));
            }}
            rows={8}
            className="font-mono text-xs"
            placeholder={"49566535\n38959704"}
          />
        </div>
      </div>
      <div className="space-y-3 rounded-md border p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">Email Template System Tags</p>
          <p className="text-muted-foreground text-xs">
            Built-ins always available:{" "}
            <code>{"{{owner.name}}"}</code>,{" "}
            <code>{"{{owner.email}}"}</code>,{" "}
            <code>{"{{contact.name}}"}</code>,{" "}
            <code>{"{{contact.email}}"}</code>.
          </p>
          <p className="text-muted-foreground text-xs">
            Add custom tags mapped to any top-level API board column.
          </p>
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_1.3fr_auto]">
          <Input
            value={newEmailSystemTagKey}
            onChange={(event) => setNewEmailSystemTagKey(event.target.value)}
            placeholder="contact.city"
          />
          <Select
            value={newEmailSystemTagColumnId || "__none__"}
            onValueChange={(value) =>
              setNewEmailSystemTagColumnId(
                value === "__none__" ? "" : value,
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select contact column" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select contact column</SelectItem>
              {platformBoardColumnOptions.map((column) => (
                <SelectItem key={column.id} value={column.id}>
                  {column.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const tag = newEmailSystemTagKey.trim().toLowerCase();
              const columnId = newEmailSystemTagColumnId.trim();
              const selectedColumn = platformBoardColumnOptions.find(
                (column) => column.id === columnId,
              );
              if (!EMAIL_TEMPLATE_TAG_KEY_PATTERN.test(tag)) {
                toast.error(
                  "Tag key must start with a letter and use letters, numbers, dots, dashes, or underscores.",
                );
                return;
              }
              if (!columnId) {
                toast.error("Select a contact column for this tag.");
                return;
              }
              setPlatformSettingsDraft((prev) => ({
                ...prev,
                emailSystemTags: normalizeEmailSystemTags([
                  ...prev.emailSystemTags,
                  {
                    tag,
                    columnId,
                    columnTitle: selectedColumn?.title ?? columnId,
                  },
                ]),
              }));
              setNewEmailSystemTagKey("");
              setNewEmailSystemTagColumnId("");
            }}
            disabled={isLoadingPlatformBoardColumns}
          >
            Add Tag
          </Button>
        </div>
        <div className="space-y-2">
          {platformSettingsDraft.emailSystemTags.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No custom tags configured yet.
            </p>
          ) : (
            platformSettingsDraft.emailSystemTags.map((entry, index) => {
              const selectedColumn = platformBoardColumnOptions.find(
                (column) => column.id === entry.columnId,
              );
              return (
                <div
                  key={`${entry.tag}:${entry.columnId}:${index}`}
                  className="grid gap-2 md:grid-cols-[1fr_1.3fr_auto]"
                >
                  <Input
                    value={entry.tag}
                    onChange={(event) => {
                      const value = event.target.value;
                      setPlatformSettingsDraft((prev) => ({
                        ...prev,
                        emailSystemTags: prev.emailSystemTags.map(
                          (tagEntry, entryIndex) =>
                            entryIndex === index
                              ? { ...tagEntry, tag: value }
                              : tagEntry,
                        ),
                      }));
                    }}
                  />
                  <Select
                    value={entry.columnId}
                    onValueChange={(value) => {
                      const selected = platformBoardColumnOptions.find(
                        (column) => column.id === value,
                      );
                      setPlatformSettingsDraft((prev) => ({
                        ...prev,
                        emailSystemTags: prev.emailSystemTags.map(
                          (tagEntry, entryIndex) =>
                            entryIndex === index
                              ? {
                                ...tagEntry,
                                columnId: value,
                                columnTitle:
                                  selected?.title ??
                                  tagEntry.columnTitle,
                              }
                              : tagEntry,
                        ),
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact column" />
                    </SelectTrigger>
                    <SelectContent>
                      {platformBoardColumnOptions.map((column) => (
                        <SelectItem key={column.id} value={column.id}>
                          {column.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPlatformSettingsDraft((prev) => ({
                        ...prev,
                        emailSystemTags: prev.emailSystemTags.filter(
                          (_, entryIndex) => entryIndex !== index,
                        ),
                      }));
                    }}
                  >
                    Remove
                  </Button>
                  <p className="text-muted-foreground text-xs md:col-span-3">
                    Token:{" "}
                    <code>{`{{${entry.tag.trim().toLowerCase()}}}`}</code>
                    {" · "}
                    Column: {selectedColumn?.title ?? entry.columnTitle} (
                    {entry.columnId})
                  </p>
                </div>
              );
            })
          )}
        </div>
        {isLoadingPlatformBoardColumns ? (
          <p className="text-muted-foreground text-xs">
            Loading API board columns...
          </p>
        ) : null}
        {platformBoardColumnsError ? (
          <p className="text-destructive text-xs">
            {platformBoardColumnsError.message}
          </p>
        ) : null}
      </div>
      <div className="rounded-md border border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-500/50 dark:bg-amber-950/30 dark:text-amber-100">
        Master admin ({masterAdminUserId}) is always included in admin IDs.
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
          {isSavingPlatformSettings ? "Saving..." : "Save platform settings"}
        </Button>
      </div>
    </div>
  );
};
