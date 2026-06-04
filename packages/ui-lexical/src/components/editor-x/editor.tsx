"use client";

import type { EditorState, SerializedEditorState } from "lexical";
import type { ReactNode } from "react";

import { $getRoot } from "lexical";
import { FloatingLinkContext } from "../../context/floating-link-context";
import type { InitialConfigType } from "@lexical/react/LexicalComposer";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { Plugins } from "./plugins";
import { SharedAutocompleteContext } from "../../context/shared-autocomplete-context";
import { TooltipProvider } from "../tooltip";
import { editorTheme } from "../../themes/editor-theme";
import { nodes } from "./nodes";

const editorConfig: InitialConfigType = {
  namespace: "Editor",
  theme: editorTheme,
  nodes,
  onError: (error: Error) => {
    console.error(error);
  },
};

export function Editor({
  editorState,
  editorSerializedState,
  onChange,
  onSerializedChange,
  onTextContentChange,
  hideFooterActions = false,
  compactToolbar = false,
  singleRowToolbar = false,
  autoFocus = true,
  blockInsertMenuItems,
}: {
  editorState?: EditorState;
  editorSerializedState?: SerializedEditorState;
  onChange?: (editorState: EditorState) => void;
  onSerializedChange?: (editorSerializedState: SerializedEditorState) => void;
  onTextContentChange?: (textContent: string) => void;
  hideFooterActions?: boolean;
  compactToolbar?: boolean;
  singleRowToolbar?: boolean;
  autoFocus?: boolean;
  blockInsertMenuItems?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-background shadow">
      <LexicalComposer
        initialConfig={{
          ...editorConfig,
          ...(editorState ? { editorState } : {}),
          ...(editorSerializedState
            ? { editorState: JSON.stringify(editorSerializedState) }
            : {}),
        }}
      >
        <TooltipProvider>
          <SharedAutocompleteContext>
            <FloatingLinkContext>
              <Plugins
                hideFooterActions={hideFooterActions}
                compactToolbar={compactToolbar}
                singleRowToolbar={singleRowToolbar}
                autoFocus={autoFocus}
                blockInsertMenuItems={blockInsertMenuItems}
              />

              <OnChangePlugin
                ignoreSelectionChange={true}
                onChange={(editorState) => {
                  onChange?.(editorState);
                  onSerializedChange?.(editorState.toJSON());
                  if (onTextContentChange) {
                    editorState.read(() => {
                      onTextContentChange($getRoot().getTextContent());
                    });
                  }
                }}
              />
            </FloatingLinkContext>
          </SharedAutocompleteContext>
        </TooltipProvider>
      </LexicalComposer>
    </div>
  );
}
