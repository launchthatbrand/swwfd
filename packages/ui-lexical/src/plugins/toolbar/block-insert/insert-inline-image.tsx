"use client";

import { FileImageIcon } from "lucide-react";
import { InsertInlineImageDialog } from "../../../plugins/inline-image-plugin";
import { SelectItem } from "@launchthatapp/ui/select";
import { useToolbarContext } from "../../../context/toolbar-context";

export function InsertInlineImage() {
  const { activeEditor, showModal } = useToolbarContext();

  return (
    <SelectItem
      value="inline-image"
      onPointerUp={() => {
        console.info("[ui-lexical][insert] inline-image item selected");
        showModal("Insert Inline Image", (onClose) => (
          <InsertInlineImageDialog
            activeEditor={activeEditor}
            onClose={onClose}
          />
        ));
      }}
      className=""
    >
      <div className="flex items-center gap-1">
        <FileImageIcon className="size-4" />
        <span>Inline Image</span>
      </div>
    </SelectItem>
  );
}
