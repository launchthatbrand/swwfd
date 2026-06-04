import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
} from "lexical";

import { $setBlocksType } from "@lexical/selection";
import { INSERT_UNORDERED_LIST_COMMAND } from "@lexical/list";
import { SelectItem } from "@launchthatapp/ui/select";
import { blockTypeToBlockName } from "./block-format-data";
import { useToolbarContext } from "../../../context/toolbar-context";

const BLOCK_FORMAT_VALUE = "bullet";

export function FormatBulletedList() {
  const { activeEditor, blockType } = useToolbarContext();

  const formatParagraph = () => {
    activeEditor.focus();
    window.setTimeout(() => {
      activeEditor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      });
    }, 0);
  };

  const formatBulletedList = () => {
    if (blockType !== "number") {
      activeEditor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      formatParagraph();
    }
  };

  return (
    <SelectItem value={BLOCK_FORMAT_VALUE} onSelect={formatBulletedList}>
      <div className="flex items-center gap-1 font-normal">
        {blockTypeToBlockName[BLOCK_FORMAT_VALUE]?.icon}
        {blockTypeToBlockName[BLOCK_FORMAT_VALUE]?.label}
      </div>
    </SelectItem>
  );
}
