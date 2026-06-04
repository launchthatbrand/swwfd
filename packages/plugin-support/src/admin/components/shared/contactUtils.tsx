import type { ComponentType } from "react";

export const formatDateTime = (value?: number) => {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString();
};

export const getInitials = (input?: string) => {
  if (!input) {
    return "??";
  }
  return input
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .slice(0, 2)
    .join("");
};

interface ContactInfoRowProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

export const ContactInfoRow = ({
  icon: Icon,
  label,
  value,
}: ContactInfoRowProps) => (
  <div className="flex items-center gap-3 text-sm">
    <Icon className="text-muted-foreground h-4 w-4" />
    <div className="flex flex-col">
      <span className="text-muted-foreground text-[11px] tracking-wide uppercase">
        {label}
      </span>
      <span className="text-foreground">{value}</span>
    </div>
  </div>
);
