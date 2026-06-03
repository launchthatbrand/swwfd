"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import { Columns3, LayoutGrid, List } from "lucide-react";

import { Button } from "@launchthatapp/ui/button";

import {
  USER_BOARD_ACTION_BUTTON_SIZE_CLASS,
  USER_BOARD_COLOR_THEME_OPTIONS,
  USER_BOARD_COLOR_THEME_STYLES,
  USER_BOARD_FONT_SIZE_OPTIONS,
  USER_BOARD_PAGE_SIZE_OPTIONS,
  USER_BOARD_RECORD_SOURCE_OPTIONS,
  USER_BOARD_TABLE_DENSITY_OPTIONS,
  buildUserBoardThemeInlineStyles,
  parseUserBoardCustomTheme,
} from "../../../constants";
import type { UserBoardDisplayMode, UserBoardGeneralSettings } from "../../../types";

export type GeneralSettingsTabProps = {
  presetScopeOwnerId: string;
  sessionToken: string | null;
  boardGeneralSettingsDraft: UserBoardGeneralSettings;
  setBoardGeneralSettingsDraft: Dispatch<SetStateAction<UserBoardGeneralSettings>>;
  hasUnsavedBoardGeneralSettings: boolean;
  isSavingBoardGeneralSettings: boolean;
  onReset: () => void;
  onSave: () => void | Promise<void>;
};

export const GeneralSettingsTab = ({
  presetScopeOwnerId,
  sessionToken,
  boardGeneralSettingsDraft,
  setBoardGeneralSettingsDraft,
  hasUnsavedBoardGeneralSettings,
  isSavingBoardGeneralSettings,
  onReset,
  onSave,
}: GeneralSettingsTabProps) => {
  const boardDraftThemeStyles = useMemo(
    () => USER_BOARD_COLOR_THEME_STYLES[boardGeneralSettingsDraft.colorTheme],
    [boardGeneralSettingsDraft.colorTheme],
  );
  const boardDraftThemeInlineStyles = useMemo(
    () => buildUserBoardThemeInlineStyles(boardGeneralSettingsDraft),
    [boardGeneralSettingsDraft],
  );
  const quickActionButtonDraftSizeClass =
    USER_BOARD_ACTION_BUTTON_SIZE_CLASS[boardGeneralSettingsDraft.fontSize];

  return (
    <div className="space-y-0 divide-y divide-border/60">
      <div className="flex items-center justify-between pb-4">
        <div>
          <p className="text-sm font-semibold">Appearance</p>
          <p className="text-muted-foreground text-xs">
            Scope: {presetScopeOwnerId.length > 0 ? `Owner ${presetScopeOwnerId}` : "No owner selected"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onReset}
            disabled={!hasUnsavedBoardGeneralSettings}
          >
            Reset
          </Button>
          <Button
            size="sm"
            onClick={() => {
              void onSave();
            }}
            disabled={
              isSavingBoardGeneralSettings ||
              !sessionToken ||
              presetScopeOwnerId.length === 0 ||
              !hasUnsavedBoardGeneralSettings
            }
          >
            {isSavingBoardGeneralSettings ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between py-3.5">
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-sm font-medium">Color Theme</p>
          <p className="text-muted-foreground text-xs">
            {USER_BOARD_COLOR_THEME_OPTIONS.find(
              (o) => o.value === boardGeneralSettingsDraft.colorTheme,
            )?.description ?? "Board accent and filter bar styling."}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {USER_BOARD_COLOR_THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              title={option.label}
              onClick={() => {
                setBoardGeneralSettingsDraft((prev) => ({
                  ...prev,
                  colorTheme: option.value,
                }));
              }}
              className={`h-7 w-7 rounded-full transition-all ${option.swatchClassName} ${boardGeneralSettingsDraft.colorTheme === option.value
                ? "ring-2 ring-offset-2 ring-primary scale-110"
                : "opacity-60 hover:opacity-100 hover:scale-105"
                }`}
              style={
                option.value === "custom"
                  ? {
                    backgroundColor:
                      boardGeneralSettingsDraft.customTheme?.colorHex ??
                      "#0ea5e9",
                    opacity:
                      boardGeneralSettingsDraft.customTheme?.alpha ?? 0.22,
                  }
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      {boardGeneralSettingsDraft.colorTheme === "custom" ? (
        <div className="rounded-md border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Custom Color</span>
              <input
                type="color"
                value={
                  boardGeneralSettingsDraft.customTheme?.colorHex ?? "#0ea5e9"
                }
                onChange={(event) => {
                  const nextHex = event.target.value;
                  setBoardGeneralSettingsDraft((prev) => ({
                    ...prev,
                    customTheme: parseUserBoardCustomTheme({
                      colorHex: nextHex,
                      alpha: prev.customTheme?.alpha,
                    }),
                  }));
                }}
                className="h-10 w-full cursor-pointer rounded border bg-transparent p-1"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Transparency</span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(
                  (boardGeneralSettingsDraft.customTheme?.alpha ?? 0.22) * 100,
                )}
                onChange={(event) => {
                  const nextAlpha = Number(event.target.value) / 100;
                  setBoardGeneralSettingsDraft((prev) => ({
                    ...prev,
                    customTheme: parseUserBoardCustomTheme({
                      colorHex: prev.customTheme?.colorHex,
                      alpha: nextAlpha,
                    }),
                  }));
                }}
                className="w-full"
              />
              <p className="text-muted-foreground text-xs">
                {Math.round(
                  (boardGeneralSettingsDraft.customTheme?.alpha ?? 0.22) * 100,
                )}
                % opacity
              </p>
            </label>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between py-3.5">
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-sm font-medium">Font Size</p>
          <p className="text-muted-foreground text-xs">Scale the board text and action buttons.</p>
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-md border">
          {USER_BOARD_FONT_SIZE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setBoardGeneralSettingsDraft((prev) => ({
                  ...prev,
                  fontSize: option.value,
                }));
              }}
              className={`h-8 px-3 text-xs font-medium transition-colors ${boardGeneralSettingsDraft.fontSize === option.value
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between py-3.5">
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-sm font-medium">Row Density</p>
          <p className="text-muted-foreground text-xs">
            {USER_BOARD_TABLE_DENSITY_OPTIONS.find(
              (o) => o.value === boardGeneralSettingsDraft.tableDensity,
            )?.description}
          </p>
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-md border">
          {USER_BOARD_TABLE_DENSITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setBoardGeneralSettingsDraft((prev) => ({
                  ...prev,
                  tableDensity: option.value,
                }));
              }}
              className={`flex h-8 items-center gap-2 px-3 text-xs font-medium transition-colors ${boardGeneralSettingsDraft.tableDensity === option.value
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
                }`}
            >
              <span className="flex flex-col gap-px">
                {option.value === "expanded" ? (
                  <>
                    <span className="block h-[3px] w-4 rounded-sm bg-current opacity-80" />
                    <span className="block h-[3px] w-4 rounded-sm bg-current opacity-40" />
                    <span className="block h-[3px] w-4 rounded-sm bg-current opacity-40" />
                  </>
                ) : (
                  <>
                    <span className="block h-0.5 w-4 rounded-sm bg-current opacity-80" />
                    <span className="block h-0.5 w-4 rounded-sm bg-current opacity-40" />
                    <span className="block h-0.5 w-4 rounded-sm bg-current opacity-40" />
                    <span className="block h-0.5 w-4 rounded-sm bg-current opacity-40" />
                  </>
                )}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between py-3.5">
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-sm font-medium">Hover Popovers</p>
          <p className="text-muted-foreground text-xs">
            Show or hide hover details on contact name and progress bar columns.
          </p>
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-md border">
          <button
            type="button"
            onClick={() => {
              setBoardGeneralSettingsDraft((prev) => ({
                ...prev,
                hoverPopoversEnabled: true,
              }));
            }}
            className={`h-8 px-3 text-xs font-medium transition-colors ${boardGeneralSettingsDraft.hoverPopoversEnabled
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-muted"
              }`}
          >
            Enabled
          </button>
          <button
            type="button"
            onClick={() => {
              setBoardGeneralSettingsDraft((prev) => ({
                ...prev,
                hoverPopoversEnabled: false,
              }));
            }}
            className={`h-8 px-3 text-xs font-medium transition-colors ${!boardGeneralSettingsDraft.hoverPopoversEnabled
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-muted"
              }`}
          >
            Disabled
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between py-3.5">
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-sm font-medium">Records Per Page</p>
          <p className="text-muted-foreground text-xs">How many records to show per page.</p>
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-md border">
          {USER_BOARD_PAGE_SIZE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setBoardGeneralSettingsDraft((prev) => ({
                  ...prev,
                  pageSize: option.value,
                }));
              }}
              className={`h-8 px-3 text-xs font-medium transition-colors ${boardGeneralSettingsDraft.pageSize === option.value
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between py-3.5">
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-sm font-medium">Default View</p>
          <p className="text-muted-foreground text-xs">Starting layout when the board loads.</p>
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-md border">
          {(["table", "grid", "kanban"] as UserBoardDisplayMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setBoardGeneralSettingsDraft((prev) => ({
                  ...prev,
                  displayMode: mode,
                }));
              }}
              className={`flex h-8 items-center gap-1.5 px-3 text-xs font-medium capitalize transition-colors ${boardGeneralSettingsDraft.displayMode === mode
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
                }`}
            >
              {mode === "table" ? <List className="h-3.5 w-3.5" /> : mode === "grid" ? <LayoutGrid className="h-3.5 w-3.5" /> : <Columns3 className="h-3.5 w-3.5" />}
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between py-3.5">
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-sm font-medium">Monthly Records</p>
          <p className="text-muted-foreground text-xs">
            {USER_BOARD_RECORD_SOURCE_OPTIONS.find(
              (o) => o.value === boardGeneralSettingsDraft.recordSource,
            )?.description ??
              "Choose how monthly records are selected."}
          </p>
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-md border">
          {USER_BOARD_RECORD_SOURCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setBoardGeneralSettingsDraft((prev) => ({
                  ...prev,
                  recordSource: option.value,
                }));
              }}
              className={`h-8 px-3 text-xs font-medium transition-colors ${boardGeneralSettingsDraft.recordSource === option.value
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`mt-3 flex items-center justify-between rounded-md px-4 py-3 ${boardDraftThemeStyles.previewClassName}`}
        style={boardDraftThemeInlineStyles.previewStyle}
      >
        <p className="text-xs text-muted-foreground">
          Preview — {USER_BOARD_COLOR_THEME_OPTIONS.find((o) => o.value === boardGeneralSettingsDraft.colorTheme)?.label},{" "}
          {USER_BOARD_FONT_SIZE_OPTIONS.find((o) => o.value === boardGeneralSettingsDraft.fontSize)?.label}
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className={`justify-start rounded-md ${quickActionButtonDraftSizeClass} ${boardDraftThemeStyles.actionButtonClassName}`}
          style={boardDraftThemeInlineStyles.actionButtonStyle}
          disabled
        >
          Quick Action
        </Button>
      </div>
    </div>
  );
};
