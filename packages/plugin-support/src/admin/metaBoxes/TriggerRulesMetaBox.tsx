import type { PluginMetaBoxRendererProps } from "@swwfd/plugin-core";

export function TriggerRulesMetaBox({
  renderField,
}: PluginMetaBoxRendererProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {["trigger_is_active", "trigger_match_mode"].map((fieldKey) =>
          renderField(fieldKey),
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {["trigger_priority", "trigger_phrases"].map((fieldKey) =>
          renderField(fieldKey),
        )}
      </div>
    </div>
  );
}
