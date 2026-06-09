export type PluginDefinition = {
  id: string;
  name: string;
  description?: string;
  [key: string]: unknown;
};

export type PluginMetaBoxRendererProps = {
  renderField: (fieldKey: string) => unknown;
};
