import { $createHeadingNode } from "@lexical/rich-text";
import { $getSelection, $isRangeSelection, $setSelection } from "lexical";
import { $setBlocksType } from "@lexical/selection";
import type { HeadingTagType } from "@lexical/rich-text";
import type { BaseSelection } from "lexical";
import { SelectItem } from "@launchthatapp/ui/select";
import { blockTypeToBlockName } from "./block-format-data";
import { useToolbarContext } from "../../../context/toolbar-context";

export function FormatHeading({ levels = [] }: { levels: HeadingTagType[] }) {
  const { activeEditor, blockType } = useToolbarContext();

  const formatHeading = (headingSize: HeadingTagType) => {
    console.info("[ui-lexical][block-format] heading item selected", headingSize);
    if (blockType !== headingSize) {
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
          if (!$isRangeSelection(selection)) {
            return;
          }
          $setBlocksType(selection, () => $createHeadingNode(headingSize));
        });
      }, 0);
    }
  };

  return levels.map((level) => (
    <SelectItem
      key={level}
      value={level}
      onPointerDown={(event) => {
        event.preventDefault();
        formatHeading(level);
      }}
    >
      <div className="flex items-center gap-1 font-normal">
        {blockTypeToBlockName[level]?.icon}
        {blockTypeToBlockName[level]?.label}
      </div>
    </SelectItem>
  ));
}
