import { Switch } from "@launchthatapp/ui/switch";

interface AgentModeToggleProps {
  isAgentMode: boolean;
  assignedAgentName?: string;
  disabled?: boolean;
  onToggle: () => void;
}

export const AgentModeToggle = ({
  isAgentMode,
  assignedAgentName,
  disabled,
  onToggle,
}: AgentModeToggleProps) => {
  return (
    <div className="rounded-lg border px-3 py-2 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">
            {isAgentMode ? "Agent mode" : "Manual mode"}
          </span>
          <span className="text-muted-foreground">
            {isAgentMode
              ? "Assistant replies are enabled."
              : "Assistant replies are paused for this chat."}
          </span>
          {assignedAgentName ? (
            <span className="text-muted-foreground text-[11px]">
              Assigned to {assignedAgentName}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Switch
            checked={isAgentMode}
            disabled={disabled}
            onCheckedChange={() => {
              if (!disabled) {
                onToggle();
              }
            }}
          />
          <span className="text-muted-foreground text-[11px] tracking-wide uppercase">
            {isAgentMode ? "ON" : "OFF"}
          </span>
        </div>
      </div>
    </div>
  );
};
