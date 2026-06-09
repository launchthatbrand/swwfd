import { AutoLinkNode, LinkNode } from "@lexical/link";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import type { Klass, LexicalNode, LexicalNodeReplacement } from "lexical";
import { ListItemNode, ListNode } from "@lexical/list";
import { ParagraphNode, TextNode } from "lexical";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";

import { AutocompleteNode } from "../../nodes/autocomplete-node";
import { CollapsibleContainerNode } from "../../nodes/collapsible-container-node";
import { CollapsibleContentNode } from "../../nodes/collapsible-content-node";
import { CollapsibleTitleNode } from "../../nodes/collapsible-title-node";
import { EmojiNode } from "../../nodes/emoji-node";
import { EquationNode } from "../../nodes/equation-node";
import { ExcalidrawNode } from "../../nodes/excalidraw-node";
import { FigmaNode } from "../../nodes/embeds/figma-node";
import { HashtagNode } from "@lexical/hashtag";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { ImageNode } from "../../nodes/image-node";
import { InlineImageNode } from "../../nodes/inline-image-node";
import { KeywordNode } from "../../nodes/keyword-node";
import { LayoutContainerNode } from "../../nodes/layout-container-node";
import { LayoutItemNode } from "../../nodes/layout-item-node";
import { MentionNode } from "../../nodes/mention-node";
import { OEmbedNode } from "../../nodes/embeds/oembed-node";
import { OverflowNode } from "@lexical/overflow";
// import { MermaidNode } from "../../../components/editor/nodes/mermaid-node";
import { PageBreakNode } from "../../nodes/page-break-node";
import { PollNode } from "../../nodes/poll-node";
import { TweetNode } from "../../nodes/embeds/tweet-node";
import { YouTubeNode } from "../../nodes/embeds/youtube-node";

export const nodes: readonly (Klass<LexicalNode> | LexicalNodeReplacement)[] = [
  HeadingNode,
  ParagraphNode,
  TextNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  OverflowNode,
  HashtagNode,
  TableNode,
  TableCellNode,
  TableRowNode,
  CodeNode,
  CodeHighlightNode,
  HorizontalRuleNode,
  MentionNode,
  PageBreakNode,
  ImageNode,
  InlineImageNode,
  EmojiNode,
  KeywordNode,
  ExcalidrawNode,
  PollNode,
  LayoutContainerNode,
  LayoutItemNode,
  EquationNode,
  CollapsibleContainerNode,
  CollapsibleContentNode,
  CollapsibleTitleNode,
  AutoLinkNode,
  FigmaNode,
  TweetNode,
  YouTubeNode,
  OEmbedNode,
  AutocompleteNode,
  // MermaidNode,
];
