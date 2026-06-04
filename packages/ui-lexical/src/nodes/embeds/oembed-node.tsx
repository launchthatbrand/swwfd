import type { SerializedDecoratorBlockNode } from "@lexical/react/LexicalDecoratorBlockNode";
import { BlockWithAlignableContents } from "@lexical/react/LexicalBlockWithAlignableContents";
import { DecoratorBlockNode } from "@lexical/react/LexicalDecoratorBlockNode";
import type { JSX } from "react";
import type {
  EditorConfig,
  ElementFormatType,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  Spread,
} from "lexical";

export interface OEmbedPayload {
  url: string;
  html: string;
  providerName?: string;
  title?: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  videoId?: string;
}

type OEmbedComponentProps = Readonly<{
  className: Readonly<{
    base: string;
    focus: string;
  }>;
  format: ElementFormatType | null;
  nodeKey: NodeKey;
  payload: OEmbedPayload;
}>;

const extractIframeAttribute = (
  html: string,
  attribute: "src" | "allow" | "referrerpolicy",
) => {
  const pattern = new RegExp(`<iframe[^>]*\\s${attribute}=(["'])(.*?)\\1`, "i");
  const match = pattern.exec(html);
  const value = match?.[2]?.trim();
  return value && value.length > 0 ? value : undefined;
};

const sanitizeIframeSrc = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    // Ignore malformed src values and fall back to default embed rendering.
  }
  return undefined;
};

const OEmbedComponent = ({
  className,
  format,
  nodeKey,
  payload,
}: OEmbedComponentProps) => {
  const iframeSrc = sanitizeIframeSrc(extractIframeAttribute(payload.html, "src"));
  const iframeAllow = extractIframeAttribute(payload.html, "allow");
  const embedTitle = payload.title ?? payload.providerName ?? payload.url;
  const aspectWidth = payload.width && payload.width > 0 ? payload.width : 16;
  const aspectHeight = payload.height && payload.height > 0 ? payload.height : 9;

  return (
    <BlockWithAlignableContents
      className={className}
      format={format}
      nodeKey={nodeKey}
    >
      {iframeSrc ? (
        <div className="oembed-container w-full" aria-label={embedTitle}>
          <div
            className="relative mx-auto w-full overflow-hidden rounded-lg bg-black shadow-lg"
            style={{
              aspectRatio: `${aspectWidth} / ${aspectHeight}`,
              maxHeight: "70vh",
              maxWidth: `calc(70vh * ${aspectWidth} / ${aspectHeight})`,
            }}
          >
            <iframe
              src={iframeSrc}
              title={embedTitle}
              allow={iframeAllow ?? "autoplay; fullscreen; picture-in-picture"}
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        </div>
      ) : (
        <div
          className="oembed-container w-full rounded-lg bg-black [&_*]:max-w-full [&_div]:!w-full [&_div]:!max-w-none [&_iframe]:!block [&_iframe]:!w-full [&_iframe]:!max-w-none [&_iframe]:!h-auto [&_iframe]:rounded-md [&_iframe]:shadow-lg"
          aria-label={embedTitle}
          dangerouslySetInnerHTML={{ __html: payload.html }}
        />
      )}
    </BlockWithAlignableContents>
  );
};

export type SerializedOEmbedNode = Spread<
  OEmbedPayload,
  SerializedDecoratorBlockNode
>;

export class OEmbedNode extends DecoratorBlockNode {
  __payload: OEmbedPayload;

  static getType(): string {
    return "oembed";
  }

  static clone(node: OEmbedNode): OEmbedNode {
    return new OEmbedNode(node.__payload, node.__format, node.__key);
  }

  static importJSON(serializedNode: SerializedOEmbedNode): OEmbedNode {
    const { url, html, providerName, title, height, width, thumbnailUrl, videoId } =
      serializedNode;
    const node = $createOEmbedNode({
      url,
      html,
      providerName,
      title,
      height,
      width,
      thumbnailUrl,
      videoId,
    });
    node.setFormat(serializedNode.format);
    return node;
  }

  exportJSON(): SerializedOEmbedNode {
    return {
      ...super.exportJSON(),
      type: "oembed",
      version: 1,
      ...this.__payload,
    };
  }

  constructor(payload: OEmbedPayload, format?: ElementFormatType, key?: NodeKey) {
    super(format, key);
    this.__payload = payload;
  }

  getPayload(): OEmbedPayload {
    return this.__payload;
  }

  updateDOM(): false {
    return false;
  }

  getTextContent(): string {
    return this.__payload.url;
  }

  decorate(_editor: LexicalEditor, config: EditorConfig): JSX.Element {
    const embedBlockTheme = config.theme.embedBlock || {};
    const className = {
      base: embedBlockTheme.base || "",
      focus: embedBlockTheme.focus || "",
    };

    return (
      <OEmbedComponent
        className={className}
        format={this.__format}
        nodeKey={this.getKey()}
        payload={this.__payload}
      />
    );
  }
}

export const $createOEmbedNode = (payload: OEmbedPayload) =>
  new OEmbedNode(payload);

export const $isOEmbedNode = (node?: LexicalNode | null): node is OEmbedNode =>
  node instanceof OEmbedNode;
