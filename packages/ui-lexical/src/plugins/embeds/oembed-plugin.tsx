"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import type { LexicalCommand } from "lexical";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  createCommand,
  PASTE_COMMAND,
} from "lexical";
import type { JSX } from "react";
import { useCallback, useEffect } from "react";

import {
  $createOEmbedNode,
  OEmbedNode,
} from "../../nodes/embeds/oembed-node";
import type { OEmbedPayload } from "../../utils/oembed";
import {
  fetchOEmbedPayload,
  isLikelyOEmbedUrl,
} from "../../utils/oembed";

export const INSERT_OEMBED_COMMAND: LexicalCommand<OEmbedPayload> =
  createCommand("INSERT_OEMBED_COMMAND");

export function OEmbedPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  const insertPlainText = useCallback(
    (text: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(text);
          return;
        }
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode(text));
        $getRoot().append(paragraph);
      });
    },
    [editor],
  );

  const handleEmbedInsertion = useCallback(
    (payload: OEmbedPayload | null, fallbackText?: string) => {
      if (payload) {
        editor.dispatchCommand(INSERT_OEMBED_COMMAND, payload);
        return;
      }
      if (fallbackText) {
        insertPlainText(fallbackText);
      }
    },
    [editor, insertPlainText],
  );

  const resolveOEmbed = useCallback(
    async (url: string) => {
      const payload = await fetchOEmbedPayload(url);
      handleEmbedInsertion(payload, url);
    },
    [handleEmbedInsertion],
  );

  useEffect(() => {
    if (!editor.hasNodes([OEmbedNode])) {
      throw new Error("OEmbedPlugin: OEmbedNode not registered on editor");
    }

    const unregisterInsert = editor.registerCommand<OEmbedPayload>(
      INSERT_OEMBED_COMMAND,
      (payload) => {
        const node = $createOEmbedNode(payload);
        $insertNodeToNearestRoot(node);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    const unregisterPaste = editor.registerCommand<ClipboardEvent>(
      PASTE_COMMAND,
      (event) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) {
          return false;
        }
        const pastedText = clipboardData.getData("text/plain").trim();
        if (!pastedText || !isLikelyOEmbedUrl(pastedText)) {
          return false;
        }

        event.preventDefault();
        void resolveOEmbed(pastedText);
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );

    return () => {
      unregisterInsert();
      unregisterPaste();
    };
  }, [editor, resolveOEmbed]);

  return null;
}
