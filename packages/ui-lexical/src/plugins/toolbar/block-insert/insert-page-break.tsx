"use client";

import { INSERT_PAGE_BREAK } from "../../../plugins/page-break-plugin";
import { SelectItem } from "@launchthatapp/ui/select";
import { SquareSplitVerticalIcon } from "lucide-react";
import { useToolbarContext } from "../../../context/toolbar-context";

export function InsertPageBreak() {
  const { activeEditor } = useToolbarContext();

  return (
    <SelectItem
      value="page-break"
      onPointerUp={() => {
        console.info("[ui-lexical][insert] page-break item selected");
        activeEditor.dispatchCommand(INSERT_PAGE_BREAK, undefined);
      }}
      className=""
    >
      <div className="flex items-center gap-1">
        <SquareSplitVerticalIcon className="size-4" />
        <span>Page Break</span>
      </div>
    </SelectItem>
  );
}
