import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $setSelection,
} from "lexical";

import { $setBlocksType } from "@lexical/selection";
import type { BaseSelection } from "lexical";
import { SelectItem } from "@launchthatapp/ui/select";
import { blockTypeToBlockName } from "./block-format-data";
import { useToolbarContext } from "../../../context/toolbar-context";

const BLOCK_FORMAT_VALUE = "paragraph";

export function FormatParagraph() {
  const { activeEditor } = useToolbarContext();

  const formatParagraph = () => {
    console.info("[ui-lexical][block-format] paragraph item selected");
    let preservedSelection: BaseSelection | null = null;
    activeEditor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        preservedSelection = selection.clone();
      }
    });
    activeEditor.focus();
    window.setTimeout(() => {
      activeEditor.update(() => {
        let selection = $getSelection();
        if (!$isRangeSelection(selection) && preservedSelection) {
          $setSelection(preservedSelection);
          selection = $getSelection();
        }
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      });
    }, 0);
  };

  return (
    <SelectItem
      value={BLOCK_FORMAT_VALUE}
      onPointerDown={(event) => {
        event.preventDefault();
        formatParagraph();
      }}
    >
      <div className="flex items-center gap-1 font-normal">
        {blockTypeToBlockName[BLOCK_FORMAT_VALUE]?.icon}
        {blockTypeToBlockName[BLOCK_FORMAT_VALUE]?.label}
      </div>
    </SelectItem>
  );
}
