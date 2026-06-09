/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { ImageIcon } from "lucide-react";
import { InsertImageDialog } from "../../../plugins/images-plugin";
import { SelectItem } from "@launchthatapp/ui/select";
import { useToolbarContext } from "../../../context/toolbar-context";

export function InsertImage() {
  const { activeEditor, showModal } = useToolbarContext();

  return (
    <SelectItem
      value="image"
      onPointerUp={() => {
        console.info("[ui-lexical][insert] image item selected");
        showModal("Insert Image", (onClose) => (
          <InsertImageDialog activeEditor={activeEditor} onClose={onClose} />
        ));
      }}
      className=""
    >
      <div className="flex items-center gap-1">
        <ImageIcon className="size-4" />
        <span>Image</span>
      </div>
    </SelectItem>
  );
}
