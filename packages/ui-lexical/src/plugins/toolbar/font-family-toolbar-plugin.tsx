"use client";

import { $getSelection, $isRangeSelection, $setSelection } from "lexical";
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
} from "@lexical/selection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@launchthatapp/ui/select";
import { useCallback, useState } from "react";

import type { BaseSelection } from "lexical";
import { TypeIcon } from "lucide-react";
import { useToolbarContext } from "../../context/toolbar-context";
import { useUpdateToolbarHandler } from "../../editor-hooks/use-update-toolbar";

const FONT_FAMILY_OPTIONS = [
  "Arial",
  "Verdana",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Trebuchet MS",
];

export function FontFamilyToolbarPlugin() {
  const style = "font-family";
  const [fontFamily, setFontFamily] = useState("Arial");

  const { activeEditor } = useToolbarContext();
  const logPrefix = "[ui-lexical][font-family]";

  const $updateToolbar = (selection: BaseSelection) => {
    if ($isRangeSelection(selection)) {
      setFontFamily(
        $getSelectionStyleValueForProperty(selection, "font-family", "Arial"),
      );
    }
  };

  useUpdateToolbarHandler($updateToolbar);

  const handleClick = useCallback(
    (option: string) => {
      console.info(logPrefix, "apply requested", option);
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
            console.info(logPrefix, "apply skipped: no range selection");
            return;
          }
          console.info(logPrefix, "apply selection present");
          $patchStyleText(selection, {
            [style]: option,
          });
        });
      }, 0);
    },
    [activeEditor, style],
  );

  const buttonAriaLabel = "Formatting options for font family";

  return (
    <Select
      value={fontFamily}
      onOpenChange={(open) => {
        console.info(logPrefix, "openChange", { open, fontFamily });
      }}
      onValueChange={(value) => {
        console.info(logPrefix, "valueChange", value);
        setFontFamily(value);
        handleClick(value);
      }}
      aria-label={buttonAriaLabel}
    >
      <SelectTrigger className="h-8 w-min gap-1">
        <TypeIcon className="size-4" />
        <span>{fontFamily}</span>
      </SelectTrigger>
      <SelectContent
        portalled={false}
        position="popper"
        align="start"
        sideOffset={4}
      >
        {FONT_FAMILY_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
