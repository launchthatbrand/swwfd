/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import {
  CHECK_LIST,
  ELEMENT_TRANSFORMERS,
  MULTILINE_ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
} from "@lexical/markdown";
import {
  DynamicTablePickerPlugin,
  TablePickerPlugin,
} from "../../plugins/picker/table-picker-plugin";

import { ActionsPlugin } from "../../plugins/actions/actions-plugin";
import { AlignmentPickerPlugin } from "../../plugins/picker/alignment-picker-plugin";
import { AutoEmbedPlugin } from "../../plugins/embeds/auto-embed-plugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { AutoLinkPlugin } from "../../plugins/auto-link-plugin";
import { AutocompletePlugin } from "../../plugins/autocomplete-plugin";
import { BlockFormatDropDown } from "../../plugins/toolbar/block-format-toolbar-plugin";
import { BlockInsertPlugin } from "../../plugins/toolbar/block-insert-plugin";
import { BulletedListPickerPlugin } from "../../plugins/picker/bulleted-list-picker-plugin";
import { CharacterLimitPlugin } from "@lexical/react/LexicalCharacterLimitPlugin";
import { CheckListPickerPlugin } from "../../plugins/picker/check-list-picker-plugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { ClearEditorActionPlugin } from "../../plugins/actions/clear-editor-plugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { ClearFormattingToolbarPlugin } from "../../plugins/toolbar/clear-formatting-toolbar-plugin";
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin";
import { CodeActionMenuPlugin } from "../../plugins/code-action-menu-plugin";
import { CodeHighlightPlugin } from "../../plugins/code-highlight-plugin";
import { CodeLanguageToolbarPlugin } from "../../plugins/toolbar/code-language-toolbar-plugin";
import { CodePickerPlugin } from "../../plugins/picker/code-picker-plugin";
import { CollapsiblePickerPlugin } from "../../plugins/picker/collapsible-picker-plugin";
import { CollapsiblePlugin } from "../../plugins/collapsible-plugin";
import { ColumnsLayoutPickerPlugin } from "../../plugins/picker/columns-layout-picker-plugin";
import { ComponentPickerMenuPlugin } from "../../plugins/component-picker-menu-plugin";
import { ContentEditable } from "../../editor-ui/content-editable";
import { ContextMenuPlugin } from "../../plugins/context-menu-plugin";
import { CounterCharacterPlugin } from "../../plugins/actions/counter-character-plugin";
import { DividerPickerPlugin } from "../../plugins/picker/divider-picker-plugin";
import { DragDropPastePlugin } from "../../plugins/drag-drop-paste-plugin";
import { DraggableBlockPlugin } from "../../plugins/draggable-block-plugin";
import { EMOJI } from "../../transformers/markdown-emoji-transformer";
import { EQUATION } from "../../transformers/markdown-equation-transofrmer";
import { EditModeTogglePlugin } from "../../plugins/actions/edit-mode-toggle-plugin";
import { ElementFormatToolbarPlugin } from "../../plugins/toolbar/element-format-toolbar-plugin";
import { EmbedsPickerPlugin } from "../../plugins/picker/embeds-picker-plugin";
import { EmojiPickerPlugin } from "../../plugins/emoji-picker-plugin";
import { EmojisPlugin } from "../../plugins/emojis-plugin";
import { EquationPickerPlugin } from "../../plugins/picker/equation-picker-plugin";
import { EquationsPlugin } from "../../plugins/equations-plugin";
import { ExcalidrawPickerPlugin } from "../../plugins/picker/excalidraw-picker-plugin";
import { ExcalidrawPlugin } from "../../plugins/excalidraw-plugin";
import { FigmaPlugin } from "../../plugins/embeds/figma-plugin";
import { FloatingLinkEditorPlugin } from "../../plugins/floating-link-editor-plugin";
import { FloatingTextFormatToolbarPlugin } from "../../plugins/floating-text-format-plugin";
import { FontBackgroundToolbarPlugin } from "../../plugins/toolbar/font-background-toolbar-plugin";
import { FontColorToolbarPlugin } from "../../plugins/toolbar/font-color-toolbar-plugin";
import { FontFamilyToolbarPlugin } from "../../plugins/toolbar/font-family-toolbar-plugin";
import { FontFormatToolbarPlugin } from "../../plugins/toolbar/font-format-toolbar-plugin";
import { FontSizeToolbarPlugin } from "../../plugins/toolbar/font-size-toolbar-plugin";
import { FormatBulletedList } from "../../plugins/toolbar/block-format/format-bulleted-list";
import { FormatCheckList } from "../../plugins/toolbar/block-format/format-check-list";
import { FormatCodeBlock } from "../../plugins/toolbar/block-format/format-code-block";
import { FormatHeading } from "../../plugins/toolbar/block-format/format-heading";
import { FormatNumberedList } from "../../plugins/toolbar/block-format/format-numbered-list";
import { FormatParagraph } from "../../plugins/toolbar/block-format/format-paragraph";
import { FormatQuote } from "../../plugins/toolbar/block-format/format-quote";
import { HR } from "../../transformers/markdown-hr-transformer";
import { HashtagPlugin } from "@lexical/react/LexicalHashtagPlugin";
import { HeadingPickerPlugin } from "../../plugins/picker/heading-picker-plugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { HistoryToolbarPlugin } from "../../plugins/toolbar/history-toolbar-plugin";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { IMAGE } from "../../transformers/markdown-image-transformer";
import { ImagePickerPlugin } from "../../plugins/picker/image-picker-plugin";
import { ImagesPlugin } from "../../plugins/images-plugin";
import { ImportExportPlugin } from "../../plugins/actions/import-export-plugin";
import { InlineImagePlugin } from "../../plugins/inline-image-plugin";
import { InsertCollapsibleContainer } from "../../plugins/toolbar/block-insert/insert-collapsible-container";
import { InsertColumnsLayout } from "../../plugins/toolbar/block-insert/insert-columns-layout";
import { InsertEmbeds } from "../../plugins/toolbar/block-insert/insert-embeds";
import { InsertExcalidraw } from "../../plugins/toolbar/block-insert/insert-excalidraw";
import { InsertHorizontalRule } from "../../plugins/toolbar/block-insert/insert-horizontal-rule";
import { InsertImage } from "../../plugins/toolbar/block-insert/insert-image";
import { InsertInlineImage } from "../../plugins/toolbar/block-insert/insert-inline-image";
import { InsertPageBreak } from "../../plugins/toolbar/block-insert/insert-page-break";
import { InsertPoll } from "../../plugins/toolbar/block-insert/insert-poll";
import { InsertTable } from "../../plugins/toolbar/block-insert/insert-table";
import { KeywordsPlugin } from "../../plugins/keywords-plugin";
import { LayoutPlugin } from "../../plugins/layout-plugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { LinkPlugin } from "../../plugins/link-plugin";
import { LinkToolbarPlugin } from "../../plugins/toolbar/link-toolbar-plugin";
import { ListMaxIndentLevelPlugin } from "../../plugins/list-max-indent-level-plugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { MarkdownTogglePlugin } from "../../plugins/actions/markdown-toggle-plugin";
import { MaxLengthPlugin } from "../../plugins/actions/max-length-plugin";
import { MentionsPlugin } from "../../plugins/mentions-plugin";
import { NumberedListPickerPlugin } from "../../plugins/picker/numbered-list-picker-plugin";
import { OEmbedPlugin } from "../../plugins/embeds/oembed-plugin";
import { PageBreakPickerPlugin } from "../../plugins/picker/page-break-picker-plugin";
import { PageBreakPlugin } from "../../plugins/page-break-plugin";
import { ParagraphPickerPlugin } from "../../plugins/picker/paragraph-picker-plugin";
import { PollPickerPlugin } from "../../plugins/picker/poll-picker-plugin";
import { PollPlugin } from "../../plugins/poll-plugin";
import { QuotePickerPlugin } from "../../plugins/picker/quote-picker-plugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { Separator } from "@launchthatapp/ui/separator";
import { ShareContentPlugin } from "../../plugins/actions/share-content-plugin";
import { SubSuperToolbarPlugin } from "../../plugins/toolbar/subsuper-toolbar-plugin";
import { TABLE } from "../../transformers/markdown-table-transformer";
import { TWEET } from "../../transformers/markdown-tweet-transformer";
import { TabFocusPlugin } from "../../plugins/tab-focus-plugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { TableActionMenuPlugin } from "../../plugins/table-action-menu-plugin";
import { TableCellResizerPlugin } from "../../plugins/table-cell-resizer-plugin";
import { TableHoverActionsPlugin } from "../../plugins/table-hover-actions-plugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { ToolbarPlugin } from "../../plugins/toolbar/toolbar-plugin";
import { TreeViewPlugin } from "../../plugins/actions/tree-view-plugin";
import { TwitterPlugin } from "../../plugins/embeds/twitter-plugin";
import { TypingPerfPlugin } from "../../plugins/typing-pref-plugin";
import { YouTubePlugin } from "../../plugins/embeds/youtube-plugin";
import { lazyClient } from "../../shared/lazy-client";
import { useState } from "react";
import type { ReactNode } from "react";

const SpeechToTextPlugin = lazyClient(
  () => import("../../plugins/actions/speech-to-text-plugin"),
  {
    resolve: (module) =>
      (
        module as typeof import("../../plugins/actions/speech-to-text-plugin")
      ).SpeechToTextPlugin,
  },
) as typeof import("../../plugins/actions/speech-to-text-plugin").SpeechToTextPlugin;

export const placeholder = "Press / for commands...";
const maxLength = 15000;

export function Plugins({
  hideFooterActions = false,
  compactToolbar = false,
  singleRowToolbar = false,
  autoFocus = true,
  blockInsertMenuItems,
}: {
  hideFooterActions?: boolean;
  compactToolbar?: boolean;
  singleRowToolbar?: boolean;
  autoFocus?: boolean;
  blockInsertMenuItems?: ReactNode;
}) {
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null);

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  return (
    <div className="relative">
      <ToolbarPlugin>
        {({ blockType }) => (
          <div className="vertical-align-middle sticky top-0 z-10 border-b p-1">
            {compactToolbar ? (
              <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
                <HistoryToolbarPlugin />
                <Separator orientation="vertical" className="h-8" />
                <BlockFormatDropDown>
                  <FormatParagraph />
                  <FormatHeading levels={["h1", "h2"]} />
                  <FormatNumberedList />
                  <FormatBulletedList />
                  <FormatCheckList />
                  <FormatQuote />
                </BlockFormatDropDown>
                {blockType === "code" ? (
                  <CodeLanguageToolbarPlugin />
                ) : (
                  <>
                    <FontFormatToolbarPlugin format="bold" />
                    <FontFormatToolbarPlugin format="italic" />
                    <FontFormatToolbarPlugin format="underline" />
                    <LinkToolbarPlugin />
                  </>
                )}
              </div>
            ) : singleRowToolbar ? (
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
                <HistoryToolbarPlugin />
                <Separator orientation="vertical" className="h-8" />
                <BlockFormatDropDown>
                  <FormatParagraph />
                  <FormatHeading levels={["h1", "h2", "h3"]} />
                  <FormatNumberedList />
                  <FormatBulletedList />
                  <FormatCheckList />
                  <FormatCodeBlock />
                  <FormatQuote />
                </BlockFormatDropDown>
                {blockType === "code" ? (
                  <CodeLanguageToolbarPlugin />
                ) : (
                  <>
                    <FontFamilyToolbarPlugin />
                    <FontSizeToolbarPlugin />
                    <Separator orientation="vertical" className="h-8" />
                    <FontFormatToolbarPlugin format="bold" />
                    <FontFormatToolbarPlugin format="italic" />
                    <FontFormatToolbarPlugin format="underline" />
                    <FontFormatToolbarPlugin format="strikethrough" />
                    <Separator orientation="vertical" className="h-8" />
                    <SubSuperToolbarPlugin />
                    <LinkToolbarPlugin />
                    <Separator orientation="vertical" className="h-8" />
                    <ClearFormattingToolbarPlugin />
                    <Separator orientation="vertical" className="h-8" />
                    <FontColorToolbarPlugin />
                    <FontBackgroundToolbarPlugin />
                    <Separator orientation="vertical" className="h-8" />
                    <ElementFormatToolbarPlugin />
                    <Separator orientation="vertical" className="h-8" />
                    <BlockInsertPlugin>
                      <InsertHorizontalRule />
                      <InsertPageBreak />
                      <InsertImage />
                      <InsertInlineImage />
                      <InsertCollapsibleContainer />
                      <InsertExcalidraw />
                      <InsertTable />
                      <InsertPoll />
                      <InsertColumnsLayout />
                      <InsertEmbeds />
                      {blockInsertMenuItems}
                    </BlockInsertPlugin>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Row 1 */}
                <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
                  <HistoryToolbarPlugin />
                  <Separator orientation="vertical" className="h-8" />
                  <BlockFormatDropDown>
                    <FormatParagraph />
                    <FormatHeading levels={["h1", "h2", "h3"]} />
                    <FormatNumberedList />
                    <FormatBulletedList />
                    <FormatCheckList />
                    <FormatCodeBlock />
                    <FormatQuote />
                  </BlockFormatDropDown>
                  {blockType === "code" ? (
                    <CodeLanguageToolbarPlugin />
                  ) : (
                    <>
                      <FontFamilyToolbarPlugin />
                      <FontSizeToolbarPlugin />
                      <Separator orientation="vertical" className="h-8" />
                      <FontFormatToolbarPlugin format="bold" />
                      <FontFormatToolbarPlugin format="italic" />
                      <FontFormatToolbarPlugin format="underline" />
                    </>
                  )}
                </div>

                {/* Row 2 (hidden for code blocks) */}
                {blockType !== "code" && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 overflow-auto">
                    <FontFormatToolbarPlugin format="strikethrough" />
                    <Separator orientation="vertical" className="h-8" />
                    <SubSuperToolbarPlugin />
                    <LinkToolbarPlugin />
                    <Separator orientation="vertical" className="h-8" />
                    <ClearFormattingToolbarPlugin />
                    <Separator orientation="vertical" className="h-8" />
                    <FontColorToolbarPlugin />
                    <FontBackgroundToolbarPlugin />
                    <Separator orientation="vertical" className="h-8" />
                    <ElementFormatToolbarPlugin />
                    <Separator orientation="vertical" className="h-8" />
                    <BlockInsertPlugin>
                      <InsertHorizontalRule />
                      <InsertPageBreak />
                      <InsertImage />
                      <InsertInlineImage />
                      <InsertCollapsibleContainer />
                      <InsertExcalidraw />

                      <InsertTable />
                      <InsertPoll />
                      <InsertColumnsLayout />
                      <InsertEmbeds />
                      {blockInsertMenuItems}
                    </BlockInsertPlugin>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </ToolbarPlugin>
      <div className="relative">
        {autoFocus ? <AutoFocusPlugin /> : null}
        <RichTextPlugin
          contentEditable={
            <div className="">
              <div className="" ref={onRef}>
                <ContentEditable
                  placeholder={placeholder}
                  className="ContentEditable__root relative block min-h-32 overflow-auto px-8 py-4 focus:outline-none"
                />
              </div>
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />

        <ClickableLinkPlugin />
        <CheckListPlugin />
        <HorizontalRulePlugin />
        <TablePlugin />
        <ListPlugin />
        <TabIndentationPlugin />
        <HashtagPlugin />
        <HistoryPlugin />

        <MentionsPlugin />
        <PageBreakPlugin />
        <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
        <KeywordsPlugin />
        <EmojisPlugin />
        <ImagesPlugin />
        <InlineImagePlugin />
        <ExcalidrawPlugin />
        {/* <MermaidPlugin /> */}
        <TableCellResizerPlugin />
        <TableHoverActionsPlugin anchorElem={floatingAnchorElem} />
        <TableActionMenuPlugin
          anchorElem={floatingAnchorElem}
          cellMerge={true}
        />
        <PollPlugin />
        <LayoutPlugin />
        <EquationsPlugin />
        <CollapsiblePlugin />

        <AutoEmbedPlugin />
        <FigmaPlugin />
        <OEmbedPlugin />
        <TwitterPlugin />
        <YouTubePlugin />

        <CodeHighlightPlugin />
        <CodeActionMenuPlugin anchorElem={floatingAnchorElem} />

        <MarkdownShortcutPlugin
          transformers={[
            TABLE,
            HR,
            IMAGE,
            EMOJI,
            EQUATION,
            TWEET,
            CHECK_LIST,
            ...ELEMENT_TRANSFORMERS,
            ...MULTILINE_ELEMENT_TRANSFORMERS,
            ...TEXT_FORMAT_TRANSFORMERS,
            ...TEXT_MATCH_TRANSFORMERS,
          ]}
        />
        <TypingPerfPlugin />
        <TabFocusPlugin />
        <AutocompletePlugin />
        <AutoLinkPlugin />
        <LinkPlugin />

        <ComponentPickerMenuPlugin
          baseOptions={[
            ParagraphPickerPlugin(),
            HeadingPickerPlugin({ n: 1 }),
            HeadingPickerPlugin({ n: 2 }),
            HeadingPickerPlugin({ n: 3 }),
            TablePickerPlugin(),
            CheckListPickerPlugin(),
            NumberedListPickerPlugin(),
            BulletedListPickerPlugin(),
            QuotePickerPlugin(),
            CodePickerPlugin(),
            DividerPickerPlugin(),
            PageBreakPickerPlugin(),
            ExcalidrawPickerPlugin(),
            // MermaidPickerPlugin(),
            PollPickerPlugin(),
            EmbedsPickerPlugin({ embed: "figma" }),
            EmbedsPickerPlugin({ embed: "tweet" }),
            EmbedsPickerPlugin({ embed: "youtube-video" }),
            EmbedsPickerPlugin({ embed: "oembed" }),
            EquationPickerPlugin(),
            ImagePickerPlugin(),
            CollapsiblePickerPlugin(),
            ColumnsLayoutPickerPlugin(),
            AlignmentPickerPlugin({ alignment: "left" }),
            AlignmentPickerPlugin({ alignment: "center" }),
            AlignmentPickerPlugin({ alignment: "right" }),
            AlignmentPickerPlugin({ alignment: "justify" }),
          ]}
          dynamicOptionsFn={DynamicTablePickerPlugin}
        />

        <ContextMenuPlugin />
        <DragDropPastePlugin />
        <EmojiPickerPlugin />

        <FloatingLinkEditorPlugin anchorElem={floatingAnchorElem} />
        <FloatingTextFormatToolbarPlugin anchorElem={floatingAnchorElem} />

        <ListMaxIndentLevelPlugin />
      </div>
      {!hideFooterActions ? (
        <ActionsPlugin>
          <div className="clear-both flex items-center justify-between gap-2 overflow-auto border-t p-1">
            <div className="flex flex-1 justify-start">
              <MaxLengthPlugin maxLength={maxLength} />
              <CharacterLimitPlugin maxLength={maxLength} charset="UTF-16" />
            </div>
            <div>
              <CounterCharacterPlugin charset="UTF-16" />
            </div>
            <div className="flex flex-1 justify-end">
              <SpeechToTextPlugin />
              <ShareContentPlugin />
              <ImportExportPlugin />
              <MarkdownTogglePlugin
                shouldPreserveNewLinesInMarkdown={true}
                transformers={[
                  TABLE,
                  HR,
                  IMAGE,
                  EMOJI,
                  EQUATION,
                  TWEET,
                  CHECK_LIST,
                  ...ELEMENT_TRANSFORMERS,
                  ...MULTILINE_ELEMENT_TRANSFORMERS,
                  ...TEXT_FORMAT_TRANSFORMERS,
                  ...TEXT_MATCH_TRANSFORMERS,
                ]}
              />
              <EditModeTogglePlugin />
              <>
                <ClearEditorActionPlugin />
                <ClearEditorPlugin />
              </>
              <TreeViewPlugin />
            </div>
          </div>
        </ActionsPlugin>
      ) : null}
    </div>
  );
}
