"use client";

import type { ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  RefreshCcw,
  Settings,
  UserPlus,
} from "lucide-react";

import { Button } from "@launchthatapp/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@launchthatapp/ui/dialog";

import { BoardViewModeToggle } from "../BoardViewModeToggle";
import type { MondayBoardViewMode, UserBoardDisplayMode } from "../../types";

export type BoardToolbarProps = {
  isGlobalDateScope: boolean;
  onToggleGlobalDateScope: () => void;
  monthBoundsLabel: string;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  viewMode: MondayBoardViewMode;
  userScopedDisplayMode: UserBoardDisplayMode;
  onUserScopedDisplayModeChange: (mode: UserBoardDisplayMode) => void;
  authLoading: boolean;
  identityUserId: string | undefined;
  onAddContact: () => void;
  staticMode: boolean;
  recordsIsFetching: boolean;
  onReload: () => void;
  hasNextPage: boolean;
  shouldAutoLoadMore: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onOpenHelpDesk: () => void;
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
  settingsDialogContent: ReactNode;
};

export const BoardToolbar = ({
  isGlobalDateScope,
  onToggleGlobalDateScope,
  monthBoundsLabel,
  onPreviousMonth,
  onNextMonth,
  viewMode,
  userScopedDisplayMode,
  onUserScopedDisplayModeChange,
  authLoading,
  identityUserId,
  onAddContact,
  staticMode,
  recordsIsFetching,
  onReload,
  hasNextPage,
  shouldAutoLoadMore,
  isFetchingNextPage,
  onLoadMore,
  onOpenHelpDesk,
  settingsOpen,
  onSettingsOpenChange,
  settingsDialogContent,
}: BoardToolbarProps) => {
  return (
    <>
      <div className="bg-border/60 h-5 w-px shrink-0" />

      <Button
        size="sm"
        variant="ghost"
        className="h-8 shrink-0 px-2"
        title={
          isGlobalDateScope
            ? "Global mode active. Click Global to return to month mode."
            : "Previous month"
        }
        disabled={isGlobalDateScope}
        onClick={onPreviousMonth}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={isGlobalDateScope ? "secondary" : "outline"}
        className="h-8 shrink-0 rounded-sm px-2.5 text-xs whitespace-nowrap"
        title={
          isGlobalDateScope
            ? "Switch back to month mode"
            : "Switch to global mode (all records)"
        }
        onClick={onToggleGlobalDateScope}
      >
        {isGlobalDateScope ? "Global" : monthBoundsLabel}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 shrink-0 px-2"
        title={
          isGlobalDateScope
            ? "Global mode active. Click Global to return to month mode."
            : "Next month"
        }
        disabled={isGlobalDateScope}
        onClick={onNextMonth}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {viewMode === "userScoped" ? (
        <>
          <div className="bg-border/60 h-5 w-px shrink-0" />
          <Button
            size="sm"
            variant="default"
            className="h-8 shrink-0 px-2.5"
            onClick={onAddContact}
            disabled={authLoading || !identityUserId}
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
          <BoardViewModeToggle
            mode={userScopedDisplayMode}
            availableModes={["table", "grid", "kanban"]}
            onChange={onUserScopedDisplayModeChange}
            dataTour="view-toggle"
          />
        </>
      ) : (
        <>
          <div className="bg-border/60 h-5 w-px shrink-0" />
          <BoardViewModeToggle
            mode={userScopedDisplayMode}
            availableModes={["table", "kanban"]}
            onChange={onUserScopedDisplayModeChange}
          />
        </>
      )}

      <div className="bg-border/60 h-5 w-px shrink-0" />

      <Button
        size="sm"
        variant="ghost"
        className="h-8 shrink-0 px-2"
        title="Reload"
        onClick={onReload}
        disabled={staticMode || recordsIsFetching}
      >
        <RefreshCcw className="h-4 w-4" />
      </Button>

      {!staticMode && hasNextPage && !shouldAutoLoadMore ? (
        <Button
          size="sm"
          variant="secondary"
          className="h-8 shrink-0 px-2.5 text-xs"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      ) : null}

      <div data-tour="toolbar-actions" className="flex items-center gap-0.5">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 shrink-0 px-2"
          title="Help Desk"
          onClick={onOpenHelpDesk}
        >
          <CircleHelp className="h-4 w-4" />
        </Button>

        <Dialog open={settingsOpen} onOpenChange={onSettingsOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 shrink-0 px-2" title="Settings">
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="flex h-[88vh] max-w-4xl flex-col overflow-scroll border-2 border-border/80 bg-linear-to-b from-background to-muted/20 p-0 shadow-xl">
            <DialogHeader className="border-b-2 border-border/70 bg-muted/35 px-6 py-4">
              <DialogTitle>Monday Settings</DialogTitle>
            </DialogHeader>
            {settingsDialogContent}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};
