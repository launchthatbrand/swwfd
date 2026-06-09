"use client";

import { Columns3, LayoutGrid, List, MessageSquareText } from "lucide-react";

import type { UserBoardDisplayMode } from "../types";

export const BoardViewModeToggle = ({
  mode,
  availableModes,
  onChange,
  dataTour,
}: {
  mode: UserBoardDisplayMode;
  availableModes: UserBoardDisplayMode[];
  onChange: (mode: UserBoardDisplayMode) => void;
  dataTour?: string;
}) => {
  const iconByMode: Record<UserBoardDisplayMode, typeof List> = {
    table: List,
    grid: LayoutGrid,
    kanban: Columns3,
    chat: MessageSquareText,
  };
  const titleByMode: Record<UserBoardDisplayMode, string> = {
    table: "Table view",
    grid: "Grid view",
    kanban: "Kanban view",
    chat: "Chat view",
  };

  return (
    <div
      data-tour={dataTour}
      className="flex shrink-0 gap-1"
    >
      {availableModes.map((entryMode) => {
        const Icon = iconByMode[entryMode];
        const isActive = mode === entryMode;
        return (
          <button
            key={entryMode}
            type="button"
            onClick={() => onChange(entryMode)}
            className={`flex h-8 w-8 items-center justify-center transition-colors ${isActive ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
            title={titleByMode[entryMode]}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
};
