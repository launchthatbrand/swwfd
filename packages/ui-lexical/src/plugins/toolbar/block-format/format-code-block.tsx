import { $getSelection, $isRangeSelection } from "lexical";

import { $createCodeNode } from "@lexical/code";
import { $setBlocksType } from "@lexical/selection";
import { SelectItem } from "@launchthatapp/ui/select";
import { blockTypeToBlockName } from "./block-format-data";
import { useToolbarContext } from "../../../context/toolbar-context";

const BLOCK_FORMAT_VALUE = "code";

export function FormatCodeBlock() {
  const { activeEditor, blockType } = useToolbarContext();

  const formatCode = () => {
    if (blockType !== "code") {
      activeEditor.focus();
      window.setTimeout(() => {
        activeEditor.update(() => {
          let selection = $getSelection();

          if (selection !== null) {
            if (selection.isCollapsed()) {
              $setBlocksType(selection, () => $createCodeNode());
            } else {
              const textContent = selection.getTextContent();
              const codeNode = $createCodeNode();
              selection.insertNodes([codeNode]);
              selection = $getSelection();
              if ($isRangeSelection(selection)) {
                selection.insertRawText(textContent);
              }
            }
          }
        });
      }, 0);
    }
  };

  return (
    <SelectItem value="code" onSelect={formatCode}>
      <div className="flex items-center gap-1 font-normal">
        {blockTypeToBlockName[BLOCK_FORMAT_VALUE]?.icon}
        {blockTypeToBlockName[BLOCK_FORMAT_VALUE]?.label}
      </div>
    </SelectItem>
  );
}
