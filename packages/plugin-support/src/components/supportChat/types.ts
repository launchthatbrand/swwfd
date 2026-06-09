export type ChatWidgetTab = "conversations" | "helpdesk";

export interface HelpdeskArticle {
  id: string;
  title: string;
  summary: string;
  updatedAt: string;
  slug?: string;
}
