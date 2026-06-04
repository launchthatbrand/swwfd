import { INSERT_EMBED_COMMAND } from "@lexical/react/LexicalAutoEmbedPlugin";

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { CustomEmbedConfig } from "../../plugins/embeds/auto-embed-plugin";
import { EmbedConfigs } from "../../plugins/embeds/auto-embed-plugin";
import { ComponentPickerOption } from "../../plugins/picker/component-picker-option";

export function EmbedsPickerPlugin({
  embed,
}: {
  embed: "figma" | "tweet" | "youtube-video" | "oembed";
}) {
  const embedConfig = EmbedConfigs.find((config) => config.type === embed)!;

  return new ComponentPickerOption(`Embed ${embedConfig.contentName}`, {
    icon: embedConfig.icon,
    keywords: [...embedConfig.keywords, "embed"],
    onSelect: (_, editor) =>
      editor.dispatchCommand(INSERT_EMBED_COMMAND, embedConfig.type),
  });
}
