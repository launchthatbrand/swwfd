"use client";

import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { ScissorsIcon } from "lucide-react";
import { SelectItem } from "@launchthatapp/ui/select";
import { useToolbarContext } from "../../../context/toolbar-context";

export function InsertHorizontalRule() {
  const { activeEditor } = useToolbarContext();

  return (
    <SelectItem
      value="horizontal-rule"
      onPointerUp={() => {
        console.info("[ui-lexical][insert] horizontal-rule item selected");
        activeEditor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
      }}
      className=""
    >
      <div className="flex items-center gap-1">
        <ScissorsIcon className="size-4" />
        <span>Horizontal Rule</span>
      </div>
    </SelectItem>
  );
}
